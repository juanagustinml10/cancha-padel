import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { CLUB_TIMEZONE } from './env';

/** Convierte una fecha 'yyyy-MM-dd' y hora 'HH:mm' en zona del club a un instante ISO (UTC). */
export function clubDateTimeToIso(date: string, time: string): string {
  const zoned = fromZonedTime(`${date} ${time}`, CLUB_TIMEZONE);
  return zoned.toISOString();
}

/** Día de la semana en zona del club: 0 = domingo ... 6 = sábado. */
export function weekdayOfDate(date: string): number {
  const iso = formatInTimeZone(new Date(`${date}T12:00:00Z`), CLUB_TIMEZONE, 'i');
  return Number.parseInt(iso, 10) % 7;
}

/** Minutos desde medianoche para una hora 'HH:mm'. */
export function minutesFromTime(time: string): number {
  const [h, m] = time.split(':').map((part) => Number.parseInt(part, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Fecha de hoy en zona del club, formato 'yyyy-MM-dd'. */
export function todayIso(): string {
  return formatInTimeZone(new Date(), CLUB_TIMEZONE, 'yyyy-MM-dd');
}

export function addDaysIso(date: string, days: number): string {
  const base = new Date(`${date}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** Parsea una fecha 'yyyy-MM-dd' al mediodía UTC para evitar corrimientos de zona horaria. */
export function parseDateOnly(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}
