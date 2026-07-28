/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  UjpCompanyInfo,
  UjpSendOutcome,
  UjpSendResult,
  UjpSubmitContext,
} from '../dto/ujp-payload.types';

/**
 * Грешка за ПОСТОЈАНО (валидационо) одбивање од УЈП — не се повторува.
 */
export class UjpBusinessRejectionError extends Error {
  constructor(
    message: string,
    public readonly raw: unknown,
  ) {
    super(message);
    this.name = 'UjpBusinessRejectionError';
  }
}

/**
 * HTTP клиент кон УЈП е-Фактура (тест).
 *
 * Автентикацијата НЕ е OAuth: се праќаат заглавија (X-EUJP-ID, X-EDB,
 * X-SERIAL-NUMBER, X-DOC-TYPE-CODE), а самото барање е потпишано како JWS.
 * Поднесувањето е СИНХРОНО — враќа EUID + qr_link веднаш.
 *
 * Base URL-и:
 *   - шифрарници/серверско време/компании: {apiBase}/api/v1/...
 *   - праќање документи: {receiverBase}/api/v1/sales-invoices/send
 *
 * `UJP_SIMULATE` (или отсуство на `UJP_API_BASE_URL`) вклучува симулација.
 */
@Injectable()
export class UjpClientService {
  private readonly logger = new Logger(UjpClientService.name);

  private readonly apiBase =
    process.env.UJP_API_BASE_URL ||
    'https://efakturatest.ujp.gov.mk/einvoice_api';
  private readonly receiverBase =
    process.env.UJP_RECEIVER_URL ||
    'https://efakturatest.ujp.gov.mk/JSONReceiver';
  private readonly simulate =
    process.env.UJP_SIMULATE === 'true' || !process.env.UJP_API_BASE_URL;

  constructor(private readonly httpService: HttpService) {}

  /** Серверско време во формат за `requestTimestamp` (без временска зона). */
  async getServerTime(): Promise<string> {
    if (this.simulate) {
      return new Date().toISOString().slice(0, 19);
    }
    const res = await this.withRetry(() =>
      firstValueFrom(
        this.httpService.get(`${this.apiBase}/api/v1/server-time`),
      ),
    );
    return res.data.timestamp as string;
  }

  /**
   * Праќање дигитално потпишана (JWS) фактура. Синхроно враќа EUID/qr_link.
   */
  async send(
    jws: string,
    requestTimestamp: string,
    ctx: UjpSubmitContext,
  ): Promise<UjpSendResult> {
    if (this.simulate) {
      return this.simulateSend(jws);
    }

    return this.withRetry(async () => {
      try {
        const res = await firstValueFrom(
          this.httpService.post(
            `${this.receiverBase}/api/v1/sales-invoices/send`,
            { requestTimestamp, jws },
            {
              headers: {
                'X-SERIAL-NUMBER': ctx.certSerialNumber,
                'X-EUJP-ID': ctx.eujpId,
                'X-EDB': ctx.edb,
                'X-DOC-TYPE-CODE': ctx.docTypeCode,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        const data = res.data;
        return {
          outcome:
            data?.status === 200 || data?.euid
              ? UjpSendOutcome.SUCCESS
              : UjpSendOutcome.REJECTED,
          euid: data?.euid,
          qrLink: data?.qr_link,
          message: data?.message,
          raw: data,
        };
      } catch (err) {
        throw this.classifyError(err);
      }
    });
  }

  /** Официјални податоци за компанија по даночен број (за автопополнување). */
  async getCompanyByTaxNumber(taxNumber: string): Promise<UjpCompanyInfo> {
    if (this.simulate) {
      return {
        taxNumber,
        registrationNumber: '0000000',
        name: `Тест компанија ${taxNumber}`,
        address: {
          street: 'ул. Тест',
          number: '1',
          city: 'Скопје',
          zip: '1000',
        },
        countryCode: 'MK',
      };
    }
    const res = await this.withRetry(() =>
      firstValueFrom(
        this.httpService.get(`${this.apiBase}/api/v1/companies/${taxNumber}`),
      ),
    );
    return res.data.company as UjpCompanyInfo;
  }

  /** 4xx (освен 408/429) = бизнис одбивање (без повтор); друго = преодно. */
  private classifyError(err: unknown): Error {
    const status = (err as any)?.response?.status as number | undefined;
    const body = (err as any)?.response?.data;
    if (
      status &&
      status >= 400 &&
      status < 500 &&
      status !== 408 &&
      status !== 429
    ) {
      const reason =
        body?.message ||
        body?.errorStatus ||
        `УЈП го одби документот (HTTP ${status}).`;
      return new UjpBusinessRejectionError(reason, body ?? null);
    }
    return err instanceof Error ? err : new Error(String(err));
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 500,
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof UjpBusinessRejectionError) throw err;
        lastErr = err;
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          this.logger.warn(
            `УЈП повик не успеа (обид ${attempt + 1}/${maxRetries + 1}), повторувам за ${delay}ms.`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  // --- Симулација ---
  private simulateSend(jws: string): UjpSendResult {
    // Ако JWS-от кодира документ со финален износ <=0, симулирај одбивање.
    try {
      const body = jws.split('.')[1];
      const json = JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
      const finalAmount = json?.document?.docTotals?.docFinalAmount;
      if (Number(finalAmount) <= 0) {
        return {
          outcome: UjpSendOutcome.REJECTED,
          rejectionReason: 'Вкупниот износ мора да биде поголем од 0.',
          raw: { simulated: true },
        };
      }
    } catch {
      /* ignore parse errors in simulation */
    }
    const euid = `sim-${Buffer.from(String(Date.now())).toString('hex').slice(0, 12)}`;
    this.logger.log(`[СИМУЛАЦИЈА] Испратена е-Фактура, EUID ${euid}.`);
    return {
      outcome: UjpSendOutcome.SUCCESS,
      euid,
      qrLink: `https://efakturatest.ujp.gov.mk/euid/${euid}`,
      message: 'Фактура успешно зачувана (симулација).',
      raw: { simulated: true, status: 200 },
    };
  }
}
