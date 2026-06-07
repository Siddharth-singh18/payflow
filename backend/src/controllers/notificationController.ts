import { z } from 'zod';
import {
  listNotifications,
  markAllNotificationsRead
} from '../services/notificationService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError('Authenticated user missing from request', 401, 'AUTH_USER_MISSING');
  }

  return userId;
};

export const getNotifications = asyncHandler(async (req, res) => {
  const query = notificationQuerySchema.parse(req.query);
  const result = await listNotifications(getAuthenticatedUserId(req.userId), query);

  res.status(200).json({
    success: true,
    message: 'Notifications fetched successfully',
    data: result
  });
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  const modifiedCount = await markAllNotificationsRead(getAuthenticatedUserId(req.userId));

  res.status(200).json({
    success: true,
    message: 'Notifications marked as read',
    data: { modifiedCount }
  });
});
