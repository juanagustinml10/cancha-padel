import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DEMO_CLUB } from '@/config/site';

const NAME_PARTS = DEMO_CLUB.name.trim().split(/\s+/);
const NAME_HEAD = NAME_PARTS.slice(0, -1).join(' ').toUpperCase();
const NAME_TAIL = (NAME_PARTS[NAME_PARTS.length - 1] ?? '').toUpperCase();

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="group -my-1 inline-flex items-center gap-2.5 rounded-xl py-1 focus-visible:ring-2 focus-visible:ring-accent"
      aria-label="Ir al inicio"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-glow ring-1 ring-white/10 transition-transform group-hover:-translate-y-0.5"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M12 4v16" />
          <circle cx="15.6" cy="8.4" r="1.9" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span
        className={cn(
          'font-display font-extrabold leading-none tracking-tight text-content',
          compact ? 'text-base' : 'text-lg',
        )}
      >
        {NAME_HEAD ? `${NAME_HEAD} ` : ''}
        <span className="text-accent">{NAME_TAIL}</span>
      </span>
    </Link>
  );
}
