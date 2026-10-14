import { describe, expect, it } from 'vitest';
import { BookingStatus, PaymentStatus } from '@padel/shared';
import { resolvePaymentDecision, type PaymentContext } from '@/domain/payment-processing';

const baseContext: PaymentContext = {
  bookingStatus: BookingStatus.PENDING_PAYMENT,
  bookingPaidAmountCents: 0,
  bookingPriceTotalCents: 100_000,
  expectedDepositCents: 30_000,
  expectedCurrency: 'ARS',
  currentPaymentStatus: null,
};

function context(overrides: Partial<PaymentContext> = {}): PaymentContext {
  return { ...baseContext, ...overrides };
}

describe('payment-processing · estados no aprobados', () => {
  it('registra un pago pendiente sin tocar la reserva', () => {
    const decision = resolvePaymentDecision(context(), {
      providerStatus: 'pending',
      amountCents: 30_000,
      currency: 'ARS',
    });
    expect(decision).toMatchObject({
      mappedStatus: PaymentStatus.PENDING,
      action: 'RECORD_ONLY',
      applyStatus: true,
      requiresReview: false,
    });
  });

  it('registra un pago rechazado', () => {
    const decision = resolvePaymentDecision(context(), {
      providerStatus: 'rejected',
      amountCents: 30_000,
      currency: 'ARS',
    });
    expect(decision).toMatchObject({ mappedStatus: PaymentStatus.REJECTED, action: 'RECORD_ONLY' });
  });
});

describe('payment-processing · pago aprobado válido', () => {
  it('confirma una reserva pendiente con seña correcta', () => {
    const decision = resolvePaymentDecision(context(), {
      providerStatus: 'approved',
      amountCents: 30_000,
      currency: 'ARS',
    });
    expect(decision).toMatchObject({
      mappedStatus: PaymentStatus.APPROVED,
      action: 'CONFIRM_BOOKING',
      requiresReview: false,
      reason: 'approved',
    });
  });

  it('acepta sobrepago (registra sin revisión)', () => {
    const decision = resolvePaymentDecision(context(), {
      providerStatus: 'approved',
      amountCents: 50_000,
      currency: 'ARS',
    });
    expect(decision).toMatchObject({ action: 'CONFIRM_BOOKING', requiresReview: false });
  });

  it('no reconfirma una reserva ya confirmada', () => {
    const decision = resolvePaymentDecision(
      context({ bookingStatus: BookingStatus.CONFIRMED }),
      { providerStatus: 'approved', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({
      action: 'RECORD_ONLY',
      requiresReview: false,
      reason: 'approved_already_confirmed',
    });
  });
});

describe('payment-processing · importes y moneda', () => {
  it('marca revisión cuando el importe es menor a la seña', () => {
    const decision = resolvePaymentDecision(context(), {
      providerStatus: 'approved',
      amountCents: 10_000,
      currency: 'ARS',
    });
    expect(decision).toMatchObject({
      action: 'FLAG_REVIEW',
      requiresReview: true,
      reason: 'amount_mismatch',
    });
  });

  it('marca revisión cuando la moneda no coincide', () => {
    const decision = resolvePaymentDecision(context(), {
      providerStatus: 'approved',
      amountCents: 30_000,
      currency: 'USD',
    });
    expect(decision).toMatchObject({
      action: 'FLAG_REVIEW',
      requiresReview: true,
      reason: 'currency_mismatch',
    });
  });
});

describe('payment-processing · pagos tardíos', () => {
  it('marca revisión si la reserva ya venció (nunca reasigna)', () => {
    const decision = resolvePaymentDecision(
      context({ bookingStatus: BookingStatus.EXPIRED }),
      { providerStatus: 'approved', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({
      action: 'FLAG_REVIEW',
      requiresReview: true,
      reason: 'late_payment',
    });
  });

  it('marca revisión si la reserva fue cancelada', () => {
    const decision = resolvePaymentDecision(
      context({ bookingStatus: BookingStatus.CANCELLED }),
      { providerStatus: 'approved', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({ action: 'FLAG_REVIEW', reason: 'late_payment' });
  });
});

describe('payment-processing · idempotencia y fuera de orden', () => {
  it('ignora un estado repetido', () => {
    const decision = resolvePaymentDecision(
      context({ currentPaymentStatus: PaymentStatus.APPROVED }),
      { providerStatus: 'approved', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({
      applyStatus: false,
      action: 'IGNORE',
      reason: 'out_of_order_or_duplicate',
    });
  });

  it('ignora un retroceso de aprobado a pendiente', () => {
    const decision = resolvePaymentDecision(
      context({ currentPaymentStatus: PaymentStatus.APPROVED }),
      { providerStatus: 'pending', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({ applyStatus: false, action: 'IGNORE' });
  });

  it('permite el avance de pendiente a aprobado', () => {
    const decision = resolvePaymentDecision(
      context({ currentPaymentStatus: PaymentStatus.PENDING }),
      { providerStatus: 'approved', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({ applyStatus: true, action: 'CONFIRM_BOOKING' });
  });

  it('permite reintegrar un pago aprobado', () => {
    const decision = resolvePaymentDecision(
      context({ bookingStatus: BookingStatus.CONFIRMED, currentPaymentStatus: PaymentStatus.APPROVED }),
      { providerStatus: 'refunded', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({ mappedStatus: PaymentStatus.REFUNDED, applyStatus: true });
  });

  it('ignora cualquier cambio posterior a un reintegro', () => {
    const decision = resolvePaymentDecision(
      context({ currentPaymentStatus: PaymentStatus.REFUNDED }),
      { providerStatus: 'approved', amountCents: 30_000, currency: 'ARS' },
    );
    expect(decision).toMatchObject({ applyStatus: false, action: 'IGNORE' });
  });
});
