import { describe, expect, it } from 'vitest';
import { BookingStatus } from '@padel/shared';
import { assertTransition, canTransition, isActiveBookingStatus, isTerminal } from '@/domain/booking-status';

describe('domain/booking-status', () => {
  it('permite confirmar, vencer o cancelar una reserva pendiente', () => {
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.EXPIRED)).toBe(true);
    expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED)).toBe(true);
  });

  it('no permite confirmar una reserva ya cancelada', () => {
    expect(canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED)).toBe(false);
  });

  it('no permite transiciones a sí mismo', () => {
    expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CONFIRMED)).toBe(false);
  });

  it('identifica estados terminales', () => {
    expect(isTerminal(BookingStatus.COMPLETED)).toBe(true);
    expect(isTerminal(BookingStatus.CANCELLED)).toBe(true);
    expect(isTerminal(BookingStatus.CONFIRMED)).toBe(false);
  });

  it('assertTransition lanza en transiciones inválidas', () => {
    expect(() => assertTransition(BookingStatus.EXPIRED, BookingStatus.CONFIRMED)).toThrow();
  });

  it('considera activas sólo pendiente y confirmada', () => {
    expect(isActiveBookingStatus(BookingStatus.PENDING_PAYMENT)).toBe(true);
    expect(isActiveBookingStatus(BookingStatus.CONFIRMED)).toBe(true);
    expect(isActiveBookingStatus(BookingStatus.CANCELLED)).toBe(false);
  });
});
