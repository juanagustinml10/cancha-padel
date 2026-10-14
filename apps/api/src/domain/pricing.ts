import { minutesFromTime } from './time';

/**
 * Reglas de precio y seña — lógica pura y testeable.
 * El backend SIEMPRE recalcula el precio; nunca confía en montos enviados por el cliente.
 */

export interface PricingRuleInput {
  id: string;
  courtId: string | null;
  weekday: number | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  priority: number;
}

export interface DepositSettings {
  depositMode: 'percent' | 'fixed_amount';
  depositPercent: number;
  depositFixedAmountCents: number;
}

export interface PricingQuery {
  courtId: string;
  weekday: number;
  startTime: string;
  durationMinutes: number;
}

export interface ResolvedPrice {
  priceCents: number;
  currency: string;
  ruleId: string;
}

const DEFAULT_HOURLY_CENTS = 1_000_000;

/** Cuánta "especificidad" aporta una regla (cancha y día concretos ganan a los genéricos). */
function specificity(rule: PricingRuleInput): number {
  return (rule.courtId ? 1 : 0) + (rule.weekday !== null ? 1 : 0);
}

/**
 * Elige la tarifa aplicable: prioridad descendente y, a igual prioridad, la más específica.
 */
export function resolvePricingRule(
  rules: PricingRuleInput[],
  query: PricingQuery,
): PricingRuleInput | undefined {
  const startMinutes = minutesFromTime(query.startTime);
  const candidates = rules.filter(
    (rule) =>
      rule.isActive &&
      (rule.courtId === null || rule.courtId === query.courtId) &&
      (rule.weekday === null || rule.weekday === query.weekday) &&
      rule.durationMinutes === query.durationMinutes &&
      startMinutes >= minutesFromTime(rule.startTime) &&
      startMinutes < minutesFromTime(rule.endTime),
  );

  return candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return specificity(b) - specificity(a);
  })[0];
}

/** Precio de respaldo cuando no hay tarifa configurada: base horaria prorrateada. */
export function fallbackPriceCents(durationMinutes: number): number {
  return Math.round((DEFAULT_HOURLY_CENTS * durationMinutes) / 60 / 100) * 100;
}

export function resolvePrice(
  rules: PricingRuleInput[],
  query: PricingQuery,
  currency = 'ARS',
): ResolvedPrice {
  const rule = resolvePricingRule(rules, query);
  if (rule) {
    return { priceCents: rule.priceCents, currency: rule.currency, ruleId: rule.id };
  }
  return { priceCents: fallbackPriceCents(query.durationMinutes), currency, ruleId: 'fallback' };
}

/** Calcula la seña según la configuración vigente (nunca supera el total). */
export function computeDeposit(priceCents: number, settings: DepositSettings): number {
  if (settings.depositMode === 'fixed_amount') {
    return Math.max(0, Math.min(settings.depositFixedAmountCents, priceCents));
  }
  const percent = Math.min(100, Math.max(0, settings.depositPercent));
  return Math.round((priceCents * percent) / 100);
}
