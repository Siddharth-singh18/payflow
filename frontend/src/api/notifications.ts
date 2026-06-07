import { apiClient } from './client';
import type { ApiEnvelope } from '../types/auth';
import type { NotificationListResponse } from '../types/notification';

export const getNotifications = async (page = 1): Promise<NotificationListResponse> => {
  const response = await apiClient.get<ApiEnvelope<NotificationListResponse>>('/notifications', {
    params: { page, limit: 10 }
  });
  return response.data.data;
};

export const markNotificationsRead = async (): Promise<number> => {
  const response = await apiClient.put<ApiEnvelope<{ modifiedCount: number }>>(
    '/notifications/read-all'
  );
  return response.data.data.modifiedCount;
};
