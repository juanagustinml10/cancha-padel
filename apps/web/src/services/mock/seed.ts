import type {
  AuditLog,
  Booking,
  BookingPaymentMethod,
  Court,
  CourtBlock,
  CourtSchedule,
  Customer,
  Payment,
  PricingRule,
  SettingsPayload,
  StaffUser,
} from '@padel/shared';
import { DEMO_CLUB } from '@/config/site';
import { addDaysIso, clubDateTimeToIso, todayIso } from '@/lib/datetime';

export interface MockState {
  courts: Court[];
  schedule: CourtSchedule[];
  pricing: PricingRule[];
  blocks: CourtBlock[];
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
  users: StaffUser[];
  settings: SettingsPayload;
  auditLogs: AuditLog[];
  sequence: number;
}

const COURTS: Court[] = [
  {
    id: 'court-1',
    name: 'Cancha 1',
    type: 'INDOOR',
    surface: 'Césped sintético premium',
    hasLighting: true,
    status: 'ACTIVE',
    sortOrder: 1,
    description: 'Cancha indoor con techo y luz LED, ideal para todo el año.',
  },
  {
    id: 'court-2',
    name: 'Cancha 2',
    type: 'INDOOR',
    surface: 'Césped sintético premium',
    hasLighting: true,
    status: 'ACTIVE',
    sortOrder: 2,
    description: 'Cancha indoor con buena ventilación y cerramiento completo.',
  },
  {
    id: 'court-3',
    name: 'Cancha 3',
    type: 'OUTDOOR',
    surface: 'Césped sintético',
    hasLighting: true,
    status: 'ACTIVE',
    sortOrder: 3,
    description: 'Cancha outdoor con luz LED para jugar de noche.',
  },
];

const FRANJAS = [
  { startTime: '08:00', endTime: '13:00', hourlyCents: 800000 },
  { startTime: '13:00', endTime: '18:00', hourlyCents: 1000000 },
  { startTime: '18:00', endTime: '23:00', hourlyCents: 1200000 },
];

const WEEKEND_FRANJA = { startTime: '09:00', endTime: '22:00', hourlyCents: 1100000 };

const DURATIONS = [60, 90, 120];

function priceFor(hourlyCents: number, durationMinutes: number): number {
  return Math.round((hourlyCents * durationMinutes) / 60 / 100) * 100;
}

function buildPricing(): PricingRule[] {
  const rules: PricingRule[] = [];
  let counter = 0;
  const validFrom = new Date('2024-01-01T00:00:00.000Z').toISOString();

  for (const weekday of [1, 2, 3, 4, 5]) {
    for (const franja of FRANJAS) {
      for (const duration of DURATIONS) {
        counter += 1;
        rules.push({
          id: `price-${counter}`,
          courtId: null,
          weekday,
          startTime: franja.startTime,
          endTime: franja.endTime,
          durationMinutes: duration,
          priceCents: priceFor(franja.hourlyCents, duration),
          currency: 'ARS',
          validFrom,
          validTo: null,
          isActive: true,
          priority: 1,
        });
      }
    }
  }

  for (const weekday of [0, 6]) {
    for (const duration of DURATIONS) {
      counter += 1;
      rules.push({
        id: `price-${counter}`,
        courtId: null,
        weekday,
        startTime: WEEKEND_FRANJA.startTime,
        endTime: WEEKEND_FRANJA.endTime,
        durationMinutes: duration,
        priceCents: priceFor(WEEKEND_FRANJA.hourlyCents, duration),
        currency: 'ARS',
        validFrom,
        validTo: null,
        isActive: true,
        priority: 1,
      });
    }
  }

  return rules;
}

function buildSchedule(): CourtSchedule[] {
  const schedule: CourtSchedule[] = [];
  for (const weekday of [1, 2, 3, 4, 5]) {
    schedule.push({
      id: `schedule-${weekday}`,
      courtId: null,
      weekday,
      opensAt: '08:00',
      closesAt: '23:00',
      slotMinutes: 60,
      isActive: true,
    });
  }
  for (const weekday of [0, 6]) {
    schedule.push({
      id: `schedule-${weekday}`,
      courtId: null,
      weekday,
      opensAt: '09:00',
      closesAt: '22:00',
      slotMinutes: 60,
      isActive: true,
    });
  }
  return schedule;
}

interface SeedBookingInput {
  courtIndex: number;
  dayOffset: number;
  time: string;
  duration: number;
  status: Booking['status'];
  source: Booking['source'];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod?: BookingPaymentMethod | null;
  paidRatio?: number;
}

function buildBookingsState(inputs: SeedBookingInput[]): {
  customers: Customer[];
  bookings: Booking[];
  payments: Payment[];
} {
  const customers: Customer[] = [];
  const bookings: Booking[] = [];
  const payments: Payment[] = [];
  const now = new Date().toISOString();

  inputs.forEach((input, index) => {
    const court = COURTS[input.courtIndex]!;
    const date = addDaysIso(todayIso(), input.dayOffset);
    const startsAt = clubDateTimeToIso(date, input.time);
    const endsAt = new Date(
      new Date(startsAt).getTime() + input.duration * 60_000,
    ).toISOString();

    const baseHourly = 1000000;
    const priceTotalCents = priceFor(baseHourly, input.duration);
    const depositAmountCents = Math.round((priceTotalCents * DEMO_CLUB.depositPercent) / 100);
    const paidAmountCents =
      input.status === 'CONFIRMED' || input.status === 'COMPLETED'
        ? depositAmountCents
        : input.paidRatio
          ? Math.round(priceTotalCents * input.paidRatio)
          : 0;

    const customer: Customer = {
      id: `customer-${index + 1}`,
      fullName: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    customers.push(customer);

    const code = `PC-${String(100000 + index).slice(0)}`;

    const isManualCash = index === 1;

    const booking: Booking = {
      id: `booking-${index + 1}`,
      code,
      courtId: court.id,
      courtName: court.name,
      customer,
      startsAt,
      endsAt,
      durationMinutes: input.duration,
      status: input.status,
      source: input.source,
      paymentMethod: input.paymentMethod ?? null,
      priceTotalCents,
      depositAmountCents,
      currency: 'ARS',
      paidAmountCents,
      pricingSnapshot: {
        ruleId: 'price-1',
        priceCents: priceTotalCents,
        depositAmountCents,
        currency: 'ARS',
        durationMinutes: input.duration,
        appliedAt: now,
      },
      notes: '',
      expiresAt: input.status === 'PENDING_PAYMENT' ? addDaysIso(todayIso(), 0) : null,
      confirmedAt:
        input.status === 'CONFIRMED' || input.status === 'COMPLETED' ? now : null,
      cancelledAt: input.status === 'CANCELLED' ? now : null,
      cancellationReason: input.status === 'CANCELLED' ? 'Cancelada por el cliente' : null,
      createdAt: now,
      updatedAt: now,
    };
    bookings.push(booking);

    if (paidAmountCents > 0) {
      payments.push({
        id: `payment-${index + 1}`,
        bookingId: booking.id,
        bookingCode: booking.code,
        provider: isManualCash ? 'MANUAL' : 'MERCADOPAGO',
        providerPaymentId: isManualCash ? null : `mp-${index + 1}`,
        providerPreferenceId: isManualCash ? null : `pref-${index + 1}`,
        method: isManualCash ? 'CASH' : 'Tarjeta de crédito',
        amountCents: paidAmountCents,
        currency: 'ARS',
        status: 'APPROVED',
        statusDetail: isManualCash ? 'Seña en efectivo' : 'accredited',
        requiresReview: false,
        reviewReason: null,
        paidAt: now,
        refundedAt: null,
        createdAt: now,
      });
    }
  });

  // Un pago declarado por el cliente que todavía no fue verificado por el staff.
  // Alimenta el indicador "requiere revisión" y permite ejercitar la confirmación
  // manual de efectivo/transferencia desde el panel. Nunca cuenta como cobrado.
  const pendingBooking = bookings[2];
  if (pendingBooking) {
    const isTransfer = pendingBooking.paymentMethod === 'TRANSFER';
    payments.push({
      id: 'payment-pending-1',
      bookingId: pendingBooking.id,
      bookingCode: pendingBooking.code,
      provider: 'MANUAL',
      providerPaymentId: null,
      providerPreferenceId: null,
      method: isTransfer ? 'TRANSFER' : 'CASH',
      amountCents: pendingBooking.depositAmountCents,
      currency: 'ARS',
      status: 'PENDING',
      statusDetail: isTransfer ? '000123456789' : null,
      requiresReview: true,
      reviewReason: isTransfer
        ? 'Transferencia declarada por el cliente: verificar la acreditación.'
        : 'Pago en efectivo declarado por el cliente: confirmar al cobrar en el club.',
      paidAt: null,
      refundedAt: null,
      createdAt: now,
    });
  }

  return { customers, bookings, payments };
}

export function createInitialState(): MockState {
  const { customers, bookings, payments } = buildBookingsState([
    {
      courtIndex: 0,
      dayOffset: 0,
      time: '19:00',
      duration: 90,
      status: 'CONFIRMED',
      source: 'ONLINE',
      paymentMethod: 'MERCADOPAGO',
      customerName: 'Martín Gómez',
      customerEmail: 'martin.gomez@example.com',
      customerPhone: '+54 9 11 5555-1111',
    },
    {
      courtIndex: 1,
      dayOffset: 0,
      time: '20:00',
      duration: 60,
      status: 'CONFIRMED',
      source: 'ADMIN',
      paymentMethod: 'CASH',
      customerName: 'Lucía Fernández',
      customerEmail: 'lucia.fernandez@example.com',
      customerPhone: '+54 9 11 5555-2222',
    },
    {
      courtIndex: 2,
      dayOffset: 0,
      time: '18:00',
      duration: 90,
      status: 'PENDING_PAYMENT',
      source: 'ONLINE',
      paymentMethod: 'TRANSFER',
      customerName: 'Diego Ramírez',
      customerEmail: 'diego.ramirez@example.com',
      customerPhone: '+54 9 11 5555-3333',
    },
    {
      courtIndex: 0,
      dayOffset: 1,
      time: '09:00',
      duration: 60,
      status: 'CONFIRMED',
      source: 'ONLINE',
      paymentMethod: 'MERCADOPAGO',
      customerName: 'Carolina Ruiz',
      customerEmail: 'carolina.ruiz@example.com',
      customerPhone: '+54 9 11 5555-4444',
    },
    {
      courtIndex: 1,
      dayOffset: 1,
      time: '21:00',
      duration: 60,
      status: 'CONFIRMED',
      source: 'ADMIN',
      paymentMethod: null,
      customerName: 'Santiago Pereyra',
      customerEmail: 'santiago.pereyra@example.com',
      customerPhone: '+54 9 11 5555-5555',
    },
    {
      courtIndex: 0,
      dayOffset: -1,
      time: '20:00',
      duration: 60,
      status: 'COMPLETED',
      source: 'ONLINE',
      paymentMethod: 'MERCADOPAGO',
      customerName: 'Valentina Ortiz',
      customerEmail: 'valentina.ortiz@example.com',
      customerPhone: '+54 9 11 5555-6666',
    },
    {
      courtIndex: 2,
      dayOffset: -2,
      time: '19:00',
      duration: 90,
      status: 'CANCELLED',
      source: 'ONLINE',
      paymentMethod: 'MERCADOPAGO',
      customerName: 'Facundo Álvarez',
      customerEmail: 'facundo.alvarez@example.com',
      customerPhone: '+54 9 11 5555-7777',
    },
    {
      courtIndex: 1,
      dayOffset: -1,
      time: '21:00',
      duration: 60,
      status: 'NO_SHOW',
      source: 'ONLINE',
      paymentMethod: 'MERCADOPAGO',
      customerName: 'Gaspar Molina',
      customerEmail: 'gaspar.molina@example.com',
      customerPhone: '+54 9 11 5555-8888',
    },
  ]);

  const now = new Date().toISOString();
  const tomorrow = addDaysIso(todayIso(), 1);

  const blocks: CourtBlock[] = [
    {
      id: 'block-1',
      courtId: 'court-3',
      startsAt: clubDateTimeToIso(tomorrow, '12:00'),
      endsAt: clubDateTimeToIso(tomorrow, '14:00'),
      reason: 'Mantenimiento del césped',
      createdAt: now,
    },
  ];

  const users: StaffUser[] = [
    {
      id: 'user-1',
      fullName: 'Administrador Demo',
      email: 'admin@padelclub.example',
      role: 'ADMIN',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
    },
    {
      id: 'user-2',
      fullName: 'Recepción Demo',
      email: 'recepcion@padelclub.example',
      role: 'RECEPTION',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-1',
      actorName: 'Administrador Demo',
      action: 'block.create',
      entity: 'CourtBlock',
      entityId: 'block-1',
      createdAt: now,
    },
  ];

  return {
    courts: COURTS,
    schedule: buildSchedule(),
    pricing: buildPricing(),
    blocks,
    customers,
    bookings,
    payments,
    users,
    settings: {
      clubName: DEMO_CLUB.name,
      depositMode: DEMO_CLUB.depositMode,
      depositPercent: DEMO_CLUB.depositPercent,
      depositFixedAmountCents: DEMO_CLUB.depositFixedAmountCents,
      bookingHoldMinutes: DEMO_CLUB.bookingHoldMinutes,
      cancellationPolicy:
        'Las cancelaciones se aceptan hasta 6 horas antes del turno. Fuera de ese plazo la seña no es reembolsable.',
      // Sin datos reales configurados en la demo: no se muestran alias/CBU inventados.
      bankTransferAlias: '',
      bankTransferCbu: '',
      bankTransferAccountHolder: '',
    },
    auditLogs,
    sequence: 1000,
  };
}
