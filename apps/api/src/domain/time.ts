import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { CLUB_TIMEZONE } from '@/config/constants';

/**
 * Utilidades de fecha/hora en la zona del club.
 * Todas las fechas que viajan por la API son instantes UTC (ISO 8601 con offset);
 * la conversión a la zona del club se hace acá de forma centralizada y testeable.
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Convierte "HH:mm" a minutos desde la medianoche. Lanza si el formato es inválido. */
export function minutesFromTime(time: string): number {
  const match = TIME_RE.exec(time);
  if (!match) throw new Error(`Hora inválida: "${time}" (formato esperado HH:mm)`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Convierte minutos desde la medianoche a "HH:mm". */
export function minutesToTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Combina una fecha local del club ("yyyy-MM-dd") y una hora ("HH:mm") en un instante UTC. */
export function clubLocalToUtc(dateIso: string, time: string, timeZone: string = CLUB_TIMEZONE): Date {
  return fromZonedTime(`${dateIso}T${time}:00`, timeZone);
}

/** Formatea un instante UTC en la zona del club usando un patrón de date-fns. */
export function formatInClub(date: Date, pattern: string, timeZone: string = CLUB_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, pattern);
}

/** Fecha local del club ("yyyy-MM-dd") de un instante UTC. */
export function clubDateKey(date: Date, timeZone: string = CLUB_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

/** Hora local del club ("HH:mm") de un instante UTC. */
export function clubTimeKey(date: Date, timeZone: string = CLUB_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, 'HH:mm');
}

/** Día de la semana (0 = domingo .. 6 = sábado) de una fecha local "yyyy-MM-dd". */
export function clubWeekdayOfDate(dateIso: string): number {
  const date = new Date(`${dateIso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Fecha inválida: "${dateIso}"`);
  return date.getUTCDay();
}

/** ¿Se solapan dos rangos [start, end)? */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** ¿Un instante está dentro de [start, end)? */
export function containsInstant(start: Date, end: Date, instant: Date): boolean {
  return start <= instant && instant < end;
}

/** Suma minutos a un instante. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
