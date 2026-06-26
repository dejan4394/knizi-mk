import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { AuthModule } from '../auth/auth.module';
import { Client } from 'src/clients/entities/client.entity';
import { PdfModule } from 'src/pdf/pdf.module';
import { InvoiceCronService } from './invoice-cron.service';
import { KibsModule } from 'src/kibs/kibs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, InvoiceItem, AuthModule, Client]),
    PdfModule,
    KibsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceCronService],
})
export class InvoicesModule {}
