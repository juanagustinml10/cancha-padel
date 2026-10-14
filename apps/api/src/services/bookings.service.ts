import { Prisma } from '@prisma/client';
import {
  ACTIVE_BOOKING_STATUSES,
  BookingPaymentMethod,
  BookingStatus,
  type Booking,
  type Paginated,
} from '@padel/shared';
import { conflict, notFound, unprocessable } from '@/domain/errors';
import { assertTransition } from '@/domain/booking-status';
import { computeDeposit, resolvePrice, type PricingRuleInput } from '@/domain/pricing';
import {
  addMinutes,
  clubDateKey,
  clubLocalToUtc,
  clubTimeKey,
  clubWeekdayOfDate,
  minutesFromTime,
} from '@/domain/time';
import { prisma } from '@/infra/prisma';
import { generateBookingCode } from '@/utils/id';
import { serializeBooking } from '@/utils/serialize';
import { getClubSettings } from './settings.service';

const COURT_LOCK_NAMESPACE = 4242;
const MAX_CODE_ATTEMPTS = 5;

const bookingInclude = { court: true, customer: true } satisfies Prisma.BookingInclude;

export interface BookingCustomerInput {
  fullName: string;
  email: string;
  phone: string;
}

export interface CreateBookingInput {
  courtId: string;
  startsAt: string;
  durationMinutes: number;
  customer: BookingCustomerInput;
  notes?: string;
  /** Medio de pago elegido por el cliente (por defecto Mercado Pago). */
  paymentMethod?: BookingPaymentMethod;
  /** Nro. de operación/comprobante declarado por el cliente (transferencias). */
  transferReference?: string;
}

/** Medios que no se cobran online: la reserva queda retenida y pendiente de confirmación. */
function isOfflinePayment(method: BookingPaymentMethod): boolean {
  return method === BookingPaymentMethod.CASH || method === BookingPaymentMethod.TRANSFER;
}

export interface ActorContext {
  userId?: string | null;
  ip?: string;
  userAgent?: string;
}

export interface BookingFilters {
  from?: string;
  to?: string;
  courtId?: string;
  status?: string;
  /** Filtra por medio de pago elegido (efectivo, transferencia o Mercado Pago). */
  paymentMethod?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Toma un lock de transacción por cancha para serializar altas concurrentes. */
async function lockCourt(tx: Prisma.TransactionClient, courtId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${COURT_LOCK_NAMESPACE}::int, hashtext(${courtId})::int)`;
}

function isOverlapError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Booking_no_overlap') ||
    message.includes('23P01') ||
    message.toLowerCase().includes('exclusion')
  );
}

function isUniqueCodeError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function assertSlotFree(
  tx: Prisma.TransactionClient,
  courtId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  const [booking, block] = await Promise.all([
    tx.booking.findFirst({
      where: {
        courtId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
    tx.courtBlock.findFirst({
      where: {
        OR: [{ courtId: null }, { courtId }],
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
  ]);

  if (booking || block) {
    throw conflict('Ese horario ya no está disponible. Elegí otro turno.', 'SLOT_TAKEN');
  }
}

interface SlotContext {
  courtId: string;
  weekday: number;
  dateKey: string;
  startTime: string;
  durationMinutes: number;
  startsAt: Date;
  endsAt: Date;
}

async function resolveSlotContext(
  courtId: string,
  startsAtIso: string,
  durationMinutes: number,
  options: { requireFuture: boolean },
): Promise<SlotContext> {
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    throw unprocessable('La fecha y hora de inicio no es válida.', 'INVALID_START');
  }

  if (options.requireFuture && startsAt.getTime() <= Date.now()) {
    throw unprocessable('No podés reservar en un horario pasado.', 'PAST_SLOT');
  }

  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court) throw notFound('La cancha seleccionada no existe.', 'COURT_NOT_FOUND');
  if (options.requireFuture && court.status !== 'ACTIVE') {
    throw unprocessable('La cancha seleccionada no está disponible.', 'COURT_UNAVAILABLE');
  }

  const dateKey = clubDateKey(startsAt);
  const startTime = clubTimeKey(startsAt);
  const weekday = clubWeekdayOfDate(dateKey);
  const endsAt = addMinutes(startsAt, durationMinutes);

  const schedules = await prisma.courtSchedule.findMany({ where: { isActive: true, weekday } });
  const schedule = schedules
    .filter((item) => item.courtId === null || item.courtId === courtId)
    .sort((a, b) => (a.courtId ? 0 : 1) - (b.courtId ? 0 : 1))[0];

  if (!schedule) {
    throw unprocessable('El complejo permanece cerrado ese día.', 'CLOSED_DAY');
  }

  const startMinutes = minutesFromTime(startTime);
  const endMinutes = startMinutes + durationMinutes;
  if (startMinutes < minutesFromTime(schedule.opensAt) || endMinutes > minutesFromTime(schedule.closesAt)) {
    throw unprocessable('El horario está fuera del horario de atención.', 'OUTSIDE_HOURS');
  }

  return { courtId, weekday, dateKey, startTime, durationMinutes, startsAt, endsAt };
}

async function upsertCustomer(
  tx: Prisma.TransactionClient,
  customer: BookingCustomerInput,
): Promise<string> {
  const email = customer.email.trim().toLowerCase();
  const existing = await tx.customer.findUnique({ where: { email } });
  if (existing) {
    const updated = await tx.customer.update({
      where: { id: existing.id },
      data: { fullName: customer.fullName, phone: customer.phone },
    });
    return updated.id;
  }
  const created = await tx.customer.create({
    data: { fullName: customer.fullName, email, phone: customer.phone },
  });
  return created.id;
}

interface PricingResolution {
  priceCents: number;
  depositAmountCents: number;
  currency: string;
  ruleId: string;
  snapshot: Prisma.InputJsonValue;
}

async function resolveBookingPricing(context: SlotContext): Promise<PricingResolution> {
  const [rules, settings] = await Promise.all([
    prisma.pricingRule.findMany({ where: { isActive: true } }),
    getClubSettings(),
  ]);

  const inputs: PricingRuleInput[] = rules.map((rule) => ({
    id: rule.id,
    courtId: rule.courtId,
    weekday: rule.weekday,
    startTime: rule.startTime,
    endTime: rule.endTime,
    durationMinutes: rule.durationMinutes,
    priceCents: rule.priceCents,
    currency: rule.currency,
    isActive: rule.isActive,
    priority: rule.priority,
  }));

  const resolved = resolvePrice(inputs, {
    courtId: context.courtId,
    weekday: context.weekday,
    startTime: context.startTime,
    durationMinutes: context.durationMinutes,
  });

  const depositAmountCents = computeDeposit(resolved.priceCents, settings);

  return {
    priceCents: resolved.priceCents,
    depositAmountCents,
    currency: resolved.currency,
    ruleId: resolved.ruleId,
    snapshot: {
      ruleId: resolved.ruleId,
      priceCents: resolved.priceCents,
      depositAmountCents,
      currency: resolved.currency,
      durationMinutes: context.durationMinutes,
      appliedAt: new Date().toISOString(),
    },
  };
}

async function createBookingRow(
  tx: Prisma.TransactionClient,
  data: {
    courtId: string;
    customerId: string;
    context: SlotContext;
    pricing: PricingResolution;
    status: BookingStatus;
    source: Booking['source'];
    paymentMethod: BookingPaymentMethod | null;
    notes?: string;
    expiresAt: Date | null;
    confirmedAt: Date | null;
    createdById: string | null;
  },
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateBookingCode();
    try {
      const booking = await tx.booking.create({
        data: {
          code,
          courtId: data.courtId,
          customerId: data.customerId,
          pricingRuleId: data.pricing.ruleId !== 'fallback' ? data.pricing.ruleId : null,
          startsAt: data.context.startsAt,
          endsAt: data.context.endsAt,
          durationMinutes: data.context.durationMinutes,
          status: data.status,
          source: data.source,
          paymentMethod: data.paymentMethod,
          priceTotalCents: data.pricing.priceCents,
          depositAmountCents: data.pricing.depositAmountCents,
          currency: data.pricing.currency,
          pricingSnapshot: data.pricing.snapshot,
          notes: data.notes ?? null,
          expiresAt: data.expiresAt,
          confirmedAt: data.confirmedAt,
          createdById: data.createdById,
        },
        select: { id: true },
      });
      return booking.id;
    } catch (error) {
      lastError = error;
      if (isOverlapError(error)) {
        throw conflict('Ese horario ya no está disponible. Elegí otro turno.', 'SLOT_TAKEN');
      }
      if (isUniqueCodeError(error)) continue;
      throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo generar un código de reserva único.');
}

async function getBookingWithRelations(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw notFound('Reserva no encontrada.', 'BOOKING_NOT_FOUND');
  return booking;
}

export async function createOnlineBooking(input: CreateBookingInput): Promise<Booking> {
  const context = await resolveSlotContext(input.courtId, input.startsAt, input.durationMinutes, {
    requireFuture: true,
  });
  const pricing = await resolveBookingPricing(context);
  const settings = await getClubSettings();

  const paymentMethod = input.paymentMethod ?? BookingPaymentMethod.MERCADOPAGO;
  const offline = isOfflinePayment(paymentMethod);
  // Pago online: el turno se retiene sólo durante la ventana de pago.
  // Pago en el club (efectivo/transferencia): se retiene hasta que el staff confirme.
  const expiresAt = offline ? null : addMinutes(new Date(), settings.bookingHoldMinutes);

  const bookingId = await prisma.$transaction(async (tx) => {
    await lockCourt(tx, context.courtId);
    await assertSlotFree(tx, context.courtId, context.startsAt, context.endsAt);
    const customerId = await upsertCustomer(tx, input.customer);
    const id = await createBookingRow(tx, {
      courtId: context.courtId,
      customerId,
      context,
      pricing,
      status: BookingStatus.PENDING_PAYMENT,
      source: 'ONLINE',
      paymentMethod,
      notes: input.notes,
      expiresAt,
      confirmedAt: null,
      createdById: null,
    });

    // El cliente declara que pagará en efectivo o por transferencia: se registra un
    // pago PENDIENTE que requiere confirmación manual. Nunca se marca pagado solo.
    if (offline) {
      const reference = input.transferReference?.trim();
      await tx.payment.create({
        data: {
          bookingId: id,
          provider: 'MANUAL',
          method: paymentMethod,
          amountCents: pricing.depositAmountCents,
          currency: pricing.currency,
          status: 'PENDING',
          requiresReview: true,
          reviewReason:
            paymentMethod === BookingPaymentMethod.TRANSFER
              ? 'Transferencia declarada por el cliente: verificar la acreditación.'
              : 'Pago en efectivo declarado por el cliente: confirmar al cobrar en el club.',
          statusDetail: paymentMethod === BookingPaymentMethod.TRANSFER ? reference ?? null : null,
        },
      });
    }

    return id;
  });

  return serializeBooking(await getBookingWithRelations(bookingId));
}

export async function createManualBooking(
  input: CreateBookingInput,
  actor: ActorContext,
): Promise<Booking> {
  const context = await resolveSlotContext(input.courtId, input.startsAt, input.durationMinutes, {
    requireFuture: false,
  });
  const pricing = await resolveBookingPricing(context);
  const now = new Date();

  const bookingId = await prisma.$transaction(async (tx) => {
    await lockCourt(tx, context.courtId);
    await assertSlotFree(tx, context.courtId, context.startsAt, context.endsAt);
    const customerId = await upsertCustomer(tx, input.customer);
    return createBookingRow(tx, {
      courtId: context.courtId,
      customerId,
      context,
      pricing,
      status: BookingStatus.CONFIRMED,
      source: 'ADMIN',
      paymentMethod: null,
      notes: input.notes,
      expiresAt: null,
      confirmedAt: now,
      createdById: actor.userId ?? null,
    });
  });

  return serializeBooking(await getBookingWithRelations(bookingId));
}

export async function listBookings(filters: BookingFilters = {}): Promise<Paginated<Booking>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 12));

  const where: Prisma.BookingWhereInput = {};

  const startsAtFilter: Prisma.DateTimeFilter = {};
  if (filters.from) startsAtFilter.gte = clubLocalToUtc(filters.from, '00:00');
  if (filters.to) startsAtFilter.lt = addMinutes(clubLocalToUtc(filters.to, '00:00'), 24 * 60);
  if (filters.from || filters.to) where.startsAt = startsAtFilter;

  if (filters.courtId) where.courtId = filters.courtId;
  if (filters.status) where.status = filters.status as BookingStatus;
  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod as BookingPaymentMethod;
  }
  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search, mode: 'insensitive' } },
      { customer: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: bookings.map(serializeBooking),
    meta: { page, pageSize, total },
  };
}

export async function getBookingByCode(code: string, email?: string): Promise<Booking> {
  const booking = await prisma.booking.findFirst({
    where: { code: { equals: code, mode: 'insensitive' } },
    include: bookingInclude,
  });
  if (!booking) throw notFound('No encontramos una reserva con ese código.', 'BOOKING_NOT_FOUND');

  if (email && booking.customer.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw conflict('Los datos no coinciden con la reserva.', 'BOOKING_FORBIDDEN');
  }

  return serializeBooking(booking);
}

export async function getBookingById(id: string): Promise<Booking> {
  return serializeBooking(await getBookingWithRelations(id));
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  actor: ActorContext,
): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound('Reserva no encontrada.', 'BOOKING_NOT_FOUND');

  try {
    assertTransition(booking.status, status);
  } catch {
    throw unprocessable(
      `No se puede pasar una reserva de "${booking.status}" a "${status}".`,
      'INVALID_TRANSITION',
    );
  }

  const now = new Date();
  await prisma.booking.update({
    where: { id },
    data: {
      status,
      ...(status === BookingStatus.CONFIRMED ? { confirmedAt: now, expiresAt: null } : {}),
    },
  });

  void actor;
  return serializeBooking(await getBookingWithRelations(id));
}

/**
 * Actualiza las observaciones de una reserva. Es el único campo de edición libre
 * permitido al staff: no altera horarios ni precios (invariantes de ocupación y tarifa).
 */
export async function updateBookingNotes(id: string, notes: string): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound('Reserva no encontrada.', 'BOOKING_NOT_FOUND');

  await prisma.booking.update({
    where: { id },
    data: { notes: notes.trim().length > 0 ? notes.trim() : null },
  });

  return serializeBooking(await getBookingWithRelations(id));
}

export async function cancelBooking(
  id: string,
  reason: string,
  actor: ActorContext,
): Promise<Booking> {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound('Reserva no encontrada.', 'BOOKING_NOT_FOUND');

  try {
    assertTransition(booking.status, BookingStatus.CANCELLED);
  } catch {
    throw unprocessable('La reserva no puede cancelarse en su estado actual.', 'INVALID_TRANSITION');
  }

  await prisma.booking.update({
    where: { id },
    data: {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById: actor.userId ?? null,
      cancellationReason: reason,
    },
  });

  return serializeBooking(await getBookingWithRelations(id));
}

export async function markNoShow(id: string, actor: ActorContext): Promise<Booking> {
  return updateBookingStatus(id, BookingStatus.NO_SHOW, actor);
}

/** Marca como vencidas las reservas impagas cuyo tiempo de retención expiró. */
export async function expireStaleBookings(): Promise<number> {
  const result = await prisma.booking.updateMany({
    where: { status: BookingStatus.PENDING_PAYMENT, expiresAt: { lt: new Date() } },
    data: { status: BookingStatus.EXPIRED },
  });
  return result.count;
}
