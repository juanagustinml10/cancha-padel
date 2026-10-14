import { logger } from '@/infra/logger';
import { prisma } from '@/infra/prisma';
import { purgeExpiredSessions } from '@/services/auth.service';
import { expireStaleBookings } from '@/services/bookings.service';
import { retryDueWebhookEvents } from '@/services/webhook.service';

/**
 * Proceso worker: tareas periódicas de mantenimiento.
 * - Expira reservas impagas cuyo tiempo de retención terminó.
 * - Purga sesiones vencidas.
 * - Reintenta webhooks de pago fallidos (con backoff y límite de intentos).
 * En producción puede ejecutarse como tarea programada (cron) o servicio aparte.
 */
const INTERVAL_MS = 60_000;

async function tick(): Promise<void> {
  try {
    const [expiredBookings, purgedSessions, retriedWebhooks] = await Promise.all([
      expireStaleBookings(),
      purgeExpiredSessions(),
      retryDueWebhookEvents(),
    ]);
    if (expiredBookings > 0 || purgedSessions > 0 || retriedWebhooks > 0) {
      logger.info(
        { expiredBookings, purgedSessions, retriedWebhooks },
        'Mantenimiento ejecutado',
      );
    }
  } catch (error) {
    logger.error({ err: error }, 'Error en el worker de mantenimiento');
  }
}

logger.info('Worker de mantenimiento iniciado');

void tick();
const timer = setInterval(() => void tick(), INTERVAL_MS);

async function shutdown(): Promise<void> {
  clearInterval(timer);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
