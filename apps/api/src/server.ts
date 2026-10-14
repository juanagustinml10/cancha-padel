import { createApp } from '@/app';
import { API_PREFIX } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/infra/logger';
import { startMaintenanceWorker } from '@/infra/maintenance';
import { prisma } from '@/infra/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API PADEL CLUB escuchando en http://localhost:${env.PORT}${API_PREFIX}`);
});

// En despliegues de un solo contenedor el worker corre embebido en el servidor.
const stopWorker = env.ENABLE_WORKER ? startMaintenanceWorker() : undefined;

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Cerrando servidor…');
  stopWorker?.();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  // Fuerza el cierre si algo queda colgado.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
