import type { PaginationMeta, TransactionStatus, TransactionType } from './transaction';

export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface AdminStats {
  totalUsers: number;
  flaggedCount: number;
  totalVolumeToday: number;
  totalVolumeTodayPaise: number;
  totalVolumeWeek: number;
  totalVolumeWeekPaise: number;
  totalVolumeMonth: number;
  totalVolumeMonthPaise: number;
  revenue: number;
  revenuePaise: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  isBlocked: boolean;
  kycStatus: KycStatus;
  kycTier: 'unverified' | 'verified';
  walletBalance: number;
  walletBalancePaise: number;
  transactionCount: number;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  counterpartyUserId?: string;
  type: TransactionType;
  status: TransactionStatus;
  channel: string;
  category: string;
  amount: number;
  amountPaise: number;
  referenceId: string;
  isFlagged: boolean;
  fraudScore: number;
  fraudReasons: string[];
  createdAt: string;
}

export interface AdminFraudLog {
  id: string;
  userId?: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
  reasons: string[];
  fraudScore: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: PaginationMeta;
}

export interface AdminTransactionsResponse {
  transactions: AdminTransaction[];
  pagination: PaginationMeta;
}

export interface AdminFraudLogsResponse {
  logs: AdminFraudLog[];
  pagination: PaginationMeta;
}
