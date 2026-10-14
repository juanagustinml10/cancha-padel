import { Link } from 'react-router-dom';
import {
  CalendarClock,
  CircleDollarSign,
  Hourglass,
  Percent,
  PiggyBank,
  ShieldAlert,
  TicketCheck,
  XCircle,
} from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { FullPageLoader } from '@/components/ui/Spinner';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/services/adminApi';
import { formatCurrency, formatDateShort, formatTime } from '@/lib/format';
import { bookingStatusLabel, bookingStatusVariant } from '@/lib/status';

export function AdminDashboardPage() {
  const dashboard = useAsync(() => adminApi.getDashboard(), []);

  if (dashboard.loading) return <FullPageLoader label="Cargando panel…" />;
  if (dashboard.error) return <ErrorState message={dashboard.error} onRetry={dashboard.retry} />;
  if (!dashboard.data) return null;

  const data = dashboard.data;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Resumen general"
        title="Estado del día"
        description="Indicadores operativos y reservas próximas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reservas hoy"
          value={data.bookingsToday}
          hint={`${data.confirmedToday} confirmadas`}
          icon={<TicketCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Pagos pendientes"
          value={data.pendingPayment}
          hint="Reservas sin seña acreditada"
          icon={<Hourglass className="h-5 w-5" />}
        />
        <StatCard
          label="Ocupación de hoy"
          value={`${Math.round(data.occupancyRate * 100)}%`}
          icon={<Percent className="h-5 w-5" />}
        />
        <StatCard
          label="Cobrado hoy"
          value={formatCurrency(data.revenueTodayCents, data.currency)}
          hint={`Mes: ${formatCurrency(data.revenueMonthCents, data.currency)}`}
          icon={<CircleDollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Reservado hoy"
          value={formatCurrency(data.reservedTodayCents, data.currency)}
          hint="Reservas activas del día"
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <StatCard
          label="Señas por cobrar"
          value={formatCurrency(data.pendingDepositsCents, data.currency)}
          hint="Turnos de hoy sin pago"
          icon={<Hourglass className="h-5 w-5" />}
        />
        <StatCard
          label="Canceladas hoy"
          value={data.cancelledToday}
          icon={<XCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Pagos en revisión"
          value={data.paymentsRequiringReview}
          hint="Requieren conciliación manual"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-content">
              <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
              Próximas reservas
            </h2>
            <Link to="/admin/reservas">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>

          <div className="mt-4">
            {data.upcoming.length === 0 ? (
              <EmptyState title="Sin reservas próximas" description="No hay turnos agendados por delante." />
            ) : (
              <ul className="divide-y divide-border">
                {data.upcoming.map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{booking.customer.fullName}</p>
                      <p className="text-xs text-muted">
                        {formatDateShort(booking.startsAt)} · {formatTime(booking.startsAt)} · {booking.courtName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden font-mono text-xs text-muted sm:inline">{booking.code}</span>
                      <Badge variant={bookingStatusVariant(booking.status)}>
                        {bookingStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-content">Ocupación por cancha (hoy)</h2>
          <div className="mt-4 flex flex-col gap-4">
            {data.occupiedByCourt.map((court) => {
              const ratio = court.totalMinutes === 0 ? 0 : court.occupiedMinutes / court.totalMinutes;
              return (
                <div key={court.courtId}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{court.courtName}</span>
                    <span className="text-muted">{Math.round(ratio * 100)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
