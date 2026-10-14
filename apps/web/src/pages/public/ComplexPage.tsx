import { Link } from 'react-router-dom';
import { Clock3, Instagram, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { PageHero } from '@/components/site/PageHero';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Card } from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import { DEMO_CLUB, DEMO_FEATURES, DEMO_SERVICES } from '@/config/site';

export function ComplexPage() {
  return (
    <div>
      <PageHero
        eyebrow="El complejo"
        title="Un espacio pensado para jugar mejor"
        description={DEMO_CLUB.description}
      >
        <Link to="/reservar" className={buttonClasses('primary', 'md')}>
          Reservar cancha
        </Link>
      </PageHero>

      <section className="section container-page">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <SectionHeading eyebrow="Sobre nosotros" title="Nuestra historia y propuesta" />
            <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-muted">
              <p>
                Este texto es un contenido de demostración. Reemplazalo por la historia real del complejo,
                su trayectoria y su propuesta de valor una vez definidos los datos comerciales.
              </p>
              <p>
                El objetivo es ofrecer una experiencia de juego cómoda, con reservas simples, atención
                personalizada y un entorno cuidado para jugadores de todos los niveles.
              </p>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {(DEMO_FEATURES as readonly string[]).map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-content">Información de contacto</h3>
            <ul className="mt-4 flex flex-col gap-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium text-ink">Dirección</p>
                  <p className="text-muted">
                    {DEMO_CLUB.address}, {DEMO_CLUB.city}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium text-ink">Horarios</p>
                  <p className="text-muted">{DEMO_CLUB.openingSummary}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium text-ink">Teléfono</p>
                  <a href={`tel:${DEMO_CLUB.phone}`} className="text-muted hover:text-accent">
                    {DEMO_CLUB.phone}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium text-ink">Email</p>
                  <a href={`mailto:${DEMO_CLUB.email}`} className="text-muted hover:text-accent">
                    {DEMO_CLUB.email}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Instagram className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium text-ink">Instagram</p>
                  <a
                    href={DEMO_CLUB.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted hover:text-accent"
                  >
                    @padelclub
                  </a>
                </div>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      <section className="section border-y border-line bg-surface/30">
        <div className="container-page">
          <SectionHeading eyebrow="Servicios" title="Qué ofrecemos" align="center" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_SERVICES.map((service) => (
              <Card key={service.id} className="p-5">
                <h3 className="text-base font-semibold text-content">{service.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
