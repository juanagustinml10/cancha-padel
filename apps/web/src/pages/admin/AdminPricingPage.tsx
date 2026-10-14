import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { PricingRule } from '@padel/shared';
import { pricingRuleSchema } from '@padel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { formatCurrency, formatDuration, weekdayLabel } from '@/lib/format';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function AdminPricingPage() {
  const toast = useToast();
  const pricing = useAsync(() => adminApi.listPricing(), []);
  const courts = useAsync(() => adminApi.listCourts(), []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [deleting, setDeleting] = useState<PricingRule | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useZodForm(pricingRuleSchema, {
    courtId: '',
    weekday: '',
    startTime: '08:00',
    endTime: '18:00',
    durationMinutes: 60,
    priceAmount: 0,
    priority: 1,
    isActive: true,
  });

  const courtName = (courtId?: string | null) =>
    courtId ? courts.data?.find((court) => court.id === courtId)?.name ?? '—' : 'Todas';

  const openCreate = () => {
    setEditing(null);
    form.reset({
      courtId: '',
      weekday: '',
      startTime: '08:00',
      endTime: '18:00',
      durationMinutes: 60,
      priceAmount: 0,
      priority: 1,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    setEditing(rule);
    form.reset({
      courtId: rule.courtId ?? '',
      weekday: rule.weekday === null || rule.weekday === undefined ? '' : String(rule.weekday),
      startTime: rule.startTime,
      endTime: rule.endTime,
      durationMinutes: rule.durationMinutes,
      priceAmount: rule.priceCents / 100,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = form.validate();
    if (!data) return;
    setLoading(true);
    try {
      const payload = {
        courtId: data.courtId || null,
        weekday: data.weekday === '' ? null : Number(data.weekday),
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: Number(data.durationMinutes),
        priceCents: Math.round(data.priceAmount * 100),
        currency: editing?.currency ?? 'ARS',
        validFrom: editing?.validFrom ?? new Date().toISOString().slice(0, 10),
        validTo: editing?.validTo ?? null,
        isActive: data.isActive,
        priority: Number(data.priority),
      };
      if (editing) {
        await adminApi.updatePricing(editing.id, payload);
        toast.success('Tarifa actualizada');
      } else {
        await adminApi.createPricing(payload);
        toast.success('Tarifa creada');
      }
      setOpen(false);
      void pricing.retry();
    } catch (error) {
      toast.error('No se pudo guardar la tarifa', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<Column<PricingRule>[]>(
    () => [
      { key: 'court', header: 'Cancha', render: (row) => courtName(row.courtId) },
      {
        key: 'weekday',
        header: 'Día',
        render: (row) => (row.weekday === null || row.weekday === undefined ? 'Todos' : weekdayLabel(row.weekday)),
      },
      {
        key: 'time',
        header: 'Franja',
        render: (row) => `${row.startTime} – ${row.endTime}`,
      },
      { key: 'duration', header: 'Duración', render: (row) => formatDuration(row.durationMinutes) },
      {
        key: 'price',
        header: 'Precio',
        render: (row) => <span className="font-semibold text-content">{formatCurrency(row.priceCents, row.currency)}</span>,
      },
      { key: 'priority', header: 'Prioridad', render: (row) => row.priority },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <Badge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Activa' : 'Inactiva'}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeleting(row)}>
              Eliminar
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courts.data],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Tarifas"
          title="Precios por franja horaria"
          description="Las reglas con mayor prioridad se evalúan primero. Si no hay regla, se aplica la tarifa base."
        />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nueva tarifa
        </Button>
      </div>

      {pricing.error ? (
        <ErrorState message={pricing.error} onRetry={pricing.retry} />
      ) : (
        <DataTable
          columns={columns}
          rows={pricing.data ?? []}
          keyExtractor={(row) => row.id}
          loading={pricing.loading}
          empty={<EmptyState title="Sin tarifas" description="Creá la primera regla de precio." />}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar tarifa' : 'Nueva tarifa'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              Guardar
            </Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <Field label="Cancha" htmlFor="pricing-court" hint="Dejá “Todas” para aplicar a cualquier cancha.">
            <Select
              id="pricing-court"
              value={form.values.courtId}
              onChange={(event) => form.setField('courtId', event.target.value)}
            >
              <option value="">Todas las canchas</option>
              {(courts.data ?? []).map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Día de la semana" htmlFor="pricing-weekday">
            <Select
              id="pricing-weekday"
              value={form.values.weekday}
              onChange={(event) => form.setField('weekday', event.target.value)}
            >
              <option value="">Todos los días</option>
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {weekdayLabel(day)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hora inicio" htmlFor="pricing-start" required error={form.errors.startTime}>
            <Input
              id="pricing-start"
              type="time"
              value={form.values.startTime}
              onChange={(event) => form.setField('startTime', event.target.value)}
            />
          </Field>
          <Field label="Hora fin" htmlFor="pricing-end" required error={form.errors.endTime}>
            <Input
              id="pricing-end"
              type="time"
              value={form.values.endTime}
              invalid={Boolean(form.errors.endTime)}
              onChange={(event) => form.setField('endTime', event.target.value)}
            />
          </Field>
          <Field label="Duración (min)" htmlFor="pricing-duration" required error={form.errors.durationMinutes}>
            <Input
              id="pricing-duration"
              type="number"
              min={30}
              step={30}
              value={form.values.durationMinutes}
              onChange={(event) => form.setField('durationMinutes', Number(event.target.value))}
            />
          </Field>
          <Field label="Precio (ARS)" htmlFor="pricing-price" required error={form.errors.priceAmount}>
            <Input
              id="pricing-price"
              type="number"
              min={0}
              step={100}
              value={form.values.priceAmount}
              invalid={Boolean(form.errors.priceAmount)}
              onChange={(event) => form.setField('priceAmount', Number(event.target.value))}
            />
          </Field>
          <Field label="Prioridad" htmlFor="pricing-priority" required error={form.errors.priority}>
            <Input
              id="pricing-priority"
              type="number"
              min={0}
              value={form.values.priority}
              onChange={(event) => form.setField('priority', Number(event.target.value))}
            />
          </Field>
          <Field label="Estado" htmlFor="pricing-active" className="justify-end">
            <label className="inline-flex h-11 items-center gap-2 text-sm text-ink">
              <input
                id="pricing-active"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                checked={form.values.isActive}
                onChange={(event) => form.setField('isActive', event.target.checked)}
              />
              Tarifa activa
            </label>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar tarifa"
        message="¿Confirmás eliminar esta regla de precio?"
        confirmLabel="Eliminar"
        danger
        loading={loading}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setLoading(true);
          adminApi
            .deletePricing(deleting.id)
            .then(() => {
              toast.success('Tarifa eliminada');
              setDeleting(null);
              void pricing.retry();
            })
            .catch((error) => toast.error('No se pudo eliminar', getErrorMessage(error)))
            .finally(() => setLoading(false));
        }}
      />
    </div>
  );
}
