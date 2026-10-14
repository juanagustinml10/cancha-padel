import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { tooManyRequests } from '@/domain/errors';
import { env } from '@/config/env';

function createLimiter(windowMs: number, max: number): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, _res, next) => next(tooManyRequests()),
  });
}

/** Límite general para toda la API. */
export const generalLimiter = createLimiter(60 * 1000, 300);

/** Límite estricto para login (anti fuerza bruta). */
export const authLimiter = createLimiter(15 * 60 * 1000, 10);

/** Límite para creación de reservas. */
export const bookingLimiter = createLimiter(10 * 60 * 1000, 30);

/** Límite para el formulario de contacto. */
export const contactLimiter = createLimiter(60 * 60 * 1000, 10);

/** Límite para checkout / preferencias de pago. */
export const checkoutLimiter = createLimiter(10 * 60 * 1000, 30);
