import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Wifi,
} from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { buttonClasses } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { CourtArt } from '@/components/site/CourtArt';
import { CourtCard } from '@/components/site/CourtCard';
import { PriceTable } from '@/components/site/GalleryAndPricing';
import { GalleryGrid } from '@/components/site/GalleryAndPricing';
import { FaqAccordion } from '@/components/site/FaqAccordion';
import { useAsync } from '@/hooks/useAsync';
import { publicApi } from '@/services/publicApi';
import { DEMO_CLUB, DEMO_FEATURES, DEMO_SERVICES } from '@/config/site';

const SERVICE_ICONS = [
  <Trophy className="h-5 w-5" key="trophy" aria-hidden />,
  <CalendarCheck className="h-5 w-5" key="calendar" aria-hidden />,
  <Users className="h-5 w-5" key="users" aria-hidden />,
  <Sparkles className="h-5 w-5" key="sparkles" aria-hidden />,
];

export function HomePage() {
  const courts = useAsync(() => publicApi.getCourts(), []);
  const pricing = useAsync(() => publicApi.getPricingDisplay(), []);
  const promotions = useAsync(() => publicApi.getPromotions(), []);
  const gallery = useAsync(() => publicApi.getGallery(), []);
  const faqs = useAsync(() => publicApi.getFaqs(), []);

  const activeCourts = (courts.data ?? []).filter((court) => court.status === 'ACTIVE');
  const lowestPrice = pricing.data
    ?.map((row) => row.priceCents)
    .sort((a, b) => a - b)[0];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-night">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-[-8rem] h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in-up">
            <Badge variant="info">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Reservas online con seña segura
            </Badge>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-content sm:text-5xl lg:text-6xl">
              {DEMO_CLUB.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">{DEMO_CLUB.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/reservar" className={buttonClasses('primary', 'lg')}>
                <CalendarCheck className="h-5 w-5" aria-hidden />
                Reservar cancha
              </Link>
              <Link to="/canchas" className={buttonClasses('outline', 'lg')}>
                Ver canchas y precios
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2 text-sm text-muted">
              <li className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden />
                {DEMO_CLUB.openingSummary}
              </li>
              <li className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5">
                <MapPin className="h-4 w-4 text-accent" aria-hidden />
                {DEMO_CLUB.address}, {DEMO_CLUB.city}
              </li>
              <li className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                Pago de seña online
              </li>
            </ul>
          </div>

          <div className="relative animate-fade-in">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 translate-y-4 scale-[0.97] rounded-3xl bg-primary/20 blur-2xl"
            />
            <div className="overflow-hidden rounded-3xl border border-line shadow-elevated">
              <div className="h-72 sm:h-96">
                <CourtArt variant="night" />
              </div>
            </div>
            <Card className="absolute -bottom-5 left-4 hidden w-60 p-4 shadow-elevated sm:block">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Reservá en minutos</p>
              <p className="mt-1 text-sm text-ink">
                Elegí día, cancha y horario. Confirmá con la seña online.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="section container-page">
        <SectionHeading
          eyebrow="Servicios"
          title="Todo lo que necesitás para jugar"
          description="Un complejo pensado para que solo te preocupes por el partido."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_SERVICES.map((service, index) => (
            <Card key={service.id} className="p-5 transition-colors hover:border-line-strong">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-brand-soft text-accent">
                {SERVICE_ICONS[index]}
              </span>
              <h3 className="mt-4 text-base font-semibold text-content">{service.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{service.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section border-y border-line bg-surface/30">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Canchas"
              title="Nuestras canchas"
              description="Canchas con superficie profesional y condiciones para jugar durante todo el año."
            />
            <Link to="/canchas" className={buttonClasses('outline', 'sm')}>
              Ver todas
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courts.loading
              ? Array.from({ length: 3 }).map((_, index) => <SkeletonCard key={index} />)
              : activeCourts
                  .slice(0, 3)
                  .map((court) => <CourtCard key={court.id} court={court} priceFromCents={lowestPrice} />)}
          </div>
          {courts.error ? <ErrorState message={courts.error} onRetry={courts.retry} /> : null}
        </div>
      </section>

      <section className="section container-page">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Precios"
              title="Horarios y tarifas"
              description="Tarifas orientativas por franja. El precio definitivo se calcula en la reserva según cancha, duración y horario."
            />
            <div className="mt-6">
              {pricing.loading ? (
                <SkeletonCard />
              ) : pricing.data ? (
                <PriceTable rows={pricing.data} />
              ) : (
                <ErrorState message={pricing.error ?? 'Sin datos de precios'} onRetry={pricing.retry} />
              )}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Instalaciones" title="Comodidades del complejo" />
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {(DEMO_FEATURES as readonly string[]).map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink"
                >
                  <Wifi className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {promotions.data && promotions.data.length > 0 ? (
        <section className="section bg-night">
          <div className="container-page">
            <SectionHeading
              eyebrow="Promociones"
              title="Beneficios vigentes"
              description="Promociones configurables por el complejo. Consultá las condiciones al reservar."
              className="[&_h2]:text-white [&_p]:text-white/70"
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promotions.data.map((promo) => (
                <div key={promo.id} className="rounded-2xl bg-surface/5 p-5 text-white ring-1 ring-white/10">
                  {promo.badge ? (
                    <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#041018]">
                      {promo.badge}
                    </span>
                  ) : null}
                  <h3 className="mt-3 text-lg font-semibold text-white">{promo.title}</h3>
                  <p className="mt-1.5 text-sm text-white/70">{promo.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section container-page">
        <SectionHeading eyebrow="Galería" title="Conocé el complejo" align="center" />
        <div className="mt-8">
          {gallery.loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-surface-2" />
              ))}
            </div>
          ) : gallery.data ? (
            <GalleryGrid images={gallery.data} />
          ) : (
            <ErrorState message={gallery.error ?? 'Sin imágenes'} onRetry={gallery.retry} />
          )}
        </div>
      </section>

      <section className="section border-y border-line bg-surface/30">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Preguntas frecuentes"
            title="Respuestas rápidas"
            description="¿No encontrás lo que buscás? Escribinos por WhatsApp y te ayudamos."
          />
          <div>
            {faqs.loading ? (
              <SkeletonCard />
            ) : faqs.data ? (
              <FaqAccordion items={faqs.data} />
            ) : (
              <ErrorState message={faqs.error ?? 'Sin preguntas'} onRetry={faqs.retry} />
            )}
          </div>
        </div>
      </section>

      <section className="section container-page" id="encontranos">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-content mb-4">Encontranos</h2>
              <p className="text-muted mb-6">
                Ubicados en la intersección de la Ruta 38 y la calle Juan Bautista Alberdi, en
                Aguilares, Tucumán.
              </p>

              {/* Google Maps iframe */}
              <div className="rounded-xl overflow-hidden shadow-elevated">
                <iframe
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1107.045!2d-65.615067!3d-27.443508!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f0!5e0!3m2!1ses-419!2sar"
                />
              </div>

              {/* Cómo llegar button */}
              <div className="mt-6">
                <a
                  href="https://maps.app.goo.gl/cdYusPSETdmWE5436"
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses('primary', 'md')}
                >
                  <Clock3 className="h-4 w-4 me-2" aria-hidden />
                  Cómo llegar
                </a>
              </div>
            </div>

            {/* Dirección verificada */}
            <div className="p-6 rounded-xl border border-line bg-surface">
              <h3 className="font-semibold text-content mb-2">Dirección</h3>
              <p className="text-muted">
                Juan Bautista Alberdi 2344<br />
                Aguilares, Tucumán, Argentina
              </p>
              <p className="mt-3 text-sm">
                <a href="tel:+543865445723" className="text-accent">
                  +54 3865 445723
                </a>
              </p>
              <p className="mt-3 text-sm">
                <a
                  href="wa.me/543865445723"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent"
                >
                  WhatsApp
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section container-page">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="eyebrow">Ubicación y contacto</span>
              <h2 className="mt-3 text-2xl font-bold text-content sm:text-3xl">Te esperamos en el club</h2>
              <ul className="mt-5 flex flex-col gap-3 text-sm text-ink">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" aria-hidden />
                  {DEMO_CLUB.address}, {DEMO_CLUB.city}
                </li>
                <li className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-accent" aria-hidden />
                  {DEMO_CLUB.openingSummary}
                </li>
                <li className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-accent" aria-hidden />
                  Reservas online las 24 horas
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/reservar" className={buttonClasses('primary', 'md')}>
                  Reservar cancha
                </Link>
                <Link to="/contacto" className={buttonClasses('outline', 'md')}>
                  Contacto
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="h-56">
                <CourtArt variant="outdoor" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
