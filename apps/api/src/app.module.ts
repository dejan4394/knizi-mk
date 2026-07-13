import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InvoicesModule } from './invoices/invoices.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { PdfModule } from './pdf/pdf.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BillingModule } from './billing/billing.module';
import { UjpModule } from './ujp/ujp.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AppDataSource } from './config/data-source'; // Го увезуваме новиот data-source

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Ги проследуваме опциите директно од AppDataSource
    TypeOrmModule.forRoot(AppDataSource.options),
    AuthModule,
    InvoicesModule,
    ClientsModule,
    CompaniesModule,
    UsersModule,
    PdfModule,
    DashboardModule,
    BillingModule,
    UjpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
