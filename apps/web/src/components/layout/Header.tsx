import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CalendarCheck, Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/complejo', label: 'El complejo' },
  { to: '/canchas', label: 'Canchas y precios' },
  { to: '/consultar', label: 'Consultar reserva' },
  { to: '/contacto', label: 'Contacto' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-soft text-accent' : 'text-ink hover:bg-surface-2 hover:text-content',
  );

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-xl px-4 py-3 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-soft text-accent' : 'text-ink hover:bg-surface-2 hover:text-content',
  );

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 glass-bar">
      <div className="container-page flex h-14 items-center justify-between gap-3 sm:h-16">
        <Logo />

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/admin" className={buttonClasses('ghost', 'sm')}>
            Panel
          </Link>
          <Link to="/reservar" className={buttonClasses('primary', 'sm')}>
            <CalendarCheck className="h-4 w-4" aria-hidden />
            Reservar cancha
          </Link>
        </div>

        {/* Acción de menú en móvil (las acciones principales viven en la barra inferior) */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-xl p-2 text-content transition-colors hover:bg-surface-2 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div id="mobile-menu" className="border-t border-line bg-surface lg:hidden">
          <nav className="container-page flex animate-fade-in flex-col gap-1.5 py-4" aria-label="Navegación móvil">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={mobileLinkClass}>
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/admin"
              className="rounded-xl px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2 hover:text-content"
            >
              Panel administrativo
            </Link>
            <Link to="/reservar" className={buttonClasses('primary', 'md', 'mt-2')}>
              <CalendarCheck className="h-4 w-4" aria-hidden />
              Reservar cancha
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
