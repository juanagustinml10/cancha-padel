import type { ContactMessage } from '@padel/shared';
import { logger } from '@/infra/logger';
import { generateOpaqueId } from '@/utils/id';

/**
 * Recepción de mensajes de contacto.
 * Actualmente se registra en el log estructurado. Para persistirlos o reenviarlos por
 * email, conectar aquí un proveedor (tabla propia o servicio de correo).
 */
export async function sendContact(message: ContactMessage): Promise<{ ok: true }> {
  logger.info(
    {
      contactId: generateOpaqueId('contact'),
      email: message.email,
      hasPhone: Boolean(message.phone),
    },
    'Mensaje de contacto recibido',
  );
  return { ok: true };
}
