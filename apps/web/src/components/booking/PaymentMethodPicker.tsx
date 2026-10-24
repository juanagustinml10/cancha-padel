import type { BookingPaymentMethod } from '@padel/shared';
import { Banknote, CreditCard, Info, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaymentOption {
  value: BookingPaymentMethod | null;
  title: string;
  description: string;
  icon: typeof Banknote;
}

/** Medios de pago configurados en el sistema, en el mismo orden que los ve el cliente. */
export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'MERCADOPAGO',
    title: 'Mercado Pago',
    description: 'Pagás la seña online con tarjeta o dinero en cuenta.',
    icon: CreditCard,
  },
  {
    value: 'TRANSFER',
    title: 'Transferencia',
    description: 'Transferís la seña al complejo y cargás el número de operación.',
    icon: Landmark,
  },
  {
    value: 'CASH',
    title: 'Efectivo',
    description: 'Abonás la seña en el club al ingresar a la cancha.',
    icon: Banknote,
  },
];

const UNSET_OPTION: PaymentOption = {
  value: null,
  title: 'Sin definir',
  description: 'Se registra el medio de pago más adelante desde el panel.',
  icon: Info,
};

interface PaymentMethodPickerProps {
  value: BookingPaymentMethod | null;
  onChange: (value: BookingPaymentMethod | null) => void;
  /** Agrega la tarjeta "Sin definir" (uso del panel administrativo). */
  includeUnset?: boolean;
  columnsClassName?: string;
}

/**
 * Selector visual de medio de pago. Se usa en la reserva pública y en la
 * reserva manual del panel para que ambas ofrezcan exactamente las mismas opciones.
 */
export function PaymentMethodPicker({
  value,
  onChange,
  includeUnset,
  columnsClassName,
}: PaymentMethodPickerProps) {
  const options = includeUnset ? [UNSET_OPTION, ...PAYMENT_OPTIONS] : PAYMENT_OPTIONS;

  return (
    <div
      role="radiogroup"
      aria-label="Medio de pago"
      className={cn('grid gap-3', columnsClassName ?? 'sm:grid-cols-3')}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return (
          <button
            key={option.title}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
              selected
                ? 'border-primary bg-brand-soft'
                : 'border-line bg-surface hover:border-primary/50 hover:bg-surface-2',
            )}
          >
            <span
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg',
                selected ? 'bg-primary text-white' : 'bg-surface-2 text-accent',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-content">{option.title}</span>
            <span className="text-xs text-muted">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
