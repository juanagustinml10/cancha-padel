import { Link } from 'react-router-dom';
import { Clock, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from './Logo';
import { DEMO_CLUB } from '@/config/site';

const YEAR = new Date().getFullYear();

const NAV = [
  { to: '/', label: 'Inicio' },
  { to: '/complejo', label: 'El complejo' },
  { to: '/canchas', label: 'Canchas y precios' },
  { to: '/reservar', label: 'Reservar cancha' },
  { to: '/consultar', label: 'Consultar reserva' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-night text-white">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="text-sm text-white/70">
            {DEMO_CLUB.tagline} Reservá tu cancha online y viví el pádel en un complejo pensado para
            jugadores de todos los niveles.
          </p>
          <a
            href={DEMO_CLUB.instagram}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 text-sm text-white/80 transition-colors hover:text-accent"
          >
            <Instagram className="h-4 w-4" aria-hidden />
            Seguinos en Instagram
          </a>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">Navegación</h3>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-white/80 transition-colors hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">Contacto</h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {DEMO_CLUB.address}, {DEMO_CLUB.city}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <a href={`tel:${DEMO_CLUB.phone}`} className="transition-colors hover:text-accent">
                {DEMO_CLUB.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <a href={`mailto:${DEMO_CLUB.email}`} className="transition-colors hover:text-accent">
                {DEMO_CLUB.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">Horarios</h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{DEMO_CLUB.openingSummary}</span>
            </li>
          </ul>
          <Link
            to="/reservar"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-[#041018] transition-colors hover:bg-accent-hover"
          >
            Reservar ahora
          </Link>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {YEAR} {DEMO_CLUB.name}. Todos los derechos reservados.
          </p>
          <p>
            Sitio en modo demostración. Los datos comerciales, precios y pagos se configuran al conectar
            el backend.
          </p>
        </div>
      </div>
    </footer>
  );
}
