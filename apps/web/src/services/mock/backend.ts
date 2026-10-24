import type {
  AuditLog,
  AvailabilityResponse,
  AvailabilitySlot,
  Booking,
  BookingPaymentMethod,
  BookingReport,
  CamerasOverview,
  CheckoutResponse,
  ClubInfo,
  ContactMessage,
  Court,
  CourtBlock,
  CourtSchedule,
  CreateBookingRequest,
  Customer,
  DashboardStats,
  Faq,
  GalleryImage,
  ManualPaymentMethod,
  Paginated,
  Payment,
  PaymentMethodRow,
  PricingDisplayRow,
  PricingRule,
  Promotion,
  ReportCourtRow,
  SessionUser,
  SettingsPayload,
  StaffUser,
} from '@padel/shared';
import {
  DEMO_CLUB,
  DEMO_FAQS,
  DEMO_GALLERY,
  DEMO_PROMOTIONS,
} from '@/config/site';
import {
  clubDateTimeToIso,
  minutesFromTime,
  minutesToTime,
  rangesOverlap,
  todayIso,
  weekdayOfDate,
} from '@/lib/datetime';
import { CLUB_TIMEZONE } from '@/lib/env';
import { formatInTimeZone } from 'date-fns-tz';
import { ApiError } from '@/lib/errors';
import { createInitialState, type MockState } from './seed';

const state: MockState = createInitialState();
const demoPasswords: Record<string, string> = {
  'admin@padelclub.example': 'admin123',
  'recepcion@padelclub.example': 'recepcion123',
};
const demoUserByEmail: Record<string, SessionUser> = {
  'admin@padelclub.example': {
    id: 'user-1',
    fullName: 'Administrador Demo',
    email: 'admin@padelclub.example',
    role: 'ADMIN',
  },
  'recepcion@padelclub.example': {
    id: 'user-2',
    fullName: 'Recepción Demo',
    email: 'recepcion@padelclub.example',
    role: 'RECEPTION',
  },
};

let currentUser: SessionUser | null = null;

function nextId(prefix: string): string {
  state.sequence += 1;
  return `${prefix}-${state.sequence}`;
}

function computeDeposit(priceCents: number): number {
  if (state.settings.depositMode === 'fixed_amount') {
    return Math.min(state.settings.depositFixedAmountCents, priceCents);
  }
  return Math.round((priceCents * state.settings.depositPercent) / 100);
}

function audit(action: string, entity: string, entityId?: string): void {
  state.auditLogs.unshift({
    id: nextId('audit'),
    actorName: currentUser?.fullName ?? 'Sistema',
    action,
    entity,
    entityId,
    createdAt: new Date().toISOString(),
  });
}

function activeBookings(): Booking[] {
  return state.bookings.filter(
    (b) => b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED',
  );
}

function isSlotBusy(courtId: string, startsAt: string, endsAt: string): boolean {
  const busyBooking = activeBookings().some(
    (b) => b.courtId === courtId && rangesOverlap(b.startsAt, b.endsAt, startsAt, endsAt),
  );
  if (busyBooking) return true;
  return state.blocks.some(
    (blk) =>
      (blk.courtId === null || blk.courtId === courtId) &&
      rangesOverlap(blk.startsAt, blk.endsAt, startsAt, endsAt),
  );
}

function resolvePriceRule(
  courtId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
): PricingRule | undefined {
  const weekday = weekdayOfDate(date);
  const startMin = minutesFromTime(startTime);
  const candidates = state.pricing.filter(
    (rule) =>
      rule.isActive &&
      (rule.courtId === null || rule.courtId === courtId) &&
      (rule.weekday === null || rule.weekday === weekday) &&
      rule.durationMinutes === durationMinutes &&
      startMin >= minutesFromTime(rule.startTime) &&
      startMin < minutesFromTime(rule.endTime),
  );
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const specificityA = (a.courtId ? 1 : 0) + (a.weekday !== null ? 1 : 0);
    const specificityB = (b.courtId ? 1 : 0) + (b.weekday !== null ? 1 : 0);
    return specificityB - specificityA;
  });
  return candidates[0];
}

function fallbackPrice(durationMinutes: number): number {
  const rule = state.pricing.find((r) => r.durationMinutes === durationMinutes && r.isActive);
  if (rule) return rule.priceCents;
  return Math.round((1000000 * durationMinutes) / 60 / 100) * 100;
}

function resolvePrice(
  courtId: string,
  date: string,
  startTime: string,
  durationMinutes: number,
): { priceCents: number; ruleId: string } {
  const rule = resolvePriceRule(courtId, date, startTime, durationMinutes);
  if (rule) return { priceCents: rule.priceCents, ruleId: rule.id };
  return { priceCents: fallbackPrice(durationMinutes), ruleId: 'fallback' };
}

function paginate<T>(items: T[], page = 1, pageSize = 10): Paginated<T> {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

function findBooking(code: string): Booking {
  const booking = state.bookings.find((b) => b.code.toLowerCase() === code.toLowerCase());
  if (!booking) {
    throw new ApiError('No encontramos una reserva con ese código.', 404, 'BOOKING_NOT_FOUND');
  }
  return booking;
}

/** Completa un pago con datos de la reserva asociada, igual que la API real. */
function enrichPayment(payment: Payment): Payment {
  const booking = state.bookings.find((b) => b.id === payment.bookingId);
  return {
    ...payment,
    customerName: booking?.customer.fullName,
    bookingPriceTotalCents: booking?.priceTotalCents,
    bookingDepositAmountCents: booking?.depositAmountCents,
    bookingPaidAmountCents: booking?.paidAmountCents,
    bookingStatus: booking?.status,
    reference: payment.provider === 'MANUAL' ? payment.statusDetail : null,
  };
}

function upsertCustomer(data: { fullName: string; email: string; phone: string }): Customer {
  const existing = state.customers.find(
    (c) => c.email.toLowerCase() === data.email.toLowerCase(),
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.fullName = data.fullName;
    existing.phone = data.phone;
    existing.updatedAt = now;
    return existing;
  }
  const customer: Customer = {
    id: nextId('customer'),
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
  state.customers.push(customer);
  return customer;
}

function buildBooking(
  req: {
    courtId: string;
    startsAt: string;
    durationMinutes: number;
    customer: { fullName: string; email: string; phone: string };
    notes?: string;
    source: Booking['source'];
    status: Booking['status'];
    paymentMethod?: BookingPaymentMethod | null;
    /** Retención del turno. Las reservas que administra el staff no vencen solas. */
    expiresAt?: string | null;
  },
): Booking {
  const court = state.courts.find((c) => c.id === req.courtId);
  if (!court) throw new ApiError('La cancha seleccionada no existe.', 404, 'COURT_NOT_FOUND');

  const endsAt = new Date(
    new Date(req.startsAt).getTime() + req.durationMinutes * 60_000,
  ).toISOString();

  if (isSlotBusy(req.courtId, req.startsAt, endsAt)) {
    throw new ApiError(
      'Ese horario ya no está disponible. Elegí otro turno.',
      409,
      'SLOT_TAKEN',
    );
  }

  const localDate = formatInTimeZone(new Date(req.startsAt), CLUB_TIMEZONE, 'yyyy-MM-dd');
  const startTime = formatInTimeZone(new Date(req.startsAt), CLUB_TIMEZONE, 'HH:mm');
  const { priceCents, ruleId } = resolvePrice(
    req.courtId,
    localDate,
    startTime,
    req.durationMinutes,
  );
  const depositAmountCents = computeDeposit(priceCents);
  const now = new Date().toISOString();
  const customer = upsertCustomer(req.customer);

  const booking: Booking = {
    id: nextId('booking'),
    code: `PC-${String(state.sequence).slice(-6)}`,
    courtId: court.id,
    courtName: court.name,
    customer,
    startsAt: req.startsAt,
    endsAt,
    durationMinutes: req.durationMinutes,
    status: req.status,
    source: req.source,
    paymentMethod: req.paymentMethod ?? null,
    priceTotalCents: priceCents,
    depositAmountCents,
    currency: 'ARS',
    paidAmountCents: 0,
    pricingSnapshot: {
      ruleId,
      priceCents,
      depositAmountCents,
      currency: 'ARS',
      durationMinutes: req.durationMinutes,
      appliedAt: now,
    },
    notes: req.notes ?? '',
    // Efectivo/transferencia: el turno queda retenido hasta que el staff confirme, sin vencimiento.
    expiresAt:
      req.expiresAt !== undefined
        ? req.expiresAt
        : req.status === 'PENDING_PAYMENT' &&
            req.paymentMethod !== 'CASH' &&
            req.paymentMethod !== 'TRANSFER'
          ? new Date(Date.now() + state.settings.bookingHoldMinutes * 60_000).toISOString()
          : null,
    confirmedAt: req.status === 'CONFIRMED' ? now : null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  };

  state.bookings.push(booking);
  return booking;
}

export const mockBackend = {
  // ---------- Público ----------
  async getClubInfo(): Promise<ClubInfo> {
    return { ...DEMO_CLUB, ...state.settings, name: state.settings.clubName };
  },

  async getCourts(options?: { activeOnly?: boolean }): Promise<Court[]> {
    const courts = [...state.courts].sort((a, b) => a.sortOrder - b.sortOrder);
    return options?.activeOnly ? courts.filter((c) => c.status === 'ACTIVE') : courts;
  },

  async getPricingDisplay(): Promise<PricingDisplayRow[]> {
    const rows: [string, string, number][] = [
      ['Mañana', 'Lunes a viernes', 800000],
      ['Tarde', 'Lunes a viernes', 1000000],
      ['Noche', 'Lunes a viernes', 1200000],
      ['Fin de semana', 'Sábados y domingos', 1100000],
    ];
    return rows.map(([label, days, hourly]) => ({
      label,
      days,
      durationMinutes: 60,
      priceCents: hourly,
      currency: 'ARS',
    }));
  },

  async getAvailability(
    date: string,
    durationMinutes: number,
    courtId?: string,
  ): Promise<AvailabilityResponse> {
    const slots: AvailabilitySlot[] = [];
    const weekday = weekdayOfDate(date);
    const nowIso = new Date().toISOString();

    const courts = state.courts.filter(
      (c) => c.status === 'ACTIVE' && (!courtId || c.id === courtId),
    );

    for (const court of courts) {
      const schedule = state.schedule.find(
        (s) =>
          s.isActive &&
          (s.courtId === null || s.courtId === court.id) &&
          s.weekday === weekday,
      );
      if (!schedule) continue;

      const open = minutesFromTime(schedule.opensAt);
      const close = minutesFromTime(schedule.closesAt);
      for (let start = open; start + durationMinutes <= close; start += schedule.slotMinutes) {
        const startTime = minutesToTime(start);
        const startsAt = clubDateTimeToIso(date, startTime);
        const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60_000).toISOString();
        const inPast = startsAt < nowIso;
        const busy = !inPast && isSlotBusy(court.id, startsAt, endsAt);
        const { priceCents } = resolvePrice(court.id, date, startTime, durationMinutes);
        slots.push({
          courtId: court.id,
          startsAt,
          endsAt,
          available: !inPast && !busy,
          priceTotalCents: priceCents,
          depositAmountCents: computeDeposit(priceCents),
          currency: 'ARS',
          reason: inPast ? 'past' : busy ? 'taken' : undefined,
        });
      }
    }

    return { date, durationMinutes, slots };
  },

  async getFaqs(): Promise<Faq[]> {
    return DEMO_FAQS;
  },

  async getGallery(): Promise<GalleryImage[]> {
    return [...DEMO_GALLERY].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getPromotions(): Promise<Promotion[]> {
    return DEMO_PROMOTIONS.filter((p) => p.isActive);
  },

  async sendContact(_message: ContactMessage): Promise<{ ok: true }> {
    void _message;
    return { ok: true };
  },

  async createBooking(req: CreateBookingRequest): Promise<Booking> {
    const court = state.courts.find((c) => c.id === req.courtId);
    if (!court || court.status !== 'ACTIVE') {
      throw new ApiError('La cancha seleccionada no está disponible.', 400, 'COURT_UNAVAILABLE');
    }
    const paymentMethod = req.paymentMethod ?? 'MERCADOPAGO';
    const booking = buildBooking({
      ...req,
      source: 'ONLINE',
      status: 'PENDING_PAYMENT',
      paymentMethod,
    });
    // Efectivo/transferencia: se registra el pago declarado como pendiente de revisión.
    if (paymentMethod === 'CASH' || paymentMethod === 'TRANSFER') {
      const now = new Date().toISOString();
      const reference = req.transferReference?.trim();
      state.payments.unshift({
        id: nextId('payment'),
        bookingId: booking.id,
        bookingCode: booking.code,
        provider: 'MANUAL',
        providerPaymentId: null,
        providerPreferenceId: null,
        method: paymentMethod,
        amountCents: booking.depositAmountCents,
        currency: 'ARS',
        status: 'PENDING',
        statusDetail: paymentMethod === 'TRANSFER' ? reference ?? null : null,
        requiresReview: true,
        reviewReason:
          paymentMethod === 'TRANSFER'
            ? 'Transferencia declarada por el cliente: verificar la acreditación.'
            : 'Pago en efectivo declarado por el cliente: confirmar al cobrar en el club.',
        paidAt: null,
        refundedAt: null,
        createdAt: now,
      });
    }
    audit('booking.create', 'Booking', booking.id);
    return booking;
  },

  async getBooking(code: string, email?: string): Promise<Booking> {
    const booking = findBooking(code);
    if (email && booking.customer.email.toLowerCase() !== email.toLowerCase()) {
      throw new ApiError(
        'Los datos no coinciden con la reserva.',
        403,
        'BOOKING_FORBIDDEN',
      );
    }
    return booking;
  },

  async createCheckout(code: string, email: string): Promise<CheckoutResponse> {
    findBooking(code);
    void email;
    throw new ApiError(
      'El pago con Mercado Pago estará disponible al conectar el backend. En modo demostración no se procesan pagos reales.',
      503,
      'MOCK_PAYMENT_UNAVAILABLE',
    );
  },

  // ---------- Autenticación ----------
  async login(email: string, password: string): Promise<SessionUser> {
    const normalized = email.toLowerCase();
    const user = demoUserByEmail[normalized];
    if (!user || demoPasswords[normalized] !== password) {
      throw new ApiError('Credenciales inválidas.', 401, 'INVALID_CREDENTIALS');
    }
    currentUser = user;
    const staff = state.users.find((u) => u.id === user.id);
    if (staff) staff.lastLoginAt = new Date().toISOString();
    return user;
  },

  async logout(): Promise<void> {
    currentUser = null;
  },

  async me(): Promise<SessionUser | null> {
    return currentUser;
  },

  // ---------- Panel ----------
  requireAuth(): SessionUser {
    if (!currentUser) {
      throw new ApiError('Sesión no válida o expirada.', 401, 'UNAUTHENTICATED');
    }
    return currentUser;
  },

  requireAdmin(): SessionUser {
    const user = mockBackend.requireAuth();
    if (user.role !== 'ADMIN') {
      throw new ApiError('No tenés permisos para esta acción.', 403, 'FORBIDDEN');
    }
    return user;
  },

  async getDashboard(): Promise<DashboardStats> {
    mockBackend.requireAuth();
    const today = todayIso();
    const bookingsTodayAll = state.bookings.filter((b) => b.startsAt.slice(0, 10) === today);
    const bookingsToday = bookingsTodayAll.filter((b) => b.status !== 'CANCELLED');
    const confirmedToday = bookingsToday.filter((b) => b.status === 'CONFIRMED');
    const pendingPayment = state.bookings.filter((b) => b.status === 'PENDING_PAYMENT').length;
    const cancelledToday = bookingsTodayAll.filter((b) => b.status === 'CANCELLED').length;
    const paymentsRequiringReview = state.payments.filter((p) => p.requiresReview).length;
    const totalMinutesToday = state.courts.length * 15 * 60;
    const occupiedMinutes = bookingsToday.reduce((acc, b) => acc + b.durationMinutes, 0);
    const revenueTodayCents = state.payments
      .filter((p) => p.paidAt?.slice(0, 10) === today && p.status === 'APPROVED')
      .reduce((acc, p) => acc + p.amountCents, 0);
    const monthPrefix = today.slice(0, 7);
    const revenueMonthCents = state.payments
      .filter((p) => p.paidAt?.slice(0, 7) === monthPrefix && p.status === 'APPROVED')
      .reduce((acc, p) => acc + p.amountCents, 0);
    const reservedTodayCents = bookingsToday
      .filter((b) => b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED')
      .reduce((acc, b) => acc + b.priceTotalCents, 0);
    const pendingDepositsCents = bookingsToday
      .filter((b) => b.status === 'PENDING_PAYMENT')
      .reduce((acc, b) => acc + b.depositAmountCents, 0);

    return {
      date: today,
      bookingsToday: bookingsToday.length,
      confirmedToday: confirmedToday.length,
      pendingPayment,
      cancelledToday,
      paymentsRequiringReview,
      occupancyRate: totalMinutesToday === 0 ? 0 : occupiedMinutes / totalMinutesToday,
      revenueTodayCents,
      revenueMonthCents,
      reservedTodayCents,
      pendingDepositsCents,
      currency: 'ARS',
      upcoming: [...activeBookings()]
        .filter((b) => b.startsAt >= new Date().toISOString())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, 6),
      occupiedByCourt: state.courts.map((court) => {
        const minutes = bookingsToday
          .filter((b) => b.courtId === court.id)
          .reduce((acc, b) => acc + b.durationMinutes, 0);
        return {
          courtId: court.id,
          courtName: court.name,
          occupiedMinutes: minutes,
          totalMinutes: 15 * 60,
        };
      }),
    };
  },

  async getCameras(): Promise<CamerasOverview> {
    mockBackend.requireAdmin();
    return {
      status: 'NOT_CONFIGURED',
      cameras: [],
      checkedAt: new Date().toISOString(),
    };
  },

  // ---------- Canchas ----------
  async listCourts(): Promise<Court[]> {
    mockBackend.requireAuth();
    return [...state.courts].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createCourt(data: Omit<Court, 'id' | 'sortOrder'>): Promise<Court> {
    mockBackend.requireAdmin();
    const court: Court = {
      ...data,
      id: nextId('court'),
      sortOrder: state.courts.length + 1,
    };
    state.courts.push(court);
    audit('court.create', 'Court', court.id);
    return court;
  },

  async updateCourt(id: string, data: Partial<Court>): Promise<Court> {
    mockBackend.requireAdmin();
    const court = state.courts.find((c) => c.id === id);
    if (!court) throw new ApiError('Cancha no encontrada.', 404, 'COURT_NOT_FOUND');
    Object.assign(court, data, { id: court.id });
    audit('court.update', 'Court', court.id);
    return court;
  },

  async deleteCourt(id: string): Promise<void> {
    mockBackend.requireAdmin();
    const index = state.courts.findIndex((c) => c.id === id);
    if (index === -1) throw new ApiError('Cancha no encontrada.', 404, 'COURT_NOT_FOUND');
    state.courts.splice(index, 1);
    audit('court.delete', 'Court', id);
  },

  // ---------- Horarios ----------
  async getSchedule(): Promise<CourtSchedule[]> {
    mockBackend.requireAuth();
    return [...state.schedule].sort((a, b) => a.weekday - b.weekday);
  },

  async updateSchedule(schedule: CourtSchedule[]): Promise<CourtSchedule[]> {
    mockBackend.requireAdmin();
    state.schedule = schedule;
    audit('schedule.update', 'CourtSchedule');
    return schedule;
  },

  // ---------- Precios ----------
  async listPricing(): Promise<PricingRule[]> {
    mockBackend.requireAuth();
    return [...state.pricing];
  },

  async createPricing(data: Omit<PricingRule, 'id'>): Promise<PricingRule> {
    mockBackend.requireAdmin();
    const rule: PricingRule = { ...data, id: nextId('price') };
    state.pricing.push(rule);
    audit('pricing.create', 'PricingRule', rule.id);
    return rule;
  },

  async updatePricing(id: string, data: Partial<PricingRule>): Promise<PricingRule> {
    mockBackend.requireAdmin();
    const rule = state.pricing.find((r) => r.id === id);
    if (!rule) throw new ApiError('Tarifa no encontrada.', 404, 'PRICING_NOT_FOUND');
    Object.assign(rule, data, { id: rule.id });
    audit('pricing.update', 'PricingRule', rule.id);
    return rule;
  },

  async deletePricing(id: string): Promise<void> {
    mockBackend.requireAdmin();
    const index = state.pricing.findIndex((r) => r.id === id);
    if (index === -1) throw new ApiError('Tarifa no encontrada.', 404, 'PRICING_NOT_FOUND');
    state.pricing.splice(index, 1);
    audit('pricing.delete', 'PricingRule', id);
  },

  // ---------- Bloqueos ----------
  async listBlocks(): Promise<CourtBlock[]> {
    mockBackend.requireAuth();
    return [...state.blocks].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },

  async createBlock(data: {
    courtId?: string | null;
    startsAt: string;
    endsAt: string;
    reason: string;
  }): Promise<CourtBlock> {
    mockBackend.requireAuth();
    const block: CourtBlock = {
      id: nextId('block'),
      courtId: data.courtId ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      reason: data.reason,
      createdById: currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    state.blocks.push(block);
    audit('block.create', 'CourtBlock', block.id);
    return block;
  },

  async deleteBlock(id: string): Promise<void> {
    mockBackend.requireAuth();
    const index = state.blocks.findIndex((b) => b.id === id);
    if (index === -1) throw new ApiError('Bloqueo no encontrado.', 404, 'BLOCK_NOT_FOUND');
    state.blocks.splice(index, 1);
    audit('block.delete', 'CourtBlock', id);
  },

  // ---------- Reservas ----------
  async listBookings(filters?: {
    from?: string;
    to?: string;
    courtId?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<Booking>> {
    mockBackend.requireAuth();
    let items = [...state.bookings].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    if (filters?.from) items = items.filter((b) => b.startsAt.slice(0, 10) >= filters.from!);
    if (filters?.to) items = items.filter((b) => b.startsAt.slice(0, 10) <= filters.to!);
    if (filters?.courtId) items = items.filter((b) => b.courtId === filters.courtId);
    if (filters?.status) items = items.filter((b) => b.status === filters.status);
    if (filters?.paymentMethod) {
      items = items.filter((b) => b.paymentMethod === filters.paymentMethod);
    }
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      items = items.filter(
        (b) =>
          b.code.toLowerCase().includes(term) ||
          b.customer.fullName.toLowerCase().includes(term) ||
          b.customer.email.toLowerCase().includes(term),
      );
    }
    return paginate(items, filters?.page, filters?.pageSize ?? 12);
  },

  async createManualBooking(data: {
    courtId: string;
    startsAt: string;
    durationMinutes: number;
    customer: { fullName: string; email: string; phone: string };
    notes?: string;
    paymentMethod?: BookingPaymentMethod | null;
    status?: 'CONFIRMED' | 'PENDING_PAYMENT';
  }): Promise<Booking> {
    mockBackend.requireAuth();
    // Misma regla que el backend real: valida cancha, horario y solapamiento antes de crear.
    const booking = buildBooking({
      courtId: data.courtId,
      startsAt: data.startsAt,
      durationMinutes: data.durationMinutes,
      customer: data.customer,
      notes: data.notes,
      source: 'ADMIN',
      status: data.status === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : 'CONFIRMED',
      paymentMethod: data.paymentMethod ?? null,
      // El turno lo administra el staff: sin vencimiento automático.
      expiresAt: null,
    });
    audit('booking.create.manual', 'Booking', booking.id);
    return booking;
  },

  async cancelBooking(id: string, reason: string): Promise<Booking> {
    mockBackend.requireAuth();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new ApiError('Reserva no encontrada.', 404, 'BOOKING_NOT_FOUND');
    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date().toISOString();
    booking.cancellationReason = reason;
    booking.updatedAt = new Date().toISOString();
    audit('booking.cancel', 'Booking', id);
    return booking;
  },

  async markNoShow(id: string): Promise<Booking> {
    mockBackend.requireAuth();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new ApiError('Reserva no encontrada.', 404, 'BOOKING_NOT_FOUND');
    booking.status = 'NO_SHOW';
    booking.updatedAt = new Date().toISOString();
    audit('booking.no_show', 'Booking', id);
    return booking;
  },

  async completeBooking(id: string): Promise<Booking> {
    mockBackend.requireAuth();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new ApiError('Reserva no encontrada.', 404, 'BOOKING_NOT_FOUND');
    booking.status = 'COMPLETED';
    booking.updatedAt = new Date().toISOString();
    audit('booking.complete', 'Booking', id);
    return booking;
  },

  /** Confirma una reserva que estaba pendiente de pago (misma transición que la API real). */
  async confirmBooking(id: string): Promise<Booking> {
    mockBackend.requireAuth();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new ApiError('Reserva no encontrada.', 404, 'BOOKING_NOT_FOUND');
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new ApiError(
        `No se puede pasar una reserva de "${booking.status}" a "CONFIRMED".`,
        422,
        'INVALID_TRANSITION',
      );
    }
    const now = new Date().toISOString();
    booking.status = 'CONFIRMED';
    booking.confirmedAt = now;
    booking.expiresAt = null;
    booking.updatedAt = now;
    audit('booking.update', 'Booking', id);
    return booking;
  },

  async updateBookingNotes(id: string, notes: string): Promise<Booking> {
    mockBackend.requireAuth();
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking) throw new ApiError('Reserva no encontrada.', 404, 'BOOKING_NOT_FOUND');
    booking.notes = notes.trim().length > 0 ? notes.trim() : '';
    booking.updatedAt = new Date().toISOString();
    audit('booking.update', 'Booking', id);
    return booking;
  },

  // ---------- Clientes ----------
  async listCustomers(search?: string): Promise<Customer[]> {
    mockBackend.requireAuth();
    let items = [...state.customers].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (search) {
      const term = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.fullName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.includes(term),
      );
    }
    return items;
  },

  async getCustomer(id: string): Promise<{ customer: Customer; bookings: Booking[] }> {
    mockBackend.requireAuth();
    const customer = state.customers.find((c) => c.id === id);
    if (!customer) throw new ApiError('Cliente no encontrado.', 404, 'CUSTOMER_NOT_FOUND');
    const bookings = state.bookings
      .filter((b) => b.customer.id === customer.id)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return { customer, bookings };
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    mockBackend.requireAuth();
    const customer = state.customers.find((c) => c.id === id);
    if (!customer) throw new ApiError('Cliente no encontrado.', 404, 'CUSTOMER_NOT_FOUND');
    Object.assign(customer, data, { id: customer.id, updatedAt: new Date().toISOString() });
    audit('customer.update', 'Customer', id);
    return customer;
  },

  // ---------- Pagos ----------
  async listPayments(filters?: {
    status?: string;
    provider?: string;
    needsReview?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<Payment>> {
    mockBackend.requireAuth();
    let items = [...state.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filters?.status) items = items.filter((p) => p.status === filters.status);
    if (filters?.provider) items = items.filter((p) => p.provider === filters.provider);
    if (filters?.needsReview !== undefined) {
      items = items.filter((p) => Boolean(p.requiresReview) === filters.needsReview);
    }
    return paginate(items.map(enrichPayment), filters?.page, filters?.pageSize ?? 12);
  },

  async confirmManualPayment(id: string): Promise<Payment> {
    mockBackend.requireAuth();
    const payment = state.payments.find((p) => p.id === id);
    if (!payment) throw new ApiError('Pago no encontrado.', 404, 'PAYMENT_NOT_FOUND');
    if (payment.provider !== 'MANUAL') {
      throw new ApiError(
        'Sólo los pagos manuales requieren confirmación.',
        422,
        'PAYMENT_NOT_MANUAL',
      );
    }
    if (payment.status !== 'PENDING') {
      throw new ApiError('El pago no está pendiente de confirmación.', 422, 'PAYMENT_NOT_PENDING');
    }
    const now = new Date().toISOString();
    payment.status = 'APPROVED';
    payment.paidAt = now;
    payment.requiresReview = false;
    const booking = state.bookings.find((b) => b.id === payment.bookingId);
    if (booking) {
      booking.paidAmountCents = Math.min(
        booking.priceTotalCents,
        booking.paidAmountCents + payment.amountCents,
      );
      if (
        booking.status === 'PENDING_PAYMENT' &&
        booking.paidAmountCents >= booking.depositAmountCents
      ) {
        booking.status = 'CONFIRMED';
        booking.confirmedAt = now;
        booking.expiresAt = null;
      }
      booking.updatedAt = now;
    }
    audit('payment.confirm', 'Payment', id);
    return enrichPayment(payment);
  },

  async rejectManualPayment(id: string, reason?: string): Promise<Payment> {
    mockBackend.requireAuth();
    const payment = state.payments.find((p) => p.id === id);
    if (!payment) throw new ApiError('Pago no encontrado.', 404, 'PAYMENT_NOT_FOUND');
    if (payment.provider !== 'MANUAL') {
      throw new ApiError('Sólo los pagos manuales pueden rechazarse.', 422, 'PAYMENT_NOT_MANUAL');
    }
    if (payment.status !== 'PENDING') {
      throw new ApiError('El pago no está pendiente de confirmación.', 422, 'PAYMENT_NOT_PENDING');
    }
    payment.status = 'REJECTED';
    payment.requiresReview = false;
    payment.reviewReason = reason?.trim() || 'Pago rechazado por el administrador.';
    audit('payment.reject', 'Payment', id);
    return enrichPayment(payment);
  },

  async refundPayment(id: string): Promise<Payment> {
    mockBackend.requireAdmin();
    const payment = state.payments.find((p) => p.id === id);
    if (!payment) throw new ApiError('Pago no encontrado.', 404, 'PAYMENT_NOT_FOUND');
    payment.status = 'REFUNDED';
    payment.refundedAt = new Date().toISOString();
    audit('payment.refund', 'Payment', id);
    return enrichPayment(payment);
  },

  async registerManualPayment(data: {
    bookingId: string;
    amountCents: number;
    method: ManualPaymentMethod;
    reference?: string;
    note?: string;
  }): Promise<Payment> {
    mockBackend.requireAuth();
    const booking = state.bookings.find((b) => b.id === data.bookingId);
    if (!booking) throw new ApiError('Reserva no encontrada.', 404, 'BOOKING_NOT_FOUND');
    if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
      throw new ApiError(
        'No se puede registrar un pago sobre una reserva cancelada o vencida.',
        422,
        'BOOKING_NOT_PAYABLE',
      );
    }
    const now = new Date().toISOString();
    const detail =
      [data.reference?.trim(), data.note?.trim()].filter(Boolean).join(' · ') || null;
    const payment: Payment = {
      id: nextId('payment'),
      bookingId: booking.id,
      bookingCode: booking.code,
      provider: 'MANUAL',
      providerPaymentId: null,
      providerPreferenceId: null,
      method: data.method,
      amountCents: data.amountCents,
      currency: 'ARS',
      status: 'APPROVED',
      statusDetail: detail,
      paidAt: now,
      refundedAt: null,
      createdAt: now,
    };
    state.payments.push(payment);
    booking.paidAmountCents = Math.min(
      booking.priceTotalCents,
      booking.paidAmountCents + data.amountCents,
    );
    if (
      booking.status === 'PENDING_PAYMENT' &&
      booking.paidAmountCents >= booking.depositAmountCents
    ) {
      booking.status = 'CONFIRMED';
      booking.confirmedAt = now;
      booking.expiresAt = null;
    }
    booking.updatedAt = now;
    audit('payment.manual', 'Payment', payment.id);
    return enrichPayment(payment);
  },

  // ---------- Reportes ----------
  async getBookingReport(from: string, to: string): Promise<BookingReport> {
    mockBackend.requireAdmin();
    const items = state.bookings.filter(
      (b) => b.startsAt.slice(0, 10) >= from && b.startsAt.slice(0, 10) <= to,
    );
    const approvedPayments = state.payments.filter((p) => {
      if (p.status !== 'APPROVED' || !p.paidAt) return false;
      const paidDay = p.paidAt.slice(0, 10);
      return paidDay >= from && paidDay <= to;
    });

    const days = Math.max(
      1,
      Math.round(
        (new Date(`${to}T00:00:00.000Z`).getTime() -
          new Date(`${from}T00:00:00.000Z`).getTime()) /
          86_400_000,
      ) + 1,
    );
    const totalMinutesPerCourt = days * 15 * 60;

    const byCourt: ReportCourtRow[] = state.courts.map((court) => {
      const courtBookings = items.filter((b) => b.courtId === court.id);
      const occupiedMinutes = courtBookings
        .filter((b) => b.status !== 'CANCELLED')
        .reduce((acc, b) => acc + b.durationMinutes, 0);
      const reservedCents = courtBookings
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        .reduce((acc, b) => acc + b.depositAmountCents, 0);
      const collectedCents = approvedPayments
        .filter((p) => courtBookings.some((b) => b.id === p.bookingId))
        .reduce((acc, p) => acc + p.amountCents, 0);
      return {
        courtId: court.id,
        courtName: court.name,
        bookings: courtBookings.length,
        collectedCents,
        reservedCents,
        occupiedMinutes,
        totalMinutes: totalMinutesPerCourt,
        occupancyRate: totalMinutesPerCourt === 0 ? 0 : Math.min(1, occupiedMinutes / totalMinutesPerCourt),
      };
    });

    const methodMap = new Map<string, PaymentMethodRow>();
    for (const payment of approvedPayments) {
      const key = payment.method ?? 'Sin especificar';
      const row = methodMap.get(key) ?? { method: key, count: 0, collectedCents: 0 };
      row.count += 1;
      row.collectedCents += payment.amountCents;
      methodMap.set(key, row);
    }

    return {
      periodLabel: `${from} — ${to}`,
      totalBookings: items.length,
      confirmedBookings: items.filter((b) => b.status === 'CONFIRMED').length,
      cancelledBookings: items.filter((b) => b.status === 'CANCELLED').length,
      noShows: items.filter((b) => b.status === 'NO_SHOW').length,
      completedBookings: items.filter((b) => b.status === 'COMPLETED').length,
      collectedCents: byCourt.reduce((acc, c) => acc + c.collectedCents, 0),
      reservedCents: byCourt.reduce((acc, c) => acc + c.reservedCents, 0),
      currency: 'ARS',
      byCourt,
      byPaymentMethod: [...methodMap.values()].sort(
        (a, b) => b.collectedCents - a.collectedCents,
      ),
    };
  },

  // ---------- Usuarios ----------
  async listUsers(): Promise<StaffUser[]> {
    mockBackend.requireAdmin();
    return [...state.users];
  },

  async createUser(data: {
    fullName: string;
    email: string;
    role: StaffUser['role'];
    password: string;
  }): Promise<StaffUser> {
    mockBackend.requireAdmin();
    if (state.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new ApiError('Ya existe un usuario con ese email.', 409, 'EMAIL_TAKEN');
    }
    const user: StaffUser = {
      id: nextId('user'),
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };
    state.users.push(user);
    demoPasswords[data.email.toLowerCase()] = data.password;
    demoUserByEmail[data.email.toLowerCase()] = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
    audit('user.create', 'User', user.id);
    return user;
  },

  async updateUser(id: string, data: Partial<StaffUser>): Promise<StaffUser> {
    mockBackend.requireAdmin();
    const user = state.users.find((u) => u.id === id);
    if (!user) throw new ApiError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
    Object.assign(user, data, { id: user.id });
    audit('user.update', 'User', id);
    return user;
  },

  // ---------- Configuración y auditoría ----------
  async getSettings(): Promise<SettingsPayload> {
    mockBackend.requireAdmin();
    return { ...state.settings };
  },

  async updateSettings(data: SettingsPayload): Promise<SettingsPayload> {
    mockBackend.requireAdmin();
    state.settings = { ...state.settings, ...data };
    audit('settings.update', 'Setting');
    return { ...state.settings };
  },

  async listAuditLogs(): Promise<AuditLog[]> {
    mockBackend.requireAdmin();
    return [...state.auditLogs].slice(0, 100);
  },
};
