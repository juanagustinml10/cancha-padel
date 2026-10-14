/**
 * Configuración de entorno del frontend.
 * IMPORTANTE: sólo variables VITE_* (públicas). Nunca secretos de Mercado Pago aquí.
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  appName: import.meta.env.VITE_APP_NAME ?? 'Azul Padel Club',
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') !== 'false',
  whatsapp: import.meta.env.VITE_WHATSAPP ?? '',
} as const;

export const CLUB_TIMEZONE = 'America/Argentina/Buenos_Aires';
