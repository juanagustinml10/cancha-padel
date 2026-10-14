import { Router } from 'express';
import { publicRouter } from './public.routes';
import { authRouter } from './auth.routes';
import { adminRouter } from './admin.routes';
import { webhooksRouter } from './webhooks.routes';

/** Router raíz montado en `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/webhooks', webhooksRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/', publicRouter);
