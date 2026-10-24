import { z } from 'zod';
import {
  bookingPaymentMethodSchema,
  createBookingSchema,
  emailSchema,
  manualBookingStatusSchema,
  onlineBookingSchema,
  phoneSchema,
} from '@padel/shared';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const time = z.string().regex(TIME_RE, 'Formato esperado HH:mm');
const date = z.string().regex(DATE_RE, 'Formato esperado yyyy-MM-dd');
const isoDateTime = z.string().regex(ISO_DATETIME_RE, 'Se espera una fecha ISO 8601 con offset');
const optionalString = z.string().trim().max(200).optional();

export const availabilityQuerySchema = z.object({
  date,
  duration: z.coerce.number().int().positive().max(240),
  courtId: z.string().optional(),
});

export const bookingCodeParamSchema = z.object({
  code: z.string().min(4).max(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const checkoutBodySchema = z.object({
  email: emailSchema,
});

export const bookingQuerySchema = z.object({
  email: emailSchema.optional(),
});

export const listBookingsQuerySchema = z.object({
  from: date.optional(),
  to: date.optional(),
  courtId: z.string().optional(),
  status: z
    .enum(['PENDING_PAYMENT', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
    .optional(),
  paymentMethod: z.enum(['MERCADOPAGO', 'CASH', 'TRANSFER']).optional(),
  search: optionalString,
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const listPaymentsQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'IN_PROCESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED'])
    .optional(),
  provider: z.enum(['MERCADOPAGO', 'MANUAL']).optional(),
  needsReview: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const customersQuerySchema = z.object({
  search: optionalString,
});

export const reportQuerySchema = z.object({
  from: date,
  to: date,
});

export const courtBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(['INDOOR', 'OUTDOOR']),
  surface: z.string().trim().max(60).optional(),
  hasLighting: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
  description: z.string().trim().max(300).optional(),
});

export const courtUpdateSchema = courtBodySchema.partial();

export const pricingRuleBaseSchema = z
  .object({
    courtId: z.string().nullable().optional(),
    weekday: z.number().int().min(0).max(6).nullable().optional(),
    startTime: time,
    endTime: time,
    durationMinutes: z.number().int().positive().max(240),
    priceCents: z.number().int().nonnegative(),
    currency: z.string().min(3).max(5).default('ARS'),
    validFrom: z.string().optional(),
    validTo: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
    priority: z.number().int().min(0).default(0),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });

export const pricingRuleUpdateSchema = z
  .object({
    courtId: z.string().nullable().optional(),
    weekday: z.number().int().min(0).max(6).nullable().optional(),
    startTime: time.optional(),
    endTime: time.optional(),
    durationMinutes: z.number().int().positive().max(240).optional(),
    priceCents: z.number().int().nonnegative().optional(),
    currency: z.string().min(3).max(5).optional(),
    validFrom: z.string().optional(),
    validTo: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(0).optional(),
  })
  .partial();

export const scheduleBodySchema = z.array(
  z.object({
    id: z.string().optional(),
    courtId: z.string().nullable().optional(),
    weekday: z.number().int().min(0).max(6),
    opensAt: time,
    closesAt: time,
    slotMinutes: z.number().int().positive(),
    isActive: z.boolean(),
  }),
);

export const blockBodySchema = z
  .object({
    courtId: z.string().nullable().optional(),
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    reason: z.string().trim().min(3).max(200),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: 'El fin debe ser posterior al inicio',
    path: ['endsAt'],
  });

// Reserva manual del staff: además de la reserva base admite el medio de pago
// declarado y el estado inicial (confirmada o pendiente de pago).
export const manualBookingBodySchema = createBookingSchema.extend({
  paymentMethod: bookingPaymentMethodSchema.optional(),
  status: manualBookingStatusSchema.optional(),
});

// Reserva online: incluye el medio de pago elegido por el cliente.
export const onlineBookingBodySchema = onlineBookingSchema;

export const cancelBookingBodySchema = z.object({
  reason: z.string().trim().min(3).max(200),
});

export const updateBookingStatusBodySchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'NO_SHOW']),
});

// Campos que el staff puede modificar en una reserva: estado (transición válida) y
// observaciones. No se permite reprogramar para no romper la garantía anti-solapamiento.
export const updateBookingBodySchema = z
  .object({
    status: z.enum(['CONFIRMED', 'COMPLETED', 'NO_SHOW']).optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal('')),
  })
  .refine((value) => value.status !== undefined || value.notes !== undefined, {
    message: 'Indicá al menos un campo para actualizar.',
  });

export const manualPaymentBodySchema = z.object({
  bookingId: z.string().min(1, 'Seleccioná una reserva'),
  amountCents: z.number().int().positive('El importe debe ser mayor a cero'),
  method: z.enum(['CASH', 'TRANSFER', 'OTHER']),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});

export const rejectPaymentBodySchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

export const customerUpdateSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .partial();

export const createUserBodySchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: emailSchema,
  role: z.enum(['ADMIN', 'RECEPTION']),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(200),
});

export const updateUserBodySchema = z
  .object({
    fullName: z.string().trim().min(3).max(120).optional(),
    email: emailSchema.optional(),
    role: z.enum(['ADMIN', 'RECEPTION']).optional(),
    isActive: z.boolean().optional(),
  })
  .partial();

export const settingsBodySchema = z.object({
  clubName: z.string().trim().min(2).max(80),
  depositMode: z.enum(['percent', 'fixed_amount']),
  depositPercent: z.number().min(0).max(100),
  depositFixedAmountCents: z.number().int().nonnegative(),
  bookingHoldMinutes: z.number().int().min(5).max(240),
  cancellationPolicy: z.string().max(1000),
  bankTransferAlias: z.string().trim().max(120).optional(),
  bankTransferCbu: z.string().trim().max(40).optional(),
  bankTransferAccountHolder: z.string().trim().max(120).optional(),
});
