import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { SubscriptionPlan } from '../enums/plan.enum';
import { REQUIRES_PLAN_KEY } from '../decorators/requires-plan.decorator';
import { getEffectivePlan, planSatisfies } from '../billing.catalog';
import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Кој план е потребен за оваа рута/контролер?
    const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(
      REQUIRES_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Ако нема @RequiresPlan, рутата не бара специфичен план.
    if (!requiredPlan) {
      return true;
    }

    // 2. Земи ја компанијата од токенот (го поставил JwtAuthGuard пред ова).
    const { user } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!user?.companyId) {
      throw new ForbiddenException(
        'Пристапот е одбиен. Недостасува компанија во токенот.',
      );
    }

    // 3. Провери го ефективниот (реален, неистечен) план на компанијата.
    const company = await this.companyRepository.findOne({
      where: { id: user.companyId },
      select: ['id', 'plan', 'planExpiresAt'],
    });

    if (!company) {
      throw new ForbiddenException('Профилот на компанијата не е пронајден.');
    }

    const effectivePlan = getEffectivePlan(
      company.plan,
      company.planExpiresAt,
    );

    if (!planSatisfies(effectivePlan, requiredPlan)) {
      throw new ForbiddenException(
        'Оваа функција е достапна само со ПРО претплата. Ве молиме надградете го вашиот план.',
      );
    }

    return true;
  }
}
