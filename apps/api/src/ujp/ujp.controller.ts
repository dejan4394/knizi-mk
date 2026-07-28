/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user.enum';
import { RequiresPlan } from '../billing/decorators/requires-plan.decorator';
import { PlanGuard } from '../billing/guards/plan.guard';
import { SubscriptionPlan } from '../billing/enums/plan.enum';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { UjpSubmissionService } from './services/ujp-submission.service';

@Controller('ujp')
export class UjpController {
  constructor(private readonly submissionService: UjpSubmissionService) {}

  /** Поднеси фактура до УЈП. Враќа веднаш (202) — обработката тече во позадина. */
  @Post('invoices/:id/submit')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  @RequiresPlan(SubscriptionPlan.PRO)
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const row = await this.submissionService.enqueue(id, req.user.companyId);
    return {
      status: row.status,
      message: 'Фактурата е ставена во ред за поднесување до УЈП.',
    };
  }

  /** Тековен фискален статус на фактурата (за приказ на фронтендот). */
  @Get('invoices/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE, UserRole.VIEWER)
  async status(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const row = await this.submissionService.getForInvoice(
      id,
      req.user.companyId,
    );
    if (!row) {
      return { status: 'DRAFT', invoiceId: id };
    }
    if (row.companyId !== req.user.companyId) {
      throw new ForbiddenException('Немате овластување за овој документ.');
    }
    return {
      status: row.status,
      euid: row.ujpDocumentId,
      qrLink: row.qrLink,
      ujpStatusCode: row.ujpStatusCode,
      rejectionReason: row.rejectionReason,
      lastError: row.lastError,
      submittedAt: row.submittedAt,
      confirmedAt: row.confirmedAt,
    };
  }

  /**
   * Автопополнување: официјални податоци за компанија по даночен број (ЕДБ/ЕМБС),
   * од регистарот на УЈП. Корисно при внесување клиент.
   */
  @Get('company-lookup/:taxNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.EMPLOYEE)
  async companyLookup(@Param('taxNumber') taxNumber: string) {
    return this.submissionService.lookupCompany(taxNumber);
  }
}
