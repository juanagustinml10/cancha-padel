import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '@/domain/errors';
import { env } from '@/config/env';
import { MP_REQUEST_ID_HEADER, MP_SIGNATURE_HEADER } from '@/config/constants';
import {
  PaymentProviderError,
  type CreatePreferenceInput,
  type CreatePreferenceResult,
  type PaymentProviderAdapter,
  type ProviderPayment,
  type RefundResult,
  type WebhookSignatureInput,
} from './provider';

const MP_API_BASE = 'https://api.mercadopago.com';

interface MpPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

interface MpPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
}

function accessToken(): string {
  if (!env.MP_ACCESS_TOKEN) {
    throw new AppError('Mercado Pago no está configurado.', 503, 'MP_NOT_CONFIGURED');
  }
  return env.MP_ACCESS_TOKEN;
}

/**
 * Cliente HTTP de la API oficial. Clasifica los fallos como transitorios (red, 5xx, 429)
 * o permanentes (4xx) para permitir reintentos seguros sólo cuando tiene sentido.
 */
async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${MP_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // Falla de red/DNS/timeout: conviene reintentar.
    throw new PaymentProviderError('No se pudo conectar con Mercado Pago.', {
      transient: true,
      code: 'MP_NETWORK_ERROR',
    });
  }

  if (!response.ok) {
    const transient = response.status >= 500 || response.status === 429;
    throw new PaymentProviderError('Error al comunicarse con Mercado Pago.', {
      transient,
      code: 'MP_ERROR',
      status: response.status,
    });
  }

  return (await response.json()) as T;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Verifica la firma `x-signature` del webhook (HMAC-SHA256) según el esquema oficial.
 * Manifiesto: `id:{data.id};request-id:{x-request-id};ts:{ts};` — los valores ausentes
 * se OMITEN del manifiesto antes de calcular el HMAC (indicación de la doc oficial).
 */
function verifySignature(input: WebhookSignatureInput): boolean {
  const secret = env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const rawSignature = input.headers[MP_SIGNATURE_HEADER];
  const rawRequestId = input.headers[MP_REQUEST_ID_HEADER];
  const signature = Array.isArray(rawSignature) ? rawSignature[0] : rawSignature;
  const requestId = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId;

  if (!signature) return false;

  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifestParts: string[] = [];
  if (input.dataId) manifestParts.push(`id:${input.dataId}`);
  if (requestId) manifestParts.push(`request-id:${requestId}`);
  manifestParts.push(`ts:${ts}`);
  const manifest = `${manifestParts.join(';')};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(v1, 'utf8');
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function mapPreference(result: MpPreferenceResponse): CreatePreferenceResult {
  return {
    preferenceId: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}

export const mercadoPagoProvider: PaymentProviderAdapter = {
  name: 'mercadopago',
  configured: Boolean(env.MP_ACCESS_TOKEN),

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
    const body = {
      items: [
        {
          title: input.description,
          quantity: 1,
          currency_id: input.currency,
          unit_price: input.amountCents / 100,
        },
      ],
      payer: { email: input.payerEmail },
      external_reference: input.externalReference,
      ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
      ...(input.backUrls
        ? {
            back_urls: input.backUrls,
            // `auto_return` sólo es válido con back_urls.success en HTTPS.
            ...(input.backUrls.success?.startsWith('https')
              ? { auto_return: 'approved' as const }
              : {}),
          }
        : {}),
    };

    const result = await mpFetch<MpPreferenceResponse>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return mapPreference(result);
  },

  async getPreference(preferenceId: string): Promise<CreatePreferenceResult> {
    const result = await mpFetch<MpPreferenceResponse>(
      `/checkout/preferences/${encodeURIComponent(preferenceId)}`,
    );
    return mapPreference(result);
  },

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const payment = await mpFetch<MpPaymentResponse>(
      `/v1/payments/${encodeURIComponent(providerPaymentId)}`,
    );
    return {
      providerPaymentId: String(payment.id),
      status: payment.status,
      statusDetail: payment.status_detail,
      amountCents: toCents(payment.transaction_amount),
      currency: payment.currency_id,
      externalReference: payment.external_reference,
      method: payment.payment_type_id ?? payment.payment_method_id,
      raw: payment,
    };
  },

  async refund(providerPaymentId: string, amountCents?: number): Promise<RefundResult> {
    const result = await mpFetch<{ status?: string }>(
      `/v1/payments/${encodeURIComponent(providerPaymentId)}/refunds`,
      {
        method: 'POST',
        ...(amountCents !== undefined
          ? { body: JSON.stringify({ amount: amountCents / 100 }) }
          : {}),
      },
    );
    return { status: result.status ?? 'refunded', raw: result };
  },

  verifyWebhookSignature: verifySignature,
};
