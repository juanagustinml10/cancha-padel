import { describe, expect, it } from 'vitest';
import {
  computeDeposit,
  fallbackPriceCents,
  resolvePrice,
  resolvePricingRule,
  type PricingRuleInput,
} from '@/domain/pricing';
import { clubLocalToUtc } from '@/domain/time';

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

const BASE_QUERY = {
  courtId: 'court-1',
  weekday: 2,
  startTime: '18:00',
  durationMinutes: 60,
};

describe('domain/pricing · resolvePricingRule', () => {
  it('elige la regla de mayor prioridad', () => {
    const rules = [
      rule({ id: 'low', priority: 1 }),
      rule({ id: 'high', priority: 5 }),
    ];
    const result = resolvePricingRule(rules, BASE_QUERY);
    expect(result?.id).toBe('high');
  });

  it('a igual prioridad, prefiere la regla más específica', () => {
    const rules = [
      rule({ id: 'generic', priority: 0 }),
      rule({ id: 'court', courtId: 'court-1', priority: 0 }),
      rule({ id: 'court+day', courtId: 'court-1', weekday: 2, priority: 0 }),
    ];
    const result = resolvePricingRule(rules, BASE_QUERY);
    expect(result?.id).toBe('court+day');
  });

  it('ignora reglas inactivas y las cuyo horario no cubre el turno', () => {
    const rules = [
      rule({ id: 'inactive', isActive: false }),
      rule({ id: 'wrong-time', startTime: '20:00', endTime: '22:00' }),
    ];
    const result = resolvePricingRule(rules, BASE_QUERY);
    expect(result).toBeUndefined();
  });

  it('no filtra por duración de la regla: la tarifa es horaria y se prorratea (spec actual)', () => {
    // La regla 90 min/08:00-23:00 cubre las 18:00: el precio se calcula prorrateando
    // una tarifa HORARIA sobre la duración real de la reserva (design 2026-01).
    const rules = [rule({ id: 'wrong-duration', durationMinutes: 90 })];
    const result = resolvePricingRule(rules, BASE_QUERY);
    expect(result?.id).toBe('wrong-duration');

    // 30 min sobre una tarifa horaria de 1.000.000 -> 500.000
    const price = resolvePrice(rules, { ...BASE_QUERY, durationMinutes: 30 });
    expect(price.priceCents).toBe(500_000);
    expect(price.ruleId).toBe('wrong-duration');
  });

  describe('vigencia (validFrom inclusivo, validTo exclusivo)', () => {
    // Fechas en la zona del club: los instantes se construyen con clubLocalToUtc
    // (mismo helper del servicio) para validar que la comparación es TZ-safe.
    const DAY = '2026-03-15'; // sábado -> weekday 6 (no afecta: weekday null)
    const validFrom = clubLocalToUtc(DAY, '00:00');
    const validTo = clubLocalToUtc('2026-03-16', '00:00'); // cierre del día 15

    it('aplica reglas sin vigencia definida', () => {
      const rules = [rule({})];
      expect(resolvePricingRule(rules, { ...BASE_QUERY, at: new Date('2020-01-01T00:00:00.000Z') })?.id).toBe('rule-1');
    });

    it('no aplica si el turno es anterior a validFrom', () => {
      const rules = [rule({ id: 'future', validFrom, validTo })];
      const result = resolvePricingRule(rules, { ...BASE_QUERY, at: clubLocalToUtc('2026-03-14', '18:00') });
      expect(result).toBeUndefined();
    });

    it('aplica en el instante exacto de validFrom (inclusive)', () => {
      const rules = [rule({ id: 'valid-from-now', validFrom })];
      const result = resolvePricingRule(rules, { ...BASE_QUERY, at: validFrom });
      expect(result?.id).toBe('valid-from-now');
    });

    it('aplica durante el día de fin completo y deja de aplicar en validTo', () => {
      const rules = [rule({ id: 'ends-today', validFrom, validTo })];
      // 22:00 del día de fin: dentro de la vigencia (día incluido de punta a punta).
      expect(resolvePricingRule(rules, { ...BASE_QUERY, at: clubLocalToUtc('2026-03-15', '22:00') })?.id).toBe('ends-today');
      // La madrugada siguiente ya está fuera.
      expect(resolvePricingRule(rules, { ...BASE_QUERY, at: clubLocalToUtc('2026-03-16', '09:00') })).toBeUndefined();
    });

    it('respeta vigencia sólo con un extremo definido', () => {
      const onlyFrom = [rule({ id: 'only-from', validFrom })];
      expect(resolvePricingRule(onlyFrom, { ...BASE_QUERY, at: clubLocalToUtc('2030-01-01', '10:00') })?.id).toBe('only-from');

      const onlyTo = [rule({ id: 'only-to', validTo })];
      expect(resolvePricingRule(onlyTo, { ...BASE_QUERY, at: clubLocalToUtc('2020-01-01', '10:00') })?.id).toBe('only-to');
    });

    it('entre dos reglas vigentes gana prioridad/especificidad; la vencida no compite', () => {
      const rules = [
        // Vigente sólo hasta el 15/03, pero prioridad alta.
        rule({ id: 'old-expensive', priceCents: 2_000_000, priority: 9, validFrom: clubLocalToUtc('2026-01-01', '00:00'), validTo: clubLocalToUtc('2026-03-16', '00:00') }),
        // Nueva desde el 15/03, prioridad baja.
        rule({ id: 'new-cheap', priceCents: 1_000_000, priority: 1, validFrom: clubLocalToUtc('2026-03-15', '00:00') }),
      ];

      const before = resolvePricingRule(rules, { ...BASE_QUERY, at: clubLocalToUtc('2026-03-14', '18:00') });
      expect(before?.id).toBe('old-expensive');

      const after = resolvePricingRule(rules, { ...BASE_QUERY, at: clubLocalToUtc('2026-03-16', '12:00') });
      expect(after?.id).toBe('new-cheap');
    });
  });
});

describe('domain/pricing · resolvePrice', () => {
  it('usa el precio de la regla cuando existe', () => {
    const rules = [rule({ id: 'r', priceCents: 1_200_000 })];
    expect(
      resolvePrice(rules, {
        courtId: 'c',
        weekday: 1,
        startTime: '19:00',
        durationMinutes: 60,
        at: new Date('2026-06-01T12:00:00.000Z'),
      }),
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

  it('cae al precio por defecto cuando la única regla está vencida', () => {
    const rules = [rule({ id: 'expired', priceCents: 1_200_000, validTo: clubLocalToUtc('2026-01-01', '00:00') })];
    const result = resolvePrice(rules, {
      courtId: 'c',
      weekday: 1,
      startTime: '19:00',
      durationMinutes: 60,
      at: new Date('2026-06-01T12:00:00.000Z'),
    });
    expect(result.ruleId).toBe('fallback');
    expect(result.priceCents).toBe(fallbackPriceCents(60));
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
