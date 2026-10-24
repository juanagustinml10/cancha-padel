import { useState } from 'react';
import type { z, ZodTypeAny } from 'zod';

/**
 * Helper de formularios con validación Zod.
 * Devuelve valores controlados, errores por campo y una función `validate`.
 */
export function useZodForm<S extends ZodTypeAny>(schema: S, initial: z.input<S>) {
  const [values, setValues] = useState<z.input<S>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = <K extends keyof z.input<S>>(
    name: K,
    value: z.input<S>[K],
  ) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      return next;
    });
  };

  const reset = (next: z.input<S> = initial) => {
    setValues(next);
    setErrors({});
  };

  const validate = (): z.output<S> | null => {
    const result = schema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_form';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return null;
    }
    setErrors({});
    return result.data;
  };

  return { values, errors, setField, setValues, reset, validate, setErrors };
}
