import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/Input';
import { CLUB_TIMEZONE } from '@/lib/env';
import { addDaysIso, parseDateOnly, todayIso } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  days?: number;
}

export function DatePicker({ value, onChange, days = 14 }: DatePickerProps) {
  const today = todayIso();
  const options = Array.from({ length: days }, (_, index) => addDaysIso(today, index));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-2 subtle-scrollbar" role="group" aria-label="Elegir fecha">
        {options.map((date) => {
          const selected = date === value;
          const parsed = parseDateOnly(date);
          const weekday = formatInTimeZone(parsed, CLUB_TIMEZONE, 'EEE', { locale: es });
          const dayNumber = formatInTimeZone(parsed, CLUB_TIMEZONE, 'd', { locale: es });
          const month = formatInTimeZone(parsed, CLUB_TIMEZONE, 'MMM', { locale: es });
          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              aria-pressed={selected}
              className={cn(
                'flex min-w-[4.25rem] flex-col items-center rounded-xl border px-3 py-2.5 transition-colors',
                selected
                  ? 'border-primary bg-primary text-white shadow-[0_10px_24px_-12px_rgba(40,120,255,0.9)]'
                  : 'border-line bg-surface text-ink hover:border-primary/50 hover:bg-surface-2',
              )}
            >
              <span className={cn('text-[11px] font-semibold uppercase', selected ? 'text-white/80' : 'text-muted')}>
                {weekday}
              </span>
              <span className="text-lg font-bold leading-tight">{dayNumber}</span>
              <span className={cn('text-[11px]', selected ? 'text-white/80' : 'text-muted')}>{month}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="custom-date" className="text-sm font-medium text-content">
          ¿Otra fecha?
        </label>
        <Input
          id="custom-date"
          type="date"
          min={today}
          value={value}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className="h-10 w-auto"
        />
      </div>
    </div>
  );
}
