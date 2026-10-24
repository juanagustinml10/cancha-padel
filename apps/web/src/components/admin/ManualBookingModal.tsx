import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, Search } from 'lucide-react';
import type {
  AvailabilitySlot,
  Booking,
  BookingPaymentMethod,
  Court,
  Customer,
} from '@padel/shared';
import { manualBookingSchema } from '@padel/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { CourtPicker, groupSlotsByCourt } from '@/components/booking/CourtPicker';
import { DatePicker } from '@/components/booking/DatePicker';
import { DurationSelector } from '@/components/booking/DurationSelector';
import { PaymentMethodPicker } from '@/components/booking/PaymentMethodPicker';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { publicApi } from '@/services/publicApi';
import { useToast } from '@/context/ToastContext';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { todayIso } from '@/lib/datetime';
import { formatCurrency, formatDateTime, formatDuration } from '@/lib/format';
import { bookingStatusLabel, paymentMethodLabel } from '@/lib/status';
import { cn } from '@/lib/utils';

const DURATIONS = [60, 90, 120];

type ManualStatus = 'CONFIRMED' | 'PENDING_PAYMENT';

const STATUS_OPTIONS: {
  value: ManualStatus;
  title: string;
  description: string;
  icon: typeof Clock;
}[] = [
  {
    value: 'CONFIRMED',
    title: 'Reserva confirmada',
    description: 'El turno queda reservado. Registrá la seña en Pagos cuando la recibas.',
    icon: CheckCircle2,
  },
  {
    value: 'PENDING_PAYMENT',
    title: 'Pago pendiente',
    description: 'El turno queda reservado hasta que se confirme el pago de la seña.',
    icon: Clock,
  },
];

function initialValues() {
  return {
    courtId: '',
    date: todayIso(),
    startsAt: '',
    durationMinutes: 60,
    fullName: '',
    email: '',
    phone: '',
    notes: '',
  };
}

function findCurrentSlot(slots: AvailabilitySlot[] | undefined, slot: AvailabilitySlot | null) {
  if (!slot) return null;
  return (
    slots?.find((item) => item.startsAt === slot.startsAt && item.courtId === slot.courtId) ?? null
  );
}

interface ManualBookingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (booking: Booking) => void;
}

/**
 * Reserva manual del panel administrativo.
 *
 * Reutiliza los mismos componentes y reglas que la reserva pública (fecha,
 * duración, cancha, horarios, medio de pago) y agrega las herramientas del
 * staff: búsqueda de clientes, estado inicial y observaciones internas.
 * La disponibilidad siempre se consulta y se revalida en el servidor.
 */
export function ManualBookingModal({ open, onClose, onCreated }: ManualBookingModalProps) {
  const toast = useToast();
  const manual = useZodForm(manualBookingSchema, initialValues());
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod | null>(null);
  const [status, setStatus] = useState<ManualStatus>('CONFIRMED');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Booking | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const debouncedSearch = useDebounce(customerSearch, 300);

  const date = manual.values.date;
  const duration = Number(manual.values.durationMinutes) || 60;
  const courtId = manual.values.courtId;

  const courtsQuery = useAsync(() => adminApi.listCourts(), [], { enabled: open });
  const availabilityQuery = useAsync(
    () => publicApi.getAvailability(date, duration),
    [date, duration],
    { enabled: open },
  );
  const customerQuery = useAsync(() => adminApi.listCustomers(debouncedSearch.trim()), [debouncedSearch], {
    enabled: open && debouncedSearch.trim().length >= 2,
  });

  const activeCourts = useMemo(
    () => (courtsQuery.data ?? []).filter((court) => court.status === 'ACTIVE'),
    [courtsQuery.data],
  );
  const slotsByCourt = useMemo(
    () => groupSlotsByCourt(availabilityQuery.data?.slots ?? []),
    [availabilityQuery.data],
  );
  const selectedCourt: Court | null =
    activeCourts.find((court) => court.id === courtId) ?? null;
  const courtSlots = courtId ? (slotsByCourt.get(courtId) ?? []) : [];

  const resetSlot = () => {
    setSelectedSlot(null);
    manual.setField('startsAt', '');
    setSlotError(null);
  };

  // Si la disponibilidad se actualizó y el turno elegido ya no está, se limpia.
  useEffect(() => {
    if (!selectedSlot || availabilityQuery.error) return;
    const fresh = findCurrentSlot(availabilityQuery.data?.slots ?? [], selectedSlot);
    if (!fresh || !fresh.available) {
      setSelectedSlot(null);
      manual.setField('startsAt', '');
      setSlotError('Ese horario ya no está disponible. Elegí otro turno.');
      return;
    }
    if (
      fresh.priceTotalCents !== selectedSlot.priceTotalCents ||
      fresh.depositAmountCents !== selectedSlot.depositAmountCents
    ) {
      setSelectedSlot(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityQuery.data]);

  const resetAll = () => {
    manual.reset(initialValues());
    setSelectedSlot(null);
    setSlotError(null);
    setPaymentMethod(null);
    setStatus('CONFIRMED');
    setCreated(null);
    setCustomerSearch('');
  };

  const handleClose = () => {
    if (submitting) return;
    if (created) resetAll();
    onClose();
  };

  const createAnother = () => {
    resetAll();
    void availabilityQuery.retry();
  };

  const pickCustomer = (customer: Customer) => {
    manual.setField('fullName', customer.fullName);
    manual.setField('email', customer.email);
    manual.setField('phone', customer.phone);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const data = manual.validate();
    if (!data) return;

    const currentSlot = findCurrentSlot(availabilityQuery.data?.slots ?? [], selectedSlot);
    if (!currentSlot || !currentSlot.available) {
      setSelectedSlot(null);
      manual.setField('startsAt', '');
      setSlotError('Ese horario ya no está disponible. Elegí otro turno.');
      void availabilityQuery.retry();
      return;
    }

    setSubmitting(true);
    try {
      const booking = await adminApi.createManualBooking({
        courtId: data.courtId,
        startsAt: data.startsAt,
        durationMinutes: Number(data.durationMinutes),
        customer: { fullName: data.fullName, email: data.email, phone: data.phone },
        notes: data.notes || undefined,
        paymentMethod: paymentMethod ?? undefined,
        status,
      });
      setCreated(booking);
      onCreated(booking);
      toast.success('Reserva registrada', `${booking.courtName} · ${formatDateTime(booking.startsAt)}`);
      // La reserva nueva ocupa el turno: refrescamos la disponibilidad.
      void availabilityQuery.retry();
    } catch (error) {
      toast.error('No se pudo registrar la reserva', getErrorMessage(error));
      if (error instanceof ApiError && error.code === 'SLOT_TAKEN') {
        setSelectedSlot(null);
        manual.setField('startsAt', '');
        setSlotError('Ese horario ya estaba ocupado. Se actualizó la disponibilidad.');
        void availabilityQuery.retry();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Reserva registrada"
        description="La reserva quedó guardada y la lista del panel se actualizó."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={createAnother} disabled={submitting}>
              Crear otra
            </Button>
            <Button onClick={handleClose}>Ver reservas</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-soft/40">
            <CheckCircle2 className="h-7 w-7 text-success" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-semibold text-content">La reserva se creó correctamente</p>
            <p className="mt-1 text-sm text-muted">
              Código de reserva:{' '}
              <span className="font-mono font-semibold text-content">{created.code}</span>
            </p>
          </div>
        </div>

        <Card className="mt-5 p-5">
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Cliente</dt>
              <dd className="text-right font-medium text-ink">{created.customer.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Cancha</dt>
              <dd className="text-right font-medium text-ink">{created.courtName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Horario</dt>
              <dd className="text-right font-medium text-ink">
                {formatDateTime(created.startsAt)} · {formatDuration(created.durationMinutes)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Precio total</dt>
              <dd className="text-right font-medium text-ink">
                {formatCurrency(created.priceTotalCents, created.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Seña</dt>
              <dd className="text-right font-semibold text-accent">
                {formatCurrency(created.depositAmountCents, created.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Medio de pago</dt>
              <dd className="text-right font-medium text-ink">
                {paymentMethodLabel(created.paymentMethod)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Estado</dt>
              <dd className="text-right font-medium text-ink">
                {bookingStatusLabel(created.status)}
              </dd>
            </div>
          </dl>
        </Card>

        <p className="mt-4 text-xs text-muted">
          {created.status === 'PENDING_PAYMENT'
            ? 'La reserva queda bloqueando el turno hasta que se confirme la seña desde el panel de Pagos o con la acción Confirmar.'
            : 'Si corresponde, registrá el pago de la seña desde el panel de Pagos.'}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ingresar reserva manual"
      description="Mismas opciones que la reserva online. La disponibilidad y el precio se validan en el servidor."
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Registrar reserva
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <section className="flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-content">Turno</h3>
            <p className="mt-0.5 text-sm text-muted">
              Elegí fecha, duración, cancha y horario. La grilla refleja la disponibilidad del
              servidor.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Fecha" required error={manual.errors.date}>
              <DatePicker
                value={date}
                onChange={(next) => {
                  manual.setField('date', next);
                  resetSlot();
                }}
              />
            </Field>
            <Field label="Duración" required error={manual.errors.durationMinutes}>
              <DurationSelector
                value={duration}
                options={DURATIONS}
                onChange={(next) => {
                  manual.setField('durationMinutes', next);
                  resetSlot();
                }}
              />
            </Field>
          </div>

          <Field label="Cancha" required error={manual.errors.courtId}>
            {courtsQuery.loading ? (
              <Skeleton className="h-20 w-full" />
            ) : courtsQuery.error ? (
              <ErrorState message={courtsQuery.error} onRetry={courtsQuery.retry} />
            ) : activeCourts.length === 0 ? (
              <EmptyState title="No hay canchas activas" />
            ) : (
              <CourtPicker
                courts={activeCourts}
                value={courtId || null}
                onChange={(nextCourtId) => {
                  manual.setField('courtId', nextCourtId);
                  resetSlot();
                }}
                slotsByCourt={slotsByCourt}
              />
            )}
          </Field>

          <Field
            label="Horario"
            required
            error={
              slotError ??
              manual.errors.startsAt ??
              undefined
            }
            hint={
              selectedCourt && !slotError && !manual.errors.startsAt
                ? `Disponibilidad del servidor para ${date}. Tocá un horario para seleccionarlo.`
                : undefined
            }
          >
            {!courtId ? (
              <p className="rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-sm text-muted">
                Seleccioná una cancha para ver los horarios.
              </p>
            ) : availabilityQuery.loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : availabilityQuery.error ? (
              <ErrorState message={availabilityQuery.error} onRetry={availabilityQuery.retry} />
            ) : (
              <TimeSlotPicker
                slots={courtSlots}
                value={selectedSlot?.startsAt ?? null}
                onChange={(slot) => {
                  setSelectedSlot(slot);
                  manual.setField('startsAt', slot.startsAt);
                  setSlotError(null);
                }}
              />
            )}
          </Field>
        </section>

        <section className="flex flex-col gap-4 border-t border-line pt-5">
          <div>
            <h3 className="text-base font-semibold text-content">Cliente</h3>
            <p className="mt-0.5 text-sm text-muted">
              Buscá un cliente existente o cargá los datos como cliente nuevo.
            </p>
          </div>

          <Field
            label="Buscar cliente existente"
            htmlFor="manual-customer-search"
            hint="Si el email ya existe, se actualiza su ficha. Si no existe, se crea un cliente nuevo."
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <Input
                id="manual-customer-search"
                className="pl-9"
                autoComplete="off"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Buscar por nombre o email"
              />
            </div>
          </Field>

          {debouncedSearch.trim().length >= 2 ? (
            customerQuery.loading ? (
              <p className="text-xs text-muted">Buscando clientes…</p>
            ) : customerQuery.error ? (
              <p className="text-xs text-danger" role="alert">
                {customerQuery.error}
              </p>
            ) : (customerQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-muted">
                Sin resultados para “{debouncedSearch.trim()}”. Cargá los datos como cliente nuevo.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {(customerQuery.data ?? []).slice(0, 6).map((customer) => {
                  const selected = customer.email.toLowerCase() === manual.values.email.toLowerCase();
                  return (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => pickCustomer(customer)}
                        aria-pressed={selected}
                        className={cn(
                          'flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-left transition-colors',
                          selected
                            ? 'border-primary bg-brand-soft'
                            : 'border-line bg-surface hover:border-primary/50 hover:bg-surface-2',
                        )}
                      >
                        <span className="text-sm font-medium text-content">
                          {customer.fullName}
                        </span>
                        <span className="text-xs text-muted">{customer.phone}</span>
                        <span className="text-xs text-muted">{customer.email}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre y apellido" htmlFor="manual-name" required error={manual.errors.fullName}>
              <Input
                id="manual-name"
                autoComplete="off"
                value={manual.values.fullName}
                invalid={Boolean(manual.errors.fullName)}
                onChange={(event) => manual.setField('fullName', event.target.value)}
              />
            </Field>
            <Field label="Teléfono" htmlFor="manual-phone" required error={manual.errors.phone}>
              <Input
                id="manual-phone"
                autoComplete="off"
                value={manual.values.phone}
                invalid={Boolean(manual.errors.phone)}
                onChange={(event) => manual.setField('phone', event.target.value)}
                placeholder="+54 9 11 ..."
              />
            </Field>
            <Field
              label="Email"
              htmlFor="manual-email"
              required
              error={manual.errors.email}
              className="sm:col-span-2"
            >
              <Input
                id="manual-email"
                type="email"
                autoComplete="off"
                value={manual.values.email}
                invalid={Boolean(manual.errors.email)}
                onChange={(event) => manual.setField('email', event.target.value)}
                placeholder="cliente@email.com"
              />
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-line pt-5">
          <div>
            <h3 className="text-base font-semibold text-content">Pago y estado</h3>
            <p className="mt-0.5 text-sm text-muted">
              Se registra la intención de pago; la acreditación se confirma desde el panel de
              Pagos.
            </p>
          </div>

          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
            includeUnset
            columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
          />

          <div>
            <p className="text-sm font-medium text-content">
              Estado inicial<span className="ml-0.5 text-danger">*</span>
            </p>
            <div
              role="radiogroup"
              aria-label="Estado inicial de la reserva"
              className="mt-2 grid gap-3 sm:grid-cols-2"
            >
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStatus(option.value)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                      selected
                        ? 'border-primary bg-brand-soft'
                        : 'border-line bg-surface hover:border-primary/50 hover:bg-surface-2',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                        selected ? 'bg-primary text-white' : 'bg-surface-2 text-accent',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold text-content">{option.title}</span>
                    <span className="text-xs text-muted">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field
            label="Observaciones internas (opcional)"
            htmlFor="manual-notes"
            hint="Visibles solo para el equipo del club. No se muestran al cliente."
            error={manual.errors.notes}
          >
            <Textarea
              id="manual-notes"
              rows={3}
              maxLength={500}
              value={manual.values.notes}
              invalid={Boolean(manual.errors.notes)}
              onChange={(event) => manual.setField('notes', event.target.value)}
              placeholder="Alguna aclaración para el staff"
            />
          </Field>
        </section>

        <section className="flex flex-col gap-4 border-t border-line pt-5">
          <div>
            <h3 className="text-base font-semibold text-content">Resumen</h3>
            <p className="mt-0.5 text-sm text-muted">Revisá los datos antes de registrar.</p>
          </div>

          {selectedSlot && selectedCourt ? (
            <div className="grid gap-4 md:grid-cols-2">
              <BookingSummary
                court={selectedCourt}
                slot={selectedSlot}
                durationMinutes={duration}
              />
              <Card className="p-5">
                <h4 className="text-base font-semibold text-content">Datos de la reserva</h4>
                <dl className="mt-4 flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Cliente</dt>
                    <dd className="text-right font-medium text-ink">{manual.values.fullName}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Email</dt>
                    <dd className="break-all text-right font-medium text-ink">
                      {manual.values.email}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Teléfono</dt>
                    <dd className="text-right font-medium text-ink">{manual.values.phone}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Medio de pago</dt>
                    <dd className="text-right font-medium text-ink">
                      {paymentMethodLabel(paymentMethod)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Estado</dt>
                    <dd className="text-right font-medium text-ink">
                      {status === 'CONFIRMED' ? 'Reserva confirmada' : 'Pago pendiente'}
                    </dd>
                  </div>
                  {manual.values.notes ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Observaciones</dt>
                      <dd className="max-w-[60%] break-all text-right font-medium text-ink">
                        {manual.values.notes}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-primary/30 bg-brand-soft p-3 text-xs text-content">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <p>
                    Al registrar, el servidor vuelve a validar que el horario esté libre. Si otra
                    persona lo tomó, se avisa y se actualiza la grilla.
                  </p>
                </div>
              </Card>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-sm text-muted">
              Completá fecha, cancha y horario para ver el resumen de la reserva.
            </p>
          )}
        </section>
      </form>
    </Modal>
  );
}
