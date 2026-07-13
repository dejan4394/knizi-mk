import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { InvoiceUjpStatus } from '../ujp/entities/invoice-ujp-status.entity';
import { AuthModule } from '../auth/auth.module';
import { Client } from 'src/clients/entities/client.entity';
import { Company } from 'src/companies/entities/company.entity';
import { PdfModule } from 'src/pdf/pdf.module';
import { InvoiceCronService } from './invoice-cron.service';
import { KibsModule } from 'src/kibs/kibs.module';
import { PlanGuard } from 'src/billing/guards/plan.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      InvoiceUjpStatus,
      Client,
      Company,
    ]),
    PdfModule,
    KibsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceCronService, PlanGuard],
  exports: [InvoicesService],
})
export class InvoicesModule {}
