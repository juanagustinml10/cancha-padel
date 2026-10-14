import { env } from '@/config/env';
import { fakePaymentProvider } from './fake.provider';
import { mercadoPagoProvider } from './mercadopago.provider';
import type { PaymentProviderAdapter } from './provider';

/**
 * Selecciona el proveedor de pagos según `PAYMENTS_PROVIDER`.
 * Con `fake` el sistema funciona completo salvo el cobro real (que falla explícitamente).
 */
export const paymentProvider: PaymentProviderAdapter =
  env.PAYMENTS_PROVIDER === 'mercadopago' ? mercadoPagoProvider : fakePaymentProvider;

export type { PaymentProviderAdapter } from './provider';
export { PaymentProviderError } from './provider';
