import { Link } from 'react-router-dom';
import { Clock, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Logo } from './Logo';
import { DEMO_CLUB } from '@/config/site';
import { env } from '@/lib/env';
import { buttonClasses } from '@/components/ui/Button';

const YEAR = new Date().getFullYear();

const NAV = [
  { to: '/complejo', label: 'El complejo' },
  { to: '/canchas', label: 'Canchas y precios' },
  { to: '/reservar', label: 'Reservar' },
  { to: '/consultar', label: 'Mi reserva' },
  { to: '/contacto', label: 'Contacto' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-night text-white">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="container-page flex flex-col gap-7 py-10 sm:py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-sm flex-col gap-3.5">
            <Logo />
            <p className="text-sm text-white/60">
              {DEMO_CLUB.tagline} Reservá tu cancha online y viví el pádel en un complejo pensado para
              jugadores de todos los niveles.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Link to="/reservar" className={buttonClasses('accent', 'sm')}>
              Reservar ahora
            </Link>
            {DEMO_CLUB.instagram ? (
              <a
                href={DEMO_CLUB.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-accent"
              >
                <Instagram className="h-4 w-4" aria-hidden />
                @azulpadelclubok
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2.5 border-t border-white/10 pt-6">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-white/70 transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
          <a
            href={DEMO_CLUB.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition-colors hover:text-accent"
          >
            <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            {DEMO_CLUB.address}, {DEMO_CLUB.city}
          </a>
          <a href={`tel:${DEMO_CLUB.phone}`} className="inline-flex items-center gap-2 transition-colors hover:text-accent">
            <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            {DEMO_CLUB.phone}
          </a>
          {DEMO_CLUB.email ? (
            <a
              href={`mailto:${DEMO_CLUB.email}`}
              className="inline-flex items-center gap-2 transition-colors hover:text-accent"
            >
              <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              {DEMO_CLUB.email}
            </a>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            {DEMO_CLUB.openingSummary}
          </span>
          {DEMO_CLUB.whatsapp ? (
            <a
              href={`https://wa.me/${DEMO_CLUB.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              WhatsApp
            </a>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 border-t border-white/10 pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {YEAR} {DEMO_CLUB.name}. Todos los derechos reservados.
          </p>
          {env.useMocks ? <p>Sitio en modo demostración: los pagos reales no están activos.</p> : null}
        </div>
      </div>
    </footer>
  );
}
