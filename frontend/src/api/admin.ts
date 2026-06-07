import { apiClient } from './client';
import type {
  AdminFraudLogsResponse,
  AdminStats,
  AdminTransactionsResponse,
  AdminUsersResponse,
  KycStatus
} from '../types/admin';
import type { ApiEnvelope } from '../types/auth';
import type { TransactionStatus } from '../types/transaction';

export interface AdminUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  kycStatus?: KycStatus | '';
}

export interface AdminTransactionsFilters {
  page?: number;
  limit?: number;
  status?: TransactionStatus | '';
  flagged?: boolean | '';
}

const appendParam = (params: URLSearchParams, key: string, value: string | number | boolean | undefined): void => {
  if (value !== undefined && value !== '') {
    params.set(key, String(value));
  }
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await apiClient.get<ApiEnvelope<{ stats: AdminStats }>>('/admin/stats');
  return response.data.data.stats;
};

export const getAdminUsers = async (
  filters: AdminUsersFilters = {}
): Promise<AdminUsersResponse> => {
  const params = new URLSearchParams();
  appendParam(params, 'page', filters.page ?? 1);
  appendParam(params, 'limit', filters.limit ?? 8);
  appendParam(params, 'search', filters.search);
  appendParam(params, 'kycStatus', filters.kycStatus);

  const response = await apiClient.get<ApiEnvelope<AdminUsersResponse>>('/admin/users', {
    params
  });
  return response.data.data;
};

export const getAdminTransactions = async (
  filters: AdminTransactionsFilters = {}
): Promise<AdminTransactionsResponse> => {
  const params = new URLSearchParams();
  appendParam(params, 'page', filters.page ?? 1);
  appendParam(params, 'limit', filters.limit ?? 8);
  appendParam(params, 'status', filters.status);
  appendParam(params, 'flagged', filters.flagged);

  const response = await apiClient.get<ApiEnvelope<AdminTransactionsResponse>>(
    '/admin/transactions',
    { params }
  );
  return response.data.data;
};

export const setAdminUserBlocked = async (userId: string, isBlocked: boolean): Promise<void> => {
  await apiClient.put(`/admin/users/${userId}/block`, { isBlocked });
};

export const getAdminFraudLogs = async (page = 1): Promise<AdminFraudLogsResponse> => {
  const response = await apiClient.get<ApiEnvelope<AdminFraudLogsResponse>>('/admin/fraud-logs', {
    params: { page, limit: 6 }
  });
  return response.data.data;
};
