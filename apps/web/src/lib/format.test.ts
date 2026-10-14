import { describe, expect, it } from 'vitest';
import { formatDuration, weekdayLabel } from './format';

describe('formatDuration', () => {
  it('muestra minutos cuando es menos de una hora', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('muestra horas exactas sin minutos', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(120)).toBe('2 h');
  });

  it('muestra horas y minutos combinados', () => {
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(150)).toBe('2 h 30 min');
  });
});

describe('weekdayLabel', () => {
  it('mapea el índice de día a su nombre en español', () => {
    expect(weekdayLabel(0)).toBe('Domingo');
    expect(weekdayLabel(1)).toBe('Lunes');
    expect(weekdayLabel(6)).toBe('Sábado');
  });

  it('devuelve cadena vacía para índices fuera de rango', () => {
    expect(weekdayLabel(9)).toBe('');
  });
});
