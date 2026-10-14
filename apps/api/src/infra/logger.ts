import pino from 'pino';
import { env } from '@/config/env';

/**
 * Logger estructurado. En producción emite JSON; en desarrollo, salida legible.
 */
export const logger = pino({
  level: env.isTest ? 'silent' : env.isProduction ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        }
      : undefined,
});

export type Logger = typeof logger;
