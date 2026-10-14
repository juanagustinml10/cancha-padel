import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/app';

const app = createApp();

describe('HTTP · sin base de datos', () => {
  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rechaza métodos mutating sin token CSRF', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@padelclub.example', password: 'admin123' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });

  it('valida el cuerpo y devuelve error uniforme (con CSRF válido)', async () => {
    // Cualquier GET que atraviese el middleware CSRF emite la cookie `csrf`.
    const bootstrap = await request(app).get('/api/v1/ruta-inexistente');
    const setCookie = bootstrap.headers['set-cookie'] as unknown as string[];
    const csrfCookie = setCookie.find((cookie) => cookie.startsWith('csrf='));
    expect(csrfCookie).toBeTruthy();
    const cookiePair = csrfCookie!.split(';')[0];
    const token = cookiePair.split('=')[1];

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', cookiePair)
      .set('x-csrf-token', token)
      .send({ email: 'no-es-un-email', password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 404 uniforme para rutas inexistentes', async () => {
    const res = await request(app).get('/api/v1/ruta-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
