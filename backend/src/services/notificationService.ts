import { Types } from 'mongoose';
import { getSocketServer } from '../config/socket.js';
import {
  NotificationModel,
  type NotificationDocument,
  type NotificationType
} from '../models/Notification.js';
import {
  getPaginationMeta,
  getPaginationOptions,
  type PaginationMeta
} from '../utils/paginate.js';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  event?: NotificationSocketEvent;
}

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Date;
}

interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: PaginationMeta;
}

interface ListNotificationsInput {
  page?: number | undefined;
  limit?: number | undefined;
}

type NotificationSocketEvent =
  | 'notification:new'
  | 'notification:read-all'
  | 'payment:sent'
  | 'payment:received';

const toNotificationItem = (notification: NotificationDocument): NotificationItem => ({
  id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  isRead: notification.isRead,
  ...(notification.metadata ? { metadata: notification.metadata } : {}),
  createdAt: notification.createdAt
});

export const emitToUser = (
  userId: string,
  event: NotificationSocketEvent,
  payload: Record<string, unknown>
): void => {
  getSocketServer()?.to(userId).emit(event, payload);
};

export const createNotification = async (
  input: CreateNotificationInput
): Promise<NotificationItem> => {
  const notification = await NotificationModel.create({
    userId: new Types.ObjectId(input.userId),
    type: input.type,
    title: input.title,
    message: input.message,
    ...(input.metadata ? { metadata: input.metadata } : {})
  });

  const item = toNotificationItem(notification);
  emitToUser(input.userId, input.event ?? 'notification:new', { notification: item });

  return item;
};

export const listNotifications = async (
  userId: string,
  input: ListNotificationsInput
): Promise<NotificationListResponse> => {
  const pagination = getPaginationOptions(input);
  const userObjectId = new Types.ObjectId(userId);

  const [notifications, total, unreadCount] = await Promise.all([
    NotificationModel.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .exec(),
    NotificationModel.countDocuments({ userId: userObjectId }).exec(),
    NotificationModel.countDocuments({ userId: userObjectId, isRead: false }).exec()
  ]);

  return {
    notifications: notifications.map(toNotificationItem),
    unreadCount,
    pagination: getPaginationMeta(total, pagination.page, pagination.limit)
  };
};

export const markAllNotificationsRead = async (userId: string): Promise<number> => {
  const result = await NotificationModel.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } }
  ).exec();

  emitToUser(userId, 'notification:read-all', { modifiedCount: result.modifiedCount });

  return result.modifiedCount;
};

export const notifyPaymentDebit = async (input: {
  userId: string;
  amount: number;
  to: string;
  balance: number;
  referenceId: string;
}): Promise<void> => {
  await createNotification({
    userId: input.userId,
    type: 'payment',
    title: 'Payment sent',
    message: `₹${String(input.amount)} sent to ${input.to}`,
    event: 'payment:sent',
    metadata: {
      amount: input.amount,
      to: input.to,
      balance: input.balance,
      referenceId: input.referenceId
    }
  });
};

export const notifyPaymentCredit = async (input: {
  userId: string;
  amount: number;
  from: string;
  balance: number;
  referenceId: string;
}): Promise<void> => {
  await createNotification({
    userId: input.userId,
    type: 'payment',
    title: 'Payment received',
    message: `₹${String(input.amount)} received from ${input.from}`,
    event: 'payment:received',
    metadata: {
      amount: input.amount,
      from: input.from,
      balance: input.balance,
      referenceId: input.referenceId
    }
  });
};

export const notifyWalletCredit = async (input: {
  userId: string;
  amount: number;
  source: string;
  balance: number;
  referenceId: string;
}): Promise<void> => {
  await createNotification({
    userId: input.userId,
    type: 'payment',
    title: 'Wallet credited',
    message: `₹${String(input.amount)} added via ${input.source}`,
    event: 'payment:received',
    metadata: {
      amount: input.amount,
      from: input.source,
      balance: input.balance,
      referenceId: input.referenceId
    }
  });
};
