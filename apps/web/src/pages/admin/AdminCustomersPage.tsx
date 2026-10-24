import { useState } from 'react';
import { Search, Save } from 'lucide-react';
import type { Customer } from '@padel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useDebounce } from '@/hooks/useDebounce';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency, formatDate, formatDateShort, formatTime } from '@/lib/format';
import { bookingStatusLabel, bookingStatusVariant } from '@/lib/status';

export function AdminCustomersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const customers = useAsync(() => adminApi.listCustomers(debounced || undefined), [debounced]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detail = useAsync(
    () => adminApi.getCustomer(selectedId as string),
    [selectedId],
    { enabled: Boolean(selectedId) },
  );

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const openCustomer = (customer: Customer) => {
    setSelectedId(customer.id);
    setNotes(customer.notes ?? '');
  };

  const saveNotes = async () => {
    if (!detail.data) return;
    setSavingNotes(true);
    try {
      await adminApi.updateCustomer(detail.data.customer.id, { notes });
      toast.success('Notas guardadas');
      detail.setData({ ...detail.data, customer: { ...detail.data.customer, notes } });
      void customers.retry();
    } catch (error) {
      toast.error('No se pudieron guardar las notas', getErrorMessage(error));
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="Clientes"
        title="Base de clientes"
        description="Historial de reservas y notas internas por cliente."
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, email o teléfono"
          className="pl-9"
          aria-label="Buscar clientes"
        />
      </div>

      {customers.error ? (
        <ErrorState message={customers.error} onRetry={customers.retry} />
      ) : customers.loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : (customers.data ?? []).length === 0 ? (
        <EmptyState title="Sin clientes" description="No se encontraron clientes con ese criterio." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(customers.data ?? []).map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => openCustomer(customer)}
              className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-brand hover:bg-brand-soft"
            >
              <span className="font-semibold text-content">{customer.fullName}</span>
              <span className="text-sm text-muted">{customer.email}</span>
              <span className="text-sm text-muted">{customer.phone}</span>
              <span className="mt-2 text-xs text-muted">
                Cliente desde {formatDateShort(customer.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        title={detail.data?.customer.fullName ?? 'Cliente'}
        description={detail.data?.customer.email}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Cerrar
            </Button>
            <Button leftIcon={<Save className="h-4 w-4" />} onClick={saveNotes} loading={savingNotes}>
              Guardar notas
            </Button>
          </>
        }
      >
        {detail.loading ? (
          <div className="grid gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : detail.error ? (
          <ErrorState message={detail.error} onRetry={detail.retry} />
        ) : detail.data ? (
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted">Teléfono</p>
                <p className="font-medium text-ink">{detail.data.customer.phone}</p>
              </div>
              <div>
                <p className="text-muted">Reservas históricas</p>
                <p className="font-medium text-ink">{detail.data.bookings.length}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-content">Historial</h3>
              <div className="flex flex-col gap-2">
                {detail.data.bookings.length === 0 ? (
                  <p className="text-sm text-muted">Sin reservas registradas.</p>
                ) : (
                  detail.data.bookings.map((booking) => (
                    <Card key={booking.id} className="flex items-center justify-between gap-3 p-3">
                      <div>
                        <p className="text-sm font-medium text-content">{booking.courtName}</p>
                        <p className="text-xs text-muted">
                          {formatDate(booking.startsAt, "EEE d MMM")} · {formatTime(booking.startsAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={bookingStatusVariant(booking.status)}>
                          {bookingStatusLabel(booking.status)}
                        </Badge>
                        <p className="mt-1 text-xs text-muted">
                          {formatCurrency(booking.priceTotalCents, booking.currency)}
                        </p>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <Field label="Notas internas" htmlFor="customer-notes" hint="Visible solo para el staff.">
              <Textarea
                id="customer-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
