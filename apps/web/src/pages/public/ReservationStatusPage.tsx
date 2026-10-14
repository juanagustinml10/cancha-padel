import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarX,
  CheckCircle2,
  Clock3,
  CreditCard,
  Hourglass,
  Search,
  XCircle,
} from 'lucide-react';
import type { Booking } from '@padel/shared';
import { PageHero } from '@/components/site/PageHero';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { FullPageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { publicApi } from '@/services/publicApi';
import { useAsync } from '@/hooks/useAsync';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { bookingStatusLabel, bookingStatusVariant, paymentMethodLabel } from '@/lib/status';
import { formatCurrency, formatDate, formatDuration, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface StatusView {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
  icon: React.ReactNode;
}

function resolveStatusView(booking: Booking): StatusView {
  switch (booking.status) {
    case 'CONFIRMED':
      return {
        title: 'Reserva confirmada',
        description: 'Recibimos la seña y tu reserva está confirmada. ¡Te esperamos!',
        tone: 'success',
        icon: <CheckCircle2 className="h-6 w-6" />,
      };
    case 'PENDING_PAYMENT':
      return {
        title: 'Pago pendiente',
        description:
          'La reserva todavía no está confirmada. Completá el pago de la seña antes del vencimiento.',
        tone: 'warning',
        icon: <Hourglass className="h-6 w-6" />,
      };
    case 'EXPIRED':
      return {
        title: 'Reserva vencida',
        description: 'El tiempo para pagar la seña finalizó y el horario fue liberado.',
        tone: 'neutral',
        icon: <CalendarX className="h-6 w-6" />,
      };
    case 'CANCELLED':
      return {
        title: 'Reserva cancelada',
        description: 'Esta reserva fue cancelada.',
        tone: 'danger',
        icon: <XCircle className="h-6 w-6" />,
      };
    case 'COMPLETED':
      return {
        title: 'Turno finalizado',
        description: 'Este turno ya se jugó. ¡Gracias por venir!',
        tone: 'neutral',
        icon: <CheckCircle2 className="h-6 w-6" />,
      };
    case 'NO_SHOW':
      return {
        title: 'Ausencia registrada',
        description: 'El turno quedó registrado como ausencia.',
        tone: 'danger',
        icon: <AlertTriangle className="h-6 w-6" />,
      };
    default:
      return {
        title: bookingStatusLabel(booking.status),
        description: '',
        tone: 'neutral',
        icon: <Clock3 className="h-6 w-6" />,
      };
  }
}

const TONE_STYLES: Record<StatusView['tone'], string> = {
  success: 'border-success-soft bg-success-soft/40 text-success',
  warning: 'border-warning-soft bg-warning-soft/40 text-warning',
  danger: 'border-danger-soft bg-danger-soft/40 text-danger',
  neutral: 'border-border bg-bg text-muted',
};

type PaymentState = 'approved' | 'pending' | 'rejected' | 'not_applicable';

function resolvePaymentState(booking: Booking): PaymentState {
  if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') return 'not_applicable';
  if (booking.paidAmountCents >= booking.depositAmountCents && booking.depositAmountCents > 0) {
    return 'approved';
  }
  if (booking.status === 'PENDING_PAYMENT') return 'pending';
  return 'pending';
}

const PAYMENT_LABEL: Record<PaymentState, string> = {
  approved: 'Acreditado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
  not_applicable: 'No aplica',
};

const PAYMENT_VARIANT: Record<PaymentState, 'success' | 'warning' | 'danger' | 'neutral'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  not_applicable: 'neutral',
};

export function ReservationStatusPage() {
  const { code = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';

  const clubInfo = useAsync(() => publicApi.getClubInfo(), []);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needEmail, setNeedEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(emailParam);

  const load = async (email?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await publicApi.getBooking(code, email);
      setBooking(result);
      setNeedEmail(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setNeedEmail(true);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(emailParam || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchParams({ email: emailInput });
    void load(emailInput);
  };

  if (loading) {
    return <FullPageLoader label="Consultando reserva…" />;
  }

  if (needEmail) {
    return (
      <div>
        <PageHero eyebrow="Consulta" title="Verificá tu identidad" description="Ingresá el email con el que hiciste la reserva." />
        <section className="section container-page">
          <Card className="mx-auto max-w-lg p-6 sm:p-8">
            <form className="flex flex-col gap-4" onSubmit={handleEmailSubmit}>
              <Field label="Email de la reserva" htmlFor="verify-email" required>
                <Input
                  id="verify-email"
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="tu@email.com"
                />
              </Field>
              <Button type="submit" leftIcon={<Search className="h-4 w-4" />}>
                Ver reserva
              </Button>
            </form>
          </Card>
        </section>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div>
        <PageHero eyebrow="Consulta" title="No encontramos la reserva" />
        <section className="section container-page">
          <div className="mx-auto max-w-lg">
            <ErrorState message={error ?? 'La reserva no existe.'} onRetry={() => load(emailParam || undefined)} />
            <div className="mt-4 text-center">
              <Link to="/consultar" className="text-sm font-medium text-accent hover:underline">
                Volver a consultar
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const statusView = resolveStatusView(booking);
  const paymentState = resolvePaymentState(booking);
  const balance = booking.priceTotalCents - booking.paidAmountCents;

  return (
    <div>
      <PageHero eyebrow="Estado de reserva" title={`Reserva ${booking.code}`} />

      <section className="section container-page">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card className={cn('flex items-start gap-4 border p-5', TONE_STYLES[statusView.tone])}>
              <span className="mt-0.5 shrink-0">{statusView.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-content">{statusView.title}</h2>
                <p className="mt-1 text-sm text-ink/80">{statusView.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={bookingStatusVariant(booking.status)}>
                    {bookingStatusLabel(booking.status)}
                  </Badge>
                  <Badge variant={PAYMENT_VARIANT[paymentState]}>
                    Pago: {PAYMENT_LABEL[paymentState]}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-content">Detalle del turno</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Cancha</dt>
                  <dd className="font-medium text-ink">{booking.courtName}</dd>
                </div>
                <div>
                  <dt className="text-muted">Duración</dt>
                  <dd className="font-medium text-ink">{formatDuration(booking.durationMinutes)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Fecha</dt>
                  <dd className="font-medium capitalize text-ink">{formatDate(booking.startsAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Horario</dt>
                  <dd className="font-medium text-ink">
                    {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
                  </dd>
                </div>
                {booking.customer ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Titular</dt>
                    <dd className="font-medium text-ink">{booking.customer.fullName}</dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="text-muted">Medio de pago</dt>
                  <dd className="font-medium text-ink">
                    {booking.paymentMethod ? paymentMethodLabel(booking.paymentMethod) : 'Sin definir'}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="inline-flex items-center gap-2 text-base font-semibold text-content">
                <CreditCard className="h-4 w-4 text-accent" aria-hidden />
                Resumen de pago
              </h2>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Precio total</dt>
                  <dd className="font-semibold text-content">
                    {formatCurrency(booking.priceTotalCents, booking.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Seña requerida</dt>
                  <dd className="font-medium text-ink">
                    {formatCurrency(booking.depositAmountCents, booking.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Importe pagado</dt>
                  <dd className="font-medium text-ink">
                    {formatCurrency(booking.paidAmountCents, booking.currency)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <dt className="text-muted">Saldo restante</dt>
                  <dd className="font-semibold text-content">
                    {formatCurrency(Math.max(0, balance), booking.currency)}
                  </dd>
                </div>
              </dl>

              {booking.status === 'PENDING_PAYMENT' ? (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-xl bg-warning-soft/50 p-3 text-xs text-content">
                    <p className="inline-flex items-center gap-1.5 font-medium">
                      <Hourglass className="h-4 w-4 text-warning" aria-hidden />
                      Pendiente de confirmación
                    </p>
                    <p className="mt-1 text-muted">
                      {booking.paymentMethod === 'TRANSFER' || booking.paymentMethod === 'CASH'
                        ? 'El club confirmará el pago de forma manual cuando lo reciba. Volver a esta página no confirma el pago.'
                        : 'La reserva se confirma solo cuando el pago de la seña se acredita y el servidor lo verifica. Volver a esta página no confirma el pago.'}
                    </p>
                  </div>

                  {booking.paymentMethod === 'TRANSFER' ? (
                    <div className="rounded-xl border border-border p-3 text-xs text-content">
                      <p className="font-medium text-ink">Datos para transferir la seña</p>
                      {(() => {
                        const info = clubInfo.data;
                        const alias = info?.bankTransferAlias?.trim();
                        const cbu = info?.bankTransferCbu?.trim();
                        const holder = info?.bankTransferAccountHolder?.trim();
                        if (!alias && !cbu && !holder) {
                          return (
                            <p className="mt-1 text-muted">
                              El club todavía no cargó los datos bancarios. Contactalo para coordinar el
                              pago de la seña.
                            </p>
                          );
                        }
                        return (
                          <dl className="mt-2 flex flex-col gap-1.5">
                            {holder ? (
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted">Titular</dt>
                                <dd className="font-medium text-ink">{holder}</dd>
                              </div>
                            ) : null}
                            {alias ? (
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted">Alias</dt>
                                <dd className="font-medium text-ink">{alias}</dd>
                              </div>
                            ) : null}
                            {cbu ? (
                              <div className="flex justify-between gap-4">
                                <dt className="text-muted">CBU / CVU</dt>
                                <dd className="font-medium text-ink">{cbu}</dd>
                              </div>
                            ) : null}
                          </dl>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-content">¿Necesitás ayuda?</h2>
              <p className="mt-2 text-sm text-muted">
                Escribinos por WhatsApp indicando tu código de reserva.
              </p>
              <Link
                to="/contacto"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-border-strong px-4 text-sm font-semibold text-content hover:bg-surface-2"
              >
                Ir a contacto
              </Link>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
