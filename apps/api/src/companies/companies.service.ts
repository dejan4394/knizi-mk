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
      company = this.companyRepository.create({
        id: companyId,
        name: dto.name,
        edb: dto.edb,
        address: dto.address,
        giroAccount: dto.giroAccount,
        bankName: dto.bankName,
        phone: dto.phone, // Зачувај телефон
        email: dto.email, // Зачувај е-пошта
      });
    } else {
      company.name = dto.name;
      company.edb = dto.edb;
      company.address = dto.address;
      company.giroAccount = dto.giroAccount;
      company.bankName = dto.bankName;
      company.phone = dto.phone; // Ажурирај телефон
      company.email = dto.email; // Ажурирај е-пошта
    }

    return await this.companyRepository.save(company);
  }
}
