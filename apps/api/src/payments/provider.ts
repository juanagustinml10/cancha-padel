/**
 * Contrato del proveedor de pagos.
 * La lógica de reservas depende de esta interfaz, no de Mercado Pago directamente,
 * lo que permite probar con un proveedor falso sin acoplar el dominio.
 */

export interface CreatePreferenceInput {
  bookingCode: string;
  amountCents: number;
  currency: string;
  description: string;
  payerEmail: string;
  externalReference: string;
  notificationUrl?: string;
  backUrls?: { success?: string; failure?: string; pending?: string };
}

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface ProviderPayment {
  providerPaymentId: string;
  /** Estado crudo tal como lo informa el proveedor (ej: "approved", "pending"). */
  status: string;
  statusDetail?: string;
  amountCents: number;
  currency: string;
  externalReference?: string;
  method?: string;
  raw: unknown;
}

export interface RefundResult {
  status: string;
  raw: unknown;
}

export interface WebhookSignatureInput {
  /** Cabeceras en minúsculas. */
  headers: Record<string, string | string[] | undefined>;
  /** Identificador del pago notificado (data.id). */
  dataId?: string;
}

export interface PaymentProviderAdapter {
  readonly name: 'mercadopago' | 'fake';
  readonly configured: boolean;
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult>;
  /** Recupera una preferencia existente (para reintentos idempotentes del checkout). */
  getPreference(preferenceId: string): Promise<CreatePreferenceResult>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refund(providerPaymentId: string, amountCents?: number): Promise<RefundResult>;
  verifyWebhookSignature(input: WebhookSignatureInput): boolean;
}

/**
 * Error de un proveedor de pagos. `transient` indica si conviene reintentar
 * (fallo de red o de servicio) o si es permanente (datos inválidos, no encontrado).
 */
export class PaymentProviderError extends Error {
  readonly transient: boolean;
  readonly code: string;
  readonly status?: number;

  constructor(message: string, options: { transient: boolean; code: string; status?: number }) {
    super(message);
    this.name = 'PaymentProviderError';
    this.transient = options.transient;
    this.code = options.code;
    this.status = options.status;
  }
}
