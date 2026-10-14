import type {
  AvailabilityResponse,
  Booking,
  CheckoutResponse,
  ClubInfo,
  ContactMessage,
  Court,
  CreateBookingRequest,
  Faq,
  GalleryImage,
  PricingDisplayRow,
  Promotion,
} from '@padel/shared';
import { apiRequest } from '@/lib/api';
import { env } from '@/lib/env';
import { mockBackend } from './mock/backend';

/**
 * Servicios del sitio público.
 * Cuando `VITE_USE_MOCKS=false` se llaman los endpoints reales (ver docs/api.md).
 * Los datos de demostración están claramente identificados y no representan reservas reales.
 */

export const publicApi = {
  getClubInfo(): Promise<ClubInfo> {
    return env.useMocks ? mockBackend.getClubInfo() : apiRequest<ClubInfo>('/club');
  },

  getCourts(): Promise<Court[]> {
    return env.useMocks ? mockBackend.getCourts() : apiRequest<Court[]>('/courts');
  },

  getPricingDisplay(): Promise<PricingDisplayRow[]> {
    return env.useMocks
      ? mockBackend.getPricingDisplay()
      : apiRequest<PricingDisplayRow[]>('/pricing');
  },

  getAvailability(
    date: string,
    durationMinutes: number,
    courtId?: string,
  ): Promise<AvailabilityResponse> {
    if (env.useMocks) return mockBackend.getAvailability(date, durationMinutes, courtId);
    return apiRequest<AvailabilityResponse>('/availability', {
      query: { date, duration: durationMinutes, courtId },
    });
  },

  getFaqs(): Promise<Faq[]> {
    return env.useMocks ? mockBackend.getFaqs() : apiRequest<Faq[]>('/faqs');
  },

  getGallery(): Promise<GalleryImage[]> {
    return env.useMocks ? mockBackend.getGallery() : apiRequest<GalleryImage[]>('/gallery');
  },

  getPromotions(): Promise<Promotion[]> {
    return env.useMocks ? mockBackend.getPromotions() : apiRequest<Promotion[]>('/promotions');
  },

  sendContact(message: ContactMessage): Promise<{ ok: true }> {
    return env.useMocks
      ? mockBackend.sendContact(message)
      : apiRequest<{ ok: true }>('/contact', { method: 'POST', body: message });
  },

  createBooking(payload: CreateBookingRequest): Promise<Booking> {
    return env.useMocks
      ? mockBackend.createBooking(payload)
      : apiRequest<Booking>('/bookings', { method: 'POST', body: payload });
  },

  getBooking(code: string, email?: string): Promise<Booking> {
    return env.useMocks
      ? mockBackend.getBooking(code, email)
      : apiRequest<Booking>(`/bookings/${encodeURIComponent(code)}`, { query: { email } });
  },

  createCheckout(code: string, email: string): Promise<CheckoutResponse> {
    return env.useMocks
      ? mockBackend.createCheckout(code, email)
      : apiRequest<CheckoutResponse>(`/bookings/${encodeURIComponent(code)}/checkout`, {
          method: 'POST',
          body: { email },
        });
  },
};
