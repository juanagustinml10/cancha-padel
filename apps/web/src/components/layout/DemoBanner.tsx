import { useState } from 'react';
import { X } from 'lucide-react';
import { env } from '@/lib/env';

export function DemoBanner() {
  const [visible, setVisible] = useState(true);
  if (!env.useMocks || !visible) return null;

  return (
    <div className="border-b border-line bg-night/80 px-4 py-1.5 text-center text-[11px] font-medium text-white/80 sm:text-xs">
      <div className="container-page flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            Demo
          </span>
          <span className="hidden sm:inline">Datos ficticios · los pagos reales no están activos.</span>
          <span className="sm:hidden">Datos de demostración</span>
        </span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-md p-0.5 text-white/50 transition-colors hover:text-white"
          aria-label="Ocultar aviso"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
