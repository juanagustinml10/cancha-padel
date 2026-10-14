import { differenceInCalendarDays } from 'date-fns';
import type { BookingReport, PaymentMethodRow, ReportCourtRow } from '@padel/shared';
import { env } from '@/config/env';
import { addMinutes, clubLocalToUtc } from '@/domain/time';
import { prisma } from '@/infra/prisma';

// El club abre 15 h por cancha: se usa como denominador de ocupación, igual que el panel.
const DAILY_OPEN_MINUTES = 15 * 60;
const RESERVED_STATUSES = ['CONFIRMED', 'COMPLETED'] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
  account_money: 'Dinero en cuenta (MP)',
  credit_card: 'Tarjeta de crédito (MP)',
  debit_card: 'Tarjeta de débito (MP)',
  ticket: 'Efectivo (MP)',
  bank_transfer: 'Transferencia (MP)',
};

function paymentMethodLabel(method: string | null): string {
  if (!method) return 'Sin especificar';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export async function getBookingReport(from: string, to: string): Promise<BookingReport> {
  const rangeStart = clubLocalToUtc(from, '00:00');
  const rangeEnd = addMinutes(clubLocalToUtc(to, '00:00'), 24 * 60);

  const [courts, bookings, approvedPayments] = await Promise.all([
    prisma.court.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.booking.findMany({
      where: { startsAt: { gte: rangeStart, lt: rangeEnd } },
    }),
    prisma.payment.findMany({
      where: { status: 'APPROVED', paidAt: { gte: rangeStart, lt: rangeEnd } },
      include: { booking: { select: { courtId: true } } },
    }),
  ]);

  const days = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart));
  const totalMinutesPerCourt = days * DAILY_OPEN_MINUTES;

  const byCourt: ReportCourtRow[] = courts.map((court) => {
    const courtBookings = bookings.filter((booking) => booking.courtId === court.id);
    const occupiedMinutes = courtBookings
      .filter((booking) => booking.status !== 'CANCELLED')
      .reduce((acc, booking) => acc + booking.durationMinutes, 0);
    const reservedCents = courtBookings
      .filter((booking) => (RESERVED_STATUSES as readonly string[]).includes(booking.status))
      .reduce((acc, booking) => acc + booking.depositAmountCents, 0);
    const collectedCents = approvedPayments
      .filter((payment) => payment.booking.courtId === court.id)
      .reduce((acc, payment) => acc + payment.amountCents, 0);

    return {
      courtId: court.id,
      courtName: court.name,
      bookings: courtBookings.length,
      collectedCents,
      reservedCents,
      occupiedMinutes,
      totalMinutes: totalMinutesPerCourt,
      occupancyRate:
        totalMinutesPerCourt === 0 ? 0 : Math.min(1, occupiedMinutes / totalMinutesPerCourt),
    };
  });

  const methodMap = new Map<string, PaymentMethodRow>();
  for (const payment of approvedPayments) {
    const key = payment.method ?? 'UNSPECIFIED';
    const row = methodMap.get(key) ?? { method: paymentMethodLabel(payment.method), count: 0, collectedCents: 0 };
    row.count += 1;
    row.collectedCents += payment.amountCents;
    methodMap.set(key, row);
  }

  const byPaymentMethod = [...methodMap.values()].sort(
    (a, b) => b.collectedCents - a.collectedCents,
  );

  return {
    periodLabel: `${from} — ${to}`,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((booking) => booking.status === 'CONFIRMED').length,
    cancelledBookings: bookings.filter((booking) => booking.status === 'CANCELLED').length,
    noShows: bookings.filter((booking) => booking.status === 'NO_SHOW').length,
    completedBookings: bookings.filter((booking) => booking.status === 'COMPLETED').length,
    collectedCents: byCourt.reduce((acc, court) => acc + court.collectedCents, 0),
    reservedCents: byCourt.reduce((acc, court) => acc + court.reservedCents, 0),
    currency: env.CURRENCY,
    byCourt,
    byPaymentMethod,
  };
}

export interface RevenueReport {
  periodLabel: string;
  totalCents: number;
  count: number;
  currency: string;
}

export async function getRevenueReport(from: string, to: string): Promise<RevenueReport> {
  const rangeStart = clubLocalToUtc(from, '00:00');
  const rangeEnd = addMinutes(clubLocalToUtc(to, '00:00'), 24 * 60);

  const result = await prisma.payment.aggregate({
    _sum: { amountCents: true },
    where: { status: 'APPROVED', paidAt: { gte: rangeStart, lt: rangeEnd } },
  });

  const count = await prisma.payment.count({
    where: { status: 'APPROVED', paidAt: { gte: rangeStart, lt: rangeEnd } },
  });

  return {
    periodLabel: `${from} — ${to}`,
    totalCents: result._sum.amountCents ?? 0,
    count,
    currency: env.CURRENCY,
  };
}
