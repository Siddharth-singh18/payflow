import { z } from 'zod';
import {
  getAdminStats,
  listAdminTransactions,
  listAdminUsers,
  listFraudLogs,
  setUserBlocked
} from '../services/adminService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  kycStatus: z.enum(['not_submitted', 'pending', 'verified', 'rejected']).optional()
});

export const adminTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.enum(['pending', 'completed', 'failed', 'flagged']).optional(),
  flagged: z.coerce.boolean().optional()
});

export const adminPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

export const adminUserParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id')
});

export const blockUserSchema = z.object({
  isBlocked: z.boolean()
});

export const getAdminUsers = asyncHandler(async (req, res) => {
  const query = adminUsersQuerySchema.parse(req.query);
  const result = await listAdminUsers(query);

  res.status(200).json({
    success: true,
    message: 'Admin users fetched successfully',
    data: result
  });
});

export const getAdminTransactions = asyncHandler(async (req, res) => {
  const query = adminTransactionsQuerySchema.parse(req.query);
  const result = await listAdminTransactions(query);

  res.status(200).json({
    success: true,
    message: 'Admin transactions fetched successfully',
    data: result
  });
});

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await getAdminStats();

  res.status(200).json({
    success: true,
    message: 'Admin stats fetched successfully',
    data: { stats }
  });
});

export const blockUser = asyncHandler(async (req, res) => {
  const params = adminUserParamsSchema.parse(req.params);
  const body = blockUserSchema.parse(req.body);
  const user = await setUserBlocked(params.id, body.isBlocked);

  res.status(200).json({
    success: true,
    message: body.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
    data: { user }
  });
});

export const getFraudLogs = asyncHandler(async (req, res) => {
  const query = adminPaginationQuerySchema.parse(req.query);
  const result = await listFraudLogs(query);

  res.status(200).json({
    success: true,
    message: 'Fraud logs fetched successfully',
    data: result
  });
});
