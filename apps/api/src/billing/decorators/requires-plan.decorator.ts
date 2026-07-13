import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '../enums/plan.enum';

export const REQUIRES_PLAN_KEY = 'requiresPlan';

// Означува дека рутата/контролерот бара најмалку одреден план (пр. PRO).
export const RequiresPlan = (plan: SubscriptionPlan) =>
  SetMetadata(REQUIRES_PLAN_KEY, plan);
