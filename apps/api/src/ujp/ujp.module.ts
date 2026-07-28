import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { InvoiceUjpStatus } from './entities/invoice-ujp-status.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Company } from '../companies/entities/company.entity';
import { AuthModule } from '../auth/auth.module';
import { PlanGuard } from '../billing/guards/plan.guard';
import { UjpController } from './ujp.controller';
import { UjpInvoiceAdapterService } from './services/ujp-invoice-adapter.service';
import { UjpClientService } from './services/ujp-client.service';
import { UjpSubmissionService } from './services/ujp-submission.service';
import { UjpReconcilerCron } from './ujp-reconciler.cron';
import { KibsJwsSigningProvider } from './signing/kibs-jws-signing.provider';
import { SIGNING_PROVIDER } from './signing/signing-provider.interface';

@Module({
  imports: [
    // Company е потребен за PlanGuard; InvoiceUjpStatus + Invoice за сервисите.
    TypeOrmModule.forFeature([InvoiceUjpStatus, Invoice, Company]),
    HttpModule,
    AuthModule,
  ],
  controllers: [UjpController],
  providers: [
    UjpInvoiceAdapterService,
    UjpClientService,
    UjpSubmissionService,
    UjpReconcilerCron,
    PlanGuard,
    // Провајдер за JWS потпис — далечинско HSM потпишување преку KIBS.
    { provide: SIGNING_PROVIDER, useClass: KibsJwsSigningProvider },
  ],
  exports: [UjpSubmissionService],
})
export class UjpModule {}
