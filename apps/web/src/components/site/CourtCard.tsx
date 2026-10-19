import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Court } from '@padel/shared';
import { Lightbulb, Sun, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { CourtArt } from './CourtArt';
import { formatCurrency } from '@/lib/format';

interface CourtCardProps {
  court: Court;
  priceFromCents?: number;
  ctaHref?: string;
  imageSrc?: string;
}

const COURT_IMAGES = {
  INDOOR: '/images/court-indoor.jpg',
  OUTDOOR: '/images/court-outdoor.jpg',
} as const;

export function CourtCard({ court, priceFromCents, ctaHref = '/reservar', imageSrc }: CourtCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isIndoor = court.type === 'INDOOR';
  const artVariant = isIndoor ? 'indoor' : 'outdoor';
  const image = imageSrc ?? COURT_IMAGES[court.type];

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-elevated">
      <div className="relative h-40 w-full overflow-hidden border-b border-line sm:h-44">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={`${court.name}: cancha de pádel`}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <CourtArt variant={artVariant} />
        )}
        <span className="absolute right-3 top-3">
          <Badge variant={isIndoor ? 'info' : 'neutral'}>
            {isIndoor ? (
              <Warehouse className="h-3 w-3" aria-hidden />
            ) : (
              <Sun className="h-3 w-3" aria-hidden />
            )}
            {isIndoor ? 'Indoor' : 'Outdoor'}
          </Badge>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-5 sm:p-6">
        <div>
          <h3 className="text-base font-semibold text-content sm:text-lg">{court.name}</h3>
          <p className="text-sm text-muted">{court.surface ?? 'Césped sintético'}</p>
        </div>

        {court.description ? (
          <p className="line-clamp-2 text-sm text-muted">{court.description}</p>
        ) : null}

        <ul className="flex flex-wrap gap-2 text-xs text-ink">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1">
            {isIndoor ? (
              <Warehouse className="h-3.5 w-3.5 text-accent" aria-hidden />
            ) : (
              <Sun className="h-3.5 w-3.5 text-accent" aria-hidden />
            )}
            {isIndoor ? 'Bajo techo' : 'Al aire libre'}
          </li>
          {court.hasLighting ? (
            <li className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1">
              <Lightbulb className="h-3.5 w-3.5 text-accent" aria-hidden />
              Iluminación
            </li>
          ) : null}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <div className="min-w-0">
            {priceFromCents !== undefined ? (
              <>
                <p className="text-lg font-bold leading-none text-content tnum">
                  {formatCurrency(priceFromCents)}
                </p>
                <p className="mt-1 text-xs text-muted">por hora · seña online</p>
              </>
            ) : (
              <p className="text-sm text-muted">Consultá disponibilidad</p>
            )}
          </div>
          <Link to={ctaHref} className={buttonClasses('primary', 'md')}>
            Reservar
          </Link>
        </div>
      </div>
    </Card>
  );
}
