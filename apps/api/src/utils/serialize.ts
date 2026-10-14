import { Prisma } from '@prisma/client';
import type {
  AuditLog as SharedAuditLog,
  Booking as SharedBooking,
  Court as SharedCourt,
  CourtBlock as SharedCourtBlock,
  CourtSchedule as SharedCourtSchedule,
  Customer as SharedCustomer,
  Payment as SharedPayment,
  PricingRule as SharedPricingRule,
  PricingSnapshot,
  StaffUser as SharedStaffUser,
} from '@padel/shared';

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: { court: true; customer: true };
}>;
export type PaymentWithBooking = Prisma.PaymentGetPayload<{
  include: { booking: { include: { customer: true } } };
}>;
export type AuditLogWithActor = Prisma.AuditLogGetPayload<{ include: { actor: true } }>;

function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

export function serializeCourt(court: Prisma.CourtGetPayload<object>): SharedCourt {
  return {
    id: court.id,
    name: court.name,
    type: court.type,
    surface: court.surface ?? undefined,
    hasLighting: court.hasLighting,
    status: court.status,
    sortOrder: court.sortOrder,
    description: court.description ?? undefined,
  };
}

export function serializeSchedule(
  schedule: Prisma.CourtScheduleGetPayload<object>,
): SharedCourtSchedule {
  return {
    id: schedule.id,
    courtId: schedule.courtId,
    weekday: schedule.weekday,
    opensAt: schedule.opensAt,
    closesAt: schedule.closesAt,
    slotMinutes: schedule.slotMinutes,
    isActive: schedule.isActive,
  };
}

export function serializePricingRule(
  rule: Prisma.PricingRuleGetPayload<object>,
): SharedPricingRule {
  return {
    id: rule.id,
    courtId: rule.courtId,
    weekday: rule.weekday,
    startTime: rule.startTime,
    endTime: rule.endTime,
    durationMinutes: rule.durationMinutes,
    priceCents: rule.priceCents,
    currency: rule.currency,
    validFrom: rule.validFrom.toISOString(),
    validTo: iso(rule.validTo),
    isActive: rule.isActive,
    priority: rule.priority,
  };
}

export function serializeBlock(block: Prisma.CourtBlockGetPayload<object>): SharedCourtBlock {
  return {
    id: block.id,
    courtId: block.courtId,
    startsAt: block.startsAt.toISOString(),
    endsAt: block.endsAt.toISOString(),
    reason: block.reason,
    createdById: block.createdById ?? undefined,
    createdAt: block.createdAt.toISOString(),
  };
}

export function serializeCustomer(customer: Prisma.CustomerGetPayload<object>): SharedCustomer {
  return {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
    notes: customer.notes ?? undefined,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function serializeBooking(booking: BookingWithRelations): SharedBooking {
  return {
    id: booking.id,
    code: booking.code,
    courtId: booking.courtId,
    courtName: booking.court.name,
    customer: serializeCustomer(booking.customer),
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    durationMinutes: booking.durationMinutes,
    status: booking.status,
    source: booking.source,
    paymentMethod: booking.paymentMethod ?? null,
    priceTotalCents: booking.priceTotalCents,
    depositAmountCents: booking.depositAmountCents,
    currency: booking.currency,
    paidAmountCents: booking.paidAmountCents,
    pricingSnapshot: booking.pricingSnapshot as unknown as PricingSnapshot,
    notes: booking.notes ?? undefined,
    expiresAt: iso(booking.expiresAt),
    confirmedAt: iso(booking.confirmedAt),
    cancelledAt: iso(booking.cancelledAt),
    cancellationReason: booking.cancellationReason,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function serializePayment(payment: PaymentWithBooking): SharedPayment {
  return {
    id: payment.id,
    bookingId: payment.bookingId,
    bookingCode: payment.booking.code,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    providerPreferenceId: payment.providerPreferenceId,
    method: payment.method,
    amountCents: payment.amountCents,
    currency: payment.currency,
    status: payment.status,
    statusDetail: payment.statusDetail,
    requiresReview: payment.requiresReview,
    reviewReason: payment.reviewReason,
    paidAt: iso(payment.paidAt),
    refundedAt: iso(payment.refundedAt),
    createdAt: payment.createdAt.toISOString(),
    customerName: payment.booking.customer.fullName,
    bookingPriceTotalCents: payment.booking.priceTotalCents,
    bookingDepositAmountCents: payment.booking.depositAmountCents,
    bookingPaidAmountCents: payment.booking.paidAmountCents,
    bookingStatus: payment.booking.status,
    reference: payment.provider === 'MANUAL' ? payment.statusDetail : null,
  };
}

export function serializeStaffUser(user: Prisma.UserGetPayload<object>): SharedStaffUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: user.createdAt.toISOString(),
  };
}

export function serializeAuditLog(log: AuditLogWithActor): SharedAuditLog {
  return {
    id: log.id,
    actorName: log.actor?.fullName ?? 'Sistema',
    action: log.action,
    entity: log.entity,
    entityId: log.entityId ?? undefined,
    createdAt: log.createdAt.toISOString(),
  };
}
