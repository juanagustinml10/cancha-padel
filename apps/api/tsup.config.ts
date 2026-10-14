import { defineConfig } from 'tsup';

/**
 * Build del backend.
 * Se empaqueta `@padel/shared` (fuente TS) dentro del bundle; las dependencias nativas
 * (Prisma, argon2) y el resto de node_modules quedan externas y se resuelven en runtime.
 */
export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts'],
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  noExternal: ['@padel/shared'],
});
