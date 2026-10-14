import type {
  AuditLog,
  Booking,
  BookingReport,
  Court,
  CourtBlock,
  CourtSchedule,
  Customer,
  DashboardStats,
  ManualPaymentMethod,
  Paginated,
  Payment,
  PricingRule,
  SessionUser,
  SettingsPayload,
  StaffUser,
} from '@padel/shared';
import { apiRequest } from '@/lib/api';
import { env } from '@/lib/env';
import { mockBackend } from './mock/backend';

/**
 * Servicios del panel administrativo.
 * La autorización real se valida en el backend; el frontend solo protege rutas como UX.
 * En modo demostración las credenciales están documentadas en el README.
 */

export interface BookingFilters {
  from?: string;
  to?: string;
  courtId?: string;
  status?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface ManualBookingInput {
  courtId: string;
  startsAt: string;
  durationMinutes: number;
  customer: { fullName: string; email: string; phone: string };
  notes?: string;
}

export const adminApi = {
  login(email: string, password: string): Promise<SessionUser> {
    return env.useMocks
      ? mockBackend.login(email, password)
      : apiRequest<SessionUser>('/auth/login', { method: 'POST', body: { email, password } });
  },

  logout(): Promise<void> {
    return env.useMocks
      ? mockBackend.logout()
      : apiRequest<void>('/auth/logout', { method: 'POST' });
  },

  me(): Promise<SessionUser | null> {
    return env.useMocks
      ? mockBackend.me()
      : apiRequest<SessionUser | null>('/auth/me');
  },

  getDashboard(): Promise<DashboardStats> {
    return env.useMocks
      ? mockBackend.getDashboard()
      : apiRequest<DashboardStats>('/admin/dashboard');
  },

  listCourts(): Promise<Court[]> {
    return env.useMocks ? mockBackend.listCourts() : apiRequest<Court[]>('/admin/courts');
  },

  createCourt(data: Omit<Court, 'id' | 'sortOrder'>): Promise<Court> {
    return env.useMocks
      ? mockBackend.createCourt(data)
      : apiRequest<Court>('/admin/courts', { method: 'POST', body: data });
  },

  updateCourt(id: string, data: Partial<Court>): Promise<Court> {
    return env.useMocks
      ? mockBackend.updateCourt(id, data)
      : apiRequest<Court>(`/admin/courts/${id}`, { method: 'PATCH', body: data });
  },

  deleteCourt(id: string): Promise<void> {
    return env.useMocks
      ? mockBackend.deleteCourt(id)
      : apiRequest<void>(`/admin/courts/${id}`, { method: 'DELETE' });
  },

  getSchedule(): Promise<CourtSchedule[]> {
    return env.useMocks
      ? mockBackend.getSchedule()
      : apiRequest<CourtSchedule[]>('/admin/schedules');
  },

  updateSchedule(schedule: CourtSchedule[]): Promise<CourtSchedule[]> {
    return env.useMocks
      ? mockBackend.updateSchedule(schedule)
      : apiRequest<CourtSchedule[]>('/admin/schedules', { method: 'PUT', body: schedule });
  },

  listPricing(): Promise<PricingRule[]> {
    return env.useMocks ? mockBackend.listPricing() : apiRequest<PricingRule[]>('/admin/pricing');
  },

  createPricing(data: Omit<PricingRule, 'id'>): Promise<PricingRule> {
    return env.useMocks
      ? mockBackend.createPricing(data)
      : apiRequest<PricingRule>('/admin/pricing', { method: 'POST', body: data });
  },

  updatePricing(id: string, data: Partial<PricingRule>): Promise<PricingRule> {
    return env.useMocks
      ? mockBackend.updatePricing(id, data)
      : apiRequest<PricingRule>(`/admin/pricing/${id}`, { method: 'PATCH', body: data });
  },

  deletePricing(id: string): Promise<void> {
    return env.useMocks
      ? mockBackend.deletePricing(id)
      : apiRequest<void>(`/admin/pricing/${id}`, { method: 'DELETE' });
  },

  listBlocks(): Promise<CourtBlock[]> {
    return env.useMocks ? mockBackend.listBlocks() : apiRequest<CourtBlock[]>('/admin/blocks');
  },

  createBlock(data: {
    courtId?: string | null;
    startsAt: string;
    endsAt: string;
    reason: string;
  }): Promise<CourtBlock> {
    return env.useMocks
      ? mockBackend.createBlock(data)
      : apiRequest<CourtBlock>('/admin/blocks', { method: 'POST', body: data });
  },

  deleteBlock(id: string): Promise<void> {
    return env.useMocks
      ? mockBackend.deleteBlock(id)
      : apiRequest<void>(`/admin/blocks/${id}`, { method: 'DELETE' });
  },

  listBookings(filters?: BookingFilters): Promise<Paginated<Booking>> {
    return env.useMocks
      ? mockBackend.listBookings(filters)
      : apiRequest<Paginated<Booking>>('/admin/bookings', {
          query: filters as Record<string, string | number | undefined>,
        });
  },

  createManualBooking(data: ManualBookingInput): Promise<Booking> {
    return env.useMocks
      ? mockBackend.createManualBooking(data)
      : apiRequest<Booking>('/admin/bookings', { method: 'POST', body: data });
  },

  updateBookingNotes(id: string, notes: string): Promise<Booking> {
    return env.useMocks
      ? mockBackend.updateBookingNotes(id, notes)
      : apiRequest<Booking>(`/admin/bookings/${id}`, { method: 'PATCH', body: { notes } });
  },

  cancelBooking(id: string, reason: string): Promise<Booking> {
    return env.useMocks
      ? mockBackend.cancelBooking(id, reason)
      : apiRequest<Booking>(`/admin/bookings/${id}/cancel`, {
          method: 'POST',
          body: { reason },
        });
  },

  markNoShow(id: string): Promise<Booking> {
    return env.useMocks
      ? mockBackend.markNoShow(id)
      : apiRequest<Booking>(`/admin/bookings/${id}/no-show`, { method: 'POST' });
  },

  completeBooking(id: string): Promise<Booking> {
    return env.useMocks
      ? mockBackend.completeBooking(id)
      : apiRequest<Booking>(`/admin/bookings/${id}`, {
          method: 'PATCH',
          body: { status: 'COMPLETED' },
        });
  },

  listCustomers(search?: string): Promise<Customer[]> {
    return env.useMocks
      ? mockBackend.listCustomers(search)
      : apiRequest<Customer[]>('/admin/customers', { query: { search } });
  },

  getCustomer(id: string): Promise<{ customer: Customer; bookings: Booking[] }> {
    return env.useMocks
      ? mockBackend.getCustomer(id)
      : apiRequest<{ customer: Customer; bookings: Booking[] }>(`/admin/customers/${id}`);
  },

  updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return env.useMocks
      ? mockBackend.updateCustomer(id, data)
      : apiRequest<Customer>(`/admin/customers/${id}`, { method: 'PATCH', body: data });
  },

  listPayments(filters?: {
    status?: string;
    provider?: string;
    needsReview?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<Payment>> {
    return env.useMocks
      ? mockBackend.listPayments(filters)
      : apiRequest<Paginated<Payment>>('/admin/payments', {
          query: filters as Record<string, string | number | boolean | undefined>,
        });
  },

  registerManualPayment(data: {
    bookingId: string;
    amountCents: number;
    method: ManualPaymentMethod;
    reference?: string;
    note?: string;
  }): Promise<Payment> {
    return env.useMocks
      ? mockBackend.registerManualPayment(data)
      : apiRequest<Payment>('/admin/payments/manual', { method: 'POST', body: data });
  },

  confirmManualPayment(id: string): Promise<Payment> {
    return env.useMocks
      ? mockBackend.confirmManualPayment(id)
      : apiRequest<Payment>(`/admin/payments/${id}/confirm`, { method: 'POST' });
  },

  rejectManualPayment(id: string, reason?: string): Promise<Payment> {
    return env.useMocks
      ? mockBackend.rejectManualPayment(id, reason)
      : apiRequest<Payment>(`/admin/payments/${id}/reject`, {
          method: 'POST',
          body: reason ? { reason } : {},
        });
  },

  refundPayment(id: string): Promise<Payment> {
    return env.useMocks
      ? mockBackend.refundPayment(id)
      : apiRequest<Payment>(`/admin/payments/${id}/refund`, { method: 'POST' });
  },

  getBookingReport(from: string, to: string): Promise<BookingReport> {
    return env.useMocks
      ? mockBackend.getBookingReport(from, to)
      : apiRequest<BookingReport>('/admin/reports/bookings', { query: { from, to } });
  },

  listUsers(): Promise<StaffUser[]> {
    return env.useMocks ? mockBackend.listUsers() : apiRequest<StaffUser[]>('/admin/users');
  },

  createUser(data: {
    fullName: string;
    email: string;
    role: StaffUser['role'];
    password: string;
  }): Promise<StaffUser> {
    return env.useMocks
      ? mockBackend.createUser(data)
      : apiRequest<StaffUser>('/admin/users', { method: 'POST', body: data });
  },

  updateUser(id: string, data: Partial<StaffUser>): Promise<StaffUser> {
    return env.useMocks
      ? mockBackend.updateUser(id, data)
      : apiRequest<StaffUser>(`/admin/users/${id}`, { method: 'PATCH', body: data });
  },

  getSettings(): Promise<SettingsPayload> {
    return env.useMocks ? mockBackend.getSettings() : apiRequest<SettingsPayload>('/admin/settings');
  },

  updateSettings(data: SettingsPayload): Promise<SettingsPayload> {
    return env.useMocks
      ? mockBackend.updateSettings(data)
      : apiRequest<SettingsPayload>('/admin/settings', { method: 'PUT', body: data });
  },

  listAuditLogs(): Promise<AuditLog[]> {
    return env.useMocks
      ? mockBackend.listAuditLogs()
      : apiRequest<AuditLog[]>('/admin/audit-logs');
  },
};
