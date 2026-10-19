import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  TicketCheck,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/services/adminApi';
import { formatCurrency, formatDateShort, formatTime } from '@/lib/format';
import { bookingStatusLabel, bookingStatusVariant } from '@/lib/status';

export function AdminDashboardPage() {
  const dashboard = useAsync(() => adminApi.getDashboard(), []);

  if (dashboard.loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
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

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Resumen general"
        title="Estado del día"
        description="Información operativa rápida para hoy."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reservas hoy"
          value={data.bookingsToday}
          hint={`${data.confirmedToday} confirmadas`}
          icon={<TicketCheck className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Pagos pendientes"
          value={data.pendingPayment}
          hint="Sin seña acreditada"
          icon={<CircleDollarSign className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Ocupación del día"
          value={`${data.occupancyRate}%`}
          hint={`${data.occupiedByCourt.length} canchas activas`}
          icon={<CalendarClock className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="Cobrado hoy"
          value={formatCurrency(data.revenueTodayCents, data.currency)}
          hint={`Mes: ${formatCurrency(data.revenueMonthCents, data.currency)}`}
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-content">
              <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
              Próximas reservas
            </h2>
            <Link to="/admin/reservas" className="text-sm font-medium text-accent hover:text-accent-hover">
              Ver todas
            </Link>
          </div>
          <div className="mt-4">
            {data.upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface-2/40 px-4 py-8 text-center text-sm text-muted">
                No hay reservas próximas.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.upcoming.slice(0, 6).map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">
                        {booking.customer.fullName}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateShort(booking.startsAt)} · {formatTime(booking.startsAt)} ·{' '}
                        {booking.courtName}
                      </p>
                    </div>
                    <Badge variant={bookingStatusVariant(booking.status)}>
                      {bookingStatusLabel(booking.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-content">Accesos rápidos</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            <Link to="/admin/reservas" className={buttonClasses('primary', 'md', 'w-full')}>
              <TicketCheck className="h-4 w-4" aria-hidden />
              Ver reservas
            </Link>
            <Link to="/admin/calendario" className={buttonClasses('outline', 'md', 'w-full')}>
              <CalendarDays className="h-4 w-4" aria-hidden />
              Ver calendario
            </Link>
            <Link to="/admin/pagos" className={buttonClasses('outline', 'md', 'w-full')}>
              <CircleDollarSign className="h-4 w-4" aria-hidden />
              Ver pagos
            </Link>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="inline-flex items-center gap-2 text-xs text-muted">
              <TrendingUp className="h-4 w-4 text-accent" aria-hidden />
              Cobrado en el mes:{' '}
              <span className="font-semibold text-content tnum">
                {formatCurrency(data.revenueMonthCents, data.currency)}
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
