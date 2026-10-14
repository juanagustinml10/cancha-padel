import { prisma } from '@/infra/prisma';
import { startMaintenanceWorker } from '@/infra/maintenance';

/**
 * Proceso worker: tareas periódicas de mantenimiento.
 * En producción puede ejecutarse como tarea programada (cron), servicio aparte,
 * o embebido en el servidor HTTP activando `ENABLE_WORKER=true`.
 */
const stopWorker = startMaintenanceWorker();

async function shutdown(): Promise<void> {
  stopWorker();
  await prisma.$disconnect().catch(() => undefined);
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
