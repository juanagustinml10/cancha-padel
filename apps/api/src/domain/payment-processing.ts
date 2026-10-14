import { BookingStatus, PaymentStatus } from '@padel/shared';
import { canApplyPaymentStatus, isApprovedStatus, mapProviderPaymentStatus } from './payment-status';

/**
 * Lógica pura de decisión para procesar una notificación de pago.
 *
 * No accede a red ni a base de datos: recibe el estado observado y devuelve qué hacer.
 * Esto permite probar exhaustivamente (aprobado/pendiente/rechazado, fuera de orden,
 * importes incorrectos, pagos tardíos) sin depender de Mercado Pago ni de PostgreSQL.
 */

export type PaymentAction =
  // Estado repetido o retroceso (fuera de orden): no se toca nada.
  | 'IGNORE'
  // Se registra/actualiza el pago, pero la reserva no cambia.
  | 'RECORD_ONLY'
  // Pago válido: la reserva se confirma.
  | 'CONFIRM_BOOKING'
  // Se registra el pago pero requiere intervención manual (no confirma).
  | 'FLAG_REVIEW';

export interface PaymentContext {
  bookingStatus: BookingStatus;
  bookingPaidAmountCents: number;
  bookingPriceTotalCents: number;
  /** Seña exigida por la reserva (snapshot, en centavos). */
  expectedDepositCents: number;
  /** Moneda esperada de la reserva (p. ej. ARS). */
  expectedCurrency: string;
  /** Estado actual del pago para este mismo intento del proveedor (null si es nuevo). */
  currentPaymentStatus: PaymentStatus | null;
}

export interface ProviderPaymentInfo {
  /** Estado crudo del proveedor (aprobado, pendiente, ...). */
  providerStatus: string;
  amountCents: number;
  currency: string;
}

export interface PaymentDecision {
  /** Estado interno al que mapea el estado del proveedor. */
  mappedStatus: PaymentStatus;
  /** Si el estado debe persistirse (false ante duplicado o retroceso). */
  applyStatus: boolean;
  /** Acción a ejecutar sobre la reserva. */
  action: PaymentAction;
  /** Si el pago requiere revisión manual. */
  requiresReview: boolean;
  /** Mensaje legible para la cola de revisión (null si no aplica). */
  reviewReason: string | null;
  /** Código máquina del motivo (para tests/logs). */
  reason: string;
}

const APPROVED_BLOCKED_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.EXPIRED,
  BookingStatus.CANCELLED,
];

/**
 * Decide el resultado de una notificación. Reglas:
 *
 * 1. Si el estado nuevo no puede aplicarse (duplicado o retroceso) → `IGNORE`.
 * 2. Un pago aprobado con moneda distinta o importe menor a la seña → `FLAG_REVIEW`.
 * 3. Un pago aprobado sobre una reserva vigente (`PENDING_PAYMENT`) → `CONFIRM_BOOKING`.
 * 4. Un pago aprobado sobre una reserva vencida/cancelada → `FLAG_REVIEW` (pago tardío):
 *    **nunca** se reasigna una cancha ocupada automáticamente.
 * 5. Cualquier otro estado (pendiente, en proceso, rechazado, cancelado) → `RECORD_ONLY`.
 */
export function resolvePaymentDecision(
  context: PaymentContext,
  info: ProviderPaymentInfo,
): PaymentDecision {
  const mappedStatus = mapProviderPaymentStatus(info.providerStatus);

  if (!canApplyPaymentStatus(context.currentPaymentStatus, mappedStatus)) {
    return {
      mappedStatus,
      applyStatus: false,
      action: 'IGNORE',
      requiresReview: false,
      reviewReason: null,
      reason: 'out_of_order_or_duplicate',
    };
  }

  if (!isApprovedStatus(mappedStatus)) {
    return {
      mappedStatus,
      applyStatus: true,
      action: 'RECORD_ONLY',
      requiresReview: false,
      reviewReason: null,
      reason: `status_${info.providerStatus}`,
    };
  }

  // A partir de aquí: pago aprobado.
  if (info.currency !== context.expectedCurrency) {
    return {
      mappedStatus,
      applyStatus: true,
      action: 'FLAG_REVIEW',
      requiresReview: true,
      reviewReason: `El pago llegó en ${info.currency}, pero la reserva es en ${context.expectedCurrency}.`,
      reason: 'currency_mismatch',
    };
  }

  if (info.amountCents < context.expectedDepositCents) {
    return {
      mappedStatus,
      applyStatus: true,
      action: 'FLAG_REVIEW',
      requiresReview: true,
      reviewReason: `El importe pagado (${info.amountCents}) es menor a la seña requerida (${context.expectedDepositCents}).`,
      reason: 'amount_mismatch',
    };
  }

  if (APPROVED_BLOCKED_BOOKING_STATUSES.includes(context.bookingStatus)) {
    return {
      mappedStatus,
      applyStatus: true,
      action: 'FLAG_REVIEW',
      requiresReview: true,
      reviewReason: `Pago recibido para una reserva en estado ${context.bookingStatus} (pago tardío). Requiere revisión manual; no se confirma ni se reasigna automáticamente.`,
      reason: 'late_payment',
    };
  }

  if (context.bookingStatus === BookingStatus.PENDING_PAYMENT) {
    return {
      mappedStatus,
      applyStatus: true,
      action: 'CONFIRM_BOOKING',
      requiresReview: false,
      reviewReason: null,
      reason: 'approved',
    };
  }

  // Reserva ya confirmada (u otro estado no bloqueante): se registra el pago sin revisión.
  return {
    mappedStatus,
    applyStatus: true,
    action: 'RECORD_ONLY',
    requiresReview: false,
    reviewReason: null,
    reason: 'approved_already_confirmed',
  };
}
