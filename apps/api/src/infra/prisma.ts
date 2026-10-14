import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Cliente Prisma único por proceso.
 * En desarrollo se reutiliza la instancia a través de `globalThis` para evitar
 * múltiples conexiones al recargar con `tsx watch`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['error', 'warn'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
