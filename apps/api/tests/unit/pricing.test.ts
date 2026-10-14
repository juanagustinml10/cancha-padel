import { describe, expect, it } from 'vitest';
import {
  computeDeposit,
  fallbackPriceCents,
  resolvePrice,
  resolvePricingRule,
  type PricingRuleInput,
} from '@/domain/pricing';

function rule(overrides: Partial<PricingRuleInput>): PricingRuleInput {
  return {
    id: 'rule-1',
    courtId: null,
    weekday: null,
    startTime: '08:00',
    endTime: '23:00',
    durationMinutes: 60,
    priceCents: 1_000_000,
    currency: 'ARS',
    isActive: true,
    priority: 0,
    ...overrides,
  };
}

describe('domain/pricing · resolvePricingRule', () => {
  it('elige la regla de mayor prioridad', () => {
    const rules = [
      rule({ id: 'low', priority: 1 }),
      rule({ id: 'high', priority: 5 }),
    ];
    const result = resolvePricingRule(rules, {
      courtId: 'court-1',
      weekday: 2,
      startTime: '18:00',
      durationMinutes: 60,
    });
    expect(result?.id).toBe('high');
  });

  it('a igual prioridad, prefiere la regla más específica', () => {
    const rules = [
      rule({ id: 'generic', priority: 0 }),
      rule({ id: 'court', courtId: 'court-1', priority: 0 }),
      rule({ id: 'court+day', courtId: 'court-1', weekday: 2, priority: 0 }),
    ];
    const result = resolvePricingRule(rules, {
      courtId: 'court-1',
      weekday: 2,
      startTime: '18:00',
      durationMinutes: 60,
    });
    expect(result?.id).toBe('court+day');
  });

  it('ignora reglas de otra duración, otro horario o inactivas', () => {
    const rules = [
      rule({ id: 'inactive', isActive: false }),
      rule({ id: 'wrong-duration', durationMinutes: 90 }),
      rule({ id: 'wrong-time', startTime: '20:00', endTime: '22:00' }),
    ];
    const result = resolvePricingRule(rules, {
      courtId: 'court-1',
      weekday: 2,
      startTime: '18:00',
      durationMinutes: 60,
    });
    expect(result).toBeUndefined();
  });
});

describe('domain/pricing · resolvePrice', () => {
  it('usa el precio de la regla cuando existe', () => {
    const rules = [rule({ id: 'r', priceCents: 1_200_000 })];
    expect(
      resolvePrice(rules, { courtId: 'c', weekday: 1, startTime: '19:00', durationMinutes: 60 }),
    ).toEqual({ priceCents: 1_200_000, currency: 'ARS', ruleId: 'r' });
  });

  it('cae al precio por defecto cuando no hay tarifa', () => {
    const result = resolvePrice([], {
      courtId: 'c',
      weekday: 1,
      startTime: '19:00',
      durationMinutes: 90,
    });
    expect(result.ruleId).toBe('fallback');
    expect(result.priceCents).toBe(fallbackPriceCents(90));
  });
});

describe('domain/pricing · computeDeposit', () => {
  it('calcula un porcentaje del total', () => {
    expect(
      computeDeposit(1_000_000, {
        depositMode: 'percent',
        depositPercent: 30,
        depositFixedAmountCents: 0,
      }),
    ).toBe(300_000);
  });

  it('usa un monto fijo sin superar el total', () => {
    expect(
      computeDeposit(400_000, {
        depositMode: 'fixed_amount',
        depositPercent: 0,
        depositFixedAmountCents: 500_000,
      }),
    ).toBe(400_000);
  });
});
