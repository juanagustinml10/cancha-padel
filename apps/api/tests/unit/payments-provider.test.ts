import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fakePaymentProvider } from '@/payments/fake.provider';
import { mercadoPagoProvider } from '@/payments/mercadopago.provider';

const SECRET = 'test-webhook-secret';

function sign(ts: string, dataId: string, requestId: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac('sha256', SECRET).update(manifest).digest('hex');
}

describe('payments · fake provider', () => {
  it('no está configurado y nunca simula un cobro', async () => {
    expect(fakePaymentProvider.configured).toBe(false);
    await expect(
      fakePaymentProvider.createPreference({
        bookingCode: 'PC-ABC123',
        amountCents: 1000,
        currency: 'ARS',
        description: 'test',
        payerEmail: 'test@example.com',
        externalReference: 'PC-ABC123',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENTS_DISABLED' });
  });
});

describe('payments · mercadopago webhook signature', () => {
  it('acepta una firma válida', () => {
    const ts = '1700000000';
    const requestId = 'req-1';
    const dataId = '123456';
    const valid = mercadoPagoProvider.verifyWebhookSignature({
      headers: {
        'x-signature': `ts=${ts},v1=${sign(ts, dataId, requestId)}`,
        'x-request-id': requestId,
      },
      dataId,
    });
    expect(valid).toBe(true);
  });

  it('rechaza una firma manipulada', () => {
    const valid = mercadoPagoProvider.verifyWebhookSignature({
      headers: {
        'x-signature': 'ts=1700000000,v1=deadbeef',
        'x-request-id': 'req-1',
      },
      dataId: '123456',
    });
    expect(valid).toBe(false);
  });

  it('rechaza cuando falta data.id', () => {
    const valid = mercadoPagoProvider.verifyWebhookSignature({
      headers: { 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'req-1' },
    });
    expect(valid).toBe(false);
  });

  it('acepta una firma válida cuando el manifiesto omite request-id', () => {
    const ts = '1700000000';
    const dataId = '123456';
    const manifest = `id:${dataId};ts:${ts};`;
    const v1 = createHmac('sha256', SECRET).update(manifest).digest('hex');
    const valid = mercadoPagoProvider.verifyWebhookSignature({
      headers: { 'x-signature': `ts=${ts},v1=${v1}` },
      dataId,
    });
    expect(valid).toBe(true);
  });

  it('rechaza una firma generada con otro secreto', () => {
    const ts = '1700000000';
    const dataId = '123456';
    const requestId = 'req-1';
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', 'otro-secreto').update(manifest).digest('hex');
    const valid = mercadoPagoProvider.verifyWebhookSignature({
      headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId },
      dataId,
    });
    expect(valid).toBe(false);
  });
});

describe('payments · fake provider no ofrece preferencias', () => {
  it('getPreference falla de forma explícita', async () => {
    await expect(fakePaymentProvider.getPreference('pref-1')).rejects.toMatchObject({
      code: 'PAYMENTS_DISABLED',
    });
  });
});
