import { Router } from 'express';
import { adminRouter } from './adminRoutes.js';
import { authRouter } from './authRoutes.js';
import { kycRouter } from './kycRoutes.js';
import { notificationRouter } from './notificationRoutes.js';
import { scheduleRouter } from './scheduleRoutes.js';
import { splitRouter } from './splitRoutes.js';
import { transactionRouter } from './transactionRoutes.js';
import { walletRouter } from './walletRoutes.js';
import { webhookRouter } from './webhookRoutes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/kyc', kycRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/transactions', transactionRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/schedule', scheduleRouter);
apiRouter.use('/split', splitRouter);
apiRouter.use('/webhooks', webhookRouter);
