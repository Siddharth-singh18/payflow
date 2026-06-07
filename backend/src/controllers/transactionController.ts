import { z } from 'zod';
import { getTransactionAnalytics, listTransactions } from '../services/transactionService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const optionalDate = z
  .string()
  .datetime()
  .optional()
  .transform((value) => (value ? new Date(value) : undefined));

export const transactionHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    type: z.enum(['credit', 'debit', 'refund']).optional(),
    status: z.enum(['pending', 'completed', 'failed', 'flagged']).optional(),
    startDate: optionalDate,
    endDate: optionalDate,
    minAmount: z.coerce.number().nonnegative().optional(),
    maxAmount: z.coerce.number().nonnegative().optional()
  })
  .refine(
    (query) =>
      !query.startDate || !query.endDate || query.startDate.getTime() <= query.endDate.getTime(),
    {
      message: 'startDate must be before or equal to endDate',
      path: ['startDate']
    }
  )
  .refine(
    (query) =>
      query.minAmount === undefined ||
      query.maxAmount === undefined ||
      query.minAmount <= query.maxAmount,
    {
      message: 'minAmount must be less than or equal to maxAmount',
      path: ['minAmount']
    }
  );

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError('Authenticated user missing from request', 401, 'AUTH_USER_MISSING');
  }

  return userId;
};

export const getTransactionHistory = asyncHandler(async (req, res) => {
  const query = transactionHistoryQuerySchema.parse(req.query);
  const result = await listTransactions(getAuthenticatedUserId(req.userId), query);

  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: result
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getTransactionAnalytics(getAuthenticatedUserId(req.userId));

  res.status(200).json({
    success: true,
    message: 'Transaction analytics fetched successfully',
    data: { analytics }
  });
});
