import type { Court } from '@padel/shared';
import { conflict, notFound } from '@/domain/errors';
import { prisma } from '@/infra/prisma';
import { serializeCourt } from '@/utils/serialize';

export interface CourtInput {
  name: string;
  type: Court['type'];
  surface?: string;
  hasLighting: boolean;
  status: Court['status'];
  description?: string;
}

export async function listActiveCourts(): Promise<Court[]> {
  const courts = await prisma.court.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  });
  return courts.map(serializeCourt);
}

export async function getCourtById(id: string): Promise<Court> {
  const court = await prisma.court.findUnique({ where: { id } });
  if (!court) throw notFound('La cancha no existe.', 'COURT_NOT_FOUND');
  return serializeCourt(court);
}

export async function listAllCourts(): Promise<Court[]> {
  const courts = await prisma.court.findMany({ orderBy: { sortOrder: 'asc' } });
  return courts.map(serializeCourt);
}

export async function createCourt(input: CourtInput): Promise<Court> {
  const count = await prisma.court.count();
  const court = await prisma.court.create({
    data: {
      name: input.name,
      type: input.type,
      surface: input.surface ?? null,
      hasLighting: input.hasLighting,
      status: input.status,
      description: input.description ?? null,
      sortOrder: count + 1,
    },
  });
  return serializeCourt(court);
}

export async function updateCourt(id: string, input: Partial<CourtInput>): Promise<Court> {
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) throw notFound('La cancha no existe.', 'COURT_NOT_FOUND');

  const court = await prisma.court.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.surface !== undefined ? { surface: input.surface ?? null } : {}),
      ...(input.hasLighting !== undefined ? { hasLighting: input.hasLighting } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
    },
  });
  return serializeCourt(court);
}

export async function deleteCourt(id: string): Promise<void> {
  const existing = await prisma.court.findUnique({ where: { id } });
  if (!existing) throw notFound('La cancha no existe.', 'COURT_NOT_FOUND');

  const bookings = await prisma.booking.count({ where: { courtId: id } });
  if (bookings > 0) {
    throw conflict(
      'No se puede eliminar una cancha con reservas asociadas. Desactivala en su lugar.',
      'COURT_HAS_BOOKINGS',
    );
  }

  await prisma.court.delete({ where: { id } });
}
