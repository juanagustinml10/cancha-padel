/**
 * Configuración global de pruebas.
 *
 * Define variables de entorno por defecto para que la validación de `env` pase sin
 * requerir una base de datos real. Si `TEST_DATABASE_URL` está definido, se usa como
 * `DATABASE_URL` para que las pruebas de integración apunten a la base de pruebas.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://test:test@localhost:5432/padel_test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-please-change';
process.env.PAYMENTS_PROVIDER = process.env.PAYMENTS_PROVIDER ?? 'fake';
process.env.MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET ?? 'test-webhook-secret';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
process.env.TZ = process.env.TZ ?? 'America/Argentina/Buenos_Aires';
