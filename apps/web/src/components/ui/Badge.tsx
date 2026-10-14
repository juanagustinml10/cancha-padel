import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'navy';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border border-line bg-surface-2 text-muted',
  info: 'border border-primary/30 bg-brand-soft text-accent',
  success: 'border border-success/30 bg-success-soft text-success',
  warning: 'border border-warning/30 bg-warning-soft text-warning',
  danger: 'border border-danger/30 bg-danger-soft text-danger',
  navy: 'border border-line-strong bg-night text-white',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
