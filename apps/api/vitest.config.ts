import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * Configuración de Vitest para el backend.
 * - Los tests unitarios del dominio no requieren base de datos.
 * - Los tests de integración / concurrencia se ejecutan solo si `TEST_DATABASE_URL`
 *   está definido (ver tests/helpers/db.ts). De lo contrario se omiten limpiamente.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@padel/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    setupFiles: ['tests/setup.ts'],
    // Los tests de integración comparten una única base de prueba (TEST_DATABASE_URL)
    // y llaman a resetDatabase; ejecutarlos en paralelo provoca condiciones de carrera
    // (datos borrados por otro archivo). Se serializa la ejecución por archivos.
    fileParallelism: false,
  },
});
