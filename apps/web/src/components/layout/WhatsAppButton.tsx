import { MessageCircle } from 'lucide-react';
import { DEMO_CLUB } from '@/config/site';
import { env } from '@/lib/env';

export function WhatsAppButton() {
  const number = env.whatsapp || DEMO_CLUB.whatsapp;
  if (!number) return null;

  const message = encodeURIComponent('¡Hola! Quisiera consultar por la disponibilidad de canchas.');

  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-4 py-3 text-sm font-semibold text-content shadow-elevated backdrop-blur transition-colors hover:border-line-strong hover:bg-surface-2"
      aria-label="Escribir por WhatsApp"
    >
      <MessageCircle className="h-5 w-5 text-[#25D366]" aria-hidden />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
