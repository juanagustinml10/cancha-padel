import type { AvailabilitySlot } from '@padel/shared';
import { cn } from '@/lib/utils';
import { formatCurrency, formatTime } from '@/lib/format';

interface TimeSlotPickerProps {
  slots: AvailabilitySlot[];
  value: string | null;
  onChange: (slot: AvailabilitySlot) => void;
}

export function TimeSlotPicker({ slots, value, onChange }: TimeSlotPickerProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-sm text-muted">
        No hay horarios para esta cancha en la fecha seleccionada.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-line bg-surface-2" aria-hidden />
          Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary" aria-hidden />
          Seleccionado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-line bg-bg" aria-hidden />
          Ocupado
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((slot) => {
          const selected = slot.startsAt === value;
          const disabled = !slot.available;
          return (
            <button
              key={slot.startsAt}
              type="button"
              disabled={disabled}
              onClick={() => onChange(slot)}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-center rounded-xl border px-3 py-2.5 text-sm transition-colors',
                selected && 'border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(40,120,255,0.9)]',
                !selected && !disabled && 'border-line bg-surface text-ink hover:border-primary/50 hover:bg-surface-2',
                disabled && 'cursor-not-allowed border-line bg-bg text-muted/50',
              )}
            >
              <span className="font-semibold">{formatTime(slot.startsAt)}</span>
              {disabled ? (
                <span className="text-[11px]">{slot.reason === 'past' ? 'Pasó' : 'Ocupado'}</span>
              ) : (
                <span className={cn('text-[11px]', selected ? 'text-white/80' : 'text-muted')}>
                  {formatCurrency(slot.priceTotalCents, slot.currency)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
