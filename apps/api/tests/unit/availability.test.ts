import { describe, expect, it } from 'vitest';
import { buildAvailability } from '@/domain/availability';

// 2026-03-10 es martes -> weekday 2
const DATE = '2026-03-10';
const WEEKDAY = 2;

function base(overrides: Partial<Parameters<typeof buildAvailability>[0]> = {}) {
  return buildAvailability({
    date: DATE,
    durationMinutes: 60,
    weekday: WEEKDAY,
    now: new Date('2026-03-01T00:00:00.000Z'),
    courts: [{ id: 'court-1', name: 'Cancha 1' }],
    schedules: [
      {
        courtId: null,
        weekday: WEEKDAY,
        opensAt: '08:00',
        closesAt: '10:00',
        slotMinutes: 60,
        isActive: true,
      },
    ],
    bookings: [],
    blocks: [],
    resolvePrice: () => ({ priceCents: 1_000_000, currency: 'ARS', ruleId: 'r' }),
    computeDeposit: (priceCents) => Math.round(priceCents * 0.3),
    ...overrides,
  });
}

describe('domain/availability', () => {
  it('genera una franja por slot dentro del horario', () => {
    const result = base();
    expect(result.slots).toHaveLength(2);
    expect(result.slots[0].startsAt).toBe('2026-03-10T11:00:00.000Z'); // 08:00 -03:00
    expect(result.slots[0].available).toBe(true);
    expect(result.slots[0].depositAmountCents).toBe(300_000);
  });

  it('marca como no disponible la franja ocupada por una reserva', () => {
    const result = base({
      bookings: [
        {
          courtId: 'court-1',
          startsAt: new Date('2026-03-10T12:00:00.000Z'),
          endsAt: new Date('2026-03-10T13:00:00.000Z'),
        },
      ],
    });
    const taken = result.slots.find((slot) => slot.startsAt === '2026-03-10T12:00:00.000Z');
    expect(taken?.available).toBe(false);
    expect(taken?.reason).toBe('taken');
  });

  it('un bloqueo global afecta a todas las canchas', () => {
    const result = base({
      blocks: [
        {
          courtId: null,
          startsAt: new Date('2026-03-10T11:00:00.000Z'),
          endsAt: new Date('2026-03-10T13:00:00.000Z'),
        },
      ],
    });
    expect(result.slots.every((slot) => !slot.available)).toBe(true);
  });

  it('marca como pasada una franja anterior al momento actual', () => {
    const result = base({ now: new Date('2026-03-10T11:30:00.000Z') });
    const past = result.slots.find((slot) => slot.startsAt === '2026-03-10T11:00:00.000Z');
    expect(past?.available).toBe(false);
    expect(past?.reason).toBe('past');
  });

  it('no genera franjas si no hay horario para ese día', () => {
    const result = base({
      schedules: [
        {
          courtId: null,
          weekday: 5,
          opensAt: '08:00',
          closesAt: '22:00',
          slotMinutes: 60,
          isActive: true,
        },
      ],
    });
    expect(result.slots).toHaveLength(0);
  });
});
