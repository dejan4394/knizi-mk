import { SubscriptionPlan } from './enums/plan.enum';

// Каталог на планови. За сега сите функции се достапни и на бесплатниот план;
// во иднина ова место ќе го користиме за фино дефинирање на ограничувањата по план.
export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  // Месечна цена во денари (0 за бесплатен план).
  priceDenars: number;
  features: string[];
}

export const PLAN_CATALOG: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Бесплатен',
    priceDenars: 0,
    features: [
      'Неограничени фактури и профактури',
      'Управување со клиенти',
      'PDF генерирање и испраќање по е-пошта',
      'Основна поддршка',
    ],
  },
  [SubscriptionPlan.PRO]: {
    id: SubscriptionPlan.PRO,
    name: 'Про',
    priceDenars: 500,
    features: [
      'Сѐ од бесплатниот план',
      'Дигитално потпишување и УЈП интеграција',
      'Приоритетна поддршка',
      'Напредни извештаи (наскоро)',
    ],
  },
};

// Колку време трае еден платен циклус (во денови).
export const PRO_CYCLE_DAYS = 30;

// Рангирање на планови - повисок број значи повеќе привилегии.
// Се користи за споредба „дали тековниот план е доволен за бараниот".
const PLAN_RANK: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.PRO]: 1,
};

// Ефективен (реален) план на компанијата во даден момент. Ако PRO истекол,
// компанијата фактички е на FREE иако полето `plan` сѐ уште е PRO
// (додека cron-от не го симне). Ова е единствениот извор на вистина за
// проверка на пристап.
export function getEffectivePlan(
  plan: SubscriptionPlan,
  planExpiresAt?: Date | null,
  now: Date = new Date(),
): SubscriptionPlan {
  if (plan === SubscriptionPlan.PRO) {
    // null истек = без истек; во спротивно мора да е во иднина.
    if (!planExpiresAt || planExpiresAt.getTime() > now.getTime()) {
      return SubscriptionPlan.PRO;
    }
    return SubscriptionPlan.FREE;
  }
  return plan;
}

// Дали `currentPlan` е доволен за да се пристапи до функција што бара
// `requiredPlan`.
export function planSatisfies(
  currentPlan: SubscriptionPlan,
  requiredPlan: SubscriptionPlan,
): boolean {
  return PLAN_RANK[currentPlan] >= PLAN_RANK[requiredPlan];
}
