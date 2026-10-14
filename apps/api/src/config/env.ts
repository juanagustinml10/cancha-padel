import 'dotenv/config';
import { z } from 'zod';

/**
 * Validación centralizada de variables de entorno.
 * Falla temprano y con un mensaje claro si falta o es inválida alguna variable.
 */

// Alias aceptados: se admite tanto `MP_*` (convención del proyecto) como
// `MERCADOPAGO_*` (nombres explícitos de la integración). Se normalizan a `MP_*`.
const MP_ALIASES: Array<[string, string]> = [
  ['MP_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN'],
  ['MP_PUBLIC_KEY', 'MERCADOPAGO_PUBLIC_KEY'],
  ['MP_WEBHOOK_SECRET', 'MERCADOPAGO_WEBHOOK_SECRET'],
  ['MP_NOTIFICATION_URL', 'MERCADOPAGO_NOTIFICATION_URL'],
  ['MP_SUCCESS_URL', 'MERCADOPAGO_SUCCESS_URL'],
  ['MP_FAILURE_URL', 'MERCADOPAGO_FAILURE_URL'],
  ['MP_PENDING_URL', 'MERCADOPAGO_PENDING_URL'],
];

for (const [canonical, alias] of MP_ALIASES) {
  if (!process.env[canonical] && process.env[alias]) {
    process.env[canonical] = process.env[alias];
  }
}

const optionalString = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.string().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    TZ: z.string().default('America/Argentina/Buenos_Aires'),
    // Habilita el worker de mantenimiento dentro del mismo proceso del servidor.
    // Útil en plataformas que corren un único contenedor (p. ej. Vercel Services).
    ENABLE_WORKER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
    TEST_DATABASE_URL: optionalString,

    SESSION_SECRET: z.string().min(8, 'SESSION_SECRET debe tener al menos 8 caracteres'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    SESSION_TTL_HOURS: z.coerce.number().positive().default(12),

    CLUB_NAME: z.string().default('Azul Padel Club'),
    BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(20),
    DEPOSIT_MODE: z.enum(['percent', 'fixed_amount']).default('percent'),
    DEPOSIT_PERCENT: z.coerce.number().min(0).max(100).default(30),
    DEPOSIT_FIXED_AMOUNT_CENTS: z.coerce.number().int().nonnegative().default(500000),
    CURRENCY: z.string().default('ARS'),

    // Bases públicas usadas para construir las URLs de retorno y de notificación.
    // En producción deben ser las URLs reales (HTTPS).
    APP_BASE_URL: z.string().default('http://localhost:5173'),
    API_BASE_URL: z.string().default('http://localhost:4000'),

    PAYMENTS_PROVIDER: z.enum(['fake', 'mercadopago']).default('fake'),
    // Nombres según la integración oficial de Mercado Pago (Checkout Pro / Preferences API).
    MP_ACCESS_TOKEN: optionalString,
    MP_PUBLIC_KEY: optionalString,
    MP_WEBHOOK_SECRET: optionalString,
    MP_NOTIFICATION_URL: optionalString,
    MP_SUCCESS_URL: optionalString,
    MP_FAILURE_URL: optionalString,
    MP_PENDING_URL: optionalString,

    SEED_ADMIN_EMAIL: z.string().default('admin@padelclub.example'),
    SEED_ADMIN_PASSWORD: z.string().default('CambiarEstaClave123'),
    SEED_RECEPTION_EMAIL: z.string().default('recepcion@padelclub.example'),
    SEED_RECEPTION_PASSWORD: z.string().default('CambiarEstaClave123'),
  })
  .superRefine((value, ctx) => {
    if (value.PAYMENTS_PROVIDER !== 'mercadopago') return;

    if (!value.MP_ACCESS_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MP_ACCESS_TOKEN'],
        message: 'MP_ACCESS_TOKEN es obligatorio cuando PAYMENTS_PROVIDER=mercadopago',
      });
    }
    // Sin el secreto de firma no se pueden autenticar los webhooks: el cobro real
    // quedaría incompleto y peligroso. Se exige configurarlo.
    if (!value.MP_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MP_WEBHOOK_SECRET'],
        message:
          'MP_WEBHOOK_SECRET es obligatorio cuando PAYMENTS_PROVIDER=mercadopago (firma de webhooks).',
      });
    }
    if (value.NODE_ENV === 'production') {
      if (!value.APP_BASE_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['APP_BASE_URL'],
          message: 'APP_BASE_URL debe ser HTTPS en producción.',
        });
      }
      if (!value.API_BASE_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['API_BASE_URL'],
          message: 'API_BASE_URL debe ser HTTPS en producción.',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Configuración de entorno inválida:\n${issues}`);
}

const raw = parsed.data;

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  corsOrigins: raw.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  appBaseUrl: stripTrailingSlash(raw.APP_BASE_URL),
  apiBaseUrl: stripTrailingSlash(raw.API_BASE_URL),
  /** URL pública del webhook (o la configurada explícitamente). */
  mpNotificationUrl:
    raw.MP_NOTIFICATION_URL ?? `${stripTrailingSlash(raw.API_BASE_URL)}/api/v1/webhooks/mercadopago`,
} as const;

export type Env = typeof env;
