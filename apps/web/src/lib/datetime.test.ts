import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  clubDateTimeToIso,
  minutesFromTime,
  minutesToTime,
  parseDateOnly,
  rangesOverlap,
  todayIso,
  weekdayOfDate,
} from './datetime';

describe('clubDateTimeToIso', () => {
  it('convierte hora del club (UTC-3) a instante UTC', () => {
    expect(clubDateTimeToIso('2025-01-15', '19:00')).toBe('2025-01-15T22:00:00.000Z');
  });

  it('respeta el horario de verano/invierno de Argentina (sin DST)', () => {
    expect(clubDateTimeToIso('2025-07-15', '19:00')).toBe('2025-07-15T22:00:00.000Z');
  });
});

describe('addDaysIso', () => {
  it('avanza al día siguiente cruzando fin de mes', () => {
    expect(addDaysIso('2025-01-31', 1)).toBe('2025-02-01');
  });

  it('retrocede cruzando fin de mes', () => {
    expect(addDaysIso('2025-03-01', -1)).toBe('2025-02-28');
  });

  it('avanza un rango de 7 días para la vista semanal', () => {
    expect(addDaysIso('2025-01-15', 6)).toBe('2025-01-21');
  });
});

describe('weekdayOfDate', () => {
  it('devuelve 0 para domingo', () => {
    expect(weekdayOfDate('2025-01-19')).toBe(0);
  });

  it('devuelve 3 para miércoles', () => {
    expect(weekdayOfDate('2025-01-15')).toBe(3);
  });
});

describe('minutes helpers', () => {
  it('convierte horas a minutos desde medianoche', () => {
    expect(minutesFromTime('19:30')).toBe(1170);
    expect(minutesFromTime('00:00')).toBe(0);
  });

  it('convierte minutos de vuelta a formato HH:mm', () => {
    expect(minutesToTime(1170)).toBe('19:30');
    expect(minutesToTime(0)).toBe('00:00');
  });
});

describe('parseDateOnly', () => {
  it('ubica la fecha al mediodía UTC para evitar corrimientos', () => {
    expect(parseDateOnly('2025-01-15').toISOString()).toBe('2025-01-15T12:00:00.000Z');
  });
});

describe('rangesOverlap', () => {
  it('detecta solapamiento parcial', () => {
    expect(rangesOverlap('2025-01-15T10:00:00Z', '2025-01-15T11:00:00Z', '2025-01-15T10:30:00Z', '2025-01-15T11:30:00Z')).toBe(true);
  });

  it('no marca solapamiento entre rangos contiguos', () => {
    expect(rangesOverlap('2025-01-15T10:00:00Z', '2025-01-15T11:00:00Z', '2025-01-15T11:00:00Z', '2025-01-15T12:00:00Z')).toBe(false);
  });
});

describe('todayIso', () => {
  it('devuelve una fecha en formato yyyy-MM-dd', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
