import { Router } from 'express';
import { asyncHandler } from '@/utils/async-handler';
import { processMercadoPagoWebhook } from '@/services/webhook.service';

export const webhooksRouter = Router();

/**
 * Webhook de Mercado Pago.
 * Responde 200 siempre que el evento se haya registrado (aun si es duplicado o se ignora),
 * para evitar reintentos infinitos. Sólo la firma inválida devuelve 401.
 */
webhooksRouter.post(
  '/mercadopago',
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const query = req.query as Record<string, unknown>;

    const data = (body.data ?? {}) as { id?: unknown };
    const dataIdRaw = data.id ?? query['data.id'] ?? query.id;
    const dataId = dataIdRaw !== undefined && dataIdRaw !== null ? String(dataIdRaw) : null;

    const eventIdRaw = body.id ?? query['id'];
    const eventId = eventIdRaw !== undefined && eventIdRaw !== null ? String(eventIdRaw) : null;

    const eventTypeRaw = body.type ?? body.action ?? query.type;
    const eventType = eventTypeRaw ? String(eventTypeRaw) : null;

    const result = await processMercadoPagoWebhook({
      eventId,
      eventType,
      dataId,
      headers: req.headers,
      payload: body,
    });

    res.json({ ok: true, status: result.status });
  }),
);
