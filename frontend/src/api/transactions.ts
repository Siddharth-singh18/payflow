import { apiClient } from './client';
import type { ApiEnvelope } from '../types/auth';
import type { TransactionFilters, TransactionHistoryResponse } from '../types/transaction';

const toIsoDate = (value: string | undefined, endOfDay = false): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date.toISOString();
};

export const getTransactions = async (
  filters: TransactionFilters = {}
): Promise<TransactionHistoryResponse> => {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 10));

  if (filters.type) params.set('type', filters.type);
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', toIsoDate(filters.startDate) ?? '');
  if (filters.endDate) params.set('endDate', toIsoDate(filters.endDate, true) ?? '');
  if (filters.minAmount) params.set('minAmount', filters.minAmount);
  if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);

  const response = await apiClient.get<ApiEnvelope<TransactionHistoryResponse>>('/transactions', {
    params
  });
  return response.data.data;
};
