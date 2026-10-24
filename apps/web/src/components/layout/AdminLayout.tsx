import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  TicketCheck,
  X,
} from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { Logo } from './Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

const ROLE_LABELS = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepción',
} as const;

const PAGE_TITLES: Array<[string, string]> = [
  ['/admin/calendario', 'Calendario'],
  ['/admin/reservas', 'Reservas'],
  ['/admin/clientes', 'Clientes'],
  ['/admin/pagos', 'Pagos'],
  ['/admin/reportes', 'Reportes'],
  ['/admin/canchas', 'Canchas'],
  ['/admin/horarios', 'Horarios y bloqueos'],
  ['/admin/precios', 'Precios'],
  ['/admin/configuracion', 'Configuración'],
  ['/admin/camaras', 'Cámaras'],
  ['/admin/usuarios', 'Usuarios y permisos'],
];

const MOBILE_ITEMS = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/calendario', label: 'Agenda', icon: CalendarDays },
  { to: '/admin/reservas', label: 'Reservas', icon: TicketCheck },
  { to: '/admin/pagos', label: 'Pagos', icon: CircleDollarSign },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

  const pageTitle =
    PAGE_TITLES.find(([path]) => location.pathname.startsWith(path))?.[1] ?? 'Resumen';
  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.info('Sesión cerrada');
      navigate('/admin/login');
    } catch {
      toast.error('No se pudo cerrar la sesión');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-x-clip bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-night px-4 py-5 lg:flex">
        <div className="mb-7 [&_span]:text-white">
          <Logo compact to="/admin" />
        </div>
        <AdminSidebar role={user.role} />
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-white/[0.03] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-accent">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
            <p className="truncate text-xs text-white/45">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-night/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-night px-4 py-5">
            <div className="mb-6 flex items-center justify-between">
              <div className="[&_span]:text-white">
                <Logo compact to="/admin" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-surface/10"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <AdminSidebar role={user.role} onNavigate={() => setOpen(false)} />
            <div className="mt-4 rounded-xl border border-line bg-white/[0.03] p-3">
              <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
              <p className="truncate text-xs text-white/45">{ROLE_LABELS[user.role]}</p>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line glass-bar px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 text-content transition-colors hover:bg-surface-2 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-content">{pageTitle}</p>
              <p className="hidden text-xs text-muted sm:block">Panel administrativo</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden text-sm font-medium text-accent transition-colors hover:text-accent-hover hover:underline md:inline"
            >
              Ver sitio
            </Link>
            <Badge variant={user.role === 'ADMIN' ? 'navy' : 'info'}>
              {ROLE_LABELS[user.role]}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              loading={loggingOut}
              onClick={handleLogout}
              leftIcon={<LogOut className="h-4 w-4" />}
              aria-label="Cerrar sesión"
            >
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/95 backdrop-blur-xl safe-bottom lg:hidden"
        aria-label="Accesos rápidos"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-white/55 hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium text-white/55 transition-colors hover:text-white"
          >
            <Menu className="h-5 w-5" aria-hidden />
            Menú
          </button>
        </div>
      </nav>
    </div>
  );
}
