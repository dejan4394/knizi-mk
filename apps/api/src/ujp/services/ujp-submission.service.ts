import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoicesService } from '../../invoices/invoices.service';
import { PdfService } from '../../pdf/pdf.service';
import { InvoiceUjpStatus } from '../entities/invoice-ujp-status.entity';
import {
  MAX_UJP_ATTEMPTS,
  TERMINAL_UJP_STATUSES,
  UjpSubmissionStatus,
} from '../enums/ujp-submission-status.enum';
import { UjpAckKind } from '../dto/ujp-payload.types';
import { UjpInvoiceAdapterService } from './ujp-invoice-adapter.service';
import {
  UjpBusinessRejectionError,
  UjpClientService,
} from './ujp-client.service';
import { SIGNING_PROVIDER } from '../signing/signing-provider.interface';
import type { SigningProvider } from '../signing/signing-provider.interface';

/**
 * Оркестратор на поднесувањето кон УЈП.
 *
 * Модел на сигурност (без Redis/BullMQ):
 *  1. `enqueue` создава/ресетира outbox запис во статус QUEUED.
 *  2. Веднаш (без блокирање на корисникот) се обидуваме да обработиме.
 *  3. `UjpReconcilerCron` е безбедносна мрежа што ги фаќа заглавените записи.
 *
 * Кога ќе се додаде вистински queue (pg-boss/BullMQ), само `enqueue` наместо
 * `void this.process(...)` ќе става job — сè друго останува исто.
 */
@Injectable()
export class UjpSubmissionService {
  private readonly logger = new Logger(UjpSubmissionService.name);

  constructor(
    @InjectRepository(InvoiceUjpStatus)
    private readonly statusRepo: Repository<InvoiceUjpStatus>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    private readonly adapter: UjpInvoiceAdapterService,
    private readonly ujpClient: UjpClientService,
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
    @Inject(SIGNING_PROVIDER)
    private readonly signingProvider: SigningProvider,
  ) {}

  /** Читање-модел за фронтендот. */
  async getForInvoice(
    invoiceId: number,
    companyId: number,
  ): Promise<InvoiceUjpStatus | null> {
    return this.statusRepo.findOne({ where: { invoiceId, companyId } });
  }

  /**
   * Става фактура во ред за поднесување (outbox) и веднаш се обидува да ја обработи.
   * Враќа брзо — обработката тече во позадина за да не се блокира корисникот.
   */
  async enqueue(
    invoiceId: number,
    companyId: number,
  ): Promise<InvoiceUjpStatus> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) {
      throw new NotFoundException('Фактурата не е пронајдена.');
    }

    let row = await this.statusRepo.findOne({ where: { invoiceId, companyId } });

    if (row && row.status === UjpSubmissionStatus.APPROVED) {
      throw new ConflictException(
        'Фактурата е веќе одобрена од УЈП и не може повторно да се поднесе.',
      );
    }

    // Ако веќе тече обработка, врати го постоечкиот запис (идемпотентно).
    const inFlight: UjpSubmissionStatus[] = [
      UjpSubmissionStatus.QUEUED,
      UjpSubmissionStatus.SIGNING,
      UjpSubmissionStatus.SUBMITTING,
      UjpSubmissionStatus.AWAITING_CONFIRMATION,
    ];
    if (row && inFlight.includes(row.status)) {
      return row;
    }

    if (!row) {
      row = this.statusRepo.create({
        invoiceId,
        companyId,
        idempotencyKey: `${companyId}:${invoiceId}:${invoice.year}:${invoice.invoiceNo}`,
      });
    }

    row.status = UjpSubmissionStatus.QUEUED;
    row.lastError = null;
    row.rejectionReason = null;
    row = await this.statusRepo.save(row);

    // Позадинска обработка; грешките се фаќаат внатре и се снимаат во записот.
    void this.process(row.id).catch((err) =>
      this.logger.error(
        `Непредвидена грешка при обработка на УЈП запис ${row!.id}: ${err}`,
      ),
    );

    return row;
  }

  /**
   * Целосна обработка на еден запис: потпиши → поднеси → сними резултат.
   * Наменето да го повикуваат и `enqueue` и reconciler-от.
   */
  async process(statusId: number): Promise<void> {
    const row = await this.statusRepo.findOne({ where: { id: statusId } });
    if (!row) return;

    // Асинхроно поднесените се проверуваат преку poll, не се праќаат повторно.
    if (row.status === UjpSubmissionStatus.AWAITING_CONFIRMATION) {
      await this.pollAwaiting(row);
      return;
    }

    if (TERMINAL_UJP_STATUSES.has(row.status)) return;

    const invoice = await this.invoiceRepo.findOne({
      where: { id: row.invoiceId },
      relations: ['company', 'client', 'items'],
    });
    if (!invoice) {
      await this.fail(row, 'Фактурата исчезнала пред поднесување.');
      return;
    }

    try {
      // 1) Потпиши
      row.status = UjpSubmissionStatus.SIGNING;
      row.attempts += 1;
      await this.statusRepo.save(row);

      const payload = this.adapter.toUjpPayload(invoice);
      const templateData = this.invoicesService.mapInvoiceToTemplateData(invoice);
      const pdf = await this.pdfService.generateInvoicePdf(templateData);
      const signed = await this.signingProvider.sign(
        invoice.company,
        pdf,
        invoice.invoiceNo,
      );
      row.signedDocumentRef = signed.signedRef;

      // 2) Поднеси до УЈП
      row.status = UjpSubmissionStatus.SUBMITTING;
      row.submittedAt = new Date();
      await this.statusRepo.save(row);

      const result = await this.ujpClient.submit(
        payload,
        signed.signedRef,
        row.idempotencyKey,
      );
      row.rawResponse = result.raw;

      // 3) Обработи резултат
      switch (result.kind) {
        case UjpAckKind.APPROVED:
          row.status = UjpSubmissionStatus.APPROVED;
          row.ujpDocumentId = result.ujpDocumentId ?? null;
          row.confirmedAt = new Date();
          break;
        case UjpAckKind.REJECTED:
          row.status = UjpSubmissionStatus.REJECTED;
          row.rejectionReason =
            result.rejectionReason ?? 'УЈП го одби документот.';
          break;
        case UjpAckKind.ACCEPTED:
        default:
          row.status = UjpSubmissionStatus.AWAITING_CONFIRMATION;
          row.ujpReference = result.ujpReference ?? null;
          break;
      }
      await this.statusRepo.save(row);
    } catch (err) {
      await this.handleProcessingError(row, err);
    }
  }

  /** Проверка на статус за асинхроно поднесени (AWAITING) записи. */
  async pollAwaiting(row: InvoiceUjpStatus): Promise<void> {
    if (!row.ujpReference) {
      await this.fail(row, 'Недостасува УЈП референца за проверка на статус.');
      return;
    }
    try {
      const result = await this.ujpClient.getDocumentStatus(row.ujpReference);
      row.rawResponse = result.raw;
      if (result.kind === UjpAckKind.APPROVED) {
        row.status = UjpSubmissionStatus.APPROVED;
        row.ujpDocumentId = result.ujpDocumentId ?? null;
        row.confirmedAt = new Date();
      } else if (result.kind === UjpAckKind.REJECTED) {
        row.status = UjpSubmissionStatus.REJECTED;
        row.rejectionReason =
          result.rejectionReason ?? 'УЈП го одби документот.';
      }
      // ACCEPTED → остани во AWAITING, ќе се провери повторно.
      await this.statusRepo.save(row);
    } catch (err) {
      await this.handleProcessingError(row, err);
    }
  }

  private async handleProcessingError(
    row: InvoiceUjpStatus,
    err: unknown,
  ): Promise<void> {
    if (err instanceof UjpBusinessRejectionError) {
      // Постојано одбивање — не повторувај, побарај корисникот да исправи.
      row.status = UjpSubmissionStatus.REJECTED;
      row.rejectionReason = err.message;
      row.rawResponse = err.raw;
      await this.statusRepo.save(row);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(
      `Преодна грешка за УЈП запис ${row.id} (обид ${row.attempts}): ${message}`,
    );
    await this.fail(row, message);
  }

  private async fail(row: InvoiceUjpStatus, message: string): Promise<void> {
    row.lastError = message;
    // По исцрпени обиди останува во ERROR за рачна интервенција; инаку QUEUED за повтор.
    row.status =
      row.attempts >= MAX_UJP_ATTEMPTS
        ? UjpSubmissionStatus.ERROR
        : UjpSubmissionStatus.QUEUED;
    await this.statusRepo.save(row);
  }

  /**
   * Ги наоѓа записите што чекаат обработка/повтор — го користи reconciler-от.
   * QUEUED и ERROR (под лимитот) за повтор; AWAITING за poll.
   */
  async findProcessable(limit = 25): Promise<InvoiceUjpStatus[]> {
    return this.statusRepo.find({
      where: {
        status: In([
          UjpSubmissionStatus.QUEUED,
          UjpSubmissionStatus.SIGNING,
          UjpSubmissionStatus.SUBMITTING,
          UjpSubmissionStatus.AWAITING_CONFIRMATION,
        ]),
      },
      order: { updated_at: 'ASC' },
      take: limit,
    });
  }

  /** Одобрен документ што пристигнал преку webhook од УЈП. */
  async applyCallback(
    reference: string,
    kind: UjpAckKind,
    ujpDocumentId?: string,
    rejectionReason?: string,
  ): Promise<void> {
    const row = await this.statusRepo.findOne({
      where: { ujpReference: reference },
    });
    if (!row) {
      this.logger.warn(`УЈП callback за непозната референца: ${reference}`);
      return;
    }
    if (TERMINAL_UJP_STATUSES.has(row.status)) return;

    if (kind === UjpAckKind.APPROVED) {
      row.status = UjpSubmissionStatus.APPROVED;
      row.ujpDocumentId = ujpDocumentId ?? row.ujpDocumentId ?? null;
      row.confirmedAt = new Date();
    } else if (kind === UjpAckKind.REJECTED) {
      row.status = UjpSubmissionStatus.REJECTED;
      row.rejectionReason = rejectionReason ?? 'УЈП го одби документот.';
    }
    await this.statusRepo.save(row);
  }
}
