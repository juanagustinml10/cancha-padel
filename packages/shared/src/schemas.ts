import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .email('Ingresá un email válido');

export const phoneSchema = z
  .string()
  .trim()
  .min(8, 'Ingresá un teléfono válido')
  .max(20, 'El teléfono es demasiado largo')
  .regex(/^[0-9+()\s-]+$/, 'El teléfono sólo puede contener números y símbolos');

export const customerSchema = z.object({
  fullName: z.string().trim().min(3, 'Ingresá el nombre completo').max(120),
  email: emailSchema,
  phone: phoneSchema,
});

export const createBookingSchema = z.object({
  courtId: z.string().min(1, 'Seleccioná una cancha'),
  startsAt: z.string().min(1, 'Seleccioná un horario'),
  durationMinutes: z
    .number({ invalid_type_error: 'Seleccioná una duración' })
    .int()
    .positive()
    .max(240),
  customer: customerSchema,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type CreateBookingFormValues = z.infer<typeof createBookingSchema>;

export const bookingPaymentMethodSchema = z.enum(['MERCADOPAGO', 'CASH', 'TRANSFER']);

/**
 * Reserva online: extiende la reserva base con el medio de pago elegido por el
 * cliente. Para transferencias se admite el nro. de operación declarado (opcional).
 */
export const onlineBookingSchema = createBookingSchema.extend({
  paymentMethod: bookingPaymentMethodSchema.default('MERCADOPAGO'),
  transferReference: z
    .string()
    .trim()
    .max(120, 'La referencia es demasiado larga')
    .optional()
    .or(z.literal('')),
});

export type OnlineBookingFormValues = z.infer<typeof onlineBookingSchema>;

export const contactSchema = z.object({
  fullName: z.string().trim().min(3, 'Ingresá tu nombre').max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Contanos un poco más (mínimo 10 caracteres)').max(1000),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const courtSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá un nombre').max(80),
  type: z.enum(['INDOOR', 'OUTDOOR']),
  surface: z.string().trim().max(60).optional().or(z.literal('')),
  hasLighting: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
  description: z.string().trim().max(300).optional().or(z.literal('')),
});

export type CourtFormValues = z.infer<typeof courtSchema>;

export const pricingRuleSchema = z
  .object({
    courtId: z.string().optional().or(z.literal('')),
    weekday: z.string().optional().or(z.literal('')),
    startTime: z.string().min(1, 'Ingresá hora de inicio'),
    endTime: z.string().min(1, 'Ingresá hora de fin'),
    durationMinutes: z.coerce.number().int().positive(),
    priceAmount: z.coerce.number().nonnegative('El precio no puede ser negativo'),
    priority: z.coerce.number().int().min(0),
    isActive: z.boolean(),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });

export type PricingRuleFormValues = z.infer<typeof pricingRuleSchema>;

export const blockSchema = z
  .object({
    courtId: z.string().optional().or(z.literal('')),
    date: z.string().min(1, 'Seleccioná una fecha'),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    reason: z.string().trim().min(3, 'Indicá el motivo').max(200),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });

export type BlockFormValues = z.infer<typeof blockSchema>;

export const manualBookingSchema = z.object({
  courtId: z.string().min(1, 'Seleccioná una cancha'),
  date: z.string().min(1, 'Seleccioná una fecha'),
  startTime: z.string().min(1, 'Seleccioná un horario'),
  durationMinutes: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(3, 'Ingresá el nombre del cliente'),
  email: emailSchema,
  phone: phoneSchema,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type ManualBookingFormValues = z.infer<typeof manualBookingSchema>;

export const userSchema = z.object({
  fullName: z.string().trim().min(3, 'Ingresá el nombre').max(120),
  email: emailSchema,
  role: z.enum(['ADMIN', 'RECEPTION']),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type UserFormValues = z.infer<typeof userSchema>;

export const settingsSchema = z.object({
  clubName: z.string().trim().min(2, 'Ingresá el nombre del club').max(80),
  depositMode: z.enum(['percent', 'fixed_amount']),
  depositPercent: z.coerce.number().min(0).max(100),
  depositFixedAmount: z.coerce.number().nonnegative(),
  bookingHoldMinutes: z.coerce.number().int().min(5).max(240),
  cancellationPolicy: z.string().trim().max(1000),
  bankTransferAlias: z.string().trim().max(120).optional().or(z.literal('')),
  bankTransferCbu: z.string().trim().max(40).optional().or(z.literal('')),
  bankTransferAccountHolder: z.string().trim().max(120).optional().or(z.literal('')),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const manualPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Seleccioná una reserva'),
  amountCents: z.coerce
    .number({ invalid_type_error: 'Ingresá un importe válido' })
    .int()
    .positive('El importe debe ser mayor a cero'),
  method: z.enum(['CASH', 'TRANSFER', 'OTHER']),
  reference: z
    .string()
    .trim()
    .max(80, 'La referencia es demasiado larga')
    .optional()
    .or(z.literal('')),
  note: z
    .string()
    .trim()
    .max(300, 'La observación es demasiado larga')
    .optional()
    .or(z.literal('')),
});

export type ManualPaymentFormValues = z.infer<typeof manualPaymentSchema>;

export const updateBookingNotesSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(1000, 'Las observaciones son demasiado largas')
    .optional()
    .or(z.literal('')),
});

export type UpdateBookingNotesFormValues = z.infer<typeof updateBookingNotesSchema>;
