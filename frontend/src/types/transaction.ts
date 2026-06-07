export type TransactionType = 'credit' | 'debit' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'flagged';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ContactSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface TransactionItem {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  channel: string;
  category: string;
  amount: number;
  amountPaise: number;
  balanceAfter: number;
  balanceAfterPaise: number;
  referenceId: string;
  note?: string;
  description: string;
  isFlagged: boolean;
  fraudScore: number;
  fraudReasons: string[];
  counterparty?: ContactSummary;
  createdAt: string;
}

export interface TransactionHistoryResponse {
  transactions: TransactionItem[];
  pagination: PaginationMeta;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: TransactionType | '';
  status?: TransactionStatus | '';
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
}
