import { Router } from 'express';
import {
  adminPaginationQuerySchema,
  adminTransactionsQuerySchema,
  adminUserParamsSchema,
  adminUsersQuerySchema,
  blockUser,
  blockUserSchema,
  getAdminTransactions,
  getAdminUsers,
  getFraudLogs,
  getStats
} from '../controllers/adminController.js';
import {
  approveKycController,
  kycUserParamsSchema,
  rejectKycController,
  rejectKycSchema
} from '../controllers/kycController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get('/users', validate({ query: adminUsersQuerySchema }), getAdminUsers);
adminRouter.get('/transactions', validate({ query: adminTransactionsQuerySchema }), getAdminTransactions);
adminRouter.get('/stats', getStats);
adminRouter.put(
  '/users/:id/block',
  validate({ params: adminUserParamsSchema, body: blockUserSchema }),
  blockUser
);
adminRouter.get('/fraud-logs', validate({ query: adminPaginationQuerySchema }), getFraudLogs);
adminRouter.put('/kyc/:userId/approve', validate({ params: kycUserParamsSchema }), approveKycController);
adminRouter.put(
  '/kyc/:userId/reject',
  validate({ params: kycUserParamsSchema, body: rejectKycSchema }),
  rejectKycController
);
