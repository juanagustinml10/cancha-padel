import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Asigna un id de correlación a cada request (reutiliza `x-request-id` si viene)
 * y lo devuelve en la respuesta para facilitar el seguimiento en logs.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length <= 200 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}
