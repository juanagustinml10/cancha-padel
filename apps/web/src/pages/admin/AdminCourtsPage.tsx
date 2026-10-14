import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Court } from '@padel/shared';
import { courtSchema, CourtStatus } from '@padel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  MAINTENANCE: 'Mantenimiento',
};

export function AdminCourtsPage() {
  const toast = useToast();
  const courts = useAsync(() => adminApi.listCourts(), []);
  const [editing, setEditing] = useState<Court | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Court | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useZodForm(courtSchema, {
    name: '',
    type: 'INDOOR',
    surface: '',
    hasLighting: true,
    status: 'ACTIVE',
    description: '',
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      type: 'INDOOR',
      surface: '',
      hasLighting: true,
      status: 'ACTIVE',
      description: '',
    });
    setOpen(true);
  };

  const openEdit = (court: Court) => {
    setEditing(court);
    form.reset({
      name: court.name,
      type: court.type,
      surface: court.surface ?? '',
      hasLighting: court.hasLighting,
      status: court.status,
      description: court.description ?? '',
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
        name: data.name,
        type: data.type,
        surface: data.surface || undefined,
        hasLighting: data.hasLighting,
        status: data.status,
        description: data.description || undefined,
      };
      if (editing) {
        await adminApi.updateCourt(editing.id, payload);
        toast.success('Cancha actualizada');
      } else {
        await adminApi.createCourt(payload);
        toast.success('Cancha creada');
      }
      setOpen(false);
      void courts.retry();
    } catch (error) {
      toast.error('No se pudo guardar la cancha', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo<Column<Court>[]>(
    () => [
      { key: 'name', header: 'Cancha', render: (row) => <span className="font-medium text-content">{row.name}</span> },
      {
        key: 'type',
        header: 'Tipo',
        render: (row) => (
          <Badge variant={row.type === 'INDOOR' ? 'info' : 'neutral'}>
            {row.type === 'INDOOR' ? 'Indoor' : 'Outdoor'}
          </Badge>
        ),
      },
      { key: 'surface', header: 'Superficie', render: (row) => row.surface ?? '—' },
      { key: 'lighting', header: 'Iluminación', render: (row) => (row.hasLighting ? 'Sí' : 'No') },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'MAINTENANCE' ? 'warning' : 'neutral'}>
            {STATUS_LABELS[row.status]}
          </Badge>
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
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="Canchas" title="Gestión de canchas" />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nueva cancha
        </Button>
      </div>

      {courts.error ? (
        <ErrorState message={courts.error} onRetry={courts.retry} />
      ) : (
        <DataTable
          columns={columns}
          rows={courts.data ?? []}
          keyExtractor={(row) => row.id}
          loading={courts.loading}
          empty={<EmptyState title="No hay canchas" description="Creá la primera cancha del complejo." />}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar cancha' : 'Nueva cancha'}
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
          <Field label="Nombre" htmlFor="court-name" required error={form.errors.name} className="sm:col-span-2">
            <Input
              id="court-name"
              value={form.values.name}
              invalid={Boolean(form.errors.name)}
              onChange={(event) => form.setField('name', event.target.value)}
            />
          </Field>
          <Field label="Tipo" htmlFor="court-type" required error={form.errors.type}>
            <Select
              id="court-type"
              value={form.values.type}
              onChange={(event) => form.setField('type', event.target.value as Court['type'])}
            >
              <option value="INDOOR">Indoor</option>
              <option value="OUTDOOR">Outdoor</option>
            </Select>
          </Field>
          <Field label="Estado" htmlFor="court-status" required>
            <Select
              id="court-status"
              value={form.values.status}
              onChange={(event) => form.setField('status', event.target.value as CourtStatus)}
            >
              <option value="ACTIVE">Activa</option>
              <option value="INACTIVE">Inactiva</option>
              <option value="MAINTENANCE">Mantenimiento</option>
            </Select>
          </Field>
          <Field label="Superficie" htmlFor="court-surface" error={form.errors.surface}>
            <Input
              id="court-surface"
              value={form.values.surface}
              onChange={(event) => form.setField('surface', event.target.value)}
              placeholder="Césped sintético"
            />
          </Field>
          <Field label="Iluminación" htmlFor="court-lighting" className="justify-end">
            <label className="inline-flex h-11 items-center gap-2 text-sm text-ink">
              <input
                id="court-lighting"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                checked={form.values.hasLighting}
                onChange={(event) => form.setField('hasLighting', event.target.checked)}
              />
              Cuenta con luces
            </label>
          </Field>
          <Field label="Descripción" htmlFor="court-description" className="sm:col-span-2">
            <Textarea
              id="court-description"
              rows={2}
              value={form.values.description}
              onChange={(event) => form.setField('description', event.target.value)}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar cancha"
        message={deleting ? `¿Confirmás eliminar ${deleting.name}? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        danger
        loading={loading}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setLoading(true);
          adminApi
            .deleteCourt(deleting.id)
            .then(() => {
              toast.success('Cancha eliminada');
              setDeleting(null);
              void courts.retry();
            })
            .catch((error) => toast.error('No se pudo eliminar', getErrorMessage(error)))
            .finally(() => setLoading(false));
        }}
      />
    </div>
  );
}
