import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Search, Undo2, XCircle } from 'lucide-react';
import type { Booking, Payment } from '@padel/shared';
import {
  MANUAL_PAYMENT_METHOD_LABELS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@padel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency, formatDateShort, formatTime } from '@/lib/format';
import { bookingStatusLabel, paymentStatusLabel, paymentStatusVariant } from '@/lib/status';

const PAGE_SIZE = 12;

const MANUAL_METHOD_LABELS: Record<string, string> = {
  ...MANUAL_PAYMENT_METHOD_LABELS,
};

function providerLabel(payment: Payment): string {
  if (payment.provider === 'MANUAL') {
    const method = payment.method ?? '';
    return MANUAL_METHOD_LABELS[method] ?? method ?? 'Manual';
  }
  return payment.providerPaymentId ? 'Mercado Pago' : (payment.method ?? 'Mercado Pago');
}

export function AdminPaymentsPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Payment | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const payments = useAsync(
    () =>
      adminApi.listPayments({
        status: status || undefined,
        provider: provider || undefined,
        needsReview: reviewOnly ? true : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [status, provider, reviewOnly, page],
  );

  const columns = useMemo<Column<Payment>[]>(
    () => [
      {
        key: 'booking',
        header: 'Reserva',
        render: (row) => (
          <div>
            <p className="font-mono text-xs text-content">{row.bookingCode}</p>
            {row.customerName ? <p className="text-xs text-muted">{row.customerName}</p> : null}
          </div>
        ),
      },
      {
        key: 'totals',
        header: 'Total / Pagado',
        render: (row) =>
          row.bookingPriceTotalCents != null ? (
            <div className="text-xs">
              <p className="text-ink">Total {formatCurrency(row.bookingPriceTotalCents, row.currency)}</p>
              <p className="text-muted">
                Pagado {formatCurrency(row.bookingPaidAmountCents ?? 0, row.currency)}
              </p>
            </div>
          ) : (
            <span className="text-xs text-muted">—</span>
          ),
      },
      {
        key: 'deposit',
        header: 'Seña',
        render: (row) =>
          row.bookingDepositAmountCents == null ? (
            <span className="text-xs text-muted">—</span>
          ) : (
            formatCurrency(row.bookingDepositAmountCents, row.currency)
          ),
      },
      {
        key: 'amount',
        header: 'Monto',
        render: (row) => (
          <span className="font-semibold text-content">{formatCurrency(row.amountCents, row.currency)}</span>
        ),
      },
      {
        key: 'provider',
        header: 'Medio',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="capitalize">{providerLabel(row)}</span>
            {row.provider === 'MANUAL' ? <Badge variant="info">Manual</Badge> : null}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <div className="flex flex-col gap-1">
            <Badge variant={paymentStatusVariant(row.status)}>{paymentStatusLabel(row.status)}</Badge>
            {row.requiresReview ? <Badge variant="warning">Revisar</Badge> : null}
            {row.reviewReason ? (
              <span className="text-xs text-muted">{row.reviewReason}</span>
            ) : row.statusDetail ? (
              <span className="text-xs text-muted">{row.statusDetail}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'reference',
        header: 'Referencia',
        render: (row) => (
          <span className="font-mono text-xs text-muted">
            {row.providerPaymentId ?? row.reference ?? '—'}
          </span>
        ),
      },
      {
        key: 'date',
        header: 'Fecha',
        render: (row) => (
          <div>
            <p className="text-ink">{formatDateShort(row.paidAt ?? row.createdAt)}</p>
            <p className="text-xs text-muted">{formatTime(row.paidAt ?? row.createdAt)}</p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => {
          const isPendingManual = row.provider === 'MANUAL' && row.status === 'PENDING';
          if (isPendingManual) {
            return (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  onClick={() => setConfirmTarget(row)}
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                  onClick={() => setRejectTarget(row)}
                >
                  Rechazar
                </Button>
              </div>
            );
          }
          if (row.status === 'APPROVED') {
            return (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                onClick={() => setRefundTarget(row)}
              >
                Reintegrar
              </Button>
            );
          }
          return <span className="text-xs text-muted">—</span>;
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Pagos"
        title="Pagos y señas"
        description="Cobros de Mercado Pago y pagos manuales en efectivo o transferencia. Los reintegros se confirman manualmente."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="max-w-xs">
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por estado de pago"
            >
              <option value="">Todos los estados</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="max-w-xs">
            <Select
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value);
                setPage(1);
              }}
              aria-label="Filtrar por medio de pago"
            >
              <option value="">Todos los medios</option>
              {Object.entries(PAYMENT_PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={reviewOnly}
              onChange={(event) => {
                setReviewOnly(event.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-border text-accent focus:ring-primary"
            />
            Sólo pagos que requieren revisión
          </label>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setManualOpen(true)}>
          Registrar pago
        </Button>
      </div>

      {payments.error ? (
        <ErrorState message={payments.error} onRetry={payments.retry} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={payments.data?.data ?? []}
            keyExtractor={(row) => row.id}
            loading={payments.loading}
            empty={<EmptyState title="Sin pagos" description="No hay pagos para el filtro seleccionado." />}
          />
          {payments.data ? (
            <Pagination
              page={payments.data.meta.page}
              pageSize={payments.data.meta.pageSize}
              total={payments.data.meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ManualPaymentModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={() => {
          toast.success('Pago registrado', 'Se asentó el pago y se actualizó la reserva.');
          void payments.retry();
        }}
      />

      <ConfirmDialog
        open={refundTarget !== null}
        title="Reintegrar pago"
        message="El reintegro quedará registrado. En pagos online se ejecuta contra el proveedor; los manuales solo se asientan."
        confirmLabel="Reintegrar"
        danger
        loading={loading}
        onClose={() => setRefundTarget(null)}
        onConfirm={async () => {
          if (!refundTarget) return;
          setLoading(true);
          try {
            await adminApi.refundPayment(refundTarget.id);
            toast.success('Pago reintegrado');
            setRefundTarget(null);
            void payments.retry();
          } catch (error) {
            toast.error('No se pudo reintegrar', getErrorMessage(error));
          } finally {
            setLoading(false);
          }
        }}
      />

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Confirmar pago manual"
        message={
          confirmTarget
            ? `¿Confirmás la recepción del pago de ${formatCurrency(
                confirmTarget.amountCents,
                confirmTarget.currency,
              )} para la reserva ${confirmTarget.bookingCode}? Si cubre la seña, la reserva se confirmará.`
            : ''
        }
        confirmLabel="Confirmar pago"
        loading={loading}
        onClose={() => setConfirmTarget(null)}
        onConfirm={async () => {
          if (!confirmTarget) return;
          setLoading(true);
          try {
            await adminApi.confirmManualPayment(confirmTarget.id);
            toast.success('Pago confirmado', 'Se actualizó el estado de la reserva.');
            setConfirmTarget(null);
            void payments.retry();
          } catch (error) {
            toast.error('No se pudo confirmar el pago', getErrorMessage(error));
          } finally {
            setLoading(false);
          }
        }}
      />

      <ConfirmDialog
        open={rejectTarget !== null}
        title="Rechazar pago manual"
        message={
          rejectTarget
            ? `¿Rechazás el pago declarado para la reserva ${rejectTarget.bookingCode}? La reserva seguirá pendiente para que puedas revisarla.`
            : ''
        }
        confirmLabel="Rechazar pago"
        danger
        loading={loading}
        onClose={() => setRejectTarget(null)}
        onConfirm={async () => {
          if (!rejectTarget) return;
          setLoading(true);
          try {
            await adminApi.rejectManualPayment(rejectTarget.id);
            toast.success('Pago rechazado');
            setRejectTarget(null);
            void payments.retry();
          } catch (error) {
            toast.error('No se pudo rechazar el pago', getErrorMessage(error));
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
}

interface ManualPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function ManualPaymentModal({ open, onClose, onCreated }: ManualPaymentModalProps) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Booking[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'TRANSFER' | 'OTHER'>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setQuery('');
    setResults([]);
    setSelected(null);
    setAmount('');
    setMethod('CASH');
    setReference('');
    setNote('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const search = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (query.trim().length < 2) {
      toast.info('Escribí al menos 2 caracteres', 'Buscá por código, nombre o email del cliente.');
      return;
    }
    setSearching(true);
    try {
      const page = await adminApi.listBookings({ search: query.trim(), pageSize: 5 });
      setResults(page.data);
      if (page.data.length === 0) {
        toast.info('Sin resultados', 'No encontramos reservas con ese criterio.');
      }
    } catch (error) {
      toast.error('No se pudo buscar', getErrorMessage(error));
    } finally {
      setSearching(false);
    }
  };

  const pick = (booking: Booking) => {
    setSelected(booking);
    const outstanding = Math.max(0, booking.priceTotalCents - booking.paidAmountCents);
    setAmount((outstanding / 100).toFixed(0));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      toast.error('Elegí una reserva', 'Primero buscá y seleccioná a qué reserva corresponde el pago.');
      return;
    }
    const amountCents = Math.round(Number(amount.replace(',', '.')) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error('Importe inválido', 'Ingresá un importe mayor a cero.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.registerManualPayment({
        bookingId: selected.id,
        amountCents,
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      reset();
      onCreated();
      onClose();
    } catch (error) {
      toast.error('No se pudo registrar el pago', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const outstanding = selected
    ? Math.max(0, selected.priceTotalCents - selected.paidAmountCents)
    : 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Registrar pago manual"
      description="Asentá un cobro en efectivo o transferencia sobre una reserva."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Registrar pago
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={search} noValidate>
        <Field label="Buscar reserva" htmlFor="manual-search" hint="Por código, nombre o email del cliente.">
          <div className="flex gap-2">
            <Input
              id="manual-search"
              value={query}
              placeholder="PC-100000 o Martín Gómez"
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" variant="outline" loading={searching} leftIcon={<Search className="h-4 w-4" />}>
              Buscar
            </Button>
          </div>
        </Field>
      </form>

      {results.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {results.map((booking) => (
            <li key={booking.id}>
              <button
                type="button"
                onClick={() => pick(booking)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                  selected?.id === booking.id
                    ? 'border-brand bg-brand-soft'
                    : 'border-border hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-content">{booking.code}</span>
                  <span className="text-xs text-muted">{bookingStatusLabel(booking.status)}</span>
                </div>
                <p className="mt-0.5 font-medium text-content">{booking.customer.fullName}</p>
                <p className="text-xs text-muted">
                  {formatDateShort(booking.startsAt)} · {formatTime(booking.startsAt)} · {booking.courtName}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <div className="mt-4 grid gap-4 rounded-xl bg-brand-soft p-4 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-content">{selected.customer.fullName}</span>
            <span className="text-muted">
              Total {formatCurrency(selected.priceTotalCents, selected.currency)} · Pagado{' '}
              {formatCurrency(selected.paidAmountCents, selected.currency)} · Saldo{' '}
              {formatCurrency(outstanding, selected.currency)}
            </span>
          </div>
          <Field label="Importe a registrar" htmlFor="manual-amount" required hint="En pesos.">
            <Input
              id="manual-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="Medio de pago" htmlFor="manual-method" required>
            <Select
              id="manual-method"
              value={method}
              onChange={(event) => setMethod(event.target.value as typeof method)}
            >
              {(Object.keys(MANUAL_PAYMENT_METHOD_LABELS) as Array<keyof typeof MANUAL_PAYMENT_METHOD_LABELS>).map(
                (value) => (
                  <option key={value} value={value}>
                    {MANUAL_PAYMENT_METHOD_LABELS[value]}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="Referencia" htmlFor="manual-reference" hint="Nro. de operación o comprobante (opcional).">
            <Input
              id="manual-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
          <Field label="Observación" htmlFor="manual-note" className="sm:col-span-2">
            <Textarea
              id="manual-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
      ) : null}
    </Modal>
  );
}
