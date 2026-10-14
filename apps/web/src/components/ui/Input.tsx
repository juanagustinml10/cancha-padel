import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const inputBaseClasses =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-content placeholder:text-muted/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(inputBaseClasses, invalid && 'border-danger focus:border-danger focus:ring-danger/30', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
