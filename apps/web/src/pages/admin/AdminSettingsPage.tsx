import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import type { SettingsPayload } from '@padel/shared';
import { settingsSchema } from '@padel/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FullPageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { useAsync } from '@/hooks/useAsync';
import { useZodForm } from '@/hooks/useZodForm';
import { adminApi } from '@/services/adminApi';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';

const EMPTY: SettingsPayload = {
  clubName: '',
  depositMode: 'percent',
  depositPercent: 30,
  depositFixedAmountCents: 0,
  bookingHoldMinutes: 15,
  cancellationPolicy: '',
  bankTransferAlias: '',
  bankTransferCbu: '',
  bankTransferAccountHolder: '',
};

export function AdminSettingsPage() {
  const toast = useToast();
  const settings = useAsync(() => adminApi.getSettings(), []);
  const [loading, setLoading] = useState(false);

  const form = useZodForm(settingsSchema, {
    clubName: '',
    depositMode: 'percent',
    depositPercent: 30,
    depositFixedAmount: 0,
    bookingHoldMinutes: 15,
    cancellationPolicy: '',
    bankTransferAlias: '',
    bankTransferCbu: '',
    bankTransferAccountHolder: '',
  });

  useEffect(() => {
    if (!settings.data) return;
    form.setValues({
      clubName: settings.data.clubName,
      depositMode: settings.data.depositMode,
      depositPercent: settings.data.depositPercent,
      depositFixedAmount: settings.data.depositFixedAmountCents / 100,
      bookingHoldMinutes: settings.data.bookingHoldMinutes,
      cancellationPolicy: settings.data.cancellationPolicy,
      bankTransferAlias: settings.data.bankTransferAlias ?? '',
      bankTransferCbu: settings.data.bankTransferCbu ?? '',
      bankTransferAccountHolder: settings.data.bankTransferAccountHolder ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = form.validate();
    if (!data) return;
    setLoading(true);
    try {
      const payload: SettingsPayload = {
        ...EMPTY,
        ...settings.data,
        clubName: data.clubName,
        depositMode: data.depositMode,
        depositPercent: Number(data.depositPercent),
        depositFixedAmountCents: Math.round(data.depositFixedAmount * 100),
        bookingHoldMinutes: Number(data.bookingHoldMinutes),
        cancellationPolicy: data.cancellationPolicy,
        bankTransferAlias: data.bankTransferAlias ?? '',
        bankTransferCbu: data.bankTransferCbu ?? '',
        bankTransferAccountHolder: data.bankTransferAccountHolder ?? '',
      };
      const updated = await adminApi.updateSettings(payload);
      toast.success('Configuración guardada');
      settings.setData(updated);
    } catch (error) {
      toast.error('No se pudo guardar la configuración', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (settings.loading) return <FullPageLoader label="Cargando configuración…" />;
  if (settings.error) return <ErrorState message={settings.error} onRetry={settings.retry} />;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Configuración"
        title="Parámetros del club"
        description="Define la seña, el tiempo de retención de turnos y la política de cancelación."
      />

      <Card className="p-5">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <Field label="Nombre del club" htmlFor="settings-club" required error={form.errors.clubName} className="sm:col-span-2">
            <Input
              id="settings-club"
              value={form.values.clubName}
              invalid={Boolean(form.errors.clubName)}
              onChange={(event) => form.setField('clubName', event.target.value)}
            />
          </Field>
          <Field label="Modalidad de seña" htmlFor="settings-mode" required>
            <Select
              id="settings-mode"
              value={form.values.depositMode}
              onChange={(event) =>
                form.setField('depositMode', event.target.value as SettingsPayload['depositMode'])
              }
            >
              <option value="percent">Porcentaje del total</option>
              <option value="fixed_amount">Monto fijo</option>
            </Select>
          </Field>
          <Field
            label="Tiempo de retención (min)"
            htmlFor="settings-hold"
            required
            error={form.errors.bookingHoldMinutes}
            hint="Minutos que el turno queda reservado mientras se paga."
          >
            <Input
              id="settings-hold"
              type="number"
              min={5}
              max={240}
              value={form.values.bookingHoldMinutes}
              invalid={Boolean(form.errors.bookingHoldMinutes)}
              onChange={(event) => form.setField('bookingHoldMinutes', Number(event.target.value))}
            />
          </Field>

          {form.values.depositMode === 'percent' ? (
            <Field label="Porcentaje de seña (%)" htmlFor="settings-percent" required error={form.errors.depositPercent}>
              <Input
                id="settings-percent"
                type="number"
                min={0}
                max={100}
                value={form.values.depositPercent}
                invalid={Boolean(form.errors.depositPercent)}
                onChange={(event) => form.setField('depositPercent', Number(event.target.value))}
              />
            </Field>
          ) : (
            <Field label="Monto fijo de seña (ARS)" htmlFor="settings-fixed" required error={form.errors.depositFixedAmount}>
              <Input
                id="settings-fixed"
                type="number"
                min={0}
                step={100}
                value={form.values.depositFixedAmount}
                invalid={Boolean(form.errors.depositFixedAmount)}
                onChange={(event) => form.setField('depositFixedAmount', Number(event.target.value))}
              />
            </Field>
          )}

          <Field
            label="Política de cancelación"
            htmlFor="settings-policy"
            error={form.errors.cancellationPolicy}
            hint="Se muestra a los clientes en el sitio y en los emails."
            className="sm:col-span-2"
          >
            <Textarea
              id="settings-policy"
              rows={4}
              value={form.values.cancellationPolicy}
              onChange={(event) => form.setField('cancellationPolicy', event.target.value)}
            />
          </Field>

          <div className="sm:col-span-2 border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-ink">Datos para transferencias</h3>
            <p className="mt-1 text-xs text-muted">
              Se muestran al cliente que elige pagar por transferencia. Si los dejás vacíos, el sitio
              avisará que todavía no están configurados.
            </p>
          </div>
          <Field
            label="Titular de la cuenta"
            htmlFor="settings-bank-holder"
            error={form.errors.bankTransferAccountHolder}
            className="sm:col-span-2"
          >
            <Input
              id="settings-bank-holder"
              value={form.values.bankTransferAccountHolder ?? ''}
              invalid={Boolean(form.errors.bankTransferAccountHolder)}
              placeholder="Nombre y apellido o razón social"
              onChange={(event) => form.setField('bankTransferAccountHolder', event.target.value)}
            />
          </Field>
          <Field label="Alias" htmlFor="settings-bank-alias" error={form.errors.bankTransferAlias}>
            <Input
              id="settings-bank-alias"
              value={form.values.bankTransferAlias ?? ''}
              invalid={Boolean(form.errors.bankTransferAlias)}
              placeholder="mi.club.padel"
              onChange={(event) => form.setField('bankTransferAlias', event.target.value)}
            />
          </Field>
          <Field
            label="CBU / CVU"
            htmlFor="settings-bank-cbu"
            error={form.errors.bankTransferCbu}
            hint="Número de 22 dígitos (opcional si usás alias)."
          >
            <Input
              id="settings-bank-cbu"
              value={form.values.bankTransferCbu ?? ''}
              invalid={Boolean(form.errors.bankTransferCbu)}
              placeholder="0000000000000000000000"
              onChange={(event) => form.setField('bankTransferCbu', event.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <Button type="submit" leftIcon={<Save className="h-4 w-4" />} loading={loading}>
              Guardar configuración
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
