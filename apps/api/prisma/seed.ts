/**
 * Datos de ejemplo (SOLO desarrollo/pruebas).
 *
 * Este script es idempotente y debe ejecutarse únicamente en entornos de desarrollo.
 * Los datos NO son contenido comercial real: son placeholders para poder probar el sistema.
 * No ejecutar en producción.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/infra/prisma';
import { env } from '@/config/env';
import {
  DEFAULT_FAQS,
  DEFAULT_PRICING,
  DEFAULT_PROMOTIONS,
  DEFAULT_SCHEDULES,
} from '@/config/content';
import { DEFAULT_SETTINGS } from '@/services/settings.service';
import { hashPassword } from '@/utils/password';

const DEMO_COURTS = [
  {
    name: 'Cancha 1',
    type: 'INDOOR' as const,
    surface: 'Césped sintético',
    hasLighting: true,
    status: 'ACTIVE' as const,
    description: 'Cancha indoor con paredes de vidrio y césped de última generación.',
    sortOrder: 1,
  },
  {
    name: 'Cancha 2',
    type: 'INDOOR' as const,
    surface: 'Césped sintético',
    hasLighting: true,
    status: 'ACTIVE' as const,
    description: 'Cancha indoor ideal para partidos nocturnos.',
    sortOrder: 2,
  },
  {
    name: 'Cancha 3',
    type: 'OUTDOOR' as const,
    surface: 'Césped sintético',
    hasLighting: true,
    status: 'ACTIVE' as const,
    description: 'Cancha descubierta con iluminación LED.',
    sortOrder: 3,
  },
  {
    name: 'Cancha 4',
    type: 'OUTDOOR' as const,
    surface: 'Césped sintético',
    hasLighting: false,
    status: 'ACTIVE' as const,
    description: 'Cancha descubierta para jugar de día.',
    sortOrder: 4,
  },
];

const DEMO_GALLERY = [
  { url: '', alt: 'Cancha de pádel con iluminación nocturna', sortOrder: 1 },
  { url: '', alt: 'Detalle de la red y superficie de juego', sortOrder: 2 },
  { url: '', alt: 'Zona de descanso y cantina', sortOrder: 3 },
  { url: '', alt: 'Vestuarios del complejo', sortOrder: 4 },
  { url: '', alt: 'Vista general de las canchas', sortOrder: 5 },
  { url: '', alt: 'Jugadores en pleno partido', sortOrder: 6 },
];

async function seedSettings(): Promise<void> {
  await prisma.setting.upsert({
    where: { key: 'club' },
    create: { key: 'club', value: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue },
    update: {},
  });
}

async function seedContent(): Promise<void> {
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({ data: DEFAULT_FAQS });
  }
  if ((await prisma.promotion.count()) === 0) {
    await prisma.promotion.createMany({ data: DEFAULT_PROMOTIONS });
  }
  if ((await prisma.galleryImage.count()) === 0) {
    await prisma.galleryImage.createMany({ data: DEMO_GALLERY });
  }
}

async function seedCourts(): Promise<void> {
  if ((await prisma.court.count()) === 0) {
    await prisma.court.createMany({ data: DEMO_COURTS });
  }
}

async function seedSchedule(): Promise<void> {
  if ((await prisma.courtSchedule.count()) === 0) {
    await prisma.courtSchedule.createMany({
      data: DEFAULT_SCHEDULES.map((schedule) => ({ ...schedule, courtId: null })),
    });
  }
}

async function seedPricing(): Promise<void> {
  if ((await prisma.pricingRule.count()) === 0) {
    await prisma.pricingRule.createMany({
      data: DEFAULT_PRICING.map((rule) => ({
        courtId: null,
        weekday: rule.weekday,
        startTime: rule.startTime,
        endTime: rule.endTime,
        durationMinutes: 60,
        priceCents: rule.priceCents,
        currency: env.CURRENCY,
        isActive: true,
        priority: 0,
      })),
    });
  }
}

async function seedUsers(): Promise<void> {
  const adminPassword = await hashPassword(env.SEED_ADMIN_PASSWORD);
  const receptionPassword = await hashPassword(env.SEED_RECEPTION_PASSWORD);

  await prisma.user.upsert({
    where: { email: env.SEED_ADMIN_EMAIL.toLowerCase() },
    create: {
      email: env.SEED_ADMIN_EMAIL.toLowerCase(),
      fullName: 'Administrador Demo',
      role: 'ADMIN',
      passwordHash: adminPassword,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: env.SEED_RECEPTION_EMAIL.toLowerCase() },
    create: {
      email: env.SEED_RECEPTION_EMAIL.toLowerCase(),
      fullName: 'Recepción Demo',
      role: 'RECEPTION',
      passwordHash: receptionPassword,
    },
    update: {},
  });
}

async function main(): Promise<void> {
  await seedSettings();
  await seedContent();
  await seedCourts();
  await seedSchedule();
  await seedPricing();
  await seedUsers();

  console.log('Seed completado: usuarios, canchas, horarios, tarifas y contenido de ejemplo.');
  console.log(`Usuarios demo: ${env.SEED_ADMIN_EMAIL} (ADMIN) y ${env.SEED_RECEPTION_EMAIL} (RECEPTION).`);
  console.log('Recordatorio: son datos de ejemplo para desarrollo, no contenido comercial real.');
}

main()
  .catch((error) => {
    console.error('Error en el seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
