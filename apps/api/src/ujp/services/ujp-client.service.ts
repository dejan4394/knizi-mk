/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  UjpAckKind,
  UjpDocumentPayload,
  UjpSubmitResult,
} from '../dto/ujp-payload.types';

/**
 * Грешка за ПОСТОЈАНО (бизнис/валидационо) одбивање од УЈП.
 * Кога ќе се фрли, поднесувањето НЕ се повторува — се бара корисникот да ја исправи фактурата.
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
 * HTTP клиент кон владиниот е-Фактура (УЈП) API.
 *
 * Спецификацијата на УЈП сè уште не е финална, па:
 *  - обликот на барањето е изолиран овде (менуваш само оваа класа + адаптерот),
 *  - има `UJP_SIMULATE` режим (како MockPaymentService во billing) за да се
 *    тестира целиот pipeline end-to-end пред да излезе вистинскиот API.
 *
 * Наспроти постоечкиот KibsService, тука токенот СЕ КЕШИРА во меморија и сите
 * повици имаат retry со exponential backoff.
 */
@Injectable()
export class UjpClientService {
  private readonly logger = new Logger(UjpClientService.name);

  private readonly baseUrl = process.env.UJP_API_BASE_URL;
  private readonly clientId = process.env.UJP_CLIENT_ID;
  private readonly clientSecret = process.env.UJP_CLIENT_SECRET;
  /** Симулација кога нема конфигуриран вистински API (dev/тест). */
  private readonly simulate =
    process.env.UJP_SIMULATE === 'true' || !this.baseUrl;

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly httpService: HttpService) {}

  /** OAuth2 client-credentials со кеш во меморија (обновен ~60s пред истек). */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - 60_000 > now) {
      return this.cachedToken.value;
    }

    const response = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    );

    const token = response.data.access_token as string;
    const expiresInSec = Number(response.data.expires_in ?? 3600);
    this.cachedToken = { value: token, expiresAt: now + expiresInSec * 1000 };
    return token;
  }

  /**
   * Поднесување на потпишан документ до УЈП.
   * @throws UjpBusinessRejectionError за 4xx бизнис-одбивања (без повтор)
   * @throws Error за преодни грешки (мрежа/5xx/429) — reconciler-от ќе повтори
   */
  async submit(
    payload: UjpDocumentPayload,
    signedRef: string,
    idempotencyKey: string,
  ): Promise<UjpSubmitResult> {
    if (this.simulate) {
      return this.simulateSubmit(payload, idempotencyKey);
    }

    return this.withRetry(async () => {
      const token = await this.getAccessToken();
      try {
        const response = await firstValueFrom(
          this.httpService.post(
            `${this.baseUrl}/documents`,
            { document: payload, signatureRef: signedRef },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Idempotency-Key': idempotencyKey,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        const data = response.data;
        return {
          kind: this.mapAckKind(data?.status),
          ujpDocumentId: data?.documentId,
          ujpReference: data?.reference,
          rejectionReason: data?.rejectionReason,
          raw: data,
        };
      } catch (err) {
        throw this.classifyError(err);
      }
    });
  }

  /** Проверка на статус за асинхроно поднесени документи. */
  async getDocumentStatus(reference: string): Promise<UjpSubmitResult> {
    if (this.simulate) {
      // Во симулација, документот се „одобрува" при првата проверка.
      return {
        kind: UjpAckKind.APPROVED,
        ujpDocumentId: `SIM-DOC-${reference}`,
        ujpReference: reference,
        raw: { simulated: true, status: 'APPROVED' },
      };
    }

    return this.withRetry(async () => {
      const token = await this.getAccessToken();
      try {
        const response = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/documents/${reference}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
        const data = response.data;
        return {
          kind: this.mapAckKind(data?.status),
          ujpDocumentId: data?.documentId,
          ujpReference: reference,
          rejectionReason: data?.rejectionReason,
          raw: data,
        };
      } catch (err) {
        throw this.classifyError(err);
      }
    });
  }

  private mapAckKind(status: unknown): UjpAckKind {
    switch (status) {
      case 'APPROVED':
      case 'ACCEPTED_FINAL':
        return UjpAckKind.APPROVED;
      case 'REJECTED':
        return UjpAckKind.REJECTED;
      default:
        return UjpAckKind.ACCEPTED; // примена, чека потврда
    }
  }

  /** Преводлив HTTP → преодна грешка (retry) или постојано одбивање (без retry). */
  private classifyError(err: unknown): Error {
    const status = (err as any)?.response?.status as number | undefined;
    const body = (err as any)?.response?.data;
    // 4xx (освен 408/429) = бизнис/валидациона грешка → нема поента да повторуваме.
    if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
      const reason =
        body?.rejectionReason ||
        body?.message ||
        `УЈП го одби документот (HTTP ${status}).`;
      return new UjpBusinessRejectionError(reason, body ?? null);
    }
    // Сè друго (мрежа, 5xx, 429, 408) е преодно.
    return err instanceof Error ? err : new Error(String(err));
  }

  /** Едноставен retry со exponential backoff за преодни грешки. */
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
        // Постојаните одбивања не се повторуваат.
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

  // --- Симулација (dev/тест), огледало на MockPaymentService од billing ---
  private simulateSubmit(
    payload: UjpDocumentPayload,
    idempotencyKey: string,
  ): UjpSubmitResult {
    this.logger.log(
      `[СИМУЛАЦИЈА] Поднесување фактура бр. ${payload.invoiceNo}/${payload.year} до УЈП.`,
    );
    // Мал детерминистички дел одбиен за да се тестира REJECTED патеката.
    if (payload.totalAmount <= 0) {
      return {
        kind: UjpAckKind.REJECTED,
        rejectionReason: 'Вкупниот износ мора да биде поголем од 0.',
        raw: { simulated: true },
      };
    }
    return {
      kind: UjpAckKind.ACCEPTED,
      ujpReference: `SIM-${idempotencyKey}`,
      raw: { simulated: true, status: 'ACCEPTED' },
    };
  }
}
