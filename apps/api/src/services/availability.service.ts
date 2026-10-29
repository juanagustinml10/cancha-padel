import type { AvailabilityResponse } from '@padel/shared';
import { ACTIVE_BOOKING_STATUSES } from '@padel/shared';
import { env } from '@/config/env';
import { buildAvailability, type AvailabilityCourt } from '@/domain/availability';
import { computeDeposit, resolvePrice, type PricingRuleInput } from '@/domain/pricing';
import { addMinutes, clubLocalToUtc, clubWeekdayOfDate } from '@/domain/time';
import { prisma } from '@/infra/prisma';
import { getClubSettings } from './settings.service';

export async function getAvailability(
  date: string,
  durationMinutes: number,
  courtId?: string,
): Promise<AvailabilityResponse> {
  const weekday = clubWeekdayOfDate(date);
  const dayStart = clubLocalToUtc(date, '00:00');
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const now = new Date();

  const courts = await prisma.court.findMany({
    where: { status: 'ACTIVE', ...(courtId ? { id: courtId } : {}) },
    orderBy: { sortOrder: 'asc' },
  });

  const courtIds = courts.map((court) => court.id);

  const [schedules, bookings, blocks, rules, settings] = await Promise.all([
    prisma.courtSchedule.findMany({ where: { isActive: true, weekday } }),
    prisma.booking.findMany({
      where: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        courtId: { in: courtIds },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { courtId: true, startsAt: true, endsAt: true },
    }),
    prisma.courtBlock.findMany({
      where: {
        OR: [{ courtId: null }, { courtId: { in: courtIds } }],
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { courtId: true, startsAt: true, endsAt: true },
    }),
    prisma.pricingRule.findMany({ where: { isActive: true } }),
    getClubSettings(),
  ]);

  const pricingInputs: PricingRuleInput[] = rules.map((rule) => ({
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
    validFrom: rule.validFrom,
    validTo: rule.validTo,
  }));

  const availabilityCourts: AvailabilityCourt[] = courts.map((court) => ({
    id: court.id,
    name: court.name,
  }));

  return buildAvailability({
    date,
    durationMinutes,
    weekday,
    now,
    courts: availabilityCourts,
    schedules: schedules.map((schedule) => ({
      courtId: schedule.courtId,
      weekday: schedule.weekday,
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      slotMinutes: schedule.slotMinutes,
      isActive: schedule.isActive,
    })),
    bookings: bookings.map((booking) => ({
      courtId: booking.courtId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
    })),
    blocks: blocks.map((block) => ({
      courtId: block.courtId,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
    })),
    resolvePrice: (courtIdValue, startTime, duration, startsAt) =>
      resolvePrice(
        pricingInputs,
        { courtId: courtIdValue, weekday, startTime, durationMinutes: duration, at: startsAt },
        env.CURRENCY,
      ),
    computeDeposit: (priceCents) => computeDeposit(priceCents, settings),
  });
}
