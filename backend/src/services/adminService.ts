import type { FilterQuery, Types } from 'mongoose';
import { AuditLogModel, type AuditLog } from '../models/AuditLog.js';
import {
  TransactionModel,
  type Transaction,
  type TransactionStatus
} from '../models/Transaction.js';
import { UserModel, type User } from '../models/User.js';
import { WalletModel } from '../models/Wallet.js';
import type { KycStatus } from '../types/auth.js';
import { AppError } from '../utils/AppError.js';
import { getPaginationMeta, getPaginationOptions } from '../utils/paginate.js';

interface AdminPaginationInput {
  page?: number | undefined;
  limit?: number | undefined;
}

interface AdminUsersInput extends AdminPaginationInput {
  search?: string | undefined;
  kycStatus?: KycStatus | undefined;
}

interface AdminTransactionsInput extends AdminPaginationInput {
  status?: TransactionStatus | undefined;
  flagged?: boolean | undefined;
}

const toRupees = (paise: number): number => paise / 100;

export const listAdminUsers = async (input: AdminUsersInput) => {
  const pagination = getPaginationOptions(input);
  const query: FilterQuery<User> = {};

  if (input.kycStatus) {
    query.kycStatus = input.kycStatus;
  }

  if (input.search) {
    query.$or = [
      { name: { $regex: input.search, $options: 'i' } },
      { email: { $regex: input.search, $options: 'i' } },
      { phone: { $regex: input.search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    UserModel.find(query).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).exec(),
    UserModel.countDocuments(query).exec()
  ]);

  const userIds = users.map((user) => user._id);
  const [wallets, transactionCounts] = await Promise.all([
    WalletModel.find({ userId: { $in: userIds } }).select('userId balance').exec(),
    TransactionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]).exec()
  ]);

  const walletMap = new Map(wallets.map((wallet) => [wallet.userId.toString(), wallet.balance]));
  const countMap = new Map(transactionCounts.map((row) => [row._id.toString(), row.count]));

  return {
    users: users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isBlocked: user.isBlocked,
      kycStatus: user.kycStatus,
      kycTier: user.kycTier,
      walletBalance: toRupees(walletMap.get(user._id.toString()) ?? 0),
      walletBalancePaise: walletMap.get(user._id.toString()) ?? 0,
      transactionCount: countMap.get(user._id.toString()) ?? 0,
      createdAt: user.createdAt
    })),
    pagination: getPaginationMeta(total, pagination.page, pagination.limit)
  };
};

export const listAdminTransactions = async (input: AdminTransactionsInput) => {
  const pagination = getPaginationOptions(input);
  const query: FilterQuery<Transaction> = {};

  if (input.status) {
    query.status = input.status;
  }

  if (input.flagged !== undefined) {
    query.isFlagged = input.flagged;
  }

  const [transactions, total] = await Promise.all([
    TransactionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .exec(),
    TransactionModel.countDocuments(query).exec()
  ]);

  const userIds = [
    ...new Set(
      transactions
        .flatMap((transaction) => [transaction.userId, transaction.counterpartyUserId])
        .filter((userId): userId is Types.ObjectId => Boolean(userId))
        .map((userId) => userId.toString())
    )
  ];

  const users = await UserModel.find({ _id: { $in: userIds } }).select('name email phone').exec();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  return {
    transactions: transactions.map((transaction) => ({
      id: transaction._id.toString(),
      user: userMap.get(transaction.userId.toString())
        ? {
            id: transaction.userId.toString(),
            name: userMap.get(transaction.userId.toString())?.name,
            email: userMap.get(transaction.userId.toString())?.email,
            phone: userMap.get(transaction.userId.toString())?.phone
          }
        : { id: transaction.userId.toString() },
      counterpartyUserId: transaction.counterpartyUserId?.toString(),
      type: transaction.type,
      status: transaction.status,
      channel: transaction.channel,
      category: transaction.category,
      amount: toRupees(transaction.amount),
      amountPaise: transaction.amount,
      referenceId: transaction.referenceId,
      isFlagged: transaction.isFlagged,
      fraudScore: transaction.fraudScore,
      fraudReasons: transaction.fraudReasons,
      createdAt: transaction.createdAt
    })),
    pagination: getPaginationMeta(total, pagination.page, pagination.limit)
  };
};

export const getAdminStats = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalUsers, flaggedCount, volumes, revenueRows] = await Promise.all([
    UserModel.countDocuments().exec(),
    TransactionModel.countDocuments({ isFlagged: true }).exec(),
    TransactionModel.aggregate<{ _id: string; totalPaise: number }>([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: startOfToday } } },
            { $group: { _id: 'today', totalPaise: { $sum: '$amount' } } }
          ],
          week: [
            { $match: { createdAt: { $gte: startOfWeek } } },
            { $group: { _id: 'week', totalPaise: { $sum: '$amount' } } }
          ],
          month: [{ $group: { _id: 'month', totalPaise: { $sum: '$amount' } } }]
        }
      },
      {
        $project: {
          combined: { $concatArrays: ['$today', '$week', '$month'] }
        }
      },
      { $unwind: '$combined' },
      { $replaceRoot: { newRoot: '$combined' } }
    ]).exec(),
    TransactionModel.aggregate<{ revenuePaise: number }>([
      { $match: { status: 'completed', type: 'credit', channel: 'razorpay', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, revenuePaise: { $sum: { $round: [{ $multiply: ['$amount', 0.002] }, 0] } } } }
    ]).exec()
  ]);

  const volumeMap = new Map(volumes.map((row) => [row._id, row.totalPaise]));
  const revenuePaise = revenueRows[0]?.revenuePaise ?? 0;

  return {
    totalUsers,
    flaggedCount,
    totalVolumeToday: toRupees(volumeMap.get('today') ?? 0),
    totalVolumeTodayPaise: volumeMap.get('today') ?? 0,
    totalVolumeWeek: toRupees(volumeMap.get('week') ?? 0),
    totalVolumeWeekPaise: volumeMap.get('week') ?? 0,
    totalVolumeMonth: toRupees(volumeMap.get('month') ?? 0),
    totalVolumeMonthPaise: volumeMap.get('month') ?? 0,
    revenue: toRupees(revenuePaise),
    revenuePaise
  };
};

export const setUserBlocked = async (userId: string, isBlocked: boolean) => {
  const user = await UserModel.findByIdAndUpdate(userId, { $set: { isBlocked } }, { new: true }).exec();

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return {
    id: user._id.toString(),
    isBlocked: user.isBlocked
  };
};

export const listFraudLogs = async (input: AdminPaginationInput) => {
  const pagination = getPaginationOptions(input);
  const query: FilterQuery<AuditLog> = {
    action: 'fraud.transfer_assessed'
  };

  const [logs, total] = await Promise.all([
    AuditLogModel.find(query).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).exec(),
    AuditLogModel.countDocuments(query).exec()
  ]);

  return {
    logs: logs.map((log) => ({
      id: log._id.toString(),
      userId: log.userId?.toString(),
      action: log.action,
      severity: log.severity,
      reasons: log.reasons,
      fraudScore: log.fraudScore ?? 0,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
      createdAt: log.createdAt
    })),
    pagination: getPaginationMeta(total, pagination.page, pagination.limit)
  };
};
