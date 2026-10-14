import { BookingStatus } from '@padel/shared';

/**
 * Máquina de estados de una reserva.
 * Los estados terminales no admiten transiciones.
 */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: [BookingStatus.CONFIRMED, BookingStatus.EXPIRED, BookingStatus.CANCELLED],
  CONFIRMED: [BookingStatus.COMPLETED, BookingStatus.NO_SHOW, BookingStatus.CANCELLED],
  EXPIRED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transición de reserva inválida: ${from} → ${to}`);
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return status === BookingStatus.PENDING_PAYMENT || status === BookingStatus.CONFIRMED;
}
