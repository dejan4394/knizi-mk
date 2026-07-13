/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
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
import { UjpAckKind } from './dto/ujp-payload.types';

/**
 * НЕМА class-level guard намерно: `callback` е владин webhook без JWT.
 * Автентицираните рути имаат guards поединечно.
 */
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
      // Нема поднесување уште — врати DRAFT-еквивалент.
      return { status: 'DRAFT', invoiceId: id };
    }
    if (row.companyId !== req.user.companyId) {
      throw new ForbiddenException('Немате овластување за овој документ.');
    }
    return {
      status: row.status,
      ujpDocumentId: row.ujpDocumentId,
      rejectionReason: row.rejectionReason,
      lastError: row.lastError,
      submittedAt: row.submittedAt,
      confirmedAt: row.confirmedAt,
    };
  }

  /**
   * Webhook од УЈП за асинхрони потврди/одбивања.
   * Заштитен со споделена тајна (`UJP_CALLBACK_SECRET`), не со JWT.
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Headers('x-ujp-signature') signature: string,
    @Body() body: any,
  ) {
    const secret = process.env.UJP_CALLBACK_SECRET;
    if (!secret || signature !== secret) {
      throw new UnauthorizedException('Невалиден потпис на УЈП callback.');
    }
    const kind = this.mapCallbackStatus(body?.status);
    await this.submissionService.applyCallback(
      body?.reference,
      kind,
      body?.documentId,
      body?.rejectionReason,
    );
    return { received: true };
  }

  private mapCallbackStatus(status: unknown): UjpAckKind {
    if (status === 'APPROVED') return UjpAckKind.APPROVED;
    if (status === 'REJECTED') return UjpAckKind.REJECTED;
    return UjpAckKind.ACCEPTED;
  }
}
