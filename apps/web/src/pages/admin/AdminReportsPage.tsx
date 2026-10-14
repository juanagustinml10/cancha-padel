import { useState } from 'react';
import { CheckCircle2, CircleDollarSign, Download, PiggyBank, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, StatCard } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { FullPageLoader } from '@/components/ui/Spinner';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/services/adminApi';
import { addDaysIso, todayIso } from '@/lib/datetime';
import { downloadCsv, toCsv } from '@/lib/csv';
import { formatCurrency } from '@/lib/format';
import type { PaymentMethodRow, ReportCourtRow } from '@padel/shared';

export function AdminReportsPage() {
  const [from, setFrom] = useState(addDaysIso(todayIso(), -30));
  const [to, setTo] = useState(todayIso());
  const [applied, setApplied] = useState({ from: addDaysIso(todayIso(), -30), to: todayIso() });

  const report = useAsync(
    () => adminApi.getBookingReport(applied.from, applied.to),
    [applied.from, applied.to],
  );

  const currency = report.data?.currency ?? 'ARS';

  const courtColumns: Column<ReportCourtRow>[] = [
    {
      key: 'court',
      header: 'Cancha',
      render: (row) => <span className="font-medium text-content">{row.courtName}</span>,
    },
    { key: 'bookings', header: 'Reservas', render: (row) => row.bookings },
    { key: 'occupancy', header: 'Ocupación', render: (row) => `${Math.round(row.occupancyRate * 100)}%` },
    {
      key: 'collected',
      header: 'Cobrado',
      render: (row) => (
        <span className="font-semibold text-content">{formatCurrency(row.collectedCents, currency)}</span>
      ),
    },
    {
      key: 'reserved',
      header: 'Reservado (señas)',
      render: (row) => formatCurrency(row.reservedCents, currency),
    },
  ];

  const paymentColumns: Column<PaymentMethodRow>[] = [
    { key: 'method', header: 'Método', render: (row) => <span className="font-medium text-content">{row.method}</span> },
    { key: 'count', header: 'Cantidad', render: (row) => row.count },
    {
      key: 'collected',
      header: 'Cobrado',
      render: (row) => (
        <span className="font-semibold text-content">{formatCurrency(row.collectedCents, currency)}</span>
      ),
    },
  ];

  function handleExport() {
    if (!report.data) return;
    const csv = toCsv(
      ['Cancha', 'Reservas', 'Ocupación (%)', 'Cobrado', 'Reservado', 'Moneda'],
      report.data.byCourt.map((row) => [
        row.courtName,
        row.bookings,
        Math.round(row.occupancyRate * 100),
        row.collectedCents / 100,
        row.reservedCents / 100,
        currency,
      ]),
    );
    downloadCsv(`reporte-${applied.from}_${applied.to}.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading
        eyebrow="Reportes"
        title="Reporte de reservas e ingresos"
        description="Cobrado real, importes reservados y ocupación por cancha en el período."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Desde" htmlFor="report-from">
            <Input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="Hasta" htmlFor="report-to">
            <Input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <Button variant="outline" onClick={() => setApplied({ from, to })}>
            Aplicar período
          </Button>
          <Button
            onClick={handleExport}
            disabled={!report.data}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Exportar CSV
          </Button>
        </div>
      </Card>

      {report.loading ? (
        <FullPageLoader label="Generando reporte…" />
      ) : report.error ? (
        <ErrorState message={report.error} onRetry={report.retry} />
      ) : report.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Reservas totales"
              value={report.data.totalBookings}
              hint={`${report.data.confirmedBookings} confirmadas · ${report.data.completedBookings} finalizadas`}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              label="Canceladas / Ausencias"
              value={`${report.data.cancelledBookings} / ${report.data.noShows}`}
              icon={<XCircle className="h-5 w-5" />}
            />
            <StatCard
              label="Cobrado"
              value={formatCurrency(report.data.collectedCents, currency)}
              hint="Pagos aprobados en el período"
              icon={<CircleDollarSign className="h-5 w-5" />}
            />
            <StatCard
              label="Reservado (señas)"
              value={formatCurrency(report.data.reservedCents, currency)}
              hint="Señas de reservas confirmadas/finalizadas"
              icon={<PiggyBank className="h-5 w-5" />}
            />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-content">Detalle por cancha</h3>
            <DataTable
              columns={courtColumns}
              rows={report.data.byCourt}
              keyExtractor={(row) => row.courtId}
              empty={<EmptyState title="Sin datos" description="No hubo actividad en el período." />}
            />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-content">Métodos de pago</h3>
            <DataTable
              columns={paymentColumns}
              rows={report.data.byPaymentMethod}
              keyExtractor={(row) => row.method}
              empty={
                <EmptyState title="Sin cobros" description="No se registraron pagos aprobados en el período." />
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
