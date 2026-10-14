import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RequireAuth } from './RequireAuth';
import { HomePage } from '@/pages/public/HomePage';
import { ComplexPage } from '@/pages/public/ComplexPage';
import { CourtsPage } from '@/pages/public/CourtsPage';
import { BookingPage } from '@/pages/public/BookingPage';
import { ConsultationPage } from '@/pages/public/ConsultationPage';
import { ReservationStatusPage } from '@/pages/public/ReservationStatusPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminCalendarPage } from '@/pages/admin/AdminCalendarPage';
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage';
import { AdminCourtsPage } from '@/pages/admin/AdminCourtsPage';
import { AdminSchedulePage } from '@/pages/admin/AdminSchedulePage';
import { AdminPricingPage } from '@/pages/admin/AdminPricingPage';
import { AdminCustomersPage } from '@/pages/admin/AdminCustomersPage';
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

/**
 * Definición de rutas.
 * La protección de /admin es una salvaguarda de UX; el backend valida la autorización real.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'complejo', element: <ComplexPage /> },
      { path: 'canchas', element: <CourtsPage /> },
      { path: 'reservar', element: <BookingPage /> },
      { path: 'consultar', element: <ConsultationPage /> },
      { path: 'reserva/:code', element: <ReservationStatusPage /> },
      { path: 'contacto', element: <ContactPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'calendario', element: <AdminCalendarPage /> },
          { path: 'reservas', element: <AdminBookingsPage /> },
          { path: 'horarios', element: <AdminSchedulePage /> },
          { path: 'clientes', element: <AdminCustomersPage /> },
          { path: 'pagos', element: <AdminPaymentsPage /> },
          {
            path: 'canchas',
            element: <RequireAuth roles={['ADMIN']} />,
            children: [{ index: true, element: <AdminCourtsPage /> }],
          },
          {
            path: 'precios',
            element: <RequireAuth roles={['ADMIN']} />,
            children: [{ index: true, element: <AdminPricingPage /> }],
          },
          {
            path: 'reportes',
            element: <RequireAuth roles={['ADMIN']} />,
            children: [{ index: true, element: <AdminReportsPage /> }],
          },
          {
            path: 'usuarios',
            element: <RequireAuth roles={['ADMIN']} />,
            children: [{ index: true, element: <AdminUsersPage /> }],
          },
          {
            path: 'configuracion',
            element: <RequireAuth roles={['ADMIN']} />,
            children: [{ index: true, element: <AdminSettingsPage /> }],
          },
        ],
      },
    ],
  },
]);
