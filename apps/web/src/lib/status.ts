import type { BadgeVariant } from '@/components/ui/Badge';
import {
  BookingPaymentMethod,
  BookingStatus,
  PaymentStatus,
  BOOKING_PAYMENT_METHOD_LABELS,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@padel/shared';

const BOOKING_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  [BookingStatus.PENDING_PAYMENT]: 'warning',
  [BookingStatus.CONFIRMED]: 'success',
  [BookingStatus.EXPIRED]: 'neutral',
  [BookingStatus.CANCELLED]: 'danger',
  [BookingStatus.COMPLETED]: 'info',
  [BookingStatus.NO_SHOW]: 'danger',
};

const PAYMENT_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  [PaymentStatus.PENDING]: 'warning',
  [PaymentStatus.IN_PROCESS]: 'info',
  [PaymentStatus.APPROVED]: 'success',
  [PaymentStatus.REJECTED]: 'danger',
  [PaymentStatus.CANCELLED]: 'neutral',
  [PaymentStatus.REFUNDED]: 'info',
};

export function bookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_LABELS[status] ?? status;
}

export function bookingStatusVariant(status: BookingStatus): BadgeVariant {
  return BOOKING_VARIANTS[status] ?? 'neutral';
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function paymentStatusVariant(status: PaymentStatus): BadgeVariant {
  return PAYMENT_VARIANTS[status] ?? 'neutral';
}

export function paymentMethodLabel(method: BookingPaymentMethod | null | undefined): string {
  if (!method) return 'Sin definir';
  return BOOKING_PAYMENT_METHOD_LABELS[method] ?? method;
}
