import { describe, expect, it } from 'vitest';
import { PaymentStatus } from '@padel/shared';
import { isApprovedStatus, mapProviderPaymentStatus } from '@/domain/payment-status';

describe('domain/payment-status', () => {
  it('mapea los estados del proveedor al estado interno', () => {
    expect(mapProviderPaymentStatus('approved')).toBe(PaymentStatus.APPROVED);
    expect(mapProviderPaymentStatus('pending')).toBe(PaymentStatus.PENDING);
    expect(mapProviderPaymentStatus('in_process')).toBe(PaymentStatus.IN_PROCESS);
    expect(mapProviderPaymentStatus('rejected')).toBe(PaymentStatus.REJECTED);
    expect(mapProviderPaymentStatus('cancelled')).toBe(PaymentStatus.CANCELLED);
    expect(mapProviderPaymentStatus('refunded')).toBe(PaymentStatus.REFUNDED);
    expect(mapProviderPaymentStatus('charged_back')).toBe(PaymentStatus.REFUNDED);
  });

  it('trata estados desconocidos como pendientes', () => {
    expect(mapProviderPaymentStatus('algo_raro')).toBe(PaymentStatus.PENDING);
  });

  it('sólo approved se considera aprobado', () => {
    expect(isApprovedStatus(PaymentStatus.APPROVED)).toBe(true);
    expect(isApprovedStatus(PaymentStatus.PENDING)).toBe(false);
  });
});
