import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShieldAlert, X } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { Logo } from './Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const ROLE_LABELS = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepción',
} as const;

export function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!user) return null;

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
    <div className="flex min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-night px-4 py-5 lg:flex">
        <div className="mb-6 [&_span]:text-white">
          <Logo compact />
        </div>
        <AdminSidebar role={user.role} />
        <div className="mt-4 rounded-xl border border-line bg-surface/5 p-3 text-xs text-white/70">
          <p className="font-semibold text-white">{user.fullName}</p>
          <p className="mt-0.5">{ROLE_LABELS[user.role]}</p>
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
                <Logo compact />
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
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line glass-bar px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl p-2 text-content transition-colors hover:bg-surface-2 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <ShieldAlert className="h-4 w-4 text-accent" aria-hidden />
              <span className="text-sm font-medium text-muted">Panel administrativo</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden text-sm font-medium text-accent transition-colors hover:text-accent-hover hover:underline sm:inline"
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
            >
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
