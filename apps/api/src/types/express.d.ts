import type { SessionUser } from '@padel/shared';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      sessionId?: string;
      user?: SessionUser;
    }
  }
}

export {};
