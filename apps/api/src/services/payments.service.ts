import {
  PaymentStatus,
  type CheckoutResponse,
  type ManualPaymentMethod,
  type Paginated,
  type Payment,
  type PaymentProvider,
} from '@padel/shared';
import { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { notFound, unprocessable } from '@/domain/errors';
import { prisma } from '@/infra/prisma';
import { paymentProvider } from '@/payments';
import { PaymentProviderError } from '@/payments/provider';
import { serializePayment } from '@/utils/serialize';

export interface PaymentFilters {
  status?: string;
  /** Proveedor del pago: cobros online de Mercado Pago o asientos manuales. */
  provider?: string;
  needsReview?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listPayments(filters: PaymentFilters = {}): Promise<Paginated<Payment>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 12));

  const where: Prisma.PaymentWhereInput = {};
  if (filters.status) where.status = filters.status as PaymentStatus;
  if (filters.provider) where.provider = filters.provider as PaymentProvider;
  if (filters.needsReview !== undefined) where.requiresReview = filters.needsReview;

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { booking: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: payments.map(serializePayment),
    meta: { page, pageSize, total },
  };
}

function bookingReturnUrl(code: string): string {
  return `${env.appBaseUrl}/reserva/${code}`;
}

/**
 * Crea la preferencia de pago en el proveedor y devuelve el punto de inicio del checkout.
 *
 * Es **idempotente**: si ya existe un intento de pago pendiente para la reserva, reutiliza
 * la misma preferencia (recuperando un `init_point` vigente) en lugar de crear una nueva.
 * Si el proveedor responde con un error transitorio, se propaga para que el cliente reintente.
 * Con el proveedor "fake" (sin credenciales) falla explícitamente: nunca simula un pago.
 */
export async function createCheckout(bookingCode: string, email: string): Promise<CheckoutResponse> {
  const booking = await prisma.booking.findFirst({
    where: { code: { equals: bookingCode, mode: 'insensitive' } },
    include: { customer: true },
  });
  if (!booking) throw notFound('No encontramos una reserva con ese código.', 'BOOKING_NOT_FOUND');

  if (booking.customer.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw unprocessable('Los datos no coinciden con la reserva.', 'BOOKING_FORBIDDEN');
  }

  if (booking.status !== 'PENDING_PAYMENT') {
    throw unprocessable('La reserva no está pendiente de pago.', 'BOOKING_NOT_PENDING');
  }

  // Nunca generar un nuevo intento si ya hay un pago aprobado (evita doble cobro).
  const alreadyPaid = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: PaymentStatus.APPROVED },
  });
  if (alreadyPaid) {
    throw unprocessable('La reserva ya tiene un pago aprobado.', 'BOOKING_ALREADY_PAID');
  }

  const amountCents = booking.depositAmountCents;
  const currency = booking.currency;
  const returnUrl = bookingReturnUrl(booking.code);
  const backUrls = {
    success: env.MP_SUCCESS_URL ?? returnUrl,
    failure: env.MP_FAILURE_URL ?? returnUrl,
    pending: env.MP_PENDING_URL ?? returnUrl,
  };

  // Reutilización idempotente: si ya hay un intento pendiente con preferencia, la reciclamos.
  const existing = await prisma.payment.findFirst({
    where: {
      bookingId: booking.id,
      status: PaymentStatus.PENDING,
      providerPreferenceId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existing?.providerPreferenceId) {
    try {
      const preference = await paymentProvider.getPreference(existing.providerPreferenceId);
      return {
        bookingCode: booking.code,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint,
      };
    } catch (error) {
      if (error instanceof PaymentProviderError && error.transient) {
        // No se puede verificar la preferencia ahora: pedimos reintentar más tarde.
        throw unprocessable(
          'No pudimos preparar el pago en este momento. Volvé a intentar en unos instantes.',
          'PAYMENTS_TEMPORARILY_UNAVAILABLE',
        );
      }
      // Error permanente (p. ej. preferencia inexistente): se crea una nueva debajo.
    }
  }

  const preference = await paymentProvider.createPreference({
    bookingCode: booking.code,
    amountCents,
    currency,
    description: `Seña reserva ${booking.code}`,
    payerEmail: booking.customer.email,
    externalReference: booking.code,
    notificationUrl: env.mpNotificationUrl,
    backUrls,
  });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      providerPreferenceId: preference.preferenceId,
      amountCents,
      currency,
      status: PaymentStatus.PENDING,
    },
  });

  return {
    bookingCode: booking.code,
    initPoint: preference.initPoint,
    sandboxInitPoint: preference.sandboxInitPoint,
  };
}

export interface ManualPaymentInput {
  bookingId: string;
  amountCents: number;
  method: ManualPaymentMethod;
  reference?: string;
  note?: string;
}

const BOOKING_INCLUDE = { booking: { include: { customer: true } } } satisfies Prisma.PaymentInclude;

/**
 * Registra un pago manual (efectivo o transferencia) realizado en el club.
 *
 * Queda asentado con trazabilidad (`provider = MANUAL`, estado `APPROVED`), se actualiza el
 * importe pagado de la reserva y, si corresponde, se confirma automáticamente cuando la seña
 * exigida fue cubierta. Nunca se apoya en un cobro online: es un asiento del staff.
 */
export async function registerManualPayment(input: ManualPaymentInput): Promise<Payment> {
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) throw notFound('Reserva no encontrada.', 'BOOKING_NOT_FOUND');

  if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
    throw unprocessable(
      'No se puede registrar un pago sobre una reserva cancelada o vencida.',
      'BOOKING_NOT_PAYABLE',
    );
  }

  const detailParts = [input.reference?.trim(), input.note?.trim()].filter(Boolean);
  const statusDetail = detailParts.length > 0 ? detailParts.join(' · ') : null;

  const paymentId = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'MANUAL',
        method: input.method,
        amountCents: input.amountCents,
        currency: booking.currency,
        status: PaymentStatus.APPROVED,
        statusDetail,
        paidAt: new Date(),
      },
    });

    const paidAmountCents = Math.min(
      booking.priceTotalCents,
      booking.paidAmountCents + input.amountCents,
    );
    const shouldConfirm =
      booking.status === 'PENDING_PAYMENT' && paidAmountCents >= booking.depositAmountCents;

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        paidAmountCents,
        ...(shouldConfirm
          ? { status: 'CONFIRMED', confirmedAt: new Date(), expiresAt: null }
          : {}),
      },
    });

    return payment.id;
  });

  const created = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: BOOKING_INCLUDE,
  });
  return serializePayment(created);
}

/**
 * Confirma un pago manual declarado (efectivo o transferencia) que estaba pendiente.
 *
 * Es la única vía por la que un pago en efectivo/transferencia pasa a `APPROVED`: la
 * declara el cliente al reservar y este paso la valida el staff. Si al confirmarlo se
 * cubre la seña exigida, la reserva se confirma y se libera su vencimiento.
 */
export async function confirmManualPayment(id: string): Promise<Payment> {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw notFound('Pago no encontrado.', 'PAYMENT_NOT_FOUND');

  if (payment.provider !== 'MANUAL') {
    throw unprocessable(
      'Sólo los pagos manuales (efectivo o transferencia) requieren confirmación.',
      'PAYMENT_NOT_MANUAL',
    );
  }
  if (payment.status !== PaymentStatus.PENDING) {
    throw unprocessable('El pago no está pendiente de confirmación.', 'PAYMENT_NOT_PENDING');
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
    const paidAmountCents = Math.min(
      booking.priceTotalCents,
      booking.paidAmountCents + payment.amountCents,
    );
    const shouldConfirm =
      booking.status === 'PENDING_PAYMENT' && paidAmountCents >= booking.depositAmountCents;

    await tx.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.APPROVED,
        paidAt: now,
        requiresReview: false,
        reviewedAt: now,
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        paidAmountCents,
        ...(shouldConfirm
          ? { status: 'CONFIRMED', confirmedAt: now, expiresAt: null }
          : {}),
      },
    });
  });

  const updated = await prisma.payment.findUniqueOrThrow({
    where: { id },
    include: BOOKING_INCLUDE,
  });
  return serializePayment(updated);
}

/**
 * Rechaza un pago manual declarado que no pudo verificarse. No cancela la reserva:
 * deja constancia del rechazo y la reserva sigue pendiente para que el staff decida.
 */
export async function rejectManualPayment(id: string, reason?: string): Promise<Payment> {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw notFound('Pago no encontrado.', 'PAYMENT_NOT_FOUND');

  if (payment.provider !== 'MANUAL') {
    throw unprocessable('Sólo los pagos manuales pueden rechazarse.', 'PAYMENT_NOT_MANUAL');
  }
  if (payment.status !== PaymentStatus.PENDING) {
    throw unprocessable('El pago no está pendiente de confirmación.', 'PAYMENT_NOT_PENDING');
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.REJECTED,
      requiresReview: false,
      reviewedAt: new Date(),
      reviewReason: reason?.trim() || 'Pago rechazado por el administrador.',
    },
    include: BOOKING_INCLUDE,
  });
  return serializePayment(updated);
}

export async function refundPayment(id: string): Promise<Payment> {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: BOOKING_INCLUDE,
  });
  if (!payment) throw notFound('Pago no encontrado.', 'PAYMENT_NOT_FOUND');

  if (payment.status !== PaymentStatus.APPROVED) {
    throw unprocessable('Sólo se pueden reintegrar pagos aprobados.', 'PAYMENT_NOT_APPROVED');
  }

  // Los pagos manuales se reintegran sólo a nivel de registro (el dinero se devuelve en el club);
  // los cobros online requieren el identificador del proveedor para ejecutar el reintegro real.
  if (payment.provider !== 'MANUAL') {
    if (!payment.providerPaymentId) {
      throw unprocessable(
        'El pago no tiene un identificador del proveedor.',
        'PAYMENT_NOT_REFUNDABLE',
      );
    }
    await paymentProvider.refund(payment.providerPaymentId, payment.amountCents);
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
    include: BOOKING_INCLUDE,
  });

  return serializePayment(updated);
}
