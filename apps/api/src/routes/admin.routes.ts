import { Router, type Request } from 'express';
import type { CourtSchedule, PricingRule } from '@padel/shared';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { recordAudit } from '@/services/audit.service';
import { listAuditLogs } from '@/services/audit.service';
import { getDashboard } from '@/services/dashboard.service';
import { getCamerasOverview } from '@/services/cameras.service';
import {
  createCourt,
  deleteCourt,
  listAllCourts,
  updateCourt,
  type CourtInput,
} from '@/services/courts.service';
import { getSchedules, updateSchedules } from '@/services/schedule.service';
import {
  createPricing,
  deletePricing,
  listPricing,
  updatePricing,
  type PricingRuleInput,
} from '@/services/pricing.service';
import { createBlock, deleteBlock, listBlocks } from '@/services/blocks.service';
import {
  cancelBooking,
  createManualBooking,
  getBookingById,
  listBookings,
  markNoShow,
  updateBookingNotes,
  updateBookingStatus,
  type BookingFilters,
  type ManualBookingInput,
} from '@/services/bookings.service';
import {
  getCustomer,
  listCustomers,
  updateCustomer,
  type CustomerUpdateInput,
} from '@/services/customers.service';
import {
  confirmManualPayment,
  listPayments,
  refundPayment,
  registerManualPayment,
  rejectManualPayment,
  type ManualPaymentInput,
} from '@/services/payments.service';
import { getBookingReport, getRevenueReport } from '@/services/reports.service';
import { createUser, listUsers, updateUser } from '@/services/users.service';
import { getClubSettings, toSettingsPayload, updateClubSettings } from '@/services/settings.service';
import {
  blockBodySchema,
  cancelBookingBodySchema,
  courtBodySchema,
  courtUpdateSchema,
  createUserBodySchema,
  customerUpdateSchema,
  customersQuerySchema,
  idParamSchema,
  listBookingsQuerySchema,
  listPaymentsQuerySchema,
  manualBookingBodySchema,
  manualPaymentBodySchema,
  pricingRuleBaseSchema,
  pricingRuleUpdateSchema,
  rejectPaymentBodySchema,
  reportQuerySchema,
  scheduleBodySchema,
  settingsBodySchema,
  updateBookingBodySchema,
  updateUserBodySchema,
} from './schemas';

export const adminRouter = Router();

const staff = [authenticate, authorize('ADMIN', 'RECEPTION')];
const admin = [authenticate, authorize('ADMIN')];

function auditContext(req: Request) {
  return {
    userId: req.user?.id ?? null,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

// ------------------------------ Panel --------------------------------------

adminRouter.get(
  '/dashboard',
  ...staff,
  asyncHandler(async (_req, res) => {
    res.json(await getDashboard());
  }),
);

// ------------------------------ Cámaras ------------------------------------

adminRouter.get(
  '/cameras',
  ...admin,
  asyncHandler(async (_req, res) => {
    res.json(getCamerasOverview());
  }),
);

// ------------------------------ Canchas ------------------------------------

adminRouter.get(
  '/courts',
  ...staff,
  asyncHandler(async (_req, res) => {
    res.json(await listAllCourts());
  }),
);

adminRouter.post(
  '/courts',
  ...admin,
  validate(courtBodySchema),
  asyncHandler(async (req, res) => {
    const court = await createCourt(req.body as CourtInput);
    await recordAudit({ ...auditContext(req), action: 'court.create', entity: 'Court', entityId: court.id });
    res.status(201).json(court);
  }),
);

adminRouter.patch(
  '/courts/:id',
  ...admin,
  validate(idParamSchema, 'params'),
  validate(courtUpdateSchema),
  asyncHandler(async (req, res) => {
    const court = await updateCourt(req.params.id, req.body as Partial<CourtInput>);
    await recordAudit({ ...auditContext(req), action: 'court.update', entity: 'Court', entityId: court.id });
    res.json(court);
  }),
);

adminRouter.delete(
  '/courts/:id',
  ...admin,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteCourt(req.params.id);
    await recordAudit({ ...auditContext(req), action: 'court.delete', entity: 'Court', entityId: req.params.id });
    res.status(204).end();
  }),
);

// ------------------------------ Horarios -----------------------------------

adminRouter.get(
  '/schedules',
  ...staff,
  asyncHandler(async (_req, res) => {
    res.json(await getSchedules());
  }),
);

adminRouter.put(
  '/schedules',
  ...admin,
  validate(scheduleBodySchema),
  asyncHandler(async (req, res) => {
    const schedules = await updateSchedules(req.body as unknown as CourtSchedule[]);
    await recordAudit({ ...auditContext(req), action: 'schedule.update', entity: 'CourtSchedule' });
    res.json(schedules);
  }),
);

// ------------------------------ Precios ------------------------------------

adminRouter.get(
  '/pricing',
  ...staff,
  asyncHandler(async (_req, res) => {
    res.json(await listPricing());
  }),
);

adminRouter.post(
  '/pricing',
  ...admin,
  validate(pricingRuleBaseSchema),
  asyncHandler(async (req, res) => {
    const rule = await createPricing(req.body as PricingRuleInput);
    await recordAudit({ ...auditContext(req), action: 'pricing.create', entity: 'PricingRule', entityId: rule.id });
    res.status(201).json(rule);
  }),
);

adminRouter.patch(
  '/pricing/:id',
  ...admin,
  validate(idParamSchema, 'params'),
  validate(pricingRuleUpdateSchema),
  asyncHandler(async (req, res) => {
    const rule = await updatePricing(req.params.id, req.body as Partial<PricingRule>);
    await recordAudit({ ...auditContext(req), action: 'pricing.update', entity: 'PricingRule', entityId: rule.id });
    res.json(rule);
  }),
);

adminRouter.delete(
  '/pricing/:id',
  ...admin,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deletePricing(req.params.id);
    await recordAudit({ ...auditContext(req), action: 'pricing.delete', entity: 'PricingRule', entityId: req.params.id });
    res.status(204).end();
  }),
);

// ------------------------------ Bloqueos -----------------------------------

adminRouter.get(
  '/blocks',
  ...staff,
  asyncHandler(async (_req, res) => {
    res.json(await listBlocks());
  }),
);

adminRouter.post(
  '/blocks',
  ...staff,
  validate(blockBodySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as { courtId?: string | null; startsAt: string; endsAt: string; reason: string };
    const block = await createBlock({ ...body, createdById: req.user?.id ?? null });
    await recordAudit({ ...auditContext(req), action: 'block.create', entity: 'CourtBlock', entityId: block.id });
    res.status(201).json(block);
  }),
);

adminRouter.delete(
  '/blocks/:id',
  ...staff,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await deleteBlock(req.params.id);
    await recordAudit({ ...auditContext(req), action: 'block.delete', entity: 'CourtBlock', entityId: req.params.id });
    res.status(204).end();
  }),
);

// ------------------------------ Reservas -----------------------------------

adminRouter.get(
  '/bookings',
  ...staff,
  validate(listBookingsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await listBookings(req.query as unknown as BookingFilters));
  }),
);

adminRouter.post(
  '/bookings',
  ...staff,
  validate(manualBookingBodySchema),
  asyncHandler(async (req, res) => {
    const booking = await createManualBooking(req.body as ManualBookingInput, auditContext(req));
    await recordAudit({ ...auditContext(req), action: 'booking.create.manual', entity: 'Booking', entityId: booking.id });
    res.status(201).json(booking);
  }),
);

adminRouter.patch(
  '/bookings/:id',
  ...staff,
  validate(idParamSchema, 'params'),
  validate(updateBookingBodySchema),
  asyncHandler(async (req, res) => {
    const { status, notes } = req.body as {
      status?: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW';
      notes?: string;
    };
    let booking = await getBookingById(req.params.id);
    if (notes !== undefined) {
      booking = await updateBookingNotes(req.params.id, notes);
      await recordAudit({ ...auditContext(req), action: 'booking.notes', entity: 'Booking', entityId: booking.id });
    }
    if (status) {
      booking = await updateBookingStatus(req.params.id, status, auditContext(req));
      await recordAudit({ ...auditContext(req), action: 'booking.update', entity: 'Booking', entityId: booking.id });
    }
    res.json(booking);
  }),
);

adminRouter.post(
  '/bookings/:id/cancel',
  ...staff,
  validate(idParamSchema, 'params'),
  validate(cancelBookingBodySchema),
  asyncHandler(async (req, res) => {
    const { reason } = req.body as { reason: string };
    const booking = await cancelBooking(req.params.id, reason, auditContext(req));
    await recordAudit({ ...auditContext(req), action: 'booking.cancel', entity: 'Booking', entityId: booking.id });
    res.json(booking);
  }),
);

adminRouter.post(
  '/bookings/:id/no-show',
  ...staff,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const booking = await markNoShow(req.params.id, auditContext(req));
    await recordAudit({ ...auditContext(req), action: 'booking.no_show', entity: 'Booking', entityId: booking.id });
    res.json(booking);
  }),
);

// ------------------------------ Clientes -----------------------------------

adminRouter.get(
  '/customers',
  ...staff,
  validate(customersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search } = req.query as { search?: string };
    res.json(await listCustomers(search));
  }),
);

adminRouter.get(
  '/customers/:id',
  ...staff,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json(await getCustomer(req.params.id));
  }),
);

adminRouter.patch(
  '/customers/:id',
  ...staff,
  validate(idParamSchema, 'params'),
  validate(customerUpdateSchema),
  asyncHandler(async (req, res) => {
    const customer = await updateCustomer(req.params.id, req.body as CustomerUpdateInput);
    await recordAudit({ ...auditContext(req), action: 'customer.update', entity: 'Customer', entityId: customer.id });
    res.json(customer);
  }),
);

// ------------------------------ Pagos --------------------------------------

adminRouter.get(
  '/payments',
  ...staff,
  validate(listPaymentsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(
      await listPayments(
        req.query as {
          status?: string;
          provider?: string;
          needsReview?: boolean;
          page?: number;
          pageSize?: number;
        },
      ),
    );
  }),
);

adminRouter.post(
  '/payments/manual',
  ...staff,
  validate(manualPaymentBodySchema),
  asyncHandler(async (req, res) => {
    const payment = await registerManualPayment(req.body as ManualPaymentInput);
    await recordAudit({
      ...auditContext(req),
      action: 'payment.manual',
      entity: 'Payment',
      entityId: payment.id,
      diff: { bookingId: payment.bookingId, amountCents: payment.amountCents, method: payment.method },
    });
    res.status(201).json(payment);
  }),
);

adminRouter.post(
  '/payments/:id/confirm',
  ...staff,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const payment = await confirmManualPayment(req.params.id);
    await recordAudit({ ...auditContext(req), action: 'payment.confirm', entity: 'Payment', entityId: payment.id });
    res.json(payment);
  }),
);

adminRouter.post(
  '/payments/:id/reject',
  ...staff,
  validate(idParamSchema, 'params'),
  validate(rejectPaymentBodySchema),
  asyncHandler(async (req, res) => {
    const { reason } = req.body as { reason?: string };
    const payment = await rejectManualPayment(req.params.id, reason);
    await recordAudit({ ...auditContext(req), action: 'payment.reject', entity: 'Payment', entityId: payment.id, diff: reason ? { reason } : undefined });
    res.json(payment);
  }),
);

adminRouter.post(
  '/payments/:id/refund',
  ...admin,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const payment = await refundPayment(req.params.id);
    await recordAudit({ ...auditContext(req), action: 'payment.refund', entity: 'Payment', entityId: payment.id });
    res.json(payment);
  }),
);

// ------------------------------ Reportes -----------------------------------

adminRouter.get(
  '/reports/bookings',
  ...admin,
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    res.json(await getBookingReport(from, to));
  }),
);

adminRouter.get(
  '/reports/revenue',
  ...admin,
  validate(reportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as unknown as { from: string; to: string };
    res.json(await getRevenueReport(from, to));
  }),
);

// ------------------------------ Usuarios -----------------------------------

adminRouter.get(
  '/users',
  ...admin,
  asyncHandler(async (_req, res) => {
    res.json(await listUsers());
  }),
);

adminRouter.post(
  '/users',
  ...admin,
  validate(createUserBodySchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body as { fullName: string; email: string; role: 'ADMIN' | 'RECEPTION'; password: string });
    await recordAudit({ ...auditContext(req), action: 'user.create', entity: 'User', entityId: user.id });
    res.status(201).json(user);
  }),
);

adminRouter.patch(
  '/users/:id',
  ...admin,
  validate(idParamSchema, 'params'),
  validate(updateUserBodySchema),
  asyncHandler(async (req, res) => {
    const user = await updateUser(req.params.id, req.body as {
      fullName?: string;
      email?: string;
      role?: 'ADMIN' | 'RECEPTION';
      isActive?: boolean;
    });
    await recordAudit({ ...auditContext(req), action: 'user.update', entity: 'User', entityId: user.id });
    res.json(user);
  }),
);

// ------------------------------ Configuración ------------------------------

adminRouter.get(
  '/settings',
  ...admin,
  asyncHandler(async (_req, res) => {
    res.json(toSettingsPayload(await getClubSettings()));
  }),
);

adminRouter.put(
  '/settings',
  ...admin,
  validate(settingsBodySchema),
  asyncHandler(async (req, res) => {
    const settings = await updateClubSettings(req.body as {
      clubName: string;
      depositMode: 'percent' | 'fixed_amount';
      depositPercent: number;
      depositFixedAmountCents: number;
      bookingHoldMinutes: number;
      cancellationPolicy: string;
      bankTransferAlias: string;
      bankTransferCbu: string;
      bankTransferAccountHolder: string;
    });
    await recordAudit({ ...auditContext(req), action: 'settings.update', entity: 'Setting' });
    res.json(settings);
  }),
);

adminRouter.get(
  '/audit-logs',
  ...admin,
  asyncHandler(async (_req, res) => {
    res.json(await listAuditLogs(100));
  }),
);
