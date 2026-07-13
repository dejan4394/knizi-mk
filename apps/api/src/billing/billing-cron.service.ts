import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { SubscriptionPlan } from './enums/plan.enum';
import { PLAN_CATALOG, PRO_CYCLE_DAYS } from './billing.catalog';
import { MockPaymentService, PaymentStatus } from './mock-payment.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly paymentService: MockPaymentService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Europe/Skopje',
  })
  async handleExpiredProPlans() {
    this.logger.log('Проверка на ПРО претплати за автоматска наплата...');

    const now = new Date();

    // ПРО компании чиј циклус истекол - треба да се обидеме да ги наплатиме.
    // `paymentToken` е `select: false`, па го бараме експлицитно.
    const expiredCompanies = await this.companyRepository.find({
      where: {
        plan: SubscriptionPlan.PRO,
        planExpiresAt: LessThan(now),
      },
      select: [
        'id',
        'name',
        'plan',
        'planStartedAt',
        'planExpiresAt',
        'paymentToken',
        'paymentCardLast4',
      ],
    });

    if (expiredCompanies.length === 0) {
      this.logger.log('Нема ПРО претплати за наплата.');
      return;
    }

    const price = PLAN_CATALOG[SubscriptionPlan.PRO].priceDenars;
    let renewed = 0;
    let downgraded = 0;

    for (const company of expiredCompanies) {
      // Без зачуван токен не можеме да наплатиме - враќаме на FREE.
      if (!company.paymentToken) {
        await this.downgrade(company.id);
        downgraded++;
        this.logger.warn(
          `Компанија #${company.id} (${company.name}) нема зачувана картичка → FREE.`,
        );
        continue;
      }

      // Автоматска наплата преку зачуваниот токен.
      const charge = await this.paymentService.chargeWithToken({
        token: company.paymentToken,
        amount: price,
        description: `ПРО претплата - обновување (${PRO_CYCLE_DAYS} дена)`,
      });

      if (charge.status === PaymentStatus.SUCCESS) {
        // Успешна наплата → продолжи го циклусот за уште еден период.
        const newExpiry = new Date(now);
        newExpiry.setDate(newExpiry.getDate() + PRO_CYCLE_DAYS);
        await this.companyRepository.update(company.id, {
          planStartedAt: now,
          planExpiresAt: newExpiry,
        });
        renewed++;
        this.logger.log(
          `Обновена ПРО претплата за #${company.id} (${company.name}) - ` +
            `${price} MKD, трансакција ${charge.transactionId}.`,
        );
      } else {
        // Одбиена наплата → симни на FREE (и исчисти го токенот).
        await this.downgrade(company.id);
        downgraded++;
        this.logger.warn(
          `Одбиена наплата за #${company.id} (${company.name}) - ` +
            `${charge.declineReason} → FREE.`,
        );
      }
    }

    this.logger.log(
      `Наплата завршена: ${renewed} обновени, ${downgraded} вратени на FREE.`,
    );
  }

  // Симнување на компанија на FREE и бришење на податоците за картичка.
  private async downgrade(companyId: number): Promise<void> {
    await this.companyRepository.update(companyId, {
      plan: SubscriptionPlan.FREE,
      planStartedAt: new Date(),
      planExpiresAt: null,
      paymentToken: null,
      paymentCardBrand: null,
      paymentCardLast4: null,
    });
  }
}
