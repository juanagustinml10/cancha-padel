import { randomInt } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Genera un código de reserva legible (sin caracteres ambiguos como O/0, I/1).
 * Ej: "PC-7KQ2MF". La unicidad final la garantiza la restricción de la base de datos;
 * el servicio reintenta si hubiera una colisión.
 */
export function generateBookingCode(): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return `PC-${suffix}`;
}

/** Identificador opaco para correos de contacto u operaciones que no requieren persistencia. */
export function generateOpaqueId(prefix = 'ref'): string {
  return `${prefix}-${Date.now().toString(36)}-${randomInt(0, 1_000_000).toString(36)}`;
}
