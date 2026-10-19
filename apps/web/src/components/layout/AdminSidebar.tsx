import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TicketCheck,
  CalendarDays,
  CalendarRange,
  Dumbbell,
  Clock,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { Role } from '@padel/shared';
import { cn } from '@/lib/utils';

type Group = 'Operación' | 'Configuración' | 'Sistema';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  group: Group;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // --- Operación: acciones del día a día ---
  { to: '/admin', label: 'Resumen', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['ADMIN', 'RECEPTION'], group: 'Operación', end: true },
  { to: '/admin/reservas', label: 'Reservas', icon: <TicketCheck className="h-4 w-4" />, roles: ['ADMIN', 'RECEPTION'], group: 'Operación' },
  { to: '/admin/calendario', label: 'Calendario', icon: <CalendarDays className="h-4 w-4" />, roles: ['ADMIN', 'RECEPTION'], group: 'Operación' },

  // --- Configuración: ajustes del club ---
  { to: '/admin/canchas', label: 'Canchas', icon: <Dumbbell className="h-4 w-4" />, roles: ['ADMIN'], group: 'Configuración' },
  { to: '/admin/horarios', label: 'Horarios y bloqueos', icon: <Clock className="h-4 w-4" />, roles: ['ADMIN', 'RECEPTION'], group: 'Configuración' },
  { to: '/admin/precios', label: 'Precios', icon: <CalendarRange className="h-4 w-4" />, roles: ['ADMIN'], group: 'Configuración' },
  { to: '/admin/configuracion', label: 'Configuración del club', icon: <Settings className="h-4 w-4" />, roles: ['ADMIN'], group: 'Configuración' },

  // --- Sistema: solo para administrador ---
  { to: '/admin/usuarios', label: 'Usuarios y permisos', icon: <ShieldCheck className="h-4 w-4" />, roles: ['ADMIN'], group: 'Sistema' },
];

const GROUP_ORDER: Group[] = ['Operación', 'Configuración', 'Sistema'];

export function AdminSidebar({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto" aria-label="Navegación del panel">
      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
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
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white shadow-[0_10px_30px_-14px_rgba(40,120,255,0.9)]'
                      : 'text-white/75 hover:bg-surface/10 hover:text-white',
                  )
                }
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}