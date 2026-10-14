import type { ApiErrorBody } from '@padel/shared';
import { env } from './env';
import { ApiError } from './errors';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

const CSRF_COOKIE = 'csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = env.apiBaseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Error ${response.status}`;
  let code = 'HTTP_ERROR';
  let details: unknown;

  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body?.error) {
      message = body.error.message ?? message;
      code = body.error.code ?? code;
      details = body.error.details;
    }
  } catch {
    // El cuerpo no era JSON; se mantiene el mensaje genérico.
  }

  return new ApiError(message, response.status, code, details);
}

async function ensureCsrfToken(): Promise<string | undefined> {
  const existing = readCsrfToken();
  if (existing) return existing;

  try {
    const base = env.apiBaseUrl.replace(/\/$/, '');
    await fetch(`${base}/csrf`, { credentials: 'include', headers: { Accept: 'application/json' } });
  } catch {
    return undefined;
  }
  return readCsrfToken();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, headers, method = 'GET', ...rest } = options;

  const isMutating = !SAFE_METHODS.has(method.toUpperCase());
  const csrfToken = isMutating ? await ensureCsrfToken() : undefined;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
