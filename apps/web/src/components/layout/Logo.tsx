import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Ir al inicio">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-[0_8px_24px_-10px_rgba(40,120,255,0.8)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
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
          'font-display font-extrabold tracking-tight text-content',
          compact ? 'text-base' : 'text-lg',
        )}
      >
        PADEL <span className="text-accent">CLUB</span>
      </span>
    </Link>
  );
}
