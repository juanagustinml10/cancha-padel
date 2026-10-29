/**
 * Pruebas de integración del procesamiento de webhooks de pago (REQUIEREN base de datos).
 *
 * Se ejecutan sólo si `TEST_DATABASE_URL` está definido. El proveedor de pagos se
 * reemplaza por un doble controlable para no depender de Mercado Pago ni cobrar de verdad.
 */
import { afterAll, beforeEach, expect, it, vi } from 'vitest';
import { prisma } from '@/infra/prisma';
import { processMercadoPagoWebhook, applyWebhookEvent } from '@/services/webhook.service';
import { describeIntegration, resetDatabase } from '../helpers/db';

const providerMock = vi.hoisted(() => ({
  name: 'fake' as const,
  configured: true,
  createPreference: vi.fn(),
  getPreference: vi.fn(),
  getPayment: vi.fn(),
  refund: vi.fn(),
  verifyWebhookSignature: vi.fn(() => true),
}));

vi.mock('@/payments', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/payments')>();
  return { ...actual, paymentProvider: providerMock };
});

function approvedPayment(overrides: Record<string, unknown> = {}) {
  return {
    providerPaymentId: '999',
    status: 'approved',
    statusDetail: 'accredited',
    amountCents: 30_000,
    currency: 'ARS',
    externalReference: 'PC-TEST1',
    method: 'credit_card',
    raw: { id: 999 },
    ...overrides,
  };
}

describeIntegration('Pagos · webhooks (requiere TEST_DATABASE_URL)', () => {
  let bookingId: string;

  beforeEach(async () => {
    await resetDatabase(prisma);
    vi.clearAllMocks();
    providerMock.configured = true;
    providerMock.verifyWebhookSignature.mockReturnValue(true);

    const court = await prisma.court.create({
      data: { name: 'Cancha Pago', type: 'INDOOR', hasLighting: true, status: 'ACTIVE' },
    });
    const customer = await prisma.customer.create({
      data: { fullName: 'Pago Test', email: 'pago@example.com', phone: '1100000000' },
    });
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        code: 'PC-TEST1',
        courtId: court.id,
        customerId: customer.id,
        startsAt,
        endsAt,
        durationMinutes: 60,
        status: 'PENDING_PAYMENT',
        source: 'ONLINE',
        priceTotalCents: 100_000,
        depositAmountCents: 30_000,
        paidAmountCents: 0,
        currency: 'ARS',
        pricingSnapshot: {},
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    bookingId = booking.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('confirma la reserva ante un pago aprobado válido', async () => {
    providerMock.getPayment.mockResolvedValue(approvedPayment());

    const result = await processMercadoPagoWebhook({
      eventId: 'evt-1',
      eventType: 'payment',
      dataId: '999',
      headers: { 'x-signature': 'ts=1,v1=x', 'x-request-id': 'req-1' },
      payload: { id: 'evt-1', type: 'payment', data: { id: '999' } },
    });

    expect(result.status).toBe('processed');

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.paidAmountCents).toBe(30_000);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerPaymentId: '999' } });
    expect(payment.status).toBe('APPROVED');
  });

  it('es idempotente ante un evento duplicado', async () => {
    providerMock.getPayment.mockResolvedValue(approvedPayment());
    const input = {
      eventId: 'evt-dup',
      eventType: 'payment',
      dataId: '999',
      headers: { 'x-signature': 'ts=1,v1=x', 'x-request-id': 'req-1' },
      payload: { id: 'evt-dup', type: 'payment', data: { id: '999' } },
    };

    const first = await processMercadoPagoWebhook(input);
    const second = await processMercadoPagoWebhook(input);

    expect(first.status).toBe('processed');
    expect(second.status).toBe('duplicate');
    expect(await prisma.payment.count()).toBe(1);
  });

  it('marca revisión y no confirma ante una reserva ya vencida (pago tardío)', async () => {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: 'EXPIRED' } });
    providerMock.getPayment.mockResolvedValue(approvedPayment());

    const result = await processMercadoPagoWebhook({
      eventId: 'evt-late',
      eventType: 'payment',
      dataId: '999',
      headers: { 'x-signature': 'ts=1,v1=x', 'x-request-id': 'req-1' },
      payload: { id: 'evt-late', type: 'payment', data: { id: '999' } },
    });

    expect(result.status).toBe('review');

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe('EXPIRED');

    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerPaymentId: '999' } });
    expect(payment.requiresReview).toBe(true);
    expect(payment.reviewReason).toContain('pago tardío');
  });

  it('rechaza una firma inválida y no procesa el pago', async () => {
    providerMock.verifyWebhookSignature.mockReturnValue(false);
    providerMock.getPayment.mockResolvedValue(approvedPayment());

    await expect(
      processMercadoPagoWebhook({
        eventId: 'evt-bad-sign',
        eventType: 'payment',
        dataId: '999',
        headers: { 'x-signature': 'ts=1,v1=bad', 'x-request-id': 'req-1' },
        payload: { id: 'evt-bad-sign', type: 'payment', data: { id: '999' } },
      }),
    ).rejects.toMatchObject({ code: 'MP_INVALID_SIGNATURE' });

    expect(await prisma.payment.count()).toBe(0);
  });

  it('agenda un reintento ante un error transitorio del proveedor', async () => {
    const { PaymentProviderError } = await import('@/payments/provider');
    providerMock.getPayment.mockRejectedValue(
      new PaymentProviderError('timeout', { transient: true, code: 'MP_NETWORK_ERROR' }),
    );

    const result = await processMercadoPagoWebhook({
      eventId: 'evt-retry',
      eventType: 'payment',
      dataId: '777',
      headers: { 'x-signature': 'ts=1,v1=x', 'x-request-id': 'req-1' },
      payload: { id: 'evt-retry', type: 'payment', data: { id: '777' } },
    });

    expect(result.status).toBe('retrying');

    const event = await prisma.paymentWebhookEvent.findFirstOrThrow({
      where: { eventId: 'evt-retry' },
    });
    expect(event.retryable).toBe(true);
    expect(event.nextAttemptAt).not.toBeNull();
  });

  it('el reintento del worker reutiliza el evento y confirma al resolverse', async () => {
    const stored = await prisma.paymentWebhookEvent.create({
      data: {
        provider: 'MERCADOPAGO',
        dedupKey: 'mp:evt:evt-manual',
        eventId: 'evt-manual',
        eventType: 'payment',
        providerPaymentId: '999',
        signature: 'ts=1,v1=x',
        requestId: 'req-1',
        payload: {},
        status: 'FAILED',
        retryable: true,
        attempts: 1,
      },
    });

    providerMock.getPayment.mockResolvedValue(approvedPayment());
    const result = await applyWebhookEvent(stored);

    expect(result.status).toBe('processed');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe('CONFIRMED');
  });

  it('descuenta el importe pagado si el proveedor notifica un reintegro', async () => {
    // 1) Primero: pago aprobado → reserva confirmada con 30_000 pagados.
    providerMock.getPayment.mockResolvedValue(approvedPayment());
    const approved = await processMercadoPagoWebhook({
      eventId: 'evt-ap',
      eventType: 'payment',
      dataId: '999',
      headers: { 'x-signature': 'ts=1,v1=x', 'x-request-id': 'req-1' },
      payload: { id: 'evt-ap', type: 'payment', data: { id: '999' } },
    });
    expect(approved.status).toBe('processed');

    let booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(30_000);

    // 2) Después: el proveedor notifica `refunded` para el mismo pago.
    providerMock.getPayment.mockResolvedValue(approvedPayment({ status: 'refunded' }));
    const refunded = await processMercadoPagoWebhook({
      eventId: 'evt-refund',
      eventType: 'payment',
      dataId: '999',
      headers: { 'x-signature': 'ts=1,v1=x', 'x-request-id': 'req-1' },
      payload: { id: 'evt-refund', type: 'payment', data: { id: '999' } },
    });

    expect(refunded.status).toBe('processed');

    booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(0);
    expect(booking.status).toBe('CONFIRMED'); // el reintegro no cancela la reserva

    const payment = await prisma.payment.findUniqueOrThrow({ where: { providerPaymentId: '999' } });
    expect(payment.status).toBe('REFUNDED');
    expect(payment.refundedAt).not.toBeNull();
  });
});
