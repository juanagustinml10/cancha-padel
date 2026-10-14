import { PaymentStatus } from '@padel/shared';

/** Mapea el estado crudo del proveedor de pagos al estado interno. */
export function mapProviderPaymentStatus(providerStatus: string): PaymentStatus {
  switch (providerStatus) {
    case 'approved':
    case 'authorized':
      return PaymentStatus.APPROVED;
    case 'pending':
      return PaymentStatus.PENDING;
    case 'in_process':
      return PaymentStatus.IN_PROCESS;
    case 'rejected':
      return PaymentStatus.REJECTED;
    case 'cancelled':
      return PaymentStatus.CANCELLED;
    case 'refunded':
    case 'charged_back':
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.PENDING;
  }
}

/** Un pago aprobado es el único que confirma la reserva. */
export function isApprovedStatus(status: PaymentStatus): boolean {
  return status === PaymentStatus.APPROVED;
}

/**
 * Determina si un nuevo estado puede aplicarse sobre el estado actual del pago.
 *
 * Protege contra notificaciones que llegan **fuera de orden**: una vez que un pago
 * está `APPROVED` o `REFUNDED`, no se admite retroceder a estados anteriores
 * (pending/in_process/rejected/cancelled). `REFUNDED` es terminal y `APPROVED` sólo
 * puede avanzar a `REFUNDED`. En el resto de los casos se permite el cambio.
 *
 * `current === null` significa que aún no existe fila de pago para ese intento.
 */
export function canApplyPaymentStatus(
  current: PaymentStatus | null,
  next: PaymentStatus,
): boolean {
  if (current === null) return true;
  if (current === next) return false;
  if (current === PaymentStatus.REFUNDED) return false;
  if (current === PaymentStatus.APPROVED) return next === PaymentStatus.REFUNDED;
  return true;
}

/** Estados desde los cuales no se espera ningún avance salvo reintegro/terminal. */
export function isPaymentTerminal(status: PaymentStatus): boolean {
  return status === PaymentStatus.REFUNDED;
}
