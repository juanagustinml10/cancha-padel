import { env } from '@/lib/env';

export function DemoBanner() {
  if (!env.useMocks) return null;

  return (
    <div className="border-b border-line bg-night px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#041018]">
          Modo demostración
        </span>
        <span className="text-white/90">
          Los datos que ves son ficticios. Los pagos reales no están activos hasta conectar el backend.
        </span>
      </span>
    </div>
  );
}
