import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, Check, Search } from 'lucide-react';
import type { Booking } from '@padel/shared';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ManualBookingModal } from '@/components/admin/ManualBookingModal';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency, formatDateShort, formatDuration, formatTime } from '@/lib/format';
import { bookingStatusLabel, bookingStatusVariant, paymentMethodLabel } from '@/lib/status';
import { BOOKING_PAYMENT_METHOD_LABELS, BOOKING_STATUS_LABELS } from '@padel/shared';

const PAGE_SIZE = 12;

export function AdminBookingsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [courtId, setCourtId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  const courts = useAsync(() => adminApi.listCourts(), []);
  const bookings = useAsync(
    () =>
      adminApi.listBookings({
        search: debouncedSearch || undefined,
        status: status || undefined,
        paymentMethod: paymentMethod || undefined,
        courtId: courtId || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [debouncedSearch, status, paymentMethod, courtId, from, to, page],
  );

  const [manualOpen, setManualOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<Booking | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Booking | null>(null);
  const [notesTarget, setNotesTarget] = useState<Booking | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const retryBookings = bookings.retry;

  const resetFilters = () => {
    setSearch('');
    setStatus('');
    setPaymentMethod('');
    setCourtId('');
    setFrom('');
    setTo('');
    setPage(1);
    setSearchParams({});
  };

  const runAction = useCallback(
    async (action: () => Promise<Booking>, successMessage: string, onDone: () => void) => {
      setActionLoading(true);
      try {
        await action();
        toast.success(successMessage);
        onDone();
        void retryBookings();
      } catch (error) {
        toast.error('No se pudo completar la acción', getErrorMessage(error));
      } finally {
        setActionLoading(false);
      }
    },
    [retryBookings, toast],
  );

  const columns = useMemo<Column<Booking>[]>(
    () => [
      {
        key: 'code',
        header: 'Código',
        render: (row) => <span className="font-mono text-xs text-content">{row.code}</span>,
      },
      {
        key: 'customer',
        header: 'Cliente',
        render: (row) => (
          <div>
            <p className="font-medium text-ink">{row.customer.fullName}</p>
            <p className="text-xs text-muted">{row.customer.phone}</p>
          </div>
        ),
      },
      { key: 'court', header: 'Cancha', render: (row) => row.courtName },
      {
        key: 'schedule',
        header: 'Fecha y hora',
        render: (row) => (
          <div>
            <p className="text-ink">{formatDateShort(row.startsAt)}</p>
            <p className="text-xs text-muted">
              {formatTime(row.startsAt)} · {formatDuration(row.durationMinutes)}
            </p>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Total / Seña',
        render: (row) => (
          <div>
            <p className="text-ink">{formatCurrency(row.priceTotalCents, row.currency)}</p>
            <p className="text-xs text-muted">Seña {formatCurrency(row.depositAmountCents, row.currency)}</p>
          </div>
        ),
      },
      {
        key: 'paymentMethod',
        header: 'Medio de pago',
        render: (row) => (
          <span className={row.paymentMethod ? 'text-ink' : 'text-xs text-muted'}>
            {row.paymentMethod ? paymentMethodLabel(row.paymentMethod) : 'Sin definir'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <Badge variant={bookingStatusVariant(row.status)}>{bookingStatusLabel(row.status)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNotesTarget(row);
                setNotesValue(row.notes ?? '');
              }}
            >
              Notas
            </Button>
            {row.status === 'PENDING_PAYMENT' ? (
              <Button
                size="sm"
                variant="outline"
                disabled={actionLoading}
                leftIcon={<Check className="h-4 w-4" />}
                onClick={() => {
                  void runAction(
                    () => adminApi.confirmBooking(row.id),
                    'Reserva confirmada',
                    () => undefined,
                  );
                }}
              >
                Confirmar
              </Button>
            ) : null}
            {row.status === 'CONFIRMED' ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setCompleteTarget(row)}>
                  Finalizar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setNoShowTarget(row)}>
                  Ausencia
                </Button>
              </>
            ) : null}
            {row.status === 'CONFIRMED' || row.status === 'PENDING_PAYMENT' ? (
              <Button size="sm" variant="danger" onClick={() => setCancelTarget(row)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [actionLoading, runAction],
  );

  const hasFilters = Boolean(search || status || paymentMethod || courtId || from || to);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Reservas"
        title="Gestión de reservas"
        description="Buscá, filtrá y gestioná los turnos del club. Las acciones quedan registradas en la auditoría."
        actions={
          <Button leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setManualOpen(true)}>
            Ingresar reserva manual
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por código, nombre o email"
              className="pl-9"
              aria-label="Buscar reservas"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por medio de pago"
          >
            <option value="">Todos los medios de pago</option>
            {Object.entries(BOOKING_PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            value={courtId}
            onChange={(event) => {
              setCourtId(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por cancha"
          >
            <option value="">Todas las canchas</option>
            {(courts.data ?? []).map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={resetFilters} disabled={!hasFilters}>
            Limpiar
          </Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <Field label="Desde" htmlFor="filter-from">
            <Input id="filter-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="Hasta" htmlFor="filter-to">
            <Input id="filter-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
        </div>
      </Card>

      {bookings.error ? (
        <ErrorState message={bookings.error} onRetry={bookings.retry} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={bookings.data?.data ?? []}
            keyExtractor={(row) => row.id}
            loading={bookings.loading}
            empty={
              <EmptyState
                title="No hay reservas"
                description={hasFilters ? 'Probá ajustar los filtros de búsqueda.' : 'Todavía no se registraron reservas.'}
              />
            }
          />
          {bookings.data ? (
            <Pagination
              page={bookings.data.meta.page}
              pageSize={bookings.data.meta.pageSize}
              total={bookings.data.meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ManualBookingModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => void bookings.retry()}
      />

      <Modal
        open={notesTarget !== null}
        onClose={() => setNotesTarget(null)}
        title="Observaciones de la reserva"
        description={
          notesTarget
            ? `Reserva ${notesTarget.code} · ${notesTarget.customer.fullName}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setNotesTarget(null)}>
              Cancelar
            </Button>
            <Button
              loading={notesLoading}
              onClick={async () => {
                if (!notesTarget) return;
                setNotesLoading(true);
                try {
                  await adminApi.updateBookingNotes(notesTarget.id, notesValue);
                  toast.success('Observaciones guardadas');
                  setNotesTarget(null);
                  void bookings.retry();
                } catch (error) {
                  toast.error('No se pudieron guardar las observaciones', getErrorMessage(error));
                } finally {
                  setNotesLoading(false);
                }
              }}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Notas internas" htmlFor="booking-notes" hint="Visibles solo para el equipo del club.">
          <Textarea
            id="booking-notes"
            rows={4}
            maxLength={1000}
            value={notesValue}
            onChange={(event) => setNotesValue(event.target.value)}
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar reserva"
        message={
          cancelTarget
            ? `¿Confirmás cancelar la reserva ${cancelTarget.code} de ${cancelTarget.customer.fullName}?`
            : ''
        }
        confirmLabel="Cancelar reserva"
        danger
        requireReason
        loading={actionLoading}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          if (!cancelTarget) return;
          void runAction(
            () => adminApi.cancelBooking(cancelTarget.id, reason ?? 'Cancelada desde el panel'),
            'Reserva cancelada',
            () => setCancelTarget(null),
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(completeTarget)}
        title="Finalizar turno"
        message="La reserva se marcará como finalizada."
        confirmLabel="Finalizar"
        loading={actionLoading}
        onClose={() => setCompleteTarget(null)}
        onConfirm={() => {
          if (!completeTarget) return;
          void runAction(
            () => adminApi.completeBooking(completeTarget.id),
            'Turno finalizado',
            () => setCompleteTarget(null),
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(noShowTarget)}
        title="Registrar ausencia"
        message="El cliente no se presentó al turno. Esta acción queda registrada."
        confirmLabel="Registrar ausencia"
        danger
        loading={actionLoading}
        onClose={() => setNoShowTarget(null)}
        onConfirm={() => {
          if (!noShowTarget) return;
          void runAction(
            () => adminApi.markNoShow(noShowTarget.id),
            'Ausencia registrada',
            () => setNoShowTarget(null),
          );
        }}
      />
    </div>
  );
}
