import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  TicketCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/services/adminApi';
import { formatCurrency, formatDateShort, formatTime } from '@/lib/format';
import { bookingStatusLabel, bookingStatusVariant } from '@/lib/status';

function percent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100)));
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const dashboard = useAsync(() => adminApi.getDashboard(), []);

  if (dashboard.loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <Card className="border-danger/30 bg-danger-soft/40 p-5 text-sm text-content">
        No pudimos cargar el resumen: {dashboard.error}
      </Card>
    );
  }

  if (!dashboard.data) return null;

  const data = dashboard.data;
  const todayLabel = formatDateShort(new Date().toISOString());
  const occupancy = percent(data.occupancyRate);
  const needsAttention = data.pendingPayment + data.paymentsRequiringReview;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Resumen general"
        title={`Hola, ${user?.fullName.split(' ')[0] ?? 'equipo'}`}
        description={`${todayLabel} · Estado operativo del club y accesos rápidos.`}
        actions={
          <>
            <Link to="/admin/calendario" className={buttonClasses('outline', 'md')}>
              <CalendarDays className="h-4 w-4" aria-hidden />
              Ver agenda
            </Link>
            <Link to="/admin/reservas" className={buttonClasses('primary', 'md')}>
              <TicketCheck className="h-4 w-4" aria-hidden />
              Nueva reserva
            </Link>
          </>
        }
      />

      {needsAttention > 0 ? (
        <Card className="border-warning/30 bg-warning-soft/25 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-warning/30 bg-surface text-warning">
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-content">Hay tareas pendientes de revisión</p>
                <p className="mt-0.5 text-sm text-muted">
                  {data.pendingPayment} reservas sin seña
                  {data.paymentsRequiringReview > 0
                    ? ` · ${data.paymentsRequiringReview} pagos requieren revisión`
                    : ''}
                  .
                </p>
              </div>
            </div>
            <Link
              to={data.paymentsRequiringReview > 0 ? '/admin/pagos' : '/admin/reservas'}
              className={buttonClasses('outline', 'sm', 'shrink-0')}
            >
              Revisar ahora
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-success/20 bg-success-soft/15 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
            <p className="text-sm text-content">
              Sin pendientes críticos: las reservas y los pagos del día están al día.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reservas hoy"
          value={data.bookingsToday}
          hint={`${data.confirmedToday} confirmadas · ${data.cancelledToday} canceladas`}
          icon={<TicketCheck className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Ocupación del día"
          value={`${occupancy}%`}
          hint={`${data.occupiedByCourt.length} canchas en el complejo`}
          icon={<CalendarClock className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Cobrado hoy"
          value={formatCurrency(data.revenueTodayCents, data.currency)}
          hint={`Mes: ${formatCurrency(data.revenueMonthCents, data.currency)}`}
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Requieren atención"
          value={needsAttention}
          hint={`${formatCurrency(data.pendingDepositsCents, data.currency)} en señas pendientes`}
          icon={<CircleDollarSign className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-base font-semibold text-content">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden />
                Próximas reservas
              </h2>
              <p className="mt-0.5 text-xs text-muted">Los siguientes turnos del club.</p>
            </div>
            <Link to="/admin/reservas" className="text-sm font-medium text-accent hover:text-accent-hover">
              Ver todas
            </Link>
          </div>

          <div className="mt-4 flex-1">
            {data.upcoming.length === 0 ? (
              <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface-2/30 px-4 py-8 text-center">
                <CalendarClock className="h-6 w-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-medium text-content">No hay reservas próximas</p>
                <p className="mt-1 text-xs text-muted">La agenda está libre por ahora.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {data.upcoming.slice(0, 6).map((booking) => (
                  <li key={booking.id}>
                    <Link
                      to={`/admin/reservas?search=${booking.code}`}
                      className="flex items-center gap-3 rounded-lg py-3 transition-colors hover:bg-surface-2/60 sm:gap-4"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-sm font-bold text-content tnum">{formatTime(booking.startsAt)}</p>
                        <p className="text-[10px] uppercase tracking-wide text-muted">
                          {formatDateShort(booking.startsAt).slice(0, 5)}
                        </p>
                      </div>
                      <div className="h-9 w-px bg-line" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-content">
                          {booking.customer.fullName}
                        </p>
                        <p className="truncate text-xs text-muted">{booking.courtName}</p>
                      </div>
                      <Badge variant={bookingStatusVariant(booking.status)}>
                        {bookingStatusLabel(booking.status)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="flex flex-col p-5">
          <div>
            <h2 className="text-base font-semibold text-content">Ocupación por cancha</h2>
            <p className="mt-0.5 text-xs text-muted">Minutos reservados sobre la jornada de hoy.</p>
          </div>

          <div className="mt-4 flex flex-1 flex-col gap-4">
            {data.occupiedByCourt.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface-2/30 px-4 py-8 text-center text-sm text-muted">
                No hay canchas configuradas.
              </p>
            ) : (
              data.occupiedByCourt.map((court) => {
                const value =
                  court.totalMinutes === 0
                    ? 0
                    : Math.min(100, Math.round((court.occupiedMinutes / court.totalMinutes) * 100));
                return (
                  <div key={court.courtId}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink">{court.courtName}</span>
                      <span className="shrink-0 text-xs font-semibold text-content tnum">{value}%</span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-surface-2"
                      role="progressbar"
                      aria-label={`Ocupación de ${court.courtName}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={value}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-500"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
            <span className="text-muted">Ocupación general</span>
            <span className="font-bold text-content tnum">{occupancy}%</span>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-content">Accesos rápidos</h2>
          <Link to="/admin/calendario" className="text-sm font-medium text-accent hover:text-accent-hover">
            Abrir calendario
          </Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/admin/reservas"
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3 text-sm font-medium text-content transition-colors hover:border-primary hover:bg-brand-soft"
          >
            <TicketCheck className="h-4 w-4 text-accent" aria-hidden />
            Reservas
          </Link>
          <Link
            to="/admin/pagos"
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3 text-sm font-medium text-content transition-colors hover:border-primary hover:bg-brand-soft"
          >
            <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden />
            Pagos y señas
          </Link>
          <Link
            to="/admin/clientes"
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3 text-sm font-medium text-content transition-colors hover:border-primary hover:bg-brand-soft"
          >
            <Users className="h-4 w-4 text-accent" aria-hidden />
            Clientes
          </Link>
          {user?.role === 'ADMIN' ? (
            <Link
              to="/admin/camaras"
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3 text-sm font-medium text-content transition-colors hover:border-primary hover:bg-brand-soft"
            >
              <Camera className="h-4 w-4 text-accent" aria-hidden />
              Cámaras
            </Link>
          ) : (
            <Link
              to="/admin/calendario"
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3 text-sm font-medium text-content transition-colors hover:border-primary hover:bg-brand-soft"
            >
              <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
              Agenda del día
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
