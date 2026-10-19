import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHero } from '@/components/site/PageHero';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CourtCard } from '@/components/site/CourtCard';
import { PriceTable } from '@/components/site/GalleryAndPricing';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { buttonClasses } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { publicApi } from '@/services/publicApi';

export function CourtsPage() {
  const courts = useAsync(() => publicApi.getCourts(), []);
  const pricing = useAsync(() => publicApi.getPricingDisplay(), []);

  const activeCourts = (courts.data ?? []).filter((court) => court.status === 'ACTIVE');
  const lowestPrice = pricing.data?.map((row) => row.priceCents).sort((a, b) => a - b)[0];

  return (
    <div>
      <PageHero
        eyebrow="Canchas y precios"
        title="Canchas preparadas para tu mejor juego"
        description="Elegí tu cancha, duración y horario. El precio definitivo se calcula al confirmar la reserva según cancha, franja y duración."
      >
        <Link to="/reservar" className={buttonClasses('primary', 'md')}>
          Consultar disponibilidad
        </Link>
      </PageHero>

      <section className="section container-page">
        <SectionHeading
          eyebrow="Canchas"
          title="Disponibles en el complejo"
          description="Todas las canchas incluyen iluminación y acceso a vestuarios."
        />
        <div className="mt-8">
          {courts.loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : courts.error ? (
            <ErrorState message={courts.error} onRetry={courts.retry} />
          ) : activeCourts.length === 0 ? (
            <EmptyState
              title="Todavía no hay canchas publicadas"
              description="La disponibilidad se mostrará cuando el complejo configure sus canchas."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {activeCourts.map((court) => (
                <CourtCard key={court.id} court={court} priceFromCents={lowestPrice} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section border-y border-line bg-surface/30">
        <div className="container-page">
          <SectionHeading
            eyebrow="Tarifas"
            title="Precios por franja"
            description="Valores orientativos expresados por hora. Pueden variar según cancha y duración."
          />
          <div className="mt-8">
            {pricing.loading ? (
              <SkeletonCard />
            ) : pricing.data ? (
              <PriceTable rows={pricing.data} />
            ) : (
              <ErrorState message={pricing.error ?? 'Sin datos'} onRetry={pricing.retry} />
            )}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/30 bg-brand-soft px-5 py-4 text-sm text-content">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <p>
              El precio final de tu reserva se calcula automáticamente al elegir cancha, duración y horario.
              La seña se abona online y el saldo restante en el complejo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
