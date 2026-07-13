import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { InvoiceUjpStatus } from './entities/invoice-ujp-status.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Company } from '../companies/entities/company.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { PdfModule } from '../pdf/pdf.module';
import { KibsModule } from '../kibs/kibs.module';
import { AuthModule } from '../auth/auth.module';
import { PlanGuard } from '../billing/guards/plan.guard';
import { UjpController } from './ujp.controller';
import { InvoiceCalculatorService } from './services/invoice-calculator.service';
import { UjpInvoiceAdapterService } from './services/ujp-invoice-adapter.service';
import { UjpClientService } from './services/ujp-client.service';
import { UjpSubmissionService } from './services/ujp-submission.service';
import { UjpReconcilerCron } from './ujp-reconciler.cron';
import { KibsSigningProvider } from './signing/kibs-signing.provider';
import { SIGNING_PROVIDER } from './signing/signing-provider.interface';

@Module({
  imports: [
    // Company е потребен за PlanGuard; InvoiceUjpStatus + Invoice за сервисите.
    TypeOrmModule.forFeature([InvoiceUjpStatus, Invoice, Company]),
    HttpModule,
    InvoicesModule, // за InvoicesService.mapInvoiceToTemplateData
    PdfModule,
    KibsModule,
    AuthModule,
  ],
  controllers: [UjpController],
  providers: [
    InvoiceCalculatorService,
    UjpInvoiceAdapterService,
    UjpClientService,
    UjpSubmissionService,
    UjpReconcilerCron,
    PlanGuard,
    // Провајдер за потпис — смени `useClass` за друг издавач (пр. Nextsense).
    { provide: SIGNING_PROVIDER, useClass: KibsSigningProvider },
  ],
  exports: [UjpSubmissionService],
})
export class UjpModule {}
