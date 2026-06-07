import type { PaginationMeta } from './transaction';

export type NotificationType = 'payment' | 'kyc' | 'fraud' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  pagination: PaginationMeta;
}

export interface PaymentSocketPayload {
  notification?: NotificationItem;
  amount?: number;
  balance?: number;
  referenceId?: string;
  from?: string;
  to?: string;
}
