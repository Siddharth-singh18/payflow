import { Router } from 'express';
import {
  getAnalytics,
  getTransactionHistory,
  transactionHistoryQuerySchema
} from '../controllers/transactionController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const transactionRouter = Router();

transactionRouter.use(authenticate);

transactionRouter.get('/', validate({ query: transactionHistoryQuerySchema }), getTransactionHistory);
transactionRouter.get('/analytics', getAnalytics);
