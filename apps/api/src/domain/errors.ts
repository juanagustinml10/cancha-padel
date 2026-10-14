/**
 * Error de aplicación con un código estable, un HTTP status y (opcional) detalles.
 * El middleware de errores lo traduce a la forma uniforme de la API:
 *   { "error": { "code": "...", "message": "...", "details"?: ... } }
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    message: string,
    status = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    expose = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST', details?: unknown): AppError =>
  new AppError(message, 400, code, details);

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError(message, 400, 'VALIDATION_ERROR', details);

export const unauthorized = (message = 'Sesión no válida o expirada.', code = 'UNAUTHENTICATED'): AppError =>
  new AppError(message, 401, code);

export const forbidden = (message = 'No tenés permisos para esta acción.', code = 'FORBIDDEN'): AppError =>
  new AppError(message, 403, code);

export const notFound = (message = 'Recurso no encontrado.', code = 'NOT_FOUND'): AppError =>
  new AppError(message, 404, code);

export const conflict = (message: string, code = 'CONFLICT'): AppError =>
  new AppError(message, 409, code);

export const unprocessable = (message: string, code = 'BUSINESS_RULE', details?: unknown): AppError =>
  new AppError(message, 422, code, details);

export const tooManyRequests = (message = 'Demasiadas solicitudes. Intentá más tarde.'): AppError =>
  new AppError(message, 429, 'RATE_LIMITED');

export const serviceUnavailable = (message: string, code = 'SERVICE_UNAVAILABLE'): AppError =>
  new AppError(message, 503, code);
