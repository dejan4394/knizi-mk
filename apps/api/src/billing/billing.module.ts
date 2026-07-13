import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingCronService } from './billing-cron.service';
import { MockPaymentService } from './mock-payment.service';
import { Company } from '../companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [BillingController],
  providers: [BillingService, BillingCronService, MockPaymentService],
  exports: [BillingService],
})
export class BillingModule {}
