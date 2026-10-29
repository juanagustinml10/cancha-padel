import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Booking, Paginated } from '@padel/shared';
import { CalendarView, type CalendarView as ViewMode } from '@/components/admin/CalendarView';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { FullPageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { addDaysIso, parseDateOnly, todayIso } from '@/lib/datetime';
import { formatCurrency, formatDate, formatDuration, formatTime } from '@/lib/format';
import { bookingStatusLabel, bookingStatusVariant } from '@/lib/status';
import { cn } from '@/lib/utils';

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

/** El API limita cada consulta a 100 registros; el calendario agrega todas las páginas. */
const CALENDAR_PAGE_SIZE = 100;
/** Tope de seguridad para que una consulta descontrolada no prolongue indefinidamente el bucle. */
const CALENDAR_MAX_BOOKINGS = 2000;

/**
 * Reúne todas las reservas del rango solicitando la API página por página, dentro
 * del máximo admitido por petición. Si la cantidad excede el tope de seguridad, se
 * devuelven las primeras páginas disponibles (la vista queda consistente y sin error).
 */
async function fetchAllBookings(range: { from: string; to: string }): Promise<Paginated<Booking>> {
  const maxPages = Math.ceil(CALENDAR_MAX_BOOKINGS / CALENDAR_PAGE_SIZE);
  let result = await adminApi.listBookings({
    from: range.from,
    to: range.to,
    page: 1,
    pageSize: CALENDAR_PAGE_SIZE,
  });

  while (
    result.meta.page < maxPages &&
    result.meta.page * result.meta.pageSize < result.meta.total
  ) {
    const next = await adminApi.listBookings({
      from: range.from,
      to: range.to,
      page: result.meta.page + 1,
      pageSize: CALENDAR_PAGE_SIZE,
    });
    if (next.data.length === 0) break; // protección extra contra un servidor inconsistente
    result = {
      data: [...result.data, ...next.data],
      meta: {
        ...result.meta,
        page: next.meta.page,
        pageSize: next.meta.pageSize,
        total: next.meta.total,
      },
    };
  }
  return result;
}

export function AdminCalendarPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<ViewMode>('day');
  const [date, setDate] = useState(todayIso());
  const [selected, setSelected] = useState<Booking | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const range = useMemo(() => {
    if (view === 'day') return { from: date, to: date };
    if (view === 'week') return { from: date, to: addDaysIso(date, 6) };
    const base = parseDateOnly(date);
    const first = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    const last = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
    return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }, [view, date]);

  const bookings = useAsync(() => fetchAllBookings(range), [range.from, range.to]);
  const courts = useAsync(() => adminApi.listCourts(), []);

  const shift = (direction: -1 | 1) => {
    if (view === 'day') setDate(addDaysIso(date, direction));
    else if (view === 'week') setDate(addDaysIso(date, direction * 7));
    else {
      const base = parseDateOnly(date);
      const nextMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + direction, 1));
      setDate(nextMonth.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Calendario"
        title="Agenda de reservas"
        description="Visualizá la ocupación por día, semana o mes y gestioná cada turno."
        actions={
          <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-surface p-1">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  view === mode ? 'bg-primary text-white' : 'text-ink hover:bg-surface-2',
                )}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
          <Button
            leftIcon={<CalendarPlus className="h-4 w-4" />}
            onClick={() => navigate('/admin/reservas')}
          >
            Nueva reserva
          </Button>
          </div>
        }
      />

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => shift(-1)} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => shift(1)} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setDate(todayIso())}>
              Hoy
            </Button>
          </div>
          <p className="text-sm font-semibold capitalize text-content">
            {view === 'day'
              ? formatDate(parseDateOnly(date).toISOString())
              : view === 'week'
                ? `${formatDate(parseDateOnly(range.from).toISOString(), 'd MMM')} – ${formatDate(parseDateOnly(range.to).toISOString(), 'd MMM')}`
                : formatDate(parseDateOnly(date).toISOString(), "MMMM 'de' yyyy")}
          </p>
        </div>

        {bookings.loading || courts.loading ? (
          <FullPageLoader label="Cargando calendario…" />
        ) : bookings.error ? (
          <ErrorState message={bookings.error} onRetry={bookings.retry} />
        ) : (
          <CalendarView
            view={view}
            date={date}
            bookings={bookings.data?.data ?? []}
            courts={courts.data ?? []}
            onSelectBooking={(booking) => setSelected(booking)}
          />
        )}
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Reserva ${selected.code}` : 'Reserva'}
        footer={
          <>
            {selected && (selected.status === 'PENDING_PAYMENT' || selected.status === 'CONFIRMED') ? (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                Cancelar reserva
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (selected) navigate(`/admin/reservas?search=${selected.code}`);
              }}
            >
              Ver en reservas
            </Button>
          </>
        }
      >
        {selected ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Cliente</dt>
              <dd className="font-medium text-ink">{selected.customer.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted">Cancha</dt>
              <dd className="font-medium text-ink">{selected.courtName}</dd>
            </div>
            <div>
              <dt className="text-muted">Horario</dt>
              <dd className="font-medium text-ink">
                {formatTime(selected.startsAt)} – {formatTime(selected.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Duración</dt>
              <dd className="font-medium text-ink">{formatDuration(selected.durationMinutes)}</dd>
            </div>
            <div>
              <dt className="text-muted">Total / Seña</dt>
              <dd className="font-medium text-ink">
                {formatCurrency(selected.priceTotalCents, selected.currency)} /{' '}
                {formatCurrency(selected.depositAmountCents, selected.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Pago</dt>
              <dd className="font-medium text-ink">
                {formatCurrency(selected.paidAmountCents, selected.currency)}
                <span className="ml-1 text-xs text-muted">
                  {selected.paidAmountCents >= selected.depositAmountCents
                    ? '(seña acreditada)'
                    : selected.paidAmountCents > 0
                      ? '(parcial)'
                      : '(sin pago)'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Estado</dt>
              <dd>
                <Badge variant={bookingStatusVariant(selected.status)}>
                  {bookingStatusLabel(selected.status)}
                </Badge>
              </dd>
            </div>
            {selected.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Observaciones</dt>
                <dd className="text-ink">{selected.notes}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancelar reserva"
        message={
          selected
            ? `¿Confirmás cancelar la reserva ${selected.code} de ${selected.customer.fullName}?`
            : ''
        }
        confirmLabel="Cancelar reserva"
        danger
        requireReason
        loading={actionLoading}
        onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => {
          if (!selected) return;
          setActionLoading(true);
          try {
            await adminApi.cancelBooking(selected.id, reason ?? 'Cancelada desde el calendario');
            toast.success('Reserva cancelada');
            setCancelOpen(false);
            setSelected(null);
            void bookings.retry();
          } catch (error) {
            toast.error('No se pudo cancelar', getErrorMessage(error));
          } finally {
            setActionLoading(false);
          }
        }}
      />
    </div>
  );
}
