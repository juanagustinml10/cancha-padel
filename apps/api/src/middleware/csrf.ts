import { randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';
import { CSRF_COOKIE, CSRF_HEADER } from '@/config/constants';
import { forbidden } from '@/domain/errors';
import { env } from '@/config/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PREFIXES = ['/api/v1/webhooks'];

/**
 * Protección CSRF por doble envío (double-submit cookie).
 * - En toda respuesta se asegura una cookie `csrf` legible por JS (no HttpOnly).
 * - En métodos mutating se exige la cabecera `x-csrf-token` con el mismo valor.
 * - El webhook de Mercado Pago queda exento (lo autentica la firma del proveedor).
 */
export const csrfProtection: RequestHandler = (req, res, next) => {
  let token = (req.cookies as Record<string, string> | undefined)?.[CSRF_COOKIE];

  if (!token) {
    token = randomBytes(24).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: env.isProduction,
      path: '/',
    });
  }

  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const header = req.header(CSRF_HEADER);
  if (!header || header !== token) {
    return next(forbidden('Token CSRF inválido o ausente.', 'CSRF_INVALID'));
  }

  return next();
};
