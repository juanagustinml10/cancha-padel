import { hash as argonHash, verify as argonVerify, Algorithm } from '@node-rs/argon2';

/**
 * Hashing de contraseñas con Argon2id (binary precompilado, sin build nativo).
 * Los parámetros siguen las recomendaciones actuales de OWASP.
 */
const HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argonHash(password, HASH_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(passwordHash, password);
  } catch {
    return false;
  }
}
