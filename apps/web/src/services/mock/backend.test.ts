import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/errors';
import { mockBackend } from './backend';

const SEEDED_CODE = 'PC-100000';
const SEEDED_EMAIL = 'martin.gomez@example.com';

function expectApiError(error: unknown, code: string, status: number) {
  expect(error).toBeInstanceOf(ApiError);
  const apiError = error as ApiError;
  expect(apiError.code).toBe(code);
  expect(apiError.status).toBe(status);
}

describe('mockBackend · autenticación', () => {
  it('inicia sesión con credenciales de demostración válidas', async () => {
    const session = await mockBackend.login('admin@padelclub.example', 'admin123');
    expect(session.role).toBe('ADMIN');
    expect(session.email).toBe('admin@padelclub.example');
  });

  it('rechaza credenciales inválidas', async () => {
    await expect(mockBackend.login('admin@padelclub.example', 'incorrecta')).rejects.toSatisfy(
      (error: unknown) => {
        expectApiError(error, 'INVALID_CREDENTIALS', 401);
        return true;
      },
    );
  });
});

describe('mockBackend · pagos no simulados', () => {
  it('nunca emula un pago exitoso: createCheckout queda deshabilitado', async () => {
    await expect(mockBackend.createCheckout(SEEDED_CODE, SEEDED_EMAIL)).rejects.toSatisfy(
      (error: unknown) => {
        expectApiError(error, 'MOCK_PAYMENT_UNAVAILABLE', 503);
        return true;
      },
    );
  });
});

describe('mockBackend · reservas', () => {
  it('devuelve una reserva sembrada por código y email', async () => {
    const booking = await mockBackend.getBooking(SEEDED_CODE, SEEDED_EMAIL);
    expect(booking.code).toBe(SEEDED_CODE);
    expect(booking.status).toBe('CONFIRMED');
  });

  it('protege la reserva cuando el email no coincide', async () => {
    await expect(mockBackend.getBooking(SEEDED_CODE, 'otro@example.com')).rejects.toSatisfy(
      (error: unknown) => {
        expectApiError(error, 'BOOKING_FORBIDDEN', 403);
        return true;
      },
    );
  });

  it('rechaza reservar una cancha inexistente', async () => {
    await expect(
      mockBackend.createBooking({
        courtId: 'no-existe',
        startsAt: new Date().toISOString(),
        durationMinutes: 60,
        customer: { fullName: 'Test', email: 'test@example.com', phone: '+54 9 11 0000-0000' },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectApiError(error, 'COURT_UNAVAILABLE', 400);
      return true;
    });
  });
});
