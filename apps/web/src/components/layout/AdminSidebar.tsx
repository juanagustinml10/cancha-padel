import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Camera,
  CircleDollarSign,
  Clock,
  Dumbbell,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Tags,
  TicketCheck,
  Users,
} from 'lucide-react';
import type { Role } from '@padel/shared';
import { cn } from '@/lib/utils';

type Group = 'Operación' | 'Cobros' | 'Club' | 'Seguridad';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  group: Group;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/admin',
    label: 'Resumen',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['ADMIN', 'RECEPTION'],
    group: 'Operación',
    end: true,
  },
  {
    to: '/admin/calendario',
    label: 'Calendario',
    icon: <CalendarDays className="h-4 w-4" />,
    roles: ['ADMIN', 'RECEPTION'],
    group: 'Operación',
  },
  {
    to: '/admin/reservas',
    label: 'Reservas',
    icon: <TicketCheck className="h-4 w-4" />,
    roles: ['ADMIN', 'RECEPTION'],
    group: 'Operación',
  },
  {
    to: '/admin/clientes',
    label: 'Clientes',
    icon: <Users className="h-4 w-4" />,
    roles: ['ADMIN', 'RECEPTION'],
    group: 'Operación',
  },
  {
    to: '/admin/pagos',
    label: 'Pagos',
    icon: <CircleDollarSign className="h-4 w-4" />,
    roles: ['ADMIN', 'RECEPTION'],
    group: 'Cobros',
  },
  {
    to: '/admin/reportes',
    label: 'Reportes',
    icon: <BarChart3 className="h-4 w-4" />,
    roles: ['ADMIN'],
    group: 'Cobros',
  },
  {
    to: '/admin/canchas',
    label: 'Canchas',
    icon: <Dumbbell className="h-4 w-4" />,
    roles: ['ADMIN'],
    group: 'Club',
  },
  {
    to: '/admin/horarios',
    label: 'Horarios y bloqueos',
    icon: <Clock className="h-4 w-4" />,
    roles: ['ADMIN', 'RECEPTION'],
    group: 'Club',
  },
  {
    to: '/admin/precios',
    label: 'Precios',
    icon: <Tags className="h-4 w-4" />,
    roles: ['ADMIN'],
    group: 'Club',
  },
  {
    to: '/admin/configuracion',
    label: 'Configuración',
    icon: <Settings className="h-4 w-4" />,
    roles: ['ADMIN'],
    group: 'Club',
  },
  {
    to: '/admin/camaras',
    label: 'Cámaras',
    icon: <Camera className="h-4 w-4" />,
    roles: ['ADMIN'],
    group: 'Seguridad',
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios y permisos',
    icon: <ShieldCheck className="h-4 w-4" />,
    roles: ['ADMIN'],
    group: 'Seguridad',
  },
];

const GROUP_ORDER: Group[] = ['Operación', 'Cobros', 'Club', 'Seguridad'];

export function AdminSidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Navegación del panel">
      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {group}
            </p>
            {groupItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/15 text-white'
                      : 'text-white/65 hover:bg-white/[0.06] hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'absolute inset-y-2 left-0 w-0.5 rounded-full transition-colors',
                        isActive ? 'bg-accent' : 'bg-transparent',
                      )}
                      aria-hidden
                    />
                    <span className={cn('transition-colors', isActive ? 'text-accent' : 'text-white/45')} aria-hidden>
                      {item.icon}
                    </span>
                    <span className="min-w-0 truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
