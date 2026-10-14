import type { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';

/**
 * Proveedores globales de la aplicación.
 * El orden importa: ToastProvider envuelve a AuthProvider para que la sesión
 * pueda emitir notificaciones al iniciar o cerrar sesión.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
