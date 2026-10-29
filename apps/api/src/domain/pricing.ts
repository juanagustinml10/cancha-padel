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
  /**
   * Vigencia (opcional). Instantes en UTC:
   *  - `validFrom` inclusive (la regla rige desde ese instante).
   *  - `validTo` exclusivo (la regla deja de regir al llegar a ese instante).
   * Si no están definidos o son null, la regla no tiene límite por ese extremo.
   * La conversión de fechas simple ("yyyy-MM-dd") a instante en la zona del club
   * la hace el servicio de pricing, no este dominio.
   */
  validFrom?: Date | null;
  validTo?: Date | null;
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
  /** Instante a valorar (inicio del turno/reserva). Omitido = ahora. */
  at?: Date;
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

/** La regla rige para `at` si no define vigencia o si `at` cae dentro de [validFrom, validTo). */
function isWithinValidity(rule: PricingRuleInput, at: Date): boolean {
  const from = rule.validFrom ?? null;
  const to = rule.validTo ?? null;
  if (from !== null && at.getTime() < from.getTime()) return false;
  if (to !== null && at.getTime() >= to.getTime()) return false;
  return true;
}

/**
 * Elige la tarifa aplicable: prioridad descendente y, a igual prioridad, la más específica.
 * Ya no requiere duración exacta: `priceCents` de la regla es una tarifa HORARIA sobre la
 * base de la duración real (reservada de la reserva), y
 * a la vigencia [validFrom, validTo) definida en cada regla (sin vigencia = siempre vigente).
 */
export function resolvePricingRule(
  rules: PricingRuleInput[],
  query: PricingQuery,
): PricingRuleInput | undefined {
  const at = query.at ?? new Date();
  const startMinutes = minutesFromTime(query.startTime);
  const candidates = rules.filter(
    (rule) =>
      rule.isActive &&
      isWithinValidity(rule, at) &&
      (rule.courtId === null || rule.courtId === query.courtId) &&
      (rule.weekday === null || rule.weekday === query.weekday) &&
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

/** Calcula el precio prorrateado para una duración dada, usando la tarifa horaria de la regla. */
export function computedPriceCents(priceCentsPerHour: number, durationMinutes: number): number {
  return Math.round((priceCentsPerHour * durationMinutes) / 60);
}

export function resolvePrice(
  rules: PricingRuleInput[],
  query: PricingQuery,
  currency = 'ARS',
): ResolvedPrice {
  const rule = resolvePricingRule(rules, query);
  if (rule) {
    const priceCents = computedPriceCents(rule.priceCents, query.durationMinutes);
    return { priceCents, currency: rule.currency, ruleId: rule.id };
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
