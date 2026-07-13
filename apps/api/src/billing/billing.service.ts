import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { SubscriptionPlan } from './enums/plan.enum';
import { PLAN_CATALOG, PRO_CYCLE_DAYS, getEffectivePlan } from './billing.catalog';
import {
  MockPaymentService,
  PaymentStatus,
  STB_TEST_CARD,
} from './mock-payment.service';
import { CardDetailsDto } from './dto/card-details.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly paymentService: MockPaymentService,
  ) {}

  private async getCompany(companyId: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Профилот на компанијата не е пронајден.');
    }
    return company;
  }

  // Тековна претплата + каталог на планови (за приказ на фронтендот).
  // Го користиме ефективниот (реален, неистечен) план за да биде приказот
  // усогласен со проверката на пристап во PlanGuard - ако PRO истекол, но
  // cron-от сѐ уште не го симнал, корисникот веднаш се прикажува како FREE.
  async getBillingOverview(companyId: number) {
    const company = await this.getCompany(companyId);
    const effectivePlan = getEffectivePlan(
      company.plan,
      company.planExpiresAt,
    );
    return {
      currentPlan: effectivePlan,
      planStartedAt: company.planStartedAt ?? null,
      planExpiresAt: company.planExpiresAt ?? null,
      cardBrand: company.paymentCardBrand ?? null,
      cardLast4: company.paymentCardLast4 ?? null,
      plans: Object.values(PLAN_CATALOG),
    };
  }

  // Надградба на PRO.
  // 1) Ја токенизираме картичката преку банката (mock) - го чуваме токенот,
  //    не самиот PAN.
  // 2) Правиме иницијална наплата за првиот циклус.
  // 3) Само ако наплатата е успешна го активираме планот и поставуваме истек.
  // Ако не се пратат податоци од картичка, користиме тест-картичка (за демо).
  async upgradeToPro(companyId: number, card?: CardDetailsDto) {
    const company = await this.getCompany(companyId);
    const price = PLAN_CATALOG[SubscriptionPlan.PRO].priceDenars;

    // 1. Токенизација на картичката.
    const cardInput = card ?? STB_TEST_CARD;
    const tokenization = await this.paymentService.tokenize({
      pan: cardInput.pan,
      expiryMonth: cardInput.expiryMonth,
      expiryYear: cardInput.expiryYear,
      cvv: cardInput.cvv,
      cardHolder: cardInput.cardHolder,
    });

    // 2. Иницијална наплата за првиот циклус.
    const charge = await this.paymentService.chargeWithToken({
      token: tokenization.token,
      amount: price,
      description: `ПРО претплата - иницијална наплата (${PRO_CYCLE_DAYS} дена)`,
    });

    if (charge.status !== PaymentStatus.SUCCESS) {
      // 402 Payment Required - картичката е одбиена, планот НЕ се активира.
      throw new HttpException(
        `Наплатата е одбиена (${charge.declineReason ?? 'непозната причина'}). ` +
          'Ве молиме обидете се со друга картичка.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 3. Успешна наплата - активирај го планот и зачувај го токенот.
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + PRO_CYCLE_DAYS);

    company.plan = SubscriptionPlan.PRO;
    company.planStartedAt = now;
    company.planExpiresAt = expires;
    company.paymentToken = tokenization.token;
    company.paymentCardBrand = tokenization.cardBrand;
    company.paymentCardLast4 = tokenization.last4;

    await this.companyRepository.save(company);
    return this.getBillingOverview(companyId);
  }

  // Враќање на бесплатниот план - го бришеме и зачуваниот токен за наплата.
  async downgradeToFree(companyId: number) {
    const company = await this.getCompany(companyId);

    company.plan = SubscriptionPlan.FREE;
    company.planStartedAt = new Date();
    company.planExpiresAt = null;
    company.paymentToken = null;
    company.paymentCardBrand = null;
    company.paymentCardLast4 = null;

    await this.companyRepository.save(company);
    return this.getBillingOverview(companyId);
  }
}
