import { z } from 'zod';
import { createSplit, listActiveSplits, settleSplitShare } from '../services/splitService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createSplitSchema = z.object({
  title: z.string().trim().min(2).max(120),
  totalAmount: z.number().positive().max(500000),
  splitType: z.enum(['equal', 'custom']),
  participants: z
    .array(
      z.object({
        userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid participant user id'),
        amount: z.number().positive().optional()
      })
    )
    .min(1)
    .max(50)
});

export const splitParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid split id')
});

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError('Authenticated user missing from request', 401, 'AUTH_USER_MISSING');
  }

  return userId;
};

export const createSplitController = asyncHandler(async (req, res) => {
  const body = createSplitSchema.parse(req.body);
  const split = await createSplit({
    createdBy: getAuthenticatedUserId(req.userId),
    title: body.title,
    totalAmount: body.totalAmount,
    splitType: body.splitType,
    participants: body.participants.map((participant) => ({
      userId: participant.userId,
      ...(participant.amount !== undefined ? { amount: participant.amount } : {})
    }))
  });

  res.status(201).json({
    success: true,
    message: 'Split bill created successfully',
    data: { split }
  });
});

export const listSplitsController = asyncHandler(async (req, res) => {
  const splits = await listActiveSplits(getAuthenticatedUserId(req.userId));

  res.status(200).json({
    success: true,
    message: 'Active splits fetched successfully',
    data: { splits }
  });
});

export const settleSplitController = asyncHandler(async (req, res) => {
  const params = splitParamsSchema.parse(req.params);
  const result = await settleSplitShare(params.id, getAuthenticatedUserId(req.userId));

  res.status(200).json({
    success: true,
    message: 'Split share settled successfully',
    data: result
  });
});
