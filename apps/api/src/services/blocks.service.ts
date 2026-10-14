import type { CourtBlock as SharedCourtBlock } from '@padel/shared';
import { notFound } from '@/domain/errors';
import { prisma } from '@/infra/prisma';
import { serializeBlock } from '@/utils/serialize';

export interface BlockInput {
  courtId?: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdById?: string | null;
}

export async function listBlocks(): Promise<SharedCourtBlock[]> {
  const blocks = await prisma.courtBlock.findMany({ orderBy: { startsAt: 'asc' } });
  return blocks.map(serializeBlock);
}

export async function createBlock(input: BlockInput): Promise<SharedCourtBlock> {
  const block = await prisma.courtBlock.create({
    data: {
      courtId: input.courtId ? input.courtId : null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      reason: input.reason,
      createdById: input.createdById ?? null,
    },
  });
  return serializeBlock(block);
}

export async function deleteBlock(id: string): Promise<void> {
  const existing = await prisma.courtBlock.findUnique({ where: { id } });
  if (!existing) throw notFound('Bloqueo no encontrado.', 'BLOCK_NOT_FOUND');
  await prisma.courtBlock.delete({ where: { id } });
}
