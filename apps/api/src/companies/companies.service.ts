import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async getCompanyDetails(companyId: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Профилот на компанијата не е пронајден.');
    }
    return company;
  }

  async updateCompanyDetails(companyId: number, dto: any): Promise<Company> {
    let company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      // 1. Креирање на нова фирма (ако не постои)
      company = this.companyRepository.create({
        id: companyId,
        name: dto.name,
        edb: dto.edb,
        address: dto.address,
        giroAccount: dto.giroAccount,
        bankName: dto.bankName,
        phone: dto.phone,
        email: dto.email,
        // Додаваме SMTP вредности при креирање
        smtpHost: dto.smtpHost || null,
        smtpPort: dto.smtpPort ? Number(dto.smtpPort) : 465,
        smtpUser: dto.smtpUser || null,
        smtpPass: dto.smtpPass || null, // Може да биде null ако првично не внесуваат ништо
      });
    } else {
      // 2. Ажурирање на постоечка фирма
      company.name = dto.name;
      company.edb = dto.edb;
      company.address = dto.address;
      company.giroAccount = dto.giroAccount;
      company.bankName = dto.bankName;
      company.phone = dto.phone;
      company.email = dto.email;

      // Новите SMTP генералии
      company.smtpHost = dto.smtpHost || null;
      company.smtpPort = dto.smtpPort ? Number(dto.smtpPort) : 465;
      company.smtpUser = dto.smtpUser || null;

      // БЕЗБЕДНОСНА ПРОВЕРКА ЗА ЛОЗИНКАТА:
      // Ја ажурираме во базата САМО ако корисникот реално внел нешто на фронтендот.
      // Ако dto.smtpPass е празна низа или undefined, старата лозинка си останува недопрена.
      if (dto.smtpPass !== undefined && dto.smtpPass !== '') {
        company.smtpPass = dto.smtpPass;
      }
    }

    return await this.companyRepository.save(company);
  }
}
