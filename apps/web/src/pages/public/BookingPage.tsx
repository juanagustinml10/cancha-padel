import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { AvailabilitySlot, BookingPaymentMethod } from '@padel/shared';
import { customerSchema } from '@padel/shared';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { DatePicker } from '@/components/booking/DatePicker';
import { DurationSelector } from '@/components/booking/DurationSelector';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { CourtPicker, groupSlotsByCourt } from '@/components/booking/CourtPicker';
import { PaymentMethodPicker } from '@/components/booking/PaymentMethodPicker';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { useAsync } from '@/hooks/useAsync';
import { useZodForm } from '@/hooks/useZodForm';
import { publicApi } from '@/services/publicApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { todayIso, parseDateOnly } from '@/lib/datetime';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/status';
import { env } from '@/lib/env';

const DURATIONS = [60, 90, 120];
const STEPS = ['Fecha y duración', 'Cancha y horario', 'Tus datos', 'Medio de pago', 'Confirmar'];

export function BookingPage() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get('date');
  const initialDuration = Number(searchParams.get('duration'));
  const [date, setDate] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : todayIso(),
  );
  const [duration, setDuration] = useState(
    DURATIONS.includes(initialDuration) ? initialDuration : 60,
  );
  const [courtId, setCourtId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [paymentUnavailable, setPaymentUnavailable] = useState(false);
  const [createdOffline, setCreatedOffline] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>('MERCADOPAGO');
  const [transferReference, setTransferReference] = useState('');

  const form = useZodForm(customerSchema, { fullName: '', email: '', phone: '' });
  const [notes, setNotes] = useState('');

  const courtsQuery = useAsync(() => publicApi.getCourts(), []);
  const clubInfoQuery = useAsync(() => publicApi.getClubInfo(), []);
  const availabilityQuery = useAsync(
    () => publicApi.getAvailability(date, duration),
    [date, duration],
    { enabled: step >= 1 },
  );

  const club = clubInfoQuery.data;
  const hasBankData = Boolean(club?.bankTransferAlias || club?.bankTransferCbu);

  const activeCourts = useMemo(
    () => (courtsQuery.data ?? []).filter((court) => court.status === 'ACTIVE'),
    [courtsQuery.data],
  );

  const slotsByCourt = useMemo(
    () => groupSlotsByCourt(availabilityQuery.data?.slots ?? []),
    [availabilityQuery.data],
  );

  const selectedCourt = activeCourts.find((court) => court.id === courtId) ?? null;

  const resetSlot = () => {
    setSelectedSlot(null);
  };

  const goNext = () => {
    if (step === 0) setStep(1);
    else if (step === 1 && selectedSlot) setStep(2);
    else if (step === 2) {
      const data = form.validate();
      if (!data) return;
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const goBack = () => setStep((current) => Math.max(0, current - 1));

  const offline = paymentMethod === 'CASH' || paymentMethod === 'TRANSFER';

  const handleConfirmPayment = async () => {
    if (!selectedSlot) return;
    const data = form.validate();
    if (!data) {
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      const booking = await publicApi.createBooking({
        courtId: selectedSlot.courtId,
        startsAt: selectedSlot.startsAt,
        durationMinutes: duration,
        customer: { fullName: data.fullName, email: data.email, phone: data.phone },
        notes: notes || undefined,
        paymentMethod,
        transferReference:
          paymentMethod === 'TRANSFER' && transferReference.trim()
            ? transferReference.trim()
            : undefined,
      });
      setCreatedCode(booking.code);

      // Efectivo/transferencia: no se abre checkout online; la reserva queda a confirmar.
      if (offline) {
        setCreatedOffline(true);
        return;
      }

      try {
        const checkout = await publicApi.createCheckout(booking.code, data.email);
        window.location.href = checkout.initPoint;
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'MOCK_PAYMENT_UNAVAILABLE') {
          setPaymentUnavailable(true);
        } else {
          toast.error('No se pudo iniciar el pago', getErrorMessage(error));
        }
      }
    } catch (error) {
      toast.error('No se pudo crear la reserva', getErrorMessage(error));
      void availabilityQuery.retry();
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOffline && createdCode) {
    return (
      <div>
        <PageHero eyebrow="Reserva registrada" title="Tu reserva quedó pendiente de confirmación" />
        <section className="section container-page">
          <Card className="mx-auto max-w-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-success-soft bg-success-soft/50 p-4 text-sm text-content">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <p>
                Registramos tu reserva con el medio de pago <strong>{paymentMethodLabel(paymentMethod)}</strong>.
                La reserva se confirma cuando el complejo verifica el pago de la seña.
              </p>
            </div>

            {paymentMethod === 'TRANSFER' ? (
              <div className="mt-6 rounded-2xl border border-line bg-surface-2/60 p-5 text-sm">
                <h2 className="text-base font-semibold text-content">Datos para la transferencia</h2>
                {hasBankData ? (
                  <dl className="mt-3 flex flex-col gap-2">
                    {club?.bankTransferAccountHolder ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Titular</dt>
                        <dd className="text-right font-medium text-ink">{club.bankTransferAccountHolder}</dd>
                      </div>
                    ) : null}
                    {club?.bankTransferAlias ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Alias</dt>
                        <dd className="text-right font-mono font-medium text-ink">{club.bankTransferAlias}</dd>
                      </div>
                    ) : null}
                    {club?.bankTransferCbu ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">CBU/CVU</dt>
                        <dd className="text-right font-mono font-medium text-ink">{club.bankTransferCbu}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="mt-2 text-muted">
                    El complejo te enviará los datos bancarios para coordinar la transferencia.
                  </p>
                )}
                {transferReference.trim() ? (
                  <p className="mt-3 text-xs text-muted">
                    Número de operación declarado: <span className="font-mono">{transferReference.trim()}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-line bg-surface-2/60 p-5 text-sm text-muted">
                Aboná la seña en efectivo al ingresar al complejo. El staff confirmará el pago y tu reserva.
              </div>
            )}

            <dl className="mt-6 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Código de reserva</dt>
                <dd className="font-mono font-semibold text-content">{createdCode}</dd>
              </div>
              {selectedSlot ? (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Cancha</dt>
                    <dd className="font-medium text-ink">{selectedCourt?.name}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Horario</dt>
                    <dd className="font-medium text-ink">{formatDateTime(selectedSlot.startsAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Seña</dt>
                    <dd className="font-semibold text-accent">
                      {formatCurrency(selectedSlot.depositAmountCents, selectedSlot.currency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Estado del pago</dt>
                    <dd className="font-medium text-warning">Pendiente de confirmación</dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/reserva/${createdCode}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Ver estado de la reserva
              </Link>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  if (paymentUnavailable && createdCode) {
    return (
      <div>
        <PageHero eyebrow="Reserva creada" title="Tu reserva quedó pendiente de pago" />
        <section className="section container-page">
          <Card className="mx-auto max-w-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-warning-soft bg-warning-soft/50 p-4 text-sm text-content">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
              <p>
                El pago con Mercado Pago se habilita al conectar el backend real. En modo demostración no se
                procesan pagos. Tu reserva quedó registrada como <strong>pago pendiente</strong>.
              </p>
            </div>
            <dl className="mt-6 flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Código de reserva</dt>
                <dd className="font-mono font-semibold text-content">{createdCode}</dd>
              </div>
              {selectedSlot ? (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Cancha</dt>
                    <dd className="font-medium text-ink">{selectedCourt?.name}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Horario</dt>
                    <dd className="font-medium text-ink">{formatDateTime(selectedSlot.startsAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Seña a pagar</dt>
                    <dd className="font-semibold text-accent">
                      {formatCurrency(selectedSlot.depositAmountCents, selectedSlot.currency)}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/reserva/${createdCode}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Ver estado de la reserva
              </Link>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="Reserva online"
        title="Reservá tu cancha"
        description="Elegí fecha, duración y horario. La disponibilidad y el precio se calculan en el servidor."
      />

      <section className="section container-page">
        <div className="mx-auto max-w-4xl">
          <BookingStepper steps={STEPS} current={step} />

          <Card className="mt-8 p-5 sm:p-7">
            {step === 0 ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-content">Elegí la fecha</h2>
                  <p className="mt-1 text-sm text-muted">Mostramos los próximos días disponibles.</p>
                  <div className="mt-4">
                    <DatePicker
                      value={date}
                      onChange={(next) => {
                        setDate(next);
                        resetSlot();
                      }}
                    />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-content">Duración del turno</h2>
                  <p className="mt-1 text-sm text-muted">La duración determina el precio del turno.</p>
                  <div className="mt-4">
                    <DurationSelector
                      value={duration}
                      options={DURATIONS}
                      onChange={(next) => {
                        setDuration(next);
                        resetSlot();
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-content">Canchas disponibles</h2>
                  <p className="mt-1 text-sm text-muted">
                    Disponibilidad del servidor para {formatDate(parseDateOnly(date).toISOString())}.
                  </p>
                </div>

                {availabilityQuery.loading ? (
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : availabilityQuery.error ? (
                  <ErrorState message={availabilityQuery.error} onRetry={availabilityQuery.retry} />
                ) : activeCourts.length === 0 ? (
                  <EmptyState title="No hay canchas disponibles" />
                ) : (
                  <>
                    <CourtPicker
                      courts={activeCourts}
                      value={courtId}
                      onChange={(nextCourtId) => {
                        setCourtId(nextCourtId);
                        resetSlot();
                      }}
                      slotsByCourt={slotsByCourt}
                    />

                    {selectedCourt ? (
                      <div>
                        <h3 className="text-sm font-semibold text-content">
                          Horarios de {selectedCourt.name}
                        </h3>
                        <div className="mt-3">
                          <TimeSlotPicker
                            slots={slotsByCourt.get(selectedCourt.id) ?? []}
                            value={selectedSlot?.startsAt ?? null}
                            onChange={setSelectedSlot}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-sm text-muted">
                        Seleccioná una cancha para ver los horarios.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-content">Tus datos</h2>
                  <p className="mt-1 text-sm text-muted">
                    Usamos estos datos para confirmar la reserva y contactarte.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre y apellido" htmlFor="booking-name" required error={form.errors.fullName}>
                    <Input
                      id="booking-name"
                      value={form.values.fullName}
                      invalid={Boolean(form.errors.fullName)}
                      onChange={(event) => form.setField('fullName', event.target.value)}
                    />
                  </Field>
                  <Field label="Teléfono" htmlFor="booking-phone" required error={form.errors.phone}>
                    <Input
                      id="booking-phone"
                      value={form.values.phone}
                      invalid={Boolean(form.errors.phone)}
                      onChange={(event) => form.setField('phone', event.target.value)}
                      placeholder="+54 9 11 ..."
                    />
                  </Field>
                  <Field label="Email" htmlFor="booking-email" required error={form.errors.email} className="sm:col-span-2">
                    <Input
                      id="booking-email"
                      type="email"
                      value={form.values.email}
                      invalid={Boolean(form.errors.email)}
                      onChange={(event) => form.setField('email', event.target.value)}
                      placeholder="tu@email.com"
                    />
                  </Field>
                  <Field label="Comentarios (opcional)" htmlFor="booking-notes" className="sm:col-span-2">
                    <Textarea
                      id="booking-notes"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Alguna aclaración para el complejo"
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-content">¿Cómo querés pagar la seña?</h2>
                  <p className="mt-1 text-sm text-muted">
                    Se abona únicamente la seña; el saldo lo pagás en el complejo.
                  </p>
                </div>

                <PaymentMethodPicker value={paymentMethod} onChange={(next) => next !== null && setPaymentMethod(next)} />

                {paymentMethod === 'TRANSFER' ? (
                  <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2/60 p-5">
                    {hasBankData ? (
                      <dl className="flex flex-col gap-2 text-sm">
                        {club?.bankTransferAccountHolder ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-muted">Titular</dt>
                            <dd className="text-right font-medium text-ink">
                              {club.bankTransferAccountHolder}
                            </dd>
                          </div>
                        ) : null}
                        {club?.bankTransferAlias ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-muted">Alias</dt>
                            <dd className="text-right font-mono font-medium text-ink">
                              {club.bankTransferAlias}
                            </dd>
                          </div>
                        ) : null}
                        {club?.bankTransferCbu ? (
                          <div className="flex justify-between gap-3">
                            <dt className="text-muted">CBU/CVU</dt>
                            <dd className="text-right font-mono font-medium text-ink">
                              {club.bankTransferCbu}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted">
                        El complejo te enviará los datos bancarios para coordinar la transferencia.
                      </p>
                    )}
                    <Field
                      label="Número de operación (opcional)"
                      htmlFor="booking-transfer-ref"
                      hint="Si ya transferiste, cargá el número para agilizar la verificación."
                    >
                      <Input
                        id="booking-transfer-ref"
                        value={transferReference}
                        onChange={(event) => setTransferReference(event.target.value)}
                        placeholder="Ej. 000123456789"
                      />
                    </Field>
                  </div>
                ) : null}

                {paymentMethod === 'CASH' ? (
                  <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/60 p-4 text-sm text-muted">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <p>
                      Abonás la seña en efectivo al llegar al complejo. El staff confirmará el pago y la
                      reserva.
                    </p>
                  </div>
                ) : null}

                {paymentMethod === 'MERCADOPAGO' ? (
                  <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-brand-soft p-4 text-sm text-content">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <p>
                      Al continuar se abre el checkout de Mercado Pago. La reserva se confirma cuando el
                      pago se acredita y el servidor lo verifica.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 4 && selectedSlot && selectedCourt ? (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-lg font-semibold text-content">Confirmá tu reserva</h2>
                  <p className="mt-1 text-sm text-muted">
                    Revisá los datos. Se pagará únicamente la seña; el saldo se abona en el complejo.
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <BookingSummary court={selectedCourt} slot={selectedSlot} durationMinutes={duration} />
                  <Card className="p-5">
                    <h3 className="text-base font-semibold text-content">Datos de contacto</h3>
                    <dl className="mt-4 flex flex-col gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Nombre</dt>
                        <dd className="text-right font-medium text-ink">{form.values.fullName}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Email</dt>
                        <dd className="text-right font-medium text-ink">{form.values.email}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Teléfono</dt>
                        <dd className="text-right font-medium text-ink">{form.values.phone}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Medio de pago</dt>
                        <dd className="text-right font-medium text-ink">{paymentMethodLabel(paymentMethod)}</dd>
                      </div>
                      {notes ? (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted">Comentarios</dt>
                          <dd className="max-w-[60%] text-right font-medium text-ink">{notes}</dd>
                        </div>
                      ) : null}
                    </dl>
                    <div className="mt-5 flex items-start gap-2 rounded-xl border border-primary/30 bg-brand-soft p-3 text-xs text-content">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <p>
                        {offline
                          ? `Al confirmar se registra la reserva con ${paymentMethodLabel(
                              paymentMethod,
                            )}. La reserva queda pendiente hasta que el complejo verifique el pago de la seña.`
                          : 'Al continuar se crea la reserva y se abre el checkout de Mercado Pago para abonar la seña. La reserva se confirma recién cuando el pago se acredita y el servidor lo verifica.'}
                      </p>
                    </div>
                  </Card>
                </div>
                {env.useMocks ? (
                  <p className="text-xs text-muted">
                    Modo demostración: el pago no se procesará. La reserva quedará como “pago pendiente”.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-6">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={step === 0}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className="w-full sm:w-auto"
              >
                Atrás
              </Button>

              {step < 4 ? (
                <Button
                  onClick={goNext}
                  disabled={step === 1 && !selectedSlot}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  onClick={handleConfirmPayment}
                  loading={submitting}
                  leftIcon={<CalendarCheck className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  {offline ? 'Confirmar reserva' : 'Continuar al pago'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
