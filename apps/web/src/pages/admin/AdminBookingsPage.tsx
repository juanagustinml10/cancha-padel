import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, Search } from 'lucide-react';
import type { Booking } from '@padel/shared';
import { manualBookingSchema } from '@padel/shared';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { clubDateTimeToIso, todayIso } from '@/lib/datetime';
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

  const manual = useZodForm(manualBookingSchema, {
    courtId: '',
    date: todayIso(),
    startTime: '19:00',
    durationMinutes: 60,
    fullName: '',
    email: '',
    phone: '',
    notes: '',
  });

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

  const handleManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = manual.validate();
    if (!data) return;
    try {
      await adminApi.createManualBooking({
        courtId: data.courtId,
        startsAt: clubDateTimeToIso(data.date, data.startTime),
        durationMinutes: Number(data.durationMinutes),
        customer: { fullName: data.fullName, email: data.email, phone: data.phone },
        notes: data.notes || undefined,
      });
      toast.success('Reserva registrada', 'La reserva manual bloquea la disponibilidad.');
      setManualOpen(false);
      manual.reset();
      void bookings.retry();
    } catch (error) {
      toast.error('No se pudo registrar la reserva', getErrorMessage(error));
    }
  };

  const runAction = async (
    action: () => Promise<Booking>,
    successMessage: string,
    onDone: () => void,
  ) => {
    setActionLoading(true);
    try {
      await action();
      toast.success(successMessage);
      onDone();
      void bookings.retry();
    } catch (error) {
      toast.error('No se pudo completar la acción', getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  };

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
    [],
  );

  const hasFilters = Boolean(search || status || paymentMethod || courtId || from || to);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Reservas" title="Gestión de reservas" />
        <Button leftIcon={<CalendarPlus className="h-4 w-4" />} onClick={() => setManualOpen(true)}>
          Nueva reserva manual
        </Button>
      </div>

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

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Nueva reserva manual"
        description="La reserva manual bloquea la disponibilidad igual que una reserva online."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleManualSubmit}>Registrar reserva</Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleManualSubmit} noValidate>
          <Field label="Cancha" htmlFor="manual-court" required error={manual.errors.courtId}>
            <Select
              id="manual-court"
              value={manual.values.courtId}
              invalid={Boolean(manual.errors.courtId)}
              onChange={(event) => manual.setField('courtId', event.target.value)}
            >
              <option value="">Seleccioná una cancha</option>
              {(courts.data ?? [])
                .filter((court) => court.status === 'ACTIVE')
                .map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Duración" htmlFor="manual-duration" required error={manual.errors.durationMinutes}>
            <Select
              id="manual-duration"
              value={String(manual.values.durationMinutes)}
              onChange={(event) => manual.setField('durationMinutes', Number(event.target.value))}
            >
              <option value="60">1 hora</option>
              <option value="90">1 hora 30 min</option>
              <option value="120">2 horas</option>
            </Select>
          </Field>
          <Field label="Fecha" htmlFor="manual-date" required error={manual.errors.date}>
            <Input
              id="manual-date"
              type="date"
              min={todayIso()}
              value={manual.values.date}
              invalid={Boolean(manual.errors.date)}
              onChange={(event) => manual.setField('date', event.target.value)}
            />
          </Field>
          <Field label="Hora de inicio" htmlFor="manual-time" required error={manual.errors.startTime}>
            <Input
              id="manual-time"
              type="time"
              value={manual.values.startTime}
              invalid={Boolean(manual.errors.startTime)}
              onChange={(event) => manual.setField('startTime', event.target.value)}
            />
          </Field>
          <Field label="Nombre del cliente" htmlFor="manual-name" required error={manual.errors.fullName}>
            <Input
              id="manual-name"
              value={manual.values.fullName}
              invalid={Boolean(manual.errors.fullName)}
              onChange={(event) => manual.setField('fullName', event.target.value)}
            />
          </Field>
          <Field label="Teléfono" htmlFor="manual-phone" required error={manual.errors.phone}>
            <Input
              id="manual-phone"
              value={manual.values.phone}
              invalid={Boolean(manual.errors.phone)}
              onChange={(event) => manual.setField('phone', event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="manual-email" required error={manual.errors.email} className="sm:col-span-2">
            <Input
              id="manual-email"
              type="email"
              value={manual.values.email}
              invalid={Boolean(manual.errors.email)}
              onChange={(event) => manual.setField('email', event.target.value)}
            />
          </Field>
          <Field label="Notas (opcional)" htmlFor="manual-notes" className="sm:col-span-2">
            <Textarea
              id="manual-notes"
              rows={2}
              value={manual.values.notes}
              onChange={(event) => manual.setField('notes', event.target.value)}
            />
          </Field>
        </form>
      </Modal>

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
