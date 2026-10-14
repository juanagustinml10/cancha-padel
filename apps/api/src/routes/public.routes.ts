import { Router } from 'express';
import { contactSchema } from '@padel/shared';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { bookingLimiter, contactLimiter, checkoutLimiter } from '@/middleware/rate-limit';
import { createCheckout } from '@/services/payments.service';
import {
  createOnlineBooking,
  getBookingByCode,
} from '@/services/bookings.service';
import { getAvailability } from '@/services/availability.service';
import { getCourtById, listActiveCourts } from '@/services/courts.service';
import { getPricingDisplay } from '@/services/pricing.service';
import { getPublicClubInfo } from '@/services/settings.service';
import { getFaqs, getGallery, getPromotions } from '@/services/content.service';
import { sendContact } from '@/services/contact.service';
import {
  availabilityQuerySchema,
  bookingCodeParamSchema,
  bookingQuerySchema,
  checkoutBodySchema,
  onlineBookingBodySchema,
} from './schemas';

export const publicRouter = Router();

/**
 * Emite (o devuelve) la cookie `csrf` legible por JS.
 * El frontend lo usa para inicializar el token antes de la primera petición mutating.
 */
publicRouter.get('/csrf', (_req, res) => {
  res.json({ token: res.locals.csrfToken as string });
});

publicRouter.get(
  '/club',
  asyncHandler(async (_req, res) => {
    res.json(await getPublicClubInfo());
  }),
);

publicRouter.get(
  '/courts',
  asyncHandler(async (_req, res) => {
    res.json(await listActiveCourts());
  }),
);

publicRouter.get(
  '/courts/:id',
  asyncHandler(async (req, res) => {
    res.json(await getCourtById(req.params.id));
  }),
);

publicRouter.get(
  '/pricing',
  asyncHandler(async (_req, res) => {
    res.json(await getPricingDisplay());
  }),
);

publicRouter.get(
  '/availability',
  validate(availabilityQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { date, duration, courtId } = req.query as unknown as {
      date: string;
      duration: number;
      courtId?: string;
    };
    res.json(await getAvailability(date, duration, courtId));
  }),
);

publicRouter.get(
  '/faqs',
  asyncHandler(async (_req, res) => {
    res.json(await getFaqs());
  }),
);

publicRouter.get(
  '/gallery',
  asyncHandler(async (_req, res) => {
    res.json(await getGallery());
  }),
);

publicRouter.get(
  '/promotions',
  asyncHandler(async (_req, res) => {
    res.json(await getPromotions());
  }),
);

publicRouter.post(
  '/contact',
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    res.json(await sendContact(req.body));
  }),
);

publicRouter.post(
  '/bookings',
  bookingLimiter,
  validate(onlineBookingBodySchema),
  asyncHandler(async (req, res) => {
    const booking = await createOnlineBooking(req.body);
    res.status(201).json(booking);
  }),
);

publicRouter.get(
  '/bookings/:code',
  validate(bookingCodeParamSchema, 'params'),
  validate(bookingQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { code } = req.params as { code: string };
    const { email } = req.query as { email?: string };
    res.json(await getBookingByCode(code, email));
  }),
);

publicRouter.post(
  '/bookings/:code/checkout',
  checkoutLimiter,
  validate(bookingCodeParamSchema, 'params'),
  validate(checkoutBodySchema),
  asyncHandler(async (req, res) => {
    const { code } = req.params as { code: string };
    const { email } = req.body as { email: string };
    res.json(await createCheckout(code, email));
  }),
);
