import type { CourtSchedule } from '@padel/shared';
import { prisma } from '@/infra/prisma';
import { serializeSchedule } from '@/utils/serialize';

export async function getSchedules(): Promise<CourtSchedule[]> {
  const schedules = await prisma.courtSchedule.findMany({ orderBy: { weekday: 'asc' } });
  return schedules.map(serializeSchedule);
}

/**
 * Reemplaza el conjunto completo de horarios de forma atómica.
 * El panel envía el listado entero; validar y reemplazar evita estados intermedios.
 */
export async function updateSchedules(schedules: CourtSchedule[]): Promise<CourtSchedule[]> {
  await prisma.$transaction(async (tx) => {
    await tx.courtSchedule.deleteMany();
    if (schedules.length > 0) {
      await tx.courtSchedule.createMany({
        data: schedules.map((schedule) => ({
          courtId: schedule.courtId ?? null,
          weekday: schedule.weekday,
          opensAt: schedule.opensAt,
          closesAt: schedule.closesAt,
          slotMinutes: schedule.slotMinutes,
          isActive: schedule.isActive,
        })),
      });
    }
  });

  return getSchedules();
}
