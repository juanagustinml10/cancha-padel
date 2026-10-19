import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Clock, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { publicApi } from '@/services/publicApi';
import { DEMO_CLUB, DEMO_SERVICES } from '@/config/site';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { CourtCard } from '@/components/site/CourtCard';

export function HomePage() {
  const courts = useAsync(() => publicApi.getCourts(), []);
  const pricing = useAsync(() => publicApi.getPricingDisplay(), []);

  const activeCourts = (courts.data ?? []).filter((court) => court.status === 'ACTIVE');
  const lowestPrice = pricing.data?.map((row) => row.priceCents).sort((a, b) => a - b)[0];

  return (
    <div>
      {/* ================= PORTADA ================= */}
      <section className="relative isolate overflow-hidden border-b border-line bg-night">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="container-page relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-24">
          <div className="relative z-10 max-w-xl animate-fade-in-up">
            <span className="eyebrow">{DEMO_CLUB.tagline}</span>
            <h1 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] tracking-tight text-content sm:text-5xl">
              Tu cancha de pádel, lista en minutos
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink/90">
              Reservá online en {DEMO_CLUB.name}, {DEMO_CLUB.city}. Elegí día, horario y cancha, y
              confirmá con la seña.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/reservar" className={buttonClasses('primary', 'lg', 'w-full sm:w-auto')}>
                <CalendarCheck className="h-5 w-5" aria-hidden />
                Reservar cancha
              </Link>
              <Link to="/canchas" className={buttonClasses('outline', 'lg', 'w-full sm:w-auto')}>
                Ver canchas y precios
              </Link>
            </div>

            <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted">
              <Clock className="h-4 w-4 text-accent" aria-hidden />
              {DEMO_CLUB.openingSummary}
            </p>
          </div>

          {/* Foto del club integrada a la portada: a sangre en móvil y como fondo lateral en escritorio */}
          <div className="relative z-0 -mx-5 -mb-12 animate-fade-in sm:-mx-6 sm:-mb-16 lg:absolute lg:inset-y-0 lg:right-[calc((100vw_-_100%)/-2)] lg:mx-0 lg:mb-0 lg:w-[50vw] lg:animate-none">
            <img
              src="/images/hero.jpg"
              alt="Jugadores disputando un partido de pádel"
              className="h-60 w-full object-cover object-center sm:h-72 lg:h-full [mask-image:linear-gradient(to_bottom,transparent,black_14%)] lg:[mask-image:linear-gradient(to_right,transparent,black_30%)]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-night via-night/5 to-night/25 lg:bg-gradient-to-b lg:from-night/50 lg:via-transparent lg:to-night/30"
            />
            <div aria-hidden className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
            <p className="absolute bottom-4 left-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/70 lg:bottom-8 lg:left-auto lg:right-8">
              {DEMO_CLUB.city}
            </p>
          </div>
        </div>
      </section>

      {/* ================= CANCHAS ================= */}
      {activeCourts.length > 0 ? (
        <section className="section container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Canchas"
              title="Elegí la tuya"
              description="Canchas indoor y outdoor con iluminación profesional, listas para jugar."
            />
            <Link
              to="/canchas"
              className="-my-2.5 inline-flex shrink-0 items-center gap-1 py-2.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              Ver todas
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {activeCourts.slice(0, 3).map((court) => (
              <div key={court.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
                <CourtCard court={court} priceFromCents={lowestPrice} ctaHref="/reservar" />
              </div>
            ))}
          </div>

          {activeCourts.length > 1 ? (
            <p className="mt-3 text-center text-xs text-muted sm:hidden">
              Deslizá para ver más canchas
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ================= EL COMPLEJO ================= */}
      <section className="section border-y border-line bg-surface/30">
        <div className="container-page">
          <SectionHeading
            eyebrow="El complejo"
            title="Mucho más que canchas"
            description="Un espacio pensado para jugar, recuperarse y compartir."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {DEMO_SERVICES.map((service) => (
              <Card key={service.id} className="p-6">
                <h3 className="text-base font-semibold text-content">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/complejo"
              className="-my-2.5 inline-flex items-center gap-1 py-2.5 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              Conocé el complejo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= UBICACIÓN Y CONTACTO ================= */}
      <section className="section container-page">
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-5 p-6 sm:p-7">
            <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-content">
              <MapPin className="h-5 w-5 text-accent" aria-hidden />
              Ubicación y horarios
            </h2>
            <dl className="flex flex-col gap-4 text-sm">
              <div>
                <dt className="text-muted">Dirección</dt>
                <dd className="mt-1 font-medium text-ink">
                  {DEMO_CLUB.address}, {DEMO_CLUB.city}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Horarios</dt>
                <dd className="mt-1 font-medium text-ink">{DEMO_CLUB.openingSummary}</dd>
              </div>
            </dl>
            <div className="mt-auto pt-2">
              <a
                href={DEMO_CLUB.mapUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses('outline', 'md', 'w-full sm:w-fit')}
              >
                <Navigation className="h-4 w-4" aria-hidden />
                Cómo llegar
              </a>
            </div>
          </Card>

          <Card className="flex flex-col gap-5 p-6 sm:p-7">
            <h2 className="inline-flex items-center gap-2.5 text-lg font-semibold text-content">
              <MessageCircle className="h-5 w-5 text-accent" aria-hidden />
              ¿Consultas?
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <a
                href={`tel:${DEMO_CLUB.phone}`}
                className="inline-flex items-center gap-2 py-1 font-medium text-ink transition-colors hover:text-accent"
              >
                <Phone className="h-4 w-4 text-accent" aria-hidden />
                {DEMO_CLUB.phone}
              </a>
              {DEMO_CLUB.instagram ? (
                <a
                  href={DEMO_CLUB.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 py-1 font-medium text-ink transition-colors hover:text-accent"
                >
                  @azulpadelclubok
                </a>
              ) : null}
              <p className="pt-1 text-muted">
                Te ayudamos con reservas, clases y torneos por WhatsApp o teléfono.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row">
              {DEMO_CLUB.whatsapp ? (
                <a
                  href={`https://wa.me/${DEMO_CLUB.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses('accent', 'md', 'w-full sm:w-fit')}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
              <Link to="/contacto" className={buttonClasses('outline', 'md', 'w-full sm:w-fit')}>
                Contacto
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
