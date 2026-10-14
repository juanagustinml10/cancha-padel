import { PrismaClient } from '@prisma/client';

/**
 * Soporte para pruebas de integración/concurrencia.
 *
 * Estas pruebas requieren una base de datos PostgreSQL real (por ejemplo, el servicio
 * local o un contenedor). Si `TEST_DATABASE_URL` no está definida, se OMITEN:
 * `describeIntegration` se comporta como `describe.skip`.
 */

export const HAS_TEST_DB = Boolean(process.env.TEST_DATABASE_URL);

export const describeIntegration = HAS_TEST_DB ? describe : describe.skip;

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: process.env.TEST_DATABASE_URL } },
  });
}

/** Limpia las tablas relevantes respetando el orden de dependencias. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.paymentWebhookEvent.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.courtBlock.deleteMany(),
    prisma.pricingRule.deleteMany(),
    prisma.courtSchedule.deleteMany(),
    prisma.court.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.faq.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.galleryImage.deleteMany(),
  ]);
}
