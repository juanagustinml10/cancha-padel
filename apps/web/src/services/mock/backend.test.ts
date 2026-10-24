import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/errors';
import { clubDateTimeToIso } from '@/lib/datetime';
import { mockBackend } from './backend';

const SEEDED_CODE = 'PC-100000';
const SEEDED_EMAIL = 'martin.gomez@example.com';
// Fecha futura fija (martes): la grilla semanal de la seed cubre todos los días.
const MANUAL_DATE = '2030-05-14';

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

describe('mockBackend · reservas manuales', () => {
  it('rechaza crear una reserva manual sin sesión', async () => {
    await mockBackend.logout();
    await expect(
      mockBackend.createManualBooking({
        courtId: 'court-1',
        startsAt: clubDateTimeToIso(MANUAL_DATE, '19:00'),
        durationMinutes: 60,
        customer: {
          fullName: 'Sin Sesión',
          email: 'sin.sesion@example.com',
          phone: '+54 9 11 0000-1111',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectApiError(error, 'UNAUTHENTICATED', 401);
      return true;
    });
  });

  it('crea una reserva manual confirmada por defecto, sin vencimiento y con el medio de pago guardado', async () => {
    await mockBackend.login('admin@padelclub.example', 'admin123');
    const booking = await mockBackend.createManualBooking({
      courtId: 'court-1',
      startsAt: clubDateTimeToIso(MANUAL_DATE, '19:00'),
      durationMinutes: 60,
      customer: {
        fullName: 'Ana Manual',
        email: 'ana.manual@example.com',
        phone: '+54 9 11 9999-0000',
      },
      paymentMethod: 'CASH',
    });
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.source).toBe('ADMIN');
    expect(booking.paymentMethod).toBe('CASH');
    expect(booking.expiresAt).toBeNull();
    expect(booking.confirmedAt).not.toBeNull();
  });

  it('rechaza una reserva manual que se solapa con otra (SLOT_TAKEN)', async () => {
    await expect(
      mockBackend.createManualBooking({
        courtId: 'court-1',
        startsAt: clubDateTimeToIso(MANUAL_DATE, '19:30'),
        durationMinutes: 60,
        customer: {
          fullName: 'Otra Persona',
          email: 'otra.persona@example.com',
          phone: '+54 9 11 8888-0000',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expectApiError(error, 'SLOT_TAKEN', 409);
      return true;
    });
  });

  it('crea una reserva manual con pago pendiente sin vencimiento y la confirma', async () => {
    const booking = await mockBackend.createManualBooking({
      courtId: 'court-2',
      startsAt: clubDateTimeToIso(MANUAL_DATE, '19:00'),
      durationMinutes: 90,
      customer: {
        fullName: 'Ana Manual',
        email: 'ana.manual@example.com',
        phone: '+54 9 11 9999-0000',
      },
      status: 'PENDING_PAYMENT',
      paymentMethod: 'TRANSFER',
    });
    expect(booking.status).toBe('PENDING_PAYMENT');
    expect(booking.paymentMethod).toBe('TRANSFER');
    expect(booking.expiresAt).toBeNull();
    expect(booking.confirmedAt).toBeNull();

    const confirmed = await mockBackend.confirmBooking(booking.id);
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.expiresAt).toBeNull();
  });

  it('no permite confirmar una reserva que no está pendiente de pago', async () => {
    // booking-1 es la reserva sembrada de Martín Gómez, ya CONFIRMED.
    await expect(mockBackend.confirmBooking('booking-1')).rejects.toSatisfy(
      (error: unknown) => {
        expectApiError(error, 'INVALID_TRANSITION', 422);
        return true;
      },
    );
  });
});
