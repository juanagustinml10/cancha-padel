/**
 * Pruebas de integración y concurrencia (REQUIEREN base de datos).
 *
 * Se ejecutan sólo si `TEST_DATABASE_URL` está definido; de lo contrario se omiten.
 * Verifican el comportamiento real de la protección anti doble-reserva contra PostgreSQL.
 */
import { afterAll, beforeEach, expect, it } from 'vitest';
import { prisma } from '@/infra/prisma';
import { clubDateKey, clubLocalToUtc, clubWeekdayOfDate } from '@/domain/time';
import { createOnlineBooking } from '@/services/bookings.service';
import { describeIntegration, resetDatabase } from '../helpers/db';

describeIntegration('Reservas · concurrencia (requiere TEST_DATABASE_URL)', () => {
  let courtId: string;
  let startsAtIso: string;

  beforeEach(async () => {
    await resetDatabase(prisma);

    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const dateKey = clubDateKey(future);
    const weekday = clubWeekdayOfDate(dateKey);
    startsAtIso = clubLocalToUtc(dateKey, '18:00').toISOString();

    const court = await prisma.court.create({
      data: { name: 'Cancha Test', type: 'INDOOR', hasLighting: true, status: 'ACTIVE' },
    });
    courtId = court.id;

    await prisma.courtSchedule.create({
      data: {
        courtId: null,
        weekday,
        opensAt: '08:00',
        closesAt: '23:00',
        slotMinutes: 60,
        isActive: true,
      },
    });

    await prisma.pricingRule.create({
      data: {
        courtId: null,
        weekday: null,
        startTime: '08:00',
        endTime: '23:00',
        durationMinutes: 60,
        priceCents: 1_000_000,
        currency: 'ARS',
        isActive: true,
        priority: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sólo permite una reserva cuando muchas intentan el mismo horario a la vez', async () => {
    const attempts = Array.from({ length: 8 }, (_, index) =>
      createOnlineBooking({
        courtId,
        startsAt: startsAtIso,
        durationMinutes: 60,
        customer: {
          fullName: `Cliente ${index}`,
          email: `cliente${index}@example.com`,
          phone: '1122334455',
        },
      }),
    );

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    for (const result of rejected) {
      expect((result as PromiseRejectedResult).reason).toMatchObject({ code: 'SLOT_TAKEN' });
    }

    const count = await prisma.booking.count({ where: { courtId } });
    expect(count).toBe(1);
  });

  it('permite reservar el mismo horario en canchas distintas', async () => {
    const secondCourt = await prisma.court.create({
      data: { name: 'Cancha Test 2', type: 'OUTDOOR', hasLighting: false, status: 'ACTIVE' },
    });

    const [a, b] = await Promise.all([
      createOnlineBooking({
        courtId,
        startsAt: startsAtIso,
        durationMinutes: 60,
        customer: { fullName: 'A', email: 'a@example.com', phone: '1122334455' },
      }),
      createOnlineBooking({
        courtId: secondCourt.id,
        startsAt: startsAtIso,
        durationMinutes: 60,
        customer: { fullName: 'B', email: 'b@example.com', phone: '1122334466' },
      }),
    ]);

    expect(a.status).toBe('PENDING_PAYMENT');
    expect(b.status).toBe('PENDING_PAYMENT');
  });
});
