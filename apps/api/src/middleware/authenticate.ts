import type { RequestHandler } from 'express';
import { SESSION_COOKIE } from '@/config/constants';
import { unauthorized } from '@/domain/errors';
import { prisma } from '@/infra/prisma';

/**
 * Autenticación por cookie de sesión opaca (`sid`, HttpOnly).
 * La sesión vive en la base de datos (no hay JWT en el cliente).
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!sessionId) {
      return next(unauthorized());
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return next(unauthorized());
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return next(unauthorized('Tu sesión expiró. Volvé a ingresar.', 'SESSION_EXPIRED'));
    }

    if (!session.user.isActive) {
      return next(unauthorized('Tu cuenta está deshabilitada.', 'ACCOUNT_DISABLED'));
    }

    req.sessionId = session.id;
    req.user = {
      id: session.user.id,
      fullName: session.user.fullName,
      email: session.user.email,
      role: session.user.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Autenticación opcional: si hay sesión válida, la carga; si no, continúa sin usuario.
 * Útil para endpoints que se comportan distinto según haya sesión.
 */
export const authenticateOptional: RequestHandler = (req, res, next) => {
  const sessionId = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  if (!sessionId) return next();
  return authenticate(req, res, next);
};
