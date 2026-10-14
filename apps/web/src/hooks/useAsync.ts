import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/errors';

interface UseAsyncOptions {
  enabled?: boolean;
  retries?: number;
  retryDelay?: number;
}

interface UseAsyncResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * Hook de carga asíncrona con reintentos y manejo centralizado de errores.
 * Se usa para consultar la API (o el backend simulado) de forma consistente.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options: UseAsyncOptions = {},
): UseAsyncResult<T> {
  const { enabled = true, retries = 1, retryDelay = 400 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);

  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const result = await fnRef.current();
        if (mounted.current) {
          setData(result);
          setLoading(false);
        }
        return;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (mounted.current) {
      setError(getErrorMessage(lastError));
      setLoading(false);
    }
  }, [retries, retryDelay]);

  useEffect(() => {
    if (enabled) {
      void run();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  return { data, error, loading, retry: run, setData };
}
