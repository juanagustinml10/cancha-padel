import type { AvailabilitySlot, Court } from '@padel/shared';
import { CalendarDays, Clock, Dumbbell, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate, formatDuration, formatTime } from '@/lib/format';

interface BookingSummaryProps {
  court: Court;
  slot: AvailabilitySlot;
  durationMinutes: number;
}

export function BookingSummary({ court, slot, durationMinutes }: BookingSummaryProps) {
  const balance = slot.priceTotalCents - slot.depositAmountCents;

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-content">Resumen de la reserva</h3>
      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted">
            <Dumbbell className="h-4 w-4 text-accent" aria-hidden />
            Cancha
          </dt>
          <dd className="font-medium text-ink">{court.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted">
            <CalendarDays className="h-4 w-4 text-accent" aria-hidden />
            Fecha
          </dt>
          <dd className="font-medium capitalize text-ink">{formatDate(slot.startsAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted">
            <Clock className="h-4 w-4 text-accent" aria-hidden />
            Horario
          </dt>
          <dd className="font-medium text-ink">
            {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">Duración</dt>
          <dd className="font-medium text-ink">{formatDuration(durationMinutes)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Precio total</span>
          <span className="font-semibold text-content">
            {formatCurrency(slot.priceTotalCents, slot.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Saldo restante</span>
          <span className="font-semibold text-ink">{formatCurrency(balance, slot.currency)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-brand-soft px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-content">
          <Wallet className="h-4 w-4 text-accent" aria-hidden />
          Seña a pagar ahora
        </span>
        <span className="text-lg font-bold text-accent">
          {formatCurrency(slot.depositAmountCents, slot.currency)}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted">
        El saldo restante se abona en el complejo. El precio definitivo es el calculado por el servidor al
        confirmar la reserva.
      </p>
    </Card>
  );
}
