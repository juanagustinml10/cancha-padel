import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@padel/shared';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';

/**
 * Protección de rutas del panel.
 * Es una salvaguarda de UX: la autorización definitiva la valida el backend.
 */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader label="Verificando sesión…" />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-6">
        <ErrorState
          title="Acceso restringido"
          message="No tenés permisos para ver esta sección. Si creés que es un error, contactá al administrador."
        />
      </div>
    );
  }

  return <Outlet />;
}
