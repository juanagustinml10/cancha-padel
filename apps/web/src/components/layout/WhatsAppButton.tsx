import { MessageCircle } from 'lucide-react';
import { DEMO_CLUB } from '@/config/site';
import { env } from '@/lib/env';

export function WhatsAppButton() {
  const whatsapp = env.whatsapp || DEMO_CLUB.whatsapp;
  if (!whatsapp) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('¡Hola! Quiero consultar por una reserva.')}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-line bg-surface/95 px-3.5 text-sm font-semibold text-content shadow-elevated backdrop-blur transition-colors hover:border-line-strong hover:bg-surface-2 sm:bottom-6 sm:right-6 sm:h-11 sm:pr-4"
      aria-label="Escribir por WhatsApp"
    >
      <MessageCircle className="h-5 w-5 text-[#25D366]" aria-hidden />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
