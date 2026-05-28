import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Откоментирај ја и прилагоди ја патеката до твојот Guard

@Controller('companies')
@UseGuards(JwtAuthGuard) // Осигурува дека само најавени корисници имаат пристап
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // 1. Земи ги податоците за фирмата на моментално најавениот корисник
  @Get('my-company')
  async getMyCompany(@Request() req: any) {
    // Привремено користиме 1 ако сè уште немаш целосен Auth сетап во req.user
    const companyId = req.user?.companyId || 1;
    return await this.companiesService.getCompanyDetails(companyId);
  }

  // 2. Ажурирај ги или внеси ги податоците за фирмата
  @Put('my-company')
  async updateMyCompany(@Request() req: any, @Body() dto: any) {
    const companyId = req.user?.companyId || 1;
    return await this.companiesService.updateCompanyDetails(companyId, dto);
  }
}
