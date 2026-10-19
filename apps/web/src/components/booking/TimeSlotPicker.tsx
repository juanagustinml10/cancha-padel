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
      <p className="text-xs text-muted">
        Tocá un horario disponible para seleccionarlo. Los horarios ocupados no se pueden elegir.
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
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
              aria-label={`${formatTime(slot.startsAt)} ${
                disabled ? 'ocupado' : `disponible, seña ${formatCurrency(slot.depositAmountCents, slot.currency)}`
              }`}
              className={cn(
                'flex min-h-[3.25rem] flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors',
                selected && 'border-primary bg-primary text-white',
                !selected && !disabled && 'border-line bg-surface text-ink hover:border-primary/60 hover:bg-surface-2',
                disabled && 'cursor-not-allowed border-line/60 bg-bg text-muted/50 line-through',
              )}
            >
              <span className="text-sm font-semibold tnum">{formatTime(slot.startsAt)}</span>
              <span
                className={cn(
                  'text-[10px]',
                  selected ? 'text-white/80' : disabled ? 'text-muted/60' : 'text-muted',
                )}
              >
                {disabled ? 'Ocupado' : formatCurrency(slot.depositAmountCents, slot.currency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
