import type { DashboardStats } from '@padel/shared';
import { ACTIVE_BOOKING_STATUSES } from '@padel/shared';
import { env } from '@/config/env';
import { addMinutes, clubDateKey, clubLocalToUtc } from '@/domain/time';
import { prisma } from '@/infra/prisma';
import { serializeBooking } from '@/utils/serialize';

const DAILY_OPEN_MINUTES = 15 * 60;

export async function getDashboard(): Promise<DashboardStats> {
  const now = new Date();
  const today = clubDateKey(now);
  const dayStart = clubLocalToUtc(today, '00:00');
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const monthStart = clubLocalToUtc(`${today.slice(0, 7)}-01`, '00:00');

  const [
    courts,
    bookingsTodayAll,
    pendingPayment,
    cancelledTodayCount,
    paymentsRequiringReview,
    revenueToday,
    revenueMonth,
    upcoming,
    bookingsTodayPendingPayment,
    activeToday,
  ] = await Promise.all([
    prisma.court.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.booking.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.booking.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.booking.count({ where: { startsAt: { gte: dayStart, lt: dayEnd }, status: 'CANCELLED' } }),
    prisma.payment.count({ where: { requiresReview: true } }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: 'APPROVED', paidAt: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: 'APPROVED', paidAt: { gte: monthStart } },
    }),
    prisma.booking.findMany({
      where: { status: { in: ACTIVE_BOOKING_STATUSES }, startsAt: { gte: now } },
      include: { court: true, customer: true },
      orderBy: { startsAt: 'asc' },
      take: 6,
    }),
    prisma.booking.findMany({
      where: { status: 'PENDING_PAYMENT', startsAt: { gte: dayStart, lt: dayEnd } },
    }),
    prisma.booking.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
    }),
  ]);

  const notCancelledToday = bookingsTodayAll.filter((booking) => booking.status !== 'CANCELLED');
  const occupiedMinutes = notCancelledToday.reduce(
    (acc, booking) => acc + booking.durationMinutes,
    0,
  );
  const totalMinutes = courts.length * DAILY_OPEN_MINUTES;

  const pendingDepositsCents = bookingsTodayPendingPayment.reduce(
    (acc, booking) => acc + booking.depositAmountCents,
    0,
  );
  const reservedTodayCents = activeToday.reduce((acc, booking) => acc + booking.priceTotalCents, 0);

  return {
    date: today,
    bookingsToday: notCancelledToday.length,
    confirmedToday: notCancelledToday.filter((booking) => booking.status === 'CONFIRMED').length,
    pendingPayment,
    cancelledToday: cancelledTodayCount,
    paymentsRequiringReview,
    occupancyRate: totalMinutes === 0 ? 0 : occupiedMinutes / totalMinutes,
    revenueTodayCents: revenueToday._sum.amountCents ?? 0,
    revenueMonthCents: revenueMonth._sum.amountCents ?? 0,
    reservedTodayCents,
    pendingDepositsCents,
    currency: env.CURRENCY,
    upcoming: upcoming.map(serializeBooking),
    occupiedByCourt: courts.map((court) => ({
      courtId: court.id,
      courtName: court.name,
      occupiedMinutes: notCancelledToday
        .filter((booking) => booking.courtId === court.id)
        .reduce((acc, booking) => acc + booking.durationMinutes, 0),
      totalMinutes: DAILY_OPEN_MINUTES,
    })),
  };
}
