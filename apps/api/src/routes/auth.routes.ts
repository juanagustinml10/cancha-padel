import { Router } from 'express';
import { loginSchema } from '@padel/shared';
import { env } from '@/config/env';
import { SESSION_COOKIE, SESSION_TTL_MS } from '@/config/constants';
import { asyncHandler } from '@/utils/async-handler';
import { validate } from '@/middleware/validate';
import { authLimiter } from '@/middleware/rate-limit';
import { authenticate, authenticateOptional } from '@/middleware/authenticate';
import { login, logout } from '@/services/auth.service';
import { recordAudit } from '@/services/audit.service';

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await login(email, password, {
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });

    res.cookie(SESSION_COOKIE, result.sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      path: '/',
      maxAge: SESSION_TTL_MS,
    });

    await recordAudit({
      actorId: result.user.id,
      action: 'auth.login',
      entity: 'User',
      entityId: result.user.id,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null,
    });

    res.json(result.user);
  }),
);

authRouter.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    await recordAudit({
      actorId: req.user?.id ?? null,
      action: 'auth.logout',
      entity: 'User',
      entityId: req.user?.id ?? null,
    });
    await logout(req.sessionId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  authenticateOptional,
  asyncHandler(async (req, res) => {
    res.json(req.user ?? null);
  }),
);
