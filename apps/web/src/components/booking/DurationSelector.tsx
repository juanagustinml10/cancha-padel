import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/format';

interface DurationSelectorProps {
  value: number;
  options: number[];
  onChange: (duration: number) => void;
}

export function DurationSelector({ value, options, onChange }: DurationSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Duración del turno">
      {options.map((duration) => {
        const selected = duration === value;
        return (
          <button
            key={duration}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(duration)}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
              selected
                ? 'border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(40,120,255,0.9)]'
                : 'border-line bg-surface text-ink hover:border-primary/50 hover:bg-surface-2',
            )}
          >
            {formatDuration(duration)}
          </button>
        );
      })}
    </div>
  );
}
