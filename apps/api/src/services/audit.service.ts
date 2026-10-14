import { Prisma } from '@prisma/client';
import { prisma } from '@/infra/prisma';
import { serializeAuditLog } from '@/utils/serialize';
import type { AuditLog } from '@padel/shared';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
}

/** Registra una acción en la bitácora de auditoría. Nunca interrumpe la operación principal. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        diff: input.diff,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch {
    // La auditoría es best-effort: un fallo aquí no debe romper la operación de negocio.
  }
}

export async function listAuditLogs(limit = 100): Promise<AuditLog[]> {
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return logs.map(serializeAuditLog);
}
