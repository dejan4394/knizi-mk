import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Mock интеграција со платниот gateway на Стопанска банка АД Скопје.
//
// Ова е СИМУЛАЦИЈА - не праќа реални барања никаде. Ја имитира механиката на
// вистински gateway со токенизација:
//   1) `tokenize()` - еднократна иницијална токенизација на картичка. Банката
//      ги чува податоците од картичката и ни враќа токен што безбедно го
//      складираме наместо самиот PAN.
//   2) `chargeWithToken()` - автоматска server-to-server наплата со зачуваниот
//      токен, без учество на корисникот (за месечните ПРО циклуси).
//
// За да можеме да ги тестираме двата тека, наплатата случајно враќа SUCCESS
// (90%) или DECLINED (10%).
// ---------------------------------------------------------------------------

export enum PaymentStatus {
  SUCCESS = 'SUCCESS',
  DECLINED = 'DECLINED',
}

export interface TokenizeRequest {
  pan: string; // број на картичка
  expiryMonth: number; // 1-12
  expiryYear: number; // полна година, пр. 2028
  cvv: string;
  cardHolder: string;
}

export interface TokenizeResult {
  token: string; // токен за идни наплати (наместо PAN)
  cardBrand: string; // VISA / MASTERCARD / ...
  last4: string; // последни 4 цифри за приказ
  expiryMonth: number;
  expiryYear: number;
}

export interface ChargeRequest {
  token: string;
  amount: number; // износ во денари
  currency?: string; // стандардно MKD
  description?: string;
}

export interface ChargeResult {
  status: PaymentStatus;
  transactionId: string;
  amount: number;
  currency: string;
  processedAt: Date;
  declineReason?: string; // пополнето само при DECLINED
}

// Тест-картичка на Стопанска банка за демо/развој. Го користиме кога сакаме
// брзо да го поминеме текот без реални податоци (нпр. предисполнет формулар).
export const STB_TEST_CARD: TokenizeRequest = {
  pan: '4111111111111111',
  expiryMonth: 12,
  expiryYear: 2030,
  cvv: '123',
  cardHolder: 'TEST KORISNIK',
};

// Веројатност за успешна наплата (останатото се одбива).
const SUCCESS_RATE = 0.9;

// Можни причини за одбивање што ги враќа „банката".
const DECLINE_REASONS = [
  'INSUFFICIENT_FUNDS', // недоволно средства
  'CARD_EXPIRED', // истечена картичка
  'DO_NOT_HONOR', // општо одбивање од издавачот
  'TRANSACTION_LIMIT_EXCEEDED', // надминат лимит
];

@Injectable()
export class MockPaymentService {
  private readonly logger = new Logger(MockPaymentService.name);

  // Иницијална токенизација - корисникот еднаш ги внесува податоците, банката
  // ни враќа токен што го чуваме за идни автоматски наплати.
  async tokenize(request: TokenizeRequest): Promise<TokenizeResult> {
    await this.simulateNetworkLatency();

    const pan = request.pan.replace(/\s+/g, '');
    const last4 = pan.slice(-4);
    const cardBrand = this.detectCardBrand(pan);

    const token = `stb_tok_${randomBytes(16).toString('hex')}`;

    this.logger.log(
      `Токенизирана картичка ${cardBrand} **** ${last4} → ${token}`,
    );

    return {
      token,
      cardBrand,
      last4,
      expiryMonth: request.expiryMonth,
      expiryYear: request.expiryYear,
    };
  }

  // Автоматска наплата преку зачуван токен (без корисник во јамката).
  // Случајно враќа SUCCESS (90%) или DECLINED (10%).
  async chargeWithToken(request: ChargeRequest): Promise<ChargeResult> {
    await this.simulateNetworkLatency();

    const currency = request.currency ?? 'MKD';
    const transactionId = `stb_txn_${randomBytes(12).toString('hex')}`;
    const processedAt = new Date();

    const approved = Math.random() < SUCCESS_RATE;

    if (!approved) {
      const declineReason =
        DECLINE_REASONS[Math.floor(Math.random() * DECLINE_REASONS.length)];
      this.logger.warn(
        `Наплатата е одбиена (${transactionId}): ${request.amount} ${currency} - причина: ${declineReason}`,
      );
      return {
        status: PaymentStatus.DECLINED,
        transactionId,
        amount: request.amount,
        currency,
        processedAt,
        declineReason,
      };
    }

    this.logger.log(
      `Успешна наплата (${transactionId}): ${request.amount} ${currency}` +
        (request.description ? ` - ${request.description}` : ''),
    );
    return {
      status: PaymentStatus.SUCCESS,
      transactionId,
      amount: request.amount,
      currency,
      processedAt,
    };
  }

  // Груба детекција на бренд според првата цифра на картичката.
  private detectCardBrand(pan: string): string {
    if (pan.startsWith('4')) return 'VISA';
    if (pan.startsWith('5')) return 'MASTERCARD';
    if (pan.startsWith('3')) return 'AMEX';
    return 'CARD';
  }

  // Мала вештачка доцна за да наликува на реален мрежен повик.
  private simulateNetworkLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 150));
  }
}
