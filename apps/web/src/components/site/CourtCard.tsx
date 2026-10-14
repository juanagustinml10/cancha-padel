import { Link } from 'react-router-dom';
import type { Court } from '@padel/shared';
import { Lightbulb, MapPin, Sun, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { CourtArt } from './CourtArt';
import { formatCurrency } from '@/lib/format';

interface CourtCardProps {
  court: Court;
  priceFromCents?: number;
  ctaHref?: string;
}

export function CourtCard({ court, priceFromCents, ctaHref = '/reservar' }: CourtCardProps) {
  const artVariant = court.type === 'OUTDOOR' ? 'outdoor' : 'indoor';

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-elevated">
      <div className="h-44 w-full overflow-hidden border-b border-line">
        <CourtArt variant={artVariant} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-content">{court.name}</h3>
            <p className="text-sm text-muted">{court.surface ?? 'Césped sintético'}</p>
          </div>
          <Badge variant={court.type === 'INDOOR' ? 'info' : 'neutral'}>
            {court.type === 'INDOOR' ? 'Indoor' : 'Outdoor'}
          </Badge>
        </div>

        {court.description ? <p className="text-sm text-muted">{court.description}</p> : null}

        <ul className="flex flex-wrap gap-2 text-xs text-ink">
          <li className="inline-flex items-center gap-1 rounded-full border border-line bg-brand-soft px-2.5 py-1">
            {court.type === 'INDOOR' ? (
              <Warehouse className="h-3.5 w-3.5 text-accent" aria-hidden />
            ) : (
              <Sun className="h-3.5 w-3.5 text-accent" aria-hidden />
            )}
            {court.type === 'INDOOR' ? 'Bajo techo' : 'Al aire libre'}
          </li>
          {court.hasLighting ? (
            <li className="inline-flex items-center gap-1 rounded-full border border-line bg-brand-soft px-2.5 py-1">
              <Lightbulb className="h-3.5 w-3.5 text-accent" aria-hidden />
              Iluminación
            </li>
          ) : null}
          {court.status !== 'ACTIVE' ? (
            <li className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-warning">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {court.status === 'MAINTENANCE' ? 'En mantenimiento' : 'No disponible'}
            </li>
          ) : null}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
          {priceFromCents !== undefined ? (
            <p className="text-sm text-muted">
              Desde <span className="text-base font-bold text-content">{formatCurrency(priceFromCents)}</span>
              <span className="text-xs"> /hora</span>
            </p>
          ) : (
            <span className="text-sm text-muted">Consultá disponibilidad</span>
          )}
          <Link to={ctaHref} className={buttonClasses('primary', 'sm')}>
            Reservar
          </Link>
        </div>
      </div>
    </Card>
  );
}
