import { z } from 'zod';
import {
  cancelSchedule,
  createSchedule,
  listSchedules
} from '../services/scheduleService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createScheduleSchema = z.object({
  recipient: z.string().trim().min(3).max(120),
  amount: z.number().positive().max(100000),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.string().datetime().transform((value) => new Date(value)),
  note: z.string().trim().max(180).optional()
});

export const scheduleParamsSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid schedule id')
});

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError('Authenticated user missing from request', 401, 'AUTH_USER_MISSING');
  }

  return userId;
};

export const createScheduleController = asyncHandler(async (req, res) => {
  const body = createScheduleSchema.parse(req.body);
  const schedule = await createSchedule({
    userId: getAuthenticatedUserId(req.userId),
    recipient: body.recipient,
    amount: body.amount,
    frequency: body.frequency,
    startDate: body.startDate,
    ...(body.note ? { note: body.note } : {})
  });

  res.status(201).json({
    success: true,
    message: 'Scheduled payment created successfully',
    data: { schedule }
  });
});

export const listSchedulesController = asyncHandler(async (req, res) => {
  const schedules = await listSchedules(getAuthenticatedUserId(req.userId));

  res.status(200).json({
    success: true,
    message: 'Scheduled payments fetched successfully',
    data: { schedules }
  });
});

export const cancelScheduleController = asyncHandler(async (req, res) => {
  const params = scheduleParamsSchema.parse(req.params);
  const schedule = await cancelSchedule(getAuthenticatedUserId(req.userId), params.id);

  res.status(200).json({
    success: true,
    message: 'Scheduled payment cancelled successfully',
    data: { schedule }
  });
});
