import type { RequestHandler } from 'express';
import type { Role } from '@padel/shared';
import { forbidden, unauthorized } from '@/domain/errors';

/**
 * Autorización por rol. Debe usarse después de `authenticate`.
 * Sin roles indicados, sólo exige estar autenticado.
 */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(forbidden());
    }
    return next();
  };
}
