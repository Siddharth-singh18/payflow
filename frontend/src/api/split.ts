import { apiClient } from './client';
import type { ApiEnvelope } from '../types/auth';
import type { SplitBill } from '../types/split';
import type { TransferResult } from '../types/wallet';

export interface CreateSplitPayload {
  title: string;
  totalAmount: number;
  splitType: 'equal' | 'custom';
  participants: Array<{
    userId: string;
    amount?: number | undefined;
  }>;
}

export const getSplits = async (): Promise<SplitBill[]> => {
  const response = await apiClient.get<ApiEnvelope<{ splits: SplitBill[] }>>('/split');
  return response.data.data.splits;
};

export const createSplit = async (payload: CreateSplitPayload): Promise<SplitBill> => {
  const response = await apiClient.post<ApiEnvelope<{ split: SplitBill }>>('/split/create', payload);
  return response.data.data.split;
};

export const settleSplit = async (
  splitId: string
): Promise<{ splitId: string; status: string; transfer: TransferResult }> => {
  const response = await apiClient.post<
    ApiEnvelope<{ splitId: string; status: string; transfer: TransferResult }>
  >(`/split/${splitId}/settle`);
  return response.data.data;
};
