import { randomUUID } from 'node:crypto';
import { Prisma, PaymentWebhookEvent, WebhookEventStatus } from '@prisma/client';
import { AppError, unauthorized } from '@/domain/errors';
import { resolvePaymentDecision } from '@/domain/payment-processing';
import { isApprovedStatus } from '@/domain/payment-status';
import { prisma } from '@/infra/prisma';
import { paymentProvider, PaymentProviderError } from '@/payments';
import {
  MP_REQUEST_ID_HEADER,
  MP_SIGNATURE_HEADER,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_BASE_MS,
} from '@/config/constants';
import { logger } from '@/infra/logger';

export interface WebhookRequestInput {
  eventId?: string | null;
  eventType?: string | null;
  dataId?: string | null;
  headers: Record<string, string | string[] | undefined>;
  payload: unknown;
}

export type WebhookOutcome =
  | 'processed'
  | 'duplicate'
  | 'ignored'
  | 'mismatch'
  | 'review'
  | 'retrying';

export interface WebhookResult {
  status: WebhookOutcome;
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Clave de deduplicación. Si el proveedor envía un id de evento, se usa (dedup fuerte de
 * reenvíos idénticos). Si no, se genera una clave aleatoria: la idempotencia real queda
 * garantizada por la guarda monótona de estados de pago, no por la unicidad del evento.
 */
function computeDedupKey(input: WebhookRequestInput): string {
  return input.eventId ? `mp:evt:${input.eventId}` : `mp:dx:${randomUUID()}`;
}

function computeNextAttempt(attempts: number, now: Date): Date {
  const delay = WEBHOOK_RETRY_BASE_MS * Math.pow(2, Math.max(0, attempts - 1));
  return new Date(now.getTime() + delay);
}

async function markEvent(
  id: string,
  data: Prisma.PaymentWebhookEventUpdateInput,
): Promise<void> {
  await prisma.paymentWebhookEvent.update({ where: { id }, data }).catch(() => undefined);
}

/**
 * Procesa una notificación de Mercado Pago de forma idempotente.
 *
 * 1. Registra el evento crudo (auditoría + deduplicación).
 * 2. Verifica la firma del proveedor.
 * 3. Consulta el pago real (nunca confía en el contenido del webhook).
 * 4. Decide y aplica el resultado con la lógica pura de dominio.
 */
export async function processMercadoPagoWebhook(
  input: WebhookRequestInput,
): Promise<WebhookResult> {
  const dedupKey = computeDedupKey(input);
  const signature = headerValue(input.headers, MP_SIGNATURE_HEADER) ?? null;
  const requestId = headerValue(input.headers, MP_REQUEST_ID_HEADER) ?? null;

  let event: PaymentWebhookEvent;
  try {
    event = await prisma.paymentWebhookEvent.create({
      data: {
        provider: 'MERCADOPAGO',
        dedupKey,
        eventId: input.eventId ?? null,
        eventType: input.eventType ?? null,
        providerPaymentId: input.dataId ?? null,
        requestId,
        signature,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      logger.info({ dedupKey }, 'Webhook duplicado ignorado');
      return { status: 'duplicate' };
    }
    throw error;
  }

  return applyWebhookEvent(event);
}

/**
 * Aplica una notificación ya registrada. Se usa tanto en el alta como en los reintentos
 * del worker, que vuelven a invocar esta función sobre el mismo evento.
 */
export async function applyWebhookEvent(event: PaymentWebhookEvent): Promise<WebhookResult> {
  const eventId = event.id;
  const now = new Date();

  await prisma.paymentWebhookEvent
    .update({ where: { id: eventId }, data: { attempts: { increment: 1 } } })
    .catch(() => undefined);

  try {
    if (!paymentProvider.configured) {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: false,
        error: 'El proveedor de pagos no está configurado.',
        processedAt: now,
      });
      return { status: 'ignored' };
    }

    const dataId = event.providerPaymentId;
    if (!dataId) {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: false,
        error: 'Notificación sin data.id.',
        processedAt: now,
      });
      return { status: 'ignored' };
    }

    const validSignature = paymentProvider.verifyWebhookSignature({
      headers: {
        [MP_SIGNATURE_HEADER]: event.signature ?? undefined,
        [MP_REQUEST_ID_HEADER]: event.requestId ?? undefined,
      },
      dataId,
    });
    if (!validSignature) {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: false,
        error: 'Firma de webhook inválida.',
        processedAt: now,
      });
      throw unauthorized('Firma de webhook inválida.', 'MP_INVALID_SIGNATURE');
    }

    let providerPayment;
    try {
      providerPayment = await paymentProvider.getPayment(dataId);
    } catch (error) {
      if (error instanceof PaymentProviderError && error.transient) {
        await markEvent(eventId, {
          status: WebhookEventStatus.FAILED,
          retryable: true,
          error: `Error transitorio del proveedor (${error.code}). Se reintentará.`,
          nextAttemptAt: computeNextAttempt(event.attempts + 1, now),
        });
        logger.warn({ eventId, code: error.code }, 'Webhook con error transitorio; se reintentará');
        return { status: 'retrying' };
      }
      throw error;
    }

    const booking = providerPayment.externalReference
      ? await prisma.booking.findFirst({
          where: { code: { equals: providerPayment.externalReference, mode: 'insensitive' } },
        })
      : null;

    if (!booking) {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: false,
        error: 'No se encontró la reserva referenciada.',
        processedAt: now,
      });
      logger.warn({ eventId, eventType: event.eventType }, 'Webhook sin reserva asociada');
      return { status: 'ignored' };
    }

    const current = await prisma.payment.findUnique({
      where: { providerPaymentId: providerPayment.providerPaymentId },
    });

    const decision = resolvePaymentDecision(
      {
        bookingStatus: booking.status,
        bookingPaidAmountCents: booking.paidAmountCents,
        bookingPriceTotalCents: booking.priceTotalCents,
        expectedDepositCents: booking.depositAmountCents,
        expectedCurrency: booking.currency,
        currentPaymentStatus: current?.status ?? null,
      },
      {
        providerStatus: providerPayment.status,
        amountCents: providerPayment.amountCents,
        currency: providerPayment.currency,
      },
    );

    // Duplicado o notificación fuera de orden: nada que aplicar.
    if (!decision.applyStatus) {
      await markEvent(eventId, {
        status: WebhookEventStatus.PROCESSED,
        error: `Sin cambios: ${decision.reason}.`,
        processedAt: now,
      });
      logger.info({ eventId, reason: decision.reason }, 'Webhook sin cambios (duplicado/fuera de orden)');
      return { status: 'duplicate' };
    }

    const approved = isApprovedStatus(decision.mappedStatus);
    const paymentData = {
      status: decision.mappedStatus,
      statusDetail: providerPayment.statusDetail ?? null,
      method: providerPayment.method ?? null,
      amountCents: providerPayment.amountCents,
      currency: providerPayment.currency,
      rawPayload: providerPayment.raw as Prisma.InputJsonValue,
      requiresReview: decision.requiresReview,
      reviewReason: decision.reviewReason,
      reviewedAt: decision.requiresReview ? null : current?.reviewedAt ?? null,
    };

    await prisma.$transaction(async (tx) => {
      const persisted = current
        ? await tx.payment.update({
            where: { id: current.id },
            data: { ...paymentData, paidAt: current.paidAt ?? (approved ? now : null) },
          })
        : await tx.payment.create({
            data: {
              bookingId: booking.id,
              providerPaymentId: providerPayment.providerPaymentId,
              ...paymentData,
              paidAt: approved ? now : null,
            },
          });

      if (decision.action === 'CONFIRM_BOOKING') {
        const paidAmountCents = Math.min(
          booking.priceTotalCents,
          booking.paidAmountCents + providerPayment.amountCents,
        );
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CONFIRMED',
            confirmedAt: now,
            expiresAt: null,
            paidAmountCents,
          },
        });
      } else if (decision.action === 'RECORD_ONLY' && approved) {
        const paidAmountCents = Math.min(
          booking.priceTotalCents,
          booking.paidAmountCents + providerPayment.amountCents,
        );
        await tx.booking.update({
          where: { id: booking.id },
          data: { paidAmountCents },
        });
      }

      await tx.paymentWebhookEvent.update({
        where: { id: eventId },
        data: {
          status: WebhookEventStatus.PROCESSED,
          providerPaymentId: persisted.providerPaymentId ?? dataId,
          retryable: false,
          nextAttemptAt: null,
          processedAt: now,
        },
      });
    });

    if (decision.requiresReview) {
      logger.warn(
        { eventId, bookingId: booking.id, reason: decision.reason },
        'Pago marcado para revisión manual',
      );
      return { status: 'review' };
    }

    logger.info(
      { eventId, bookingId: booking.id, action: decision.action, reason: decision.reason },
      'Webhook procesado',
    );
    return { status: decision.action === 'IGNORE' ? 'ignored' : 'processed' };
  } catch (error) {
    if (error instanceof AppError) {
      // La firma inválida ya quedó marcada como fallida; se re-lanza para responder 401.
      throw error;
    }
    if (error instanceof PaymentProviderError) {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: error.transient,
        error: `Error del proveedor (${error.code}).`,
        ...(error.transient
          ? { nextAttemptAt: computeNextAttempt(event.attempts + 1, now) }
          : { processedAt: now }),
      });
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: true,
        error: `Error de datos: ${error.code}`,
        nextAttemptAt: computeNextAttempt(event.attempts + 1, now),
      });
    } else {
      await markEvent(eventId, {
        status: WebhookEventStatus.FAILED,
        retryable: false,
        error: 'Error inesperado al procesar el webhook.',
        processedAt: now,
      });
    }
    throw error;
  }
}

/**
 * Reintenta los webhooks fallidos marcados como reintentables. Se ejecuta desde el worker.
 * Devuelve la cantidad de eventos reintentados.
 */
export async function retryDueWebhookEvents(limit = 20): Promise<number> {
  const due = await prisma.paymentWebhookEvent.findMany({
    where: {
      status: WebhookEventStatus.FAILED,
      retryable: true,
      attempts: { lt: WEBHOOK_MAX_ATTEMPTS },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
  });

  let retried = 0;
  for (const event of due) {
    try {
      await applyWebhookEvent(event);
      retried += 1;
    } catch {
      logger.warn({ eventId: event.id }, 'Reintento de webhook falló');
    }
  }

  // Agota los que superaron el máximo de intentos para sacarlos de la cola.
  await prisma.paymentWebhookEvent.updateMany({
    where: { status: WebhookEventStatus.FAILED, retryable: true, attempts: { gte: WEBHOOK_MAX_ATTEMPTS } },
    data: { retryable: false, error: 'Se agotaron los reintentos.' },
  });

  return retried;
}
