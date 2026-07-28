/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { InvoiceUjpStatus } from '../entities/invoice-ujp-status.entity';
import {
  MAX_UJP_ATTEMPTS,
  TERMINAL_UJP_STATUSES,
  UjpSubmissionStatus,
} from '../enums/ujp-submission-status.enum';
import {
  UjpCompanyInfo,
  UjpEnvelope,
  UjpSendOutcome,
  UjpSubmitContext,
} from '../dto/ujp-payload.types';
import { UjpInvoiceAdapterService } from './ujp-invoice-adapter.service';
import {
  UjpBusinessRejectionError,
  UjpClientService,
} from './ujp-client.service';
import { SIGNING_PROVIDER } from '../signing/signing-provider.interface';
import type { JwsSigningProvider } from '../signing/signing-provider.interface';

/**
 * Оркестратор на поднесувањето кон УЈП.
 *
 * Модел на сигурност (без Redis/BullMQ):
 *  1. `enqueue` создава/ресетира outbox запис (QUEUED).
 *  2. Веднаш се обидуваме да обработиме, во позадина (без блокирање на корисникот).
 *  3. `UjpReconcilerCron` ги фаќа заглавените записи (крашеви, привремени грешки).
 *
 * Поднесувањето е СИНХРОНО: adapter → потпис (JWS) → send → веднаш добиваме EUID.
 * Успешно пратена и валидирана фактура се смета за фискализирана (заклучена).
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
    @Inject(SIGNING_PROVIDER)
    private readonly signer: JwsSigningProvider,
  ) {}

  async getForInvoice(
    invoiceId: number,
    companyId: number,
  ): Promise<InvoiceUjpStatus | null> {
    return this.statusRepo.findOne({ where: { invoiceId, companyId } });
  }

  /** Официјални податоци за компанија по даночен број (автопополнување). */
  async lookupCompany(taxNumber: string): Promise<UjpCompanyInfo> {
    return this.ujpClient.getCompanyByTaxNumber(taxNumber);
  }

  /**
   * Става фактура во ред за поднесување (outbox) и веднаш обработува во позадина.
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

    let row = await this.statusRepo.findOne({
      where: { invoiceId, companyId },
    });

    if (row && row.status === UjpSubmissionStatus.APPROVED) {
      throw new ConflictException(
        'Фактурата е веќе поднесена и валидирана од УЈП.',
      );
    }

    const inFlight: UjpSubmissionStatus[] = [
      UjpSubmissionStatus.QUEUED,
      UjpSubmissionStatus.SIGNING,
      UjpSubmissionStatus.SUBMITTING,
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

    void this.process(row.id).catch((err) =>
      this.logger.error(
        `Непредвидена грешка при обработка на УЈП запис ${row.id}: ${err}`,
      ),
    );

    return row;
  }

  /** Целосна синхрона обработка: adapter → JWS → send → сними EUID/статус. */
  async process(statusId: number): Promise<void> {
    const row = await this.statusRepo.findOne({ where: { id: statusId } });
    if (!row || TERMINAL_UJP_STATUSES.has(row.status)) return;

    const invoice = await this.invoiceRepo.findOne({
      where: { id: row.invoiceId },
      relations: ['company', 'client', 'items'],
    });
    if (!invoice) {
      await this.fail(row, 'Фактурата исчезнала пред поднесување.');
      return;
    }

    try {
      row.attempts += 1;

      // docTypeCode: 100 = Фактура (проформи не се фискализираат преку овој сервис).
      const docTypeCode = '100';

      // 1) Серверско време → requestTimestamp (±5 мин; дел од потписот).
      const requestTimestamp = await this.ujpClient.getServerTime();

      // 2) Изгради payload и потпиши го како JWS.
      row.status = UjpSubmissionStatus.SIGNING;
      await this.statusRepo.save(row);

      const document = this.adapter.toUjpDocument(invoice);
      const envelope: UjpEnvelope = { requestTimestamp, document };
      const signed = await this.signer.signToJws(
        invoice.company,
        envelope,
        docTypeCode,
      );
      row.signedDocumentRef = signed.certSerialNumber;

      // 3) Испрати (синхроно).
      row.status = UjpSubmissionStatus.SUBMITTING;
      row.submittedAt = new Date();
      await this.statusRepo.save(row);

      const ctx: UjpSubmitContext = {
        eujpId: process.env.UJP_EUJP_ID || '',
        edb: invoice.company.edb,
        certSerialNumber: signed.certSerialNumber,
        docTypeCode,
      };

      console.log(signed, 'SIGNED');

      const result = await this.ujpClient.send(
        signed.jws,
        requestTimestamp,
        ctx,
      );
      row.rawResponse = result.raw;

      if (result.outcome === UjpSendOutcome.SUCCESS) {
        row.status = UjpSubmissionStatus.APPROVED;
        row.ujpDocumentId = result.euid ?? null; // EUID
        row.qrLink = result.qrLink ?? null;
        row.ujpStatusCode = '01'; // Испратена (Нова)
        row.confirmedAt = new Date();
      } else {
        row.status = UjpSubmissionStatus.REJECTED;
        row.rejectionReason =
          result.rejectionReason ?? result.message ?? 'УЈП го одби документот.';
      }
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
    row.status =
      row.attempts >= MAX_UJP_ATTEMPTS
        ? UjpSubmissionStatus.ERROR
        : UjpSubmissionStatus.QUEUED;
    await this.statusRepo.save(row);
  }

  /** Записи што чекаат обработка/повтор — ги користи reconciler-от. */
  async findProcessable(limit = 25): Promise<InvoiceUjpStatus[]> {
    return this.statusRepo.find({
      where: {
        status: In([
          UjpSubmissionStatus.QUEUED,
          UjpSubmissionStatus.SIGNING,
          UjpSubmissionStatus.SUBMITTING,
        ]),
      },
      order: { updated_at: 'ASC' },
      take: limit,
    });
  }
}
