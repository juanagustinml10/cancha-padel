import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { CourtBlock, CourtSchedule } from '@padel/shared';
import { blockSchema } from '@padel/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { FullPageLoader } from '@/components/ui/Spinner';
import { useAsync } from '@/hooks/useAsync';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errors';
import { clubDateTimeToIso, todayIso } from '@/lib/datetime';
import { formatDateShort, formatTime, weekdayLabel } from '@/lib/format';

export function AdminSchedulePage() {
  const toast = useToast();
  const { user } = useAuth();
  // Autoridad real de permisos: el backend exige ADMIN para PUT /admin/schedules.
  // Recepción puede VER horarios y gestionar bloqueos, pero no modificar horarios.
  const canEditSchedule = user?.role === 'ADMIN';
  const schedule = useAsync(() => adminApi.getSchedule(), []);
  const blocks = useAsync(() => adminApi.listBlocks(), []);
  const courts = useAsync(() => adminApi.listCourts(), []);
  const [rows, setRows] = useState<CourtSchedule[]>([]);
  const [saving, setSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState<CourtBlock | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    if (schedule.data) setRows(schedule.data.map((row) => ({ ...row })));
  }, [schedule.data]);

  const form = useZodForm(blockSchema, {
    courtId: '',
    date: todayIso(),
    startTime: '12:00',
    endTime: '14:00',
    reason: '',
  });

  const updateRow = (weekday: number, patch: Partial<CourtSchedule>) => {
    setRows((current) =>
      current.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateSchedule(rows);
      toast.success('Horarios actualizados');
      void schedule.retry();
    } catch (error) {
      toast.error('No se pudieron guardar los horarios', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlock = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = form.validate();
    if (!data) return;
    setBlockLoading(true);
    try {
      await adminApi.createBlock({
        courtId: data.courtId || null,
        startsAt: clubDateTimeToIso(data.date, data.startTime),
        endsAt: clubDateTimeToIso(data.date, data.endTime),
        reason: data.reason,
      });
      toast.success('Bloqueo creado');
      setBlockOpen(false);
      form.reset();
      void blocks.retry();
    } catch (error) {
      toast.error('No se pudo crear el bloqueo', getErrorMessage(error));
    } finally {
      setBlockLoading(false);
    }
  };

  const courtName = (courtId?: string | null) =>
    courtId ? courts.data?.find((court) => court.id === courtId)?.name ?? '—' : 'Todas';

  const blockColumns: Column<CourtBlock>[] = [
    { key: 'court', header: 'Cancha', render: (row) => courtName(row.courtId) },
    {
      key: 'range',
      header: 'Rango',
      render: (row) => (
        <div>
          <p className="text-ink">{formatDateShort(row.startsAt)}</p>
          <p className="text-xs text-muted">
            {formatTime(row.startsAt)} – {formatTime(row.endsAt)}
          </p>
        </div>
      ),
    },
    { key: 'reason', header: 'Motivo', render: (row) => row.reason },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => (
        <Button
          size="sm"
          variant="danger"
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={() => setDeletingBlock(row)}
        >
          Eliminar
        </Button>
      ),
    },
  ];

  if (schedule.loading) return <FullPageLoader label="Cargando horarios…" />;
  if (schedule.error) return <ErrorState message={schedule.error} onRetry={schedule.retry} />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        eyebrow="Horarios"
        title="Horarios de atención"
        description="Definí la apertura, el cierre y la granularidad de turnos por día."
        actions={
          canEditSchedule ? (
            <Button leftIcon={<Save className="h-4 w-4" />} onClick={handleSave} loading={saving}>
              Guardar horarios
            </Button>
          ) : null
        }
      />

      {!canEditSchedule ? (
        <p className="rounded-md border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          Los horarios de atención sólo pueden modificarse por un administrador. La vista es de
          sólo lectura; podés seguir gestionando bloqueos.
        </p>
      ) : null}
      <Card className="overflow-hidden">
        <div className="divide-y divide-border md:hidden">
          {rows
            .slice()
            .sort((a, b) => a.weekday - b.weekday)
            .map((row) => (
              <div key={row.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-content">{weekdayLabel(row.weekday)}</span>
                  <label className="inline-flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      disabled={!canEditSchedule}
                      checked={row.isActive}
                      onChange={(event) => updateRow(row.weekday, { isActive: event.target.checked })}
                    />
                    Activo
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Apertura" htmlFor={`opens-${row.id}`}>
                    <Input
                      id={`opens-${row.id}`}
                      type="time"
                      disabled={!canEditSchedule}
                      className="h-10"
                      value={row.opensAt}
                      onChange={(event) => updateRow(row.weekday, { opensAt: event.target.value })}
                    />
                  </Field>
                  <Field label="Cierre" htmlFor={`closes-${row.id}`}>
                    <Input
                      id={`closes-${row.id}`}
                      type="time"
                      disabled={!canEditSchedule}
                      className="h-10"
                      value={row.closesAt}
                      onChange={(event) => updateRow(row.weekday, { closesAt: event.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Turno (min)" htmlFor={`slot-${row.id}`}>
                  <Input
                    id={`slot-${row.id}`}
                    type="number"
                    disabled={!canEditSchedule}
                    min={15}
                    step={15}
                    className="h-10"
                    value={row.slotMinutes}
                    onChange={(event) => updateRow(row.weekday, { slotMinutes: Number(event.target.value) })}
                  />
                </Field>
              </div>
            ))}
        </div>

        <div className="hidden overflow-x-auto subtle-scrollbar md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-content">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase">Día</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase">Apertura</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase">Cierre</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase">Turno (min)</th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows
                .slice()
                .sort((a, b) => a.weekday - b.weekday)
                .map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 font-medium text-content">{weekdayLabel(row.weekday)}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="time"
                        disabled={!canEditSchedule}
                        className="h-9 w-32"
                        value={row.opensAt}
                        onChange={(event) => updateRow(row.weekday, { opensAt: event.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="time"
                        disabled={!canEditSchedule}
                        className="h-9 w-32"
                        value={row.closesAt}
                        onChange={(event) => updateRow(row.weekday, { closesAt: event.target.value })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        disabled={!canEditSchedule}
                        min={15}
                        step={15}
                        className="h-9 w-24"
                        value={row.slotMinutes}
                        onChange={(event) => updateRow(row.weekday, { slotMinutes: Number(event.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                        disabled={!canEditSchedule}
                        checked={row.isActive}
                        onChange={(event) => updateRow(row.weekday, { isActive: event.target.checked })}
                        aria-label={`Activar ${weekdayLabel(row.weekday)}`}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AdminPageHeader
        eyebrow="Bloqueos"
        title="Bloqueos por mantenimiento o eventos"
        description="Los bloqueos impiden reservar en el rango indicado."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setBlockOpen(true)}>
            Nuevo bloqueo
          </Button>
        }
      />

      {blocks.error ? (
        <ErrorState message={blocks.error} onRetry={blocks.retry} />
      ) : (
        <DataTable
          columns={blockColumns}
          rows={blocks.data ?? []}
          keyExtractor={(row) => row.id}
          loading={blocks.loading}
          empty={<EmptyState title="Sin bloqueos" description="No hay bloqueos registrados." />}
        />
      )}

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Nuevo bloqueo"
        footer={
          <>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBlock} loading={blockLoading}>
              Crear bloqueo
            </Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleCreateBlock} noValidate>
          <Field label="Cancha" htmlFor="block-court" hint="Dejá “Todas” para bloquear todas las canchas.">
            <Select
              id="block-court"
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
          <Field label="Fecha" htmlFor="block-date" required error={form.errors.date}>
            <Input
              id="block-date"
              type="date"
              value={form.values.date}
              invalid={Boolean(form.errors.date)}
              onChange={(event) => form.setField('date', event.target.value)}
            />
          </Field>
          <Field label="Desde" htmlFor="block-start" required error={form.errors.startTime}>
            <Input
              id="block-start"
              type="time"
              value={form.values.startTime}
              onChange={(event) => form.setField('startTime', event.target.value)}
            />
          </Field>
          <Field label="Hasta" htmlFor="block-end" required error={form.errors.endTime}>
            <Input
              id="block-end"
              type="time"
              value={form.values.endTime}
              invalid={Boolean(form.errors.endTime)}
              onChange={(event) => form.setField('endTime', event.target.value)}
            />
          </Field>
          <Field label="Motivo" htmlFor="block-reason" required error={form.errors.reason} className="sm:col-span-2">
            <Input
              id="block-reason"
              value={form.values.reason}
              invalid={Boolean(form.errors.reason)}
              onChange={(event) => form.setField('reason', event.target.value)}
              placeholder="Mantenimiento, evento, uso interno…"
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingBlock)}
        title="Eliminar bloqueo"
        message="¿Confirmás eliminar este bloqueo?"
        confirmLabel="Eliminar"
        danger
        loading={blockLoading}
        onClose={() => setDeletingBlock(null)}
        onConfirm={() => {
          if (!deletingBlock) return;
          setBlockLoading(true);
          adminApi
            .deleteBlock(deletingBlock.id)
            .then(() => {
              toast.success('Bloqueo eliminado');
              setDeletingBlock(null);
              void blocks.retry();
            })
            .catch((error) => toast.error('No se pudo eliminar', getErrorMessage(error)))
            .finally(() => setBlockLoading(false));
        }}
      />
    </div>
  );
}
