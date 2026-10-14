import type { GalleryImage, PricingDisplayRow } from '@padel/shared';
import { ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDuration } from '@/lib/format';

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image, index) => (
        <figure
          key={image.id}
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-2"
        >
          {image.url ? (
            <img
              src={image.url}
              alt={image.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-accent/70">
              <ImageIcon className="h-8 w-8" aria-hidden />
              <span className="px-4 text-center text-xs font-medium text-muted">{image.alt}</span>
              <span className="rounded-full border border-line bg-surface/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Imagen de demostración
              </span>
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-night/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {index + 1}
          </span>
        </figure>
      ))}
    </div>
  );
}

export function PriceTable({ rows }: { rows: PricingDisplayRow[] }) {
  return (
    <Card className="overflow-hidden">
      {/* Tabla (pantallas medianas en adelante) */}
      <div className="hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-2 text-content">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Franja</th>
              <th scope="col" className="px-5 py-3 font-semibold">Días</th>
              <th scope="col" className="px-5 py-3 font-semibold">Duración</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={`${row.label}-${row.days}`} className="text-ink">
                <td className="px-5 py-3 font-medium text-content">{row.label}</td>
                <td className="px-5 py-3 text-muted">{row.days}</td>
                <td className="px-5 py-3 text-muted">{formatDuration(row.durationMinutes)}</td>
                <td className="px-5 py-3 text-right font-semibold text-content">
                  {formatCurrency(row.priceCents, row.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas (móvil) */}
      <ul className="divide-y divide-line sm:hidden">
        {rows.map((row) => (
          <li key={`${row.label}-${row.days}`} className="flex flex-col gap-1 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-content">{row.label}</span>
              <span className="shrink-0 font-semibold text-accent">
                {formatCurrency(row.priceCents, row.currency)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span>{row.days}</span>
              <span aria-hidden>·</span>
              <span>{formatDuration(row.durationMinutes)}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
