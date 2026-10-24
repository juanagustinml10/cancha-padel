import type { AvailabilitySlot, Court } from '@padel/shared';
import { Lightbulb, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface CourtPickerProps {
  courts: Court[];
  value: string | null;
  onChange: (courtId: string) => void;
  /** Turnos por cancha para mostrar cuántos quedan libres. */
  slotsByCourt?: Map<string, AvailabilitySlot[]>;
}

/**
 * Selector visual de cancha con disponibilidad, compartido por la reserva
 * pública y la reserva manual del panel administrativo.
 */
export function CourtPicker({ courts, value, onChange, slotsByCourt }: CourtPickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {courts.map((court) => {
        const slots = slotsByCourt?.get(court.id) ?? [];
        const available = slots.filter((slot) => slot.available).length;
        const selected = court.id === value;
        return (
          <button
            key={court.id}
            type="button"
            onClick={() => onChange(court.id)}
            aria-pressed={selected}
            className={cn(
              'flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
              selected
                ? 'border-primary bg-brand-soft'
                : 'border-line bg-surface hover:border-primary/50 hover:bg-surface-2',
            )}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-content">
              {court.type === 'INDOOR' ? (
                <Warehouse className="h-4 w-4 text-accent" aria-hidden />
              ) : (
                <Lightbulb className="h-4 w-4 text-accent" aria-hidden />
              )}
              {court.name}
            </span>
            <Badge variant={available > 0 ? 'success' : 'neutral'}>
              {available > 0 ? `${available} turnos libres` : 'Sin turnos'}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

/** Agrupa los slots de disponibilidad por cancha. */
export function groupSlotsByCourt(slots: AvailabilitySlot[]): Map<string, AvailabilitySlot[]> {
  const map = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    const list = map.get(slot.courtId) ?? [];
    list.push(slot);
    map.set(slot.courtId, list);
  }
  return map;
}
