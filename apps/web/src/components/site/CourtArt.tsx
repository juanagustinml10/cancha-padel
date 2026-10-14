import { cn } from '@/lib/utils';

interface CourtArtProps {
  variant?: 'indoor' | 'outdoor' | 'night';
  className?: string;
}

/**
 * Ilustración vectorial de una cancha de pádel.
 * Se usa como imagen de calidad con procedencia propia (sin dependencias externas ni
 * licencias de terceros) mientras no haya fotografías reales del complejo.
 */
export function CourtArt({ variant = 'indoor', className }: CourtArtProps) {
  const night = variant === 'night';
  const outdoor = variant === 'outdoor';

  return (
    <svg
      viewBox="0 0 320 200"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="Ilustración de una cancha de pádel"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`court-bg-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={night ? '#17243A' : '#101A2B'} />
          <stop offset="100%" stopColor={night ? '#0A1020' : '#080D18'} />
        </linearGradient>
        <linearGradient id={`court-floor-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EAF2FF" />
          <stop offset="100%" stopColor="#C7D9F2" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#court-bg-${variant})`} />
      {outdoor ? <circle cx="270" cy="40" r="18" fill="#53A1FF" opacity="0.45" /> : null}
      <rect x="30" y="30" width="260" height="140" rx="6" fill={`url(#court-floor-${variant})`} />
      <rect x="30" y="30" width="260" height="140" rx="6" fill="none" stroke="#2878FF" strokeWidth="3" />
      <line x1="160" y1="30" x2="160" y2="170" stroke="#2878FF" strokeWidth="2" opacity="0.85" />
      <line x1="30" y1="100" x2="290" y2="100" stroke="#2878FF" strokeWidth="2" opacity="0.55" />
      <rect x="20" y="28" width="6" height="144" rx="3" fill="#ffffff" opacity="0.85" />
      <rect x="294" y="28" width="6" height="144" rx="3" fill="#ffffff" opacity="0.85" />
      <circle cx="160" cy="100" r="3" fill="#0A1020" />
    </svg>
  );
}
