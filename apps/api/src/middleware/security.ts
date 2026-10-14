import helmet from 'helmet';
import cors from 'cors';
import type { RequestHandler } from 'express';
import { env } from '@/config/env';

/** Cabeceras de seguridad HTTP. Al ser un API JSON no hay CSP de HTML relevante. */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
});

/** CORS con credenciales (cookies) y lista blanca de orígenes. */
export const corsMiddleware: RequestHandler = cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
});
