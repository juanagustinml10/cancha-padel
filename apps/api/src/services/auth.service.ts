import { randomUUID } from 'node:crypto';
import type { SessionUser } from '@padel/shared';
import { SESSION_TTL_MS } from '@/config/constants';
import { unauthorized } from '@/domain/errors';
import { prisma } from '@/infra/prisma';
import { verifyPassword } from '@/utils/password';

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

export interface LoginResult {
  user: SessionUser;
  sessionId: string;
  expiresAt: Date;
}

export async function login(
  email: string,
  password: string,
  ctx: LoginContext = {},
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Mismo mensaje para usuario inexistente y contraseña incorrecta (no filtra información).
  if (!user || !user.isActive) {
    throw unauthorized('Credenciales inválidas.', 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw unauthorized('Credenciales inválidas.', 'INVALID_CREDENTIALS');
  }

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    sessionId,
    expiresAt,
  };
}

export async function logout(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
}

export async function purgeExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}
