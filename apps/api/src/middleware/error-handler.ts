import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import type { ApiErrorBody } from '@padel/shared';
import { AppError, notFound } from '@/domain/errors';
import { logger } from '@/infra/logger';
import { env } from '@/config/env';

function isJsonSyntaxError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    'body' in error &&
    (error as { type?: string }).type === 'entity.parse.failed'
  );
}

function fromPrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      return new AppError('Ya existe un registro con esos datos.', 409, 'DUPLICATE', error.meta);
    case 'P2003':
      return new AppError(
        'La operación viola una referencia entre registros.',
        409,
        'FOREIGN_KEY_VIOLATION',
      );
    case 'P2025':
      return notFound('El recurso solicitado no existe.', 'NOT_FOUND');
    case 'P2000':
      return new AppError('Uno de los valores es demasiado largo.', 400, 'VALUE_TOO_LONG');
    default:
      return new AppError('Error de base de datos.', 500, 'DATABASE_ERROR', undefined, false);
  }
}

/** Convierte cualquier error en la respuesta uniforme de la API. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    appError = new AppError('Datos inválidos.', 400, 'VALIDATION_ERROR', error.flatten());
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = fromPrismaError(error);
  } else if (isJsonSyntaxError(error)) {
    appError = new AppError('El cuerpo de la solicitud no es JSON válido.', 400, 'INVALID_JSON');
  } else {
    appError = new AppError(
      'Ocurrió un error inesperado.',
      500,
      'INTERNAL_ERROR',
      undefined,
      false,
    );
  }

  const logPayload = {
    requestId: req.requestId,
    code: appError.code,
    status: appError.status,
    path: req.originalUrl,
    method: req.method,
  };

  if (appError.status >= 500) {
    logger.error({ ...logPayload, err: error }, 'Error no controlado');
  } else {
    logger.warn(logPayload, 'Solicitud rechazada');
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.expose ? appError.message : 'Ocurrió un error inesperado.',
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  };

  if (!env.isProduction && error instanceof Error && appError.status >= 500) {
    (body.error as { stack?: string }).stack = error.stack;
  }

  res.status(appError.status).json(body);
};

/** 404 para rutas no registradas. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};
