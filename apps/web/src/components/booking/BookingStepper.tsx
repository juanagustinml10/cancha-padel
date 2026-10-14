import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: string[];
  current: number;
}

export function BookingStepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3" aria-label="Pasos de la reserva">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                state === 'done' && 'bg-primary text-white',
                state === 'current' && 'bg-accent text-[#041018] shadow-[0_8px_20px_-8px_rgba(83,161,255,0.9)]',
                state === 'upcoming' && 'border border-line bg-surface-2 text-muted',
              )}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                state === 'upcoming' ? 'text-muted' : state === 'current' ? 'text-content' : 'text-ink',
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={cn('mx-1 hidden h-px w-6 sm:block', state === 'done' ? 'bg-primary/60' : 'bg-line')}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
