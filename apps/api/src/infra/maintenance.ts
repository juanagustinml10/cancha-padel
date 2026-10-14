import { logger } from '@/infra/logger';
import { purgeExpiredSessions } from '@/services/auth.service';
import { expireStaleBookings } from '@/services/bookings.service';
import { retryDueWebhookEvents } from '@/services/webhook.service';

/**
 * Tareas periódicas de mantenimiento:
 * - Expira reservas impagas cuyo tiempo de retención terminó.
 * - Purga sesiones vencidas.
 * - Reintenta webhooks de pago fallidos (con backoff y límite de intentos).
 *
 * Se expone como módulo reutilizable para poder correrlo:
 *  - como proceso aparte (`src/worker.ts`, multi-servicio o cron), o
 *  - embebido en el servidor HTTP cuando `ENABLE_WORKER=true`.
 */
export const MAINTENANCE_INTERVAL_MS = 60_000;

export async function runMaintenanceTick(): Promise<void> {
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

/**
 * Arranca el worker en el proceso actual y devuelve una función para detenerlo.
 */
export function startMaintenanceWorker(
  intervalMs: number = MAINTENANCE_INTERVAL_MS,
): () => void {
  logger.info('Worker de mantenimiento iniciado');
  void runMaintenanceTick();
  const timer = setInterval(() => void runMaintenanceTick(), intervalMs);
  return () => clearInterval(timer);
}
