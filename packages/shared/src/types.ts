import type {
  BookingPaymentMethod,
  BookingSource,
  BookingStatus,
  CourtStatus,
  CourtType,
  PaymentProvider,
  PaymentStatus,
  Role,
} from './enums';

export interface ClubInfo {
  name: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  mapUrl?: string;
  instagram?: string;
  openingSummary: string;
  depositMode: 'percent' | 'fixed_amount';
  depositPercent: number;
  depositFixedAmountCents: number;
  bookingHoldMinutes: number;
  currency: string;
  timezone: string;
  /** Datos bancarios para transferencias (configurables por el staff). */
  bankTransferAlias?: string;
  bankTransferCbu?: string;
  bankTransferAccountHolder?: string;
}

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  surface?: string;
  hasLighting: boolean;
  status: CourtStatus;
  sortOrder: number;
  description?: string;
}

export interface PricingRule {
  id: string;
  courtId?: string | null;
  weekday?: number | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  validFrom: string;
  validTo?: string | null;
  isActive: boolean;
  priority: number;
}

export interface PricingDisplayRow {
  label: string;
  days: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
}

export interface CourtSchedule {
  id: string;
  courtId?: string | null;
  weekday: number;
  opensAt: string;
  closesAt: string;
  slotMinutes: number;
  isActive: boolean;
}

export interface CourtBlock {
  id: string;
  courtId?: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdById?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingSnapshot {
  ruleId: string;
  priceCents: number;
  depositAmountCents: number;
  currency: string;
  durationMinutes: number;
  appliedAt: string;
}

export interface Booking {
  id: string;
  code: string;
  courtId: string;
  courtName: string;
  customer: Customer;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: BookingStatus;
  source: BookingSource;
  /** Medio de pago elegido por el cliente (null en reservas cargadas por el staff). */
  paymentMethod?: BookingPaymentMethod | null;
  priceTotalCents: number;
  depositAmountCents: number;
  currency: string;
  paidAmountCents: number;
  pricingSnapshot: PricingSnapshot;
  notes?: string;
  expiresAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  bookingCode: string;
  provider: PaymentProvider;
  providerPaymentId?: string | null;
  providerPreferenceId?: string | null;
  method?: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  statusDetail?: string | null;
  requiresReview?: boolean;
  reviewReason?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  /** Datos de la reserva asociada para conciliación en el panel de pagos. */
  customerName?: string | null;
  bookingStatus?: BookingStatus | null;
  bookingPriceTotalCents?: number | null;
  bookingDepositAmountCents?: number | null;
  bookingPaidAmountCents?: number | null;
  /** Referencia declarada por el staff (nro. de operación de una transferencia). */
  reference?: string | null;
}

export interface AvailabilitySlot {
  courtId: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  priceTotalCents: number;
  depositAmountCents: number;
  currency: string;
  reason?: string;
}

export interface AvailabilityResponse {
  date: string;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

export interface BookingQuote {
  courtId: string;
  startsAt: string;
  durationMinutes: number;
  priceTotalCents: number;
  depositAmountCents: number;
  balanceCents: number;
  currency: string;
}

export interface CreateBookingRequest {
  courtId: string;
  startsAt: string;
  durationMinutes: number;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  notes?: string;
  /** Medio de pago elegido por el cliente (por defecto Mercado Pago). */
  paymentMethod?: BookingPaymentMethod;
  /** Nro. de operación/comprobante declarado por el cliente (transferencias). */
  transferReference?: string;
}

export interface CheckoutResponse {
  bookingCode: string;
  initPoint: string;
  sandboxInitPoint: string;
}

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface DashboardStats {
  date: string;
  bookingsToday: number;
  confirmedToday: number;
  pendingPayment: number;
  cancelledToday: number;
  paymentsRequiringReview: number;
  occupancyRate: number;
  /** Cobrado efectivamente hoy (pagos aprobados). */
  revenueTodayCents: number;
  /** Cobrado efectivamente en el mes corriente (pagos aprobados). */
  revenueMonthCents: number;
  /** Importe reservado/estimado hoy (reservas activas con seña definida). */
  reservedTodayCents: number;
  /** Señas pendientes hoy (reservas en PENDING_PAYMENT). */
  pendingDepositsCents: number;
  currency: string;
  upcoming: Booking[];
  occupiedByCourt: { courtId: string; courtName: string; occupiedMinutes: number; totalMinutes: number }[];
}

export interface ContactMessage {
  fullName: string;
  email: string;
  phone?: string;
  message: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  badge?: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
}

export type CameraIntegrationStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'ERROR';
export type SecurityCameraStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface SecurityCamera {
  id: string;
  name: string;
  location: string;
  courtName?: string | null;
  protocol: 'HLS' | 'WEBRTC';
  status: SecurityCameraStatus;
  lastCheckedAt?: string | null;
}

export interface CamerasOverview {
  status: CameraIntegrationStatus;
  cameras: SecurityCamera[];
  checkedAt: string;
}

export interface ReportCourtRow {
  courtId: string;
  courtName: string;
  bookings: number;
  /** Cobrado efectivamente (pagos aprobados) en el período. */
  collectedCents: number;
  /** Importe reservado (señas de reservas confirmadas/finalizadas) en el período. */
  reservedCents: number;
  occupiedMinutes: number;
  totalMinutes: number;
  occupancyRate: number;
}

export interface PaymentMethodRow {
  method: string;
  count: number;
  collectedCents: number;
}

export interface BookingReport {
  periodLabel: string;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShows: number;
  completedBookings: number;
  /** Cobrado efectivamente (pagos aprobados). */
  collectedCents: number;
  /** Importe reservado estimado (señas de reservas activas/finalizadas). */
  reservedCents: number;
  currency: string;
  byCourt: ReportCourtRow[];
  byPaymentMethod: PaymentMethodRow[];
}

export interface SettingsPayload {
  clubName: string;
  depositMode: 'percent' | 'fixed_amount';
  depositPercent: number;
  depositFixedAmountCents: number;
  bookingHoldMinutes: number;
  cancellationPolicy: string;
  /** Datos bancarios que se muestran al cliente que elige transferencia. */
  bankTransferAlias: string;
  bankTransferCbu: string;
  bankTransferAccountHolder: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
