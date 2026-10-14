import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { CLUB_TIMEZONE } from './env';

export function formatCurrency(cents: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(iso: string, pattern = "EEEE d 'de' MMMM"): string {
  return formatInTimeZone(new Date(iso), CLUB_TIMEZONE, pattern, { locale: es });
}

export function formatDateShort(iso: string): string {
  return formatInTimeZone(new Date(iso), CLUB_TIMEZONE, 'dd/MM/yyyy', { locale: es });
}

export function formatTime(iso: string): string {
  return formatInTimeZone(new Date(iso), CLUB_TIMEZONE, 'HH:mm', { locale: es });
}

export function formatDateTime(iso: string): string {
  return formatInTimeZone(
    new Date(iso),
    CLUB_TIMEZONE,
    "EEEE d MMM, HH:mm 'hs'",
    { locale: es },
  );
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function weekdayLabel(weekday: number): string {
  const labels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return labels[weekday] ?? '';
}

export function todayInClubTimeZone(): string {
  return formatInTimeZone(new Date(), CLUB_TIMEZONE, 'yyyy-MM-dd');
}
