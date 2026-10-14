import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { API_PREFIX } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/infra/logger';
import { requestContext } from '@/middleware/request-context';
import { securityHeaders, corsMiddleware } from '@/middleware/security';
import { csrfProtection } from '@/middleware/csrf';
import { generalLimiter } from '@/middleware/rate-limit';
import { errorHandler, notFoundHandler } from '@/middleware/error-handler';
import { apiRouter } from '@/routes';

/**
 * Construye la aplicación Express.
 * Se separa del `listen` para poder testearla con Supertest sin abrir puertos.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestContext);
  app.use(pinoHttp({ logger }));
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: env.NODE_ENV });
  });

  app.use(csrfProtection);
  app.use(API_PREFIX, generalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
