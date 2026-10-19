import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  children?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  children,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col gap-3',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="text-2xl font-bold tracking-tight text-content sm:text-[1.75rem]">{title}</h2>
      {description ? (
        <p className={cn('max-w-2xl text-sm text-muted', align === 'center' && 'mx-auto')}>
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
