import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  clubDateKey,
  clubLocalToUtc,
  clubTimeKey,
  clubWeekdayOfDate,
  minutesFromTime,
  minutesToTime,
  rangesOverlap,
} from '@/domain/time';

const TZ = 'America/Argentina/Buenos_Aires';

describe('domain/time', () => {
  it('convierte "HH:mm" a minutos y viceversa', () => {
    expect(minutesFromTime('00:00')).toBe(0);
    expect(minutesFromTime('08:30')).toBe(510);
    expect(minutesFromTime('23:59')).toBe(1439);
    expect(minutesToTime(510)).toBe('08:30');
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('rechaza horas con formato inválido', () => {
    expect(() => minutesFromTime('24:00')).toThrow();
    expect(() => minutesFromTime('8:5')).toThrow();
  });

  it('interpreta una hora local del club como UTC (UTC-3)', () => {
    const date = clubLocalToUtc('2026-03-10', '18:00', TZ);
    expect(date.toISOString()).toBe('2026-03-10T21:00:00.000Z');
  });

  it('calcula el día de la semana de una fecha local (0=domingo)', () => {
    expect(clubWeekdayOfDate('2026-03-10')).toBe(2); // martes
    expect(clubWeekdayOfDate('2026-03-15')).toBe(0); // domingo
  });

  it('obtiene la fecha y hora locales del club de un instante UTC', () => {
    const instant = new Date('2026-03-10T21:00:00.000Z');
    expect(clubDateKey(instant, TZ)).toBe('2026-03-10');
    expect(clubTimeKey(instant, TZ)).toBe('18:00');
  });

  it('suma minutos a un instante', () => {
    const base = new Date('2026-03-10T18:00:00.000Z');
    expect(addMinutes(base, 90).toISOString()).toBe('2026-03-10T19:30:00.000Z');
  });

  it('detecta solapamiento de rangos semiabiertos [start, end)', () => {
    const a = new Date('2026-03-10T18:00:00.000Z');
    const b = new Date('2026-03-10T19:00:00.000Z');
    const c = new Date('2026-03-10T19:00:00.000Z');
    expect(rangesOverlap(a, b, a, b)).toBe(true);
    expect(rangesOverlap(a, b, b, new Date('2026-03-10T20:00:00.000Z'))).toBe(false);
    expect(rangesOverlap(a, c, b, new Date('2026-03-10T20:00:00.000Z'))).toBe(false);
  });
});
