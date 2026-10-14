import { env } from './env';

/** Nombre de la cookie de sesión (HttpOnly). */
export const SESSION_COOKIE = 'sid';

/** Cookie legible por JS con el token CSRF (patrón double-submit). */
export const CSRF_COOKIE = 'csrf';

/** Cabecera que el cliente debe reenviar con el token CSRF. */
export const CSRF_HEADER = 'x-csrf-token';

/** Zona horaria del club. */
export const CLUB_TIMEZONE = env.TZ;

/** Duración de la sesión en milisegundos. */
export const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

/** Prefijo de todas las rutas de la API. */
export const API_PREFIX = '/api/v1';

/** Moneda por defecto. */
export const DEFAULT_CURRENCY = env.CURRENCY;

/** Encabezado de la cabecera de firma de Mercado Pago. */
export const MP_SIGNATURE_HEADER = 'x-signature';
export const MP_REQUEST_ID_HEADER = 'x-request-id';

/** Reintentos máximos de un webhook fallido antes de darlo por perdido. */
export const WEBHOOK_MAX_ATTEMPTS = 5;

/** Base del backoff exponencial entre reintentos de webhooks (1 minuto). */
export const WEBHOOK_RETRY_BASE_MS = 60_000;
