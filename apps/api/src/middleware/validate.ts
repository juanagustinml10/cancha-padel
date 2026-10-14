import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { validationError } from '@/domain/errors';

type Source = 'body' | 'query' | 'params';

/**
 * Valida y reemplaza `req[source]` con el resultado tipado del esquema Zod.
 * Ante error, devuelve 400 con el detalle de los campos inválidos.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = (result.error as ZodError).issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(validationError('Los datos enviados no son válidos.', details));
    }
    req[source] = result.data;
    return next();
  };
}
