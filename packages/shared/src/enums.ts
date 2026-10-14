export const Role = {
  ADMIN: 'ADMIN',
  RECEPTION: 'RECEPTION',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const CourtType = {
  INDOOR: 'INDOOR',
  OUTDOOR: 'OUTDOOR',
} as const;
export type CourtType = (typeof CourtType)[keyof typeof CourtType];

export const CourtStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type CourtStatus = (typeof CourtStatus)[keyof typeof CourtStatus];

export const BookingSource = {
  ONLINE: 'ONLINE',
  ADMIN: 'ADMIN',
} as const;
export type BookingSource = (typeof BookingSource)[keyof typeof BookingSource];

export const BookingStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentProvider = {
  MERCADOPAGO: 'MERCADOPAGO',
  MANUAL: 'MANUAL',
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

/**
 * Medios de pago que el staff puede registrar manualmente (efectivo o
 * transferencias). No representan cobros online: se asientan con trazabilidad.
 */
export const ManualPaymentMethod = {
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
  OTHER: 'OTHER',
} as const;
export type ManualPaymentMethod = (typeof ManualPaymentMethod)[keyof typeof ManualPaymentMethod];

export const MANUAL_PAYMENT_METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  [ManualPaymentMethod.CASH]: 'Efectivo',
  [ManualPaymentMethod.TRANSFER]: 'Transferencia',
  [ManualPaymentMethod.OTHER]: 'Otro medio',
};

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  [PaymentProvider.MERCADOPAGO]: 'Mercado Pago',
  [PaymentProvider.MANUAL]: 'Registrado manualmente',
};

export const PaymentStatus = {
  PENDING: 'PENDING',
  IN_PROCESS: 'IN_PROCESS',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/**
 * Medio de pago elegido por el cliente al reservar. Representa la intención:
 *   - MERCADOPAGO: pago online de la seña (checkout).
 *   - CASH / TRANSFER: pago en el club. La reserva queda retenida y el pago
 *     pendiente hasta que el staff lo confirme. Nunca se marca pagado solo.
 */
export const BookingPaymentMethod = {
  MERCADOPAGO: 'MERCADOPAGO',
  CASH: 'CASH',
  TRANSFER: 'TRANSFER',
} as const;
export type BookingPaymentMethod =
  (typeof BookingPaymentMethod)[keyof typeof BookingPaymentMethod];

export const BOOKING_PAYMENT_METHOD_LABELS: Record<BookingPaymentMethod, string> = {
  [BookingPaymentMethod.MERCADOPAGO]: 'Mercado Pago',
  [BookingPaymentMethod.CASH]: 'Efectivo',
  [BookingPaymentMethod.TRANSFER]: 'Transferencia bancaria',
};

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.CONFIRMED,
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING_PAYMENT]: 'Pago pendiente',
  [BookingStatus.CONFIRMED]: 'Confirmada',
  [BookingStatus.EXPIRED]: 'Vencida',
  [BookingStatus.CANCELLED]: 'Cancelada',
  [BookingStatus.COMPLETED]: 'Finalizada',
  [BookingStatus.NO_SHOW]: 'Ausencia',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'Pendiente',
  [PaymentStatus.IN_PROCESS]: 'En proceso',
  [PaymentStatus.APPROVED]: 'Aprobado',
  [PaymentStatus.REJECTED]: 'Rechazado',
  [PaymentStatus.CANCELLED]: 'Cancelado',
  [PaymentStatus.REFUNDED]: 'Reintegrado',
};
