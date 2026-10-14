import { serviceUnavailable } from '@/domain/errors';
import type {
  CreatePreferenceInput,
  CreatePreferenceResult,
  PaymentProviderAdapter,
  ProviderPayment,
  RefundResult,
  WebhookSignatureInput,
} from './provider';

/**
 * Proveedor falso: NO procesa pagos.
 *
 * Existe para permitir levantar el sistema sin credenciales de Mercado Pago.
 * Cualquier intento de cobrar falla de forma explícita (503): nunca simula una
 * aprobación, para no dar por confirmadas reservas que no fueron pagadas.
 */
export const fakePaymentProvider: PaymentProviderAdapter = {
  name: 'fake',
  configured: false,

  async createPreference(_input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    void _input;
    throw serviceUnavailable(
      'El cobro online no está disponible: configurá Mercado Pago (PAYMENTS_PROVIDER=mercadopago) para habilitarlo.',
      'PAYMENTS_DISABLED',
    );
  },

  async getPreference(_preferenceId: string): Promise<CreatePreferenceResult> {
    void _preferenceId;
    throw serviceUnavailable('El proveedor de pagos no está configurado.', 'PAYMENTS_DISABLED');
  },

  async getPayment(_providerPaymentId: string): Promise<ProviderPayment> {
    void _providerPaymentId;
    throw serviceUnavailable('El proveedor de pagos no está configurado.', 'PAYMENTS_DISABLED');
  },

  async refund(_providerPaymentId: string, _amountCents?: number): Promise<RefundResult> {
    void _providerPaymentId;
    void _amountCents;
    throw serviceUnavailable('El proveedor de pagos no está configurado.', 'PAYMENTS_DISABLED');
  },

  verifyWebhookSignature(_input: WebhookSignatureInput): boolean {
    void _input;
    return false;
  },
};
