import { useMemo } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import type { Booking, Court } from '@padel/shared';
import { Badge } from '@/components/ui/Badge';
import { bookingStatusVariant } from '@/lib/status';
import { CLUB_TIMEZONE } from '@/lib/env';
import { addDaysIso, minutesToTime, parseDateOnly, todayIso } from '@/lib/datetime';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export type CalendarView = 'day' | 'week' | 'month';

interface CalendarViewProps {
  view: CalendarView;
  date: string;
  bookings: Booking[];
  courts: Court[];
  onSelectBooking?: (booking: Booking) => void;
}

const OPEN_HOUR = 8;
const CLOSE_HOUR = 23;

function buildHourSlots(): string[] {
  const slots: string[] = [];
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour += 1) {
    slots.push(minutesToTime(hour * 60));
  }
  return slots;
}

function isoDateToClubDate(iso: string): string {
  return formatInTimeZone(new Date(iso), CLUB_TIMEZONE, 'yyyy-MM-dd');
}

function isoTime(iso: string): string {
  return formatInTimeZone(new Date(iso), CLUB_TIMEZONE, 'HH:mm');
}

function isActive(booking: Booking): boolean {
  return booking.status === 'PENDING_PAYMENT' || booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';
}

export function CalendarView({ view, date, bookings, courts, onSelectBooking }: CalendarViewProps) {
  const hourSlots = useMemo(buildHourSlots, []);

  if (view === 'month') {
    return <MonthView date={date} bookings={bookings} onSelectBooking={onSelectBooking} />;
  }

  const activeCourts = courts.filter((court) => court.status !== 'INACTIVE');

  if (view === 'week') {
    const start = date;
    const days = Array.from({ length: 7 }, (_, index) => addDaysIso(start, index));
    return (
      <div className="overflow-x-auto subtle-scrollbar">
        <div className="min-w-[820px]">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(96px, 1fr))` }}>
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted">Hora</div>
            {days.map((day) => (
              <div key={day} className="border-b border-l border-border px-3 py-2 text-center">
                <p className="text-xs font-semibold uppercase text-muted">
                  {formatInTimeZone(parseDateOnly(day), CLUB_TIMEZONE, 'EEE', { locale: es })}
                </p>
                <p className="text-sm font-bold text-content">
                  {formatInTimeZone(parseDateOnly(day), CLUB_TIMEZONE, 'd/M')}
                </p>
              </div>
            ))}

            {hourSlots.map((hour) => (
              <div key={hour} className="contents">
                <div className="border-b border-border px-3 py-2 text-xs text-muted">{hour}</div>
                {days.map((day) => {
                  const cell = bookings.filter(
                    (booking) =>
                      isActive(booking) && isoDateToClubDate(booking.startsAt) === day && isoTime(booking.startsAt) === hour,
                  );
                  return (
                    <div key={`${day}-${hour}`} className="min-h-[52px] border-b border-l border-border p-1">
                      {cell.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => onSelectBooking?.(booking)}
                          className="mb-1 w-full rounded-md border border-primary/30 bg-brand-soft px-1.5 py-1 text-left text-[11px] font-medium text-content hover:border-primary hover:bg-primary hover:text-white"
                          title={`${booking.courtName} · ${booking.customer.fullName}`}
                        >
                          {formatTime(booking.startsAt)} {booking.courtName.replace('Cancha ', 'C')}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto subtle-scrollbar">
      <div className="min-w-[560px]">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${activeCourts.length}, minmax(140px, 1fr))` }}>
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted">Hora</div>
          {activeCourts.map((court) => (
            <div key={court.id} className="border-b border-l border-border px-3 py-2 text-center text-sm font-semibold text-content">
              {court.name}
            </div>
          ))}

          {hourSlots.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-border px-3 py-2 text-xs text-muted">{hour}</div>
              {activeCourts.map((court) => {
                const cell = bookings.filter(
                  (booking) =>
                    isActive(booking) &&
                    booking.courtId === court.id &&
                    isoDateToClubDate(booking.startsAt) === date &&
                    isoTime(booking.startsAt) === hour,
                );
                return (
                  <div key={`${court.id}-${hour}`} className="min-h-[48px] border-b border-l border-border p-1">
                    {cell.map((booking) => (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => onSelectBooking?.(booking)}
                        className="w-full rounded-lg border border-primary/30 bg-brand-soft px-2 py-1.5 text-left text-xs text-content hover:border-primary hover:bg-primary hover:text-white"
                      >
                        <span className="block font-semibold text-content">{booking.customer.fullName}</span>
                        <span className="block text-[11px] text-muted">{booking.code}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  date,
  bookings,
  onSelectBooking,
}: {
  date: string;
  bookings: Booking[];
  onSelectBooking?: (booking: Booking) => void;
}) {
  const base = parseDateOnly(date);
  const firstOfMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const year = firstOfMonth.getUTCFullYear();
  const month = firstOfMonth.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = todayIso();

  const cells: (string | null)[] = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-l border-border text-center">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((label) => (
          <div key={label} className="border-r border-t border-line bg-surface-2 px-2 py-2 text-xs font-semibold uppercase text-content">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          const dayBookings = cell
            ? bookings.filter((booking) => isActive(booking) && isoDateToClubDate(booking.startsAt) === cell)
            : [];
          return (
            <div
              key={index}
              className={cn(
                'min-h-[96px] border-b border-r border-border p-1.5',
                cell === today && 'bg-brand-soft',
                !cell && 'bg-bg',
              )}
            >
              {cell ? (
                <>
                  <p className={cn('text-xs font-semibold', cell === today ? 'text-accent' : 'text-muted')}>
                    {Number.parseInt(cell.slice(-2), 10)}
                  </p>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => onSelectBooking?.(booking)}
                        className="truncate rounded border border-primary/30 bg-brand-soft px-1.5 py-0.5 text-left text-[11px] text-content hover:border-primary hover:bg-primary hover:text-white"
                      >
                        {formatTime(booking.startsAt)} {booking.courtName.replace('Cancha ', 'C')}
                      </button>
                    ))}
                    {dayBookings.length > 3 ? (
                      <Badge variant="info">+{dayBookings.length - 3}</Badge>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <Badge variant={bookingStatusVariant('CONFIRMED')}>Confirmada</Badge>
        <Badge variant={bookingStatusVariant('PENDING_PAYMENT')}>Pago pendiente</Badge>
        <span>Las reservas se agrupan por cancha y horario.</span>
      </div>
    </div>
  );
}
