import { apiClient } from './client';
import type { ApiEnvelope } from '../types/auth';
import type { TransactionAnalytics } from '../types/analytics';

export const getAnalytics = async (): Promise<TransactionAnalytics> => {
  const response =
    await apiClient.get<ApiEnvelope<{ analytics: TransactionAnalytics }>>('/transactions/analytics');
  return response.data.data.analytics;
};
