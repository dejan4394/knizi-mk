import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './entities/invoice.entity';

@Injectable()
export class InvoiceCronService {
  private readonly logger = new Logger(InvoiceCronService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Europe/Skopje',
  })
  // @Cron('0 59 11 * * *', {
  //   timeZone: 'Europe/Skopje',
  // })
  async handleOverdueInvoices() {
    this.logger.log('Проверка на фактури со поминат рок за плаќање...');

    const today = new Date();

    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        status: InvoiceStatus.UNPAID,
        dueDate: LessThan(today),
      },
    });

    if (overdueInvoices.length > 0) {
      overdueInvoices.forEach((invoice) => {
        invoice.status = InvoiceStatus.OVERDUE;
      });

      await this.invoiceRepository.save(overdueInvoices);
      this.logger.log(
        `Успешно ажурирани ${overdueInvoices.length} фактури во статус OVERDUE.`,
      );
    } else {
      this.logger.log('Нема пронајдено нови фактури што доцнат.');
    }
  }
}
