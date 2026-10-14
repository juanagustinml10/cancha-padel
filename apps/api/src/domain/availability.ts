import type { ResolvedPrice } from './pricing';
import { addMinutes, clubLocalToUtc, minutesFromTime, minutesToTime, rangesOverlap } from './time';

/**
 * Cálculo de disponibilidad — lógica pura.
 * Recibe datos ya cargados (canchas, horarios, reservas activas y bloqueos) y produce
 * las franjas con precio y seña. No accede a la base de datos, por lo que es testeable.
 */

export interface AvailabilityCourt {
  id: string;
  name: string;
}

export interface AvailabilitySchedule {
  courtId: string | null;
  weekday: number;
  opensAt: string;
  closesAt: string;
  slotMinutes: number;
  isActive: boolean;
}

export interface BusyInterval {
  courtId: string | null;
  startsAt: Date;
  endsAt: Date;
}

export interface AvailabilitySlot {
  courtId: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  priceTotalCents: number;
  depositAmountCents: number;
  currency: string;
  reason?: 'past' | 'taken' | 'closed';
}

export interface AvailabilityResult {
  date: string;
  durationMinutes: number;
  slots: AvailabilitySlot[];
}

export interface BuildAvailabilityArgs {
  date: string;
  durationMinutes: number;
  weekday: number;
  now: Date;
  courts: AvailabilityCourt[];
  schedules: AvailabilitySchedule[];
  bookings: BusyInterval[];
  blocks: BusyInterval[];
  resolvePrice: (courtId: string, startTime: string, durationMinutes: number) => ResolvedPrice;
  computeDeposit: (priceCents: number) => number;
}

/** Elige el horario aplicable a una cancha: el específico gana al global. */
export function resolveSchedule(
  schedules: AvailabilitySchedule[],
  courtId: string,
  weekday: number,
): AvailabilitySchedule | undefined {
  const candidates = schedules.filter(
    (schedule) =>
      schedule.isActive &&
      (schedule.courtId === null || schedule.courtId === courtId) &&
      schedule.weekday === weekday,
  );
  return candidates.sort((a, b) => (a.courtId ? 0 : 1) - (b.courtId ? 0 : 1))[0];
}

function isBusy(
  intervals: BusyInterval[],
  courtId: string | null,
  start: Date,
  end: Date,
): boolean {
  return intervals.some(
    (interval) =>
      (interval.courtId === null || interval.courtId === courtId) &&
      rangesOverlap(interval.startsAt, interval.endsAt, start, end),
  );
}

export function buildAvailability(args: BuildAvailabilityArgs): AvailabilityResult {
  const {
    date,
    durationMinutes,
    weekday,
    now,
    courts,
    schedules,
    bookings,
    blocks,
    resolvePrice,
    computeDeposit,
  } = args;

  const slots: AvailabilitySlot[] = [];

  for (const court of courts) {
    const schedule = resolveSchedule(schedules, court.id, weekday);
    if (!schedule) continue;

    const open = minutesFromTime(schedule.opensAt);
    const close = minutesFromTime(schedule.closesAt);
    const step = schedule.slotMinutes > 0 ? schedule.slotMinutes : 60;

    for (let start = open; start + durationMinutes <= close; start += step) {
      const startTime = minutesToTime(start);
      const startsAt = clubLocalToUtc(date, startTime);
      const endsAt = addMinutes(startsAt, durationMinutes);

      const past = startsAt.getTime() < now.getTime();
      const taken =
        !past &&
        (isBusy(bookings, court.id, startsAt, endsAt) ||
          isBusy(blocks, court.id, startsAt, endsAt));

      const resolved = resolvePrice(court.id, startTime, durationMinutes);
      const priceCents = resolved.priceCents;
      const depositAmountCents = computeDeposit(priceCents);

      slots.push({
        courtId: court.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        available: !past && !taken,
        priceTotalCents: priceCents,
        depositAmountCents,
        currency: resolved.currency,
        reason: past ? 'past' : taken ? 'taken' : undefined,
      });
    }
  }

  return { date, durationMinutes, slots };
}
