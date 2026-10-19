import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: string[];
  current: number;
}

export function BookingStepper({ steps, current }: StepperProps) {
  const progress = ((current + 1) / steps.length) * 100;

  return (
    <div>
      {/* Compacto para móvil */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">
            Paso {current + 1} de {steps.length}
          </span>
          <span className="truncate text-sm font-medium text-content">{steps[current]}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Completo desde tablet */}
      <ol
        className="hidden flex-wrap items-center gap-x-2 gap-y-3 sm:flex"
        aria-label="Pasos de la reserva"
      >
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  state === 'done' && 'bg-primary text-white',
                  state === 'current' && 'bg-primary text-white shadow-glow',
                  state === 'upcoming' && 'border border-line bg-surface-2 text-muted',
                )}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  state === 'upcoming' ? 'text-muted' : 'text-content',
                )}
              >
                {step}
              </span>
              {index < steps.length - 1 ? (
                <span className={cn('mx-1 h-px w-6', state === 'done' ? 'bg-primary/60' : 'bg-line')} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
