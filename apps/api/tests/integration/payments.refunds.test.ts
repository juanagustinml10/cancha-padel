/**
 * Pruebas de integración de pagos: reintegros y concurrencia (REQUIEREN base de datos).
 *
 * Se ejecutan sólo si `TEST_DATABASE_URL` está definido; de lo contrario se omiten.
 * Cubren:
 *  - `refundPayment` descuenta el importe pagado de la reserva (una sola vez, sin
 *    negativos, con idempotencia de estado).
 *  - `registerManualPayment` / `confirmManualPayment` concurrentes no pierden
 *    actualizaciones de `paidAmountCents` (advisory lock por reserva).
 */
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest';
import { ManualPaymentMethod, PaymentStatus } from '@padel/shared';
import { prisma } from '@/infra/prisma';
import {
  confirmManualPayment,
  registerManualPayment,
  refundPayment,
} from '@/services/payments.service';
import { describeIntegration, resetDatabase } from '../helpers/db';

let bookingId: string;
let pendingBookingId: string;
let cancelledBookingId: string;

describeIntegration('Pagos · reintegros y concurrencia (requiere TEST_DATABASE_URL)', () => {
  beforeAll(async () => {
    // Punto de enganche para preparaciones futuras; los fixtures se crean en beforeEach.
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    // Una cancha por reserva: la constraint Booking_no_overlap rechazaría
    // tres reservas con el mismo rango horario sobre la misma cancha.
    const [confirmedCourt, pendingCourt, cancelledCourt] = await Promise.all([
      prisma.court.create({
        data: { name: 'Cancha Pagos 1', type: 'INDOOR', hasLighting: true, status: 'ACTIVE' },
      }),
      prisma.court.create({
        data: { name: 'Cancha Pagos 2', type: 'INDOOR', hasLighting: true, status: 'ACTIVE' },
      }),
      prisma.court.create({
        data: { name: 'Cancha Pagos 3', type: 'INDOOR', hasLighting: true, status: 'ACTIVE' },
      }),
    ]);
    const customer = await prisma.customer.create({
      data: { fullName: 'Cliente Pagos', email: 'pagos@example.com', phone: '1100000000' },
    });

    const baseData = {
      customerId: customer.id,
      startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      durationMinutes: 60,
      source: 'ADMIN' as const,
      priceTotalCents: 100_000,
      depositAmountCents: 30_000,
      paidAmountCents: 0,
      currency: 'ARS',
      pricingSnapshot: {},
    };

    const confirmed = await prisma.booking.create({
      data: { ...baseData, courtId: confirmedCourt.id, code: 'PC-REFUND', status: 'CONFIRMED' },
    });
    const pending = await prisma.booking.create({
      data: { ...baseData, courtId: pendingCourt.id, code: 'PC-PENDING', status: 'PENDING_PAYMENT' },
    });
    const cancelled = await prisma.booking.create({
      data: { ...baseData, courtId: cancelledCourt.id, code: 'PC-CANCEL', status: 'CANCELLED' },
    });

    bookingId = confirmed.id;
    pendingBookingId = pending.id;
    cancelledBookingId = cancelled.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('descuenta el importe pagado al reintegrar y rechaza segundos reintegros', async () => {
    const payment = await registerManualPayment({
      bookingId,
      amountCents: 30_000,
      method: ManualPaymentMethod.CASH,
    });

    const refunded = await refundPayment(payment.id);
    expect(refunded.status).toBe(PaymentStatus.REFUNDED);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(0);

    // Segundo reintegro del mismo pago: rechazado por estado (idempotencia).
    await expect(refundPayment(payment.id)).rejects.toMatchObject({
      code: 'PAYMENT_NOT_APPROVED',
    });
    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(unchanged.paidAmountCents).toBe(0);

    // El reintegro NO cancela la reserva: la cancelación es acción explícita del staff.
    expect(unchanged.status).toBe('CONFIRMED');
  });

  it('un reintegro parcial resta sólo el pago reintegrado', async () => {
    const first = await registerManualPayment({
      bookingId,
      amountCents: 30_000,
      method: ManualPaymentMethod.CASH,
    });
    const second = await registerManualPayment({
      bookingId,
      amountCents: 10_000,
      method: ManualPaymentMethod.TRANSFER,
    });

    await refundPayment(second.id);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(30_000);

    const firstPayment = await prisma.payment.findUniqueOrThrow({ where: { id: first.id } });
    expect(firstPayment.status).toBe(PaymentStatus.APPROVED);
    const secondPayment = await prisma.payment.findUniqueOrThrow({ where: { id: second.id } });
    expect(secondPayment.status).toBe(PaymentStatus.REFUNDED);
  });

  it('el importe pagado no queda negativo si se reintegra más de lo pagado', async () => {
    // Escenario de borde: la reserva quedó pagada por debajo del importe a reintegrar
    // (p. ej. registros de señas parciales de una seña fija).
    await prisma.booking.update({
      where: { id: bookingId },
      data: { paidAmountCents: 5_000 },
    });
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        provider: 'MANUAL',
        method: 'CASH',
        amountCents: 50_000,
        currency: 'ARS',
        status: PaymentStatus.APPROVED,
        paidAt: new Date(),
      },
    });

    await refundPayment(payment.id);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(0);
  });

  it('dos reintegros concurrentes dejan el pago reintegrado una única vez', async () => {
    const payment = await registerManualPayment({
      bookingId,
      amountCents: 30_000,
      method: ManualPaymentMethod.CASH,
    });
    await prisma.booking.update({
      where: { id: bookingId },
      data: { paidAmountCents: 90_000 },
    });

    const results = await Promise.allSettled([refundPayment(payment.id), refundPayment(payment.id)]);
    const statuses = results.map((r) => r.status);
    expect(statuses.sort()).toEqual(['fulfilled', 'rejected']);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(90_000 - 30_000);
    expect(booking.paidAmountCents).toBe(60_000);

    const refundedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(refundedPayment.status).toBe(PaymentStatus.REFUNDED);
    expect(refundedPayment.refundedAt).not.toBeNull();
  });

  it('registros manuales concurrentes no pierden actualizaciones de paidAmountCents', async () => {
    const [a, b] = await Promise.all([
      registerManualPayment({ bookingId, amountCents: 20_000, method: ManualPaymentMethod.CASH }),
      registerManualPayment({ bookingId, amountCents: 15_000, method: ManualPaymentMethod.TRANSFER }),
    ]);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.paidAmountCents).toBe(35_000);
    expect(a.status).toBe(PaymentStatus.APPROVED);
    expect(b.status).toBe(PaymentStatus.APPROVED);
  });

  it('confirmaciones concurrentes de pagos pendientes suman sin pérdida', async () => {
    const paymentA = await prisma.payment.create({
      data: {
        bookingId: pendingBookingId,
        provider: 'MANUAL',
        method: 'CASH',
        amountCents: 20_000,
        currency: 'ARS',
        status: PaymentStatus.PENDING,
      },
    });
    const paymentB = await prisma.payment.create({
      data: {
        bookingId: pendingBookingId,
        provider: 'MANUAL',
        method: 'TRANSFER',
        amountCents: 20_000,
        currency: 'ARS',
        status: PaymentStatus.PENDING,
      },
    });

    await Promise.all([confirmManualPayment(paymentA.id), confirmManualPayment(paymentB.id)]);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: pendingBookingId } });
    expect(booking.paidAmountCents).toBe(40_000);
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.expiresAt).toBeNull();
  });

  it('no registra pagos sobre reservas canceladas y deja el pagado intacto', async () => {
    await expect(
      registerManualPayment({ bookingId: cancelledBookingId, amountCents: 30_000, method: ManualPaymentMethod.CASH }),
    ).rejects.toMatchObject({ code: 'BOOKING_NOT_PAYABLE' });

    const paymentCount = await prisma.payment.count({
      where: { bookingId: cancelledBookingId },
    });
    expect(paymentCount).toBe(0);
  });
});
