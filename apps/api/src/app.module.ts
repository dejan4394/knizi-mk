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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres', // Твојот Postgres username
      password: 'ilinamalinova2018', // Твојата лозинка за локалната база
      database: 'knizi_db', // Името на базата што ќе ја креираш во Postgres
      entities: [__dirname + '/**/*.entity{.ts,.js}'], // Автоматски ќе ги чита сите ентитети
      synchronize: true, // Автоматски ги креира/менува табелите во базата (само за dev!)
    }),
    AuthModule,
    InvoicesModule,
    ClientsModule,
    CompaniesModule,
    UsersModule,
    PdfModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
