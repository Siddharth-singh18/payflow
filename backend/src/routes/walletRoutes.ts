import { Router } from 'express';
import {
  getTransactionHistory,
  transactionHistoryQuerySchema
} from '../controllers/transactionController.js';
import {
  addMoney,
  addMoneySchema,
  getBalance,
  getQr,
  payQr,
  payQrSchema,
  transfer,
  transferSchema
} from '../controllers/walletController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const walletRouter = Router();

walletRouter.use(authenticate);

walletRouter.get('/balance', getBalance);
walletRouter.post('/add-money', validate({ body: addMoneySchema }), addMoney);
walletRouter.get('/qr', getQr);
walletRouter.post('/pay-qr', validate({ body: payQrSchema }), payQr);
walletRouter.post('/transfer', validate({ body: transferSchema }), transfer);
walletRouter.get('/transactions', validate({ query: transactionHistoryQuerySchema }), getTransactionHistory);
