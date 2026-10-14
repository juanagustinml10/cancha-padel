import { useMemo, useState } from 'react';
import { Plus, ShieldCheck, UserRound } from 'lucide-react';
import type { StaffUser } from '@padel/shared';
import { userSchema } from '@padel/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { formatDateShort } from '@/lib/format';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepción',
};

export function AdminUsersPage() {
  const toast = useToast();
  const users = useAsync(() => adminApi.listUsers(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useZodForm(userSchema, {
    fullName: '',
    email: '',
    role: 'RECEPTION',
    password: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = form.validate();
    if (!data) return;
    setLoading(true);
    try {
      await adminApi.createUser(data);
      toast.success('Usuario creado');
      setOpen(false);
      form.reset();
      void users.retry();
    } catch (error) {
      toast.error('No se pudo crear el usuario', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = (user: StaffUser) => {
    adminApi
      .updateUser(user.id, { isActive: !user.isActive })
      .then(() => {
        toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado');
        void users.retry();
      })
      .catch((error) => toast.error('No se pudo actualizar', getErrorMessage(error)));
  };

  const columns = useMemo<Column<StaffUser>[]>(
    () => [
      {
        key: 'name',
        header: 'Usuario',
        render: (row) => (
          <div>
            <p className="font-medium text-content">{row.fullName}</p>
            <p className="text-xs text-muted">{row.email}</p>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Rol',
        render: (row) => (
          <Badge variant={row.role === 'ADMIN' ? 'navy' : 'info'}>
            {row.role === 'ADMIN' ? (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <UserRound className="h-3.5 w-3.5" aria-hidden />
            )}
            {ROLE_LABELS[row.role]}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (row) => (
          <Badge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Activo' : 'Inactivo'}</Badge>
        ),
      },
      {
        key: 'lastLogin',
        header: 'Último ingreso',
        render: (row) => (row.lastLoginAt ? formatDateShort(row.lastLoginAt) : '—'),
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => (
          <Button size="sm" variant={row.isActive ? 'outline' : 'primary'} onClick={() => toggleActive(row)}>
            {row.isActive ? 'Desactivar' : 'Activar'}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Usuarios"
          title="Usuarios del sistema"
          description="Administradores y recepción. El rol define los permisos en el panel."
        />
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Nuevo usuario
        </Button>
      </div>

      {users.error ? (
        <ErrorState message={users.error} onRetry={users.retry} />
      ) : (
        <DataTable
          columns={columns}
          rows={users.data ?? []}
          keyExtractor={(row) => row.id}
          loading={users.loading}
          empty={<EmptyState title="Sin usuarios" description="Creá el primer usuario del sistema." />}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo usuario"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={loading}>
              Crear usuario
            </Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <Field label="Nombre completo" htmlFor="user-name" required error={form.errors.fullName} className="sm:col-span-2">
            <Input
              id="user-name"
              value={form.values.fullName}
              invalid={Boolean(form.errors.fullName)}
              onChange={(event) => form.setField('fullName', event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="user-email" required error={form.errors.email}>
            <Input
              id="user-email"
              type="email"
              value={form.values.email}
              invalid={Boolean(form.errors.email)}
              onChange={(event) => form.setField('email', event.target.value)}
            />
          </Field>
          <Field label="Rol" htmlFor="user-role" required>
            <Select
              id="user-role"
              value={form.values.role}
              onChange={(event) => form.setField('role', event.target.value as StaffUser['role'])}
            >
              <option value="RECEPTION">Recepción</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
          <Field
            label="Contraseña"
            htmlFor="user-password"
            required
            error={form.errors.password}
            hint="Mínimo 8 caracteres."
            className="sm:col-span-2"
          >
            <Input
              id="user-password"
              type="password"
              value={form.values.password}
              invalid={Boolean(form.errors.password)}
              onChange={(event) => form.setField('password', event.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
