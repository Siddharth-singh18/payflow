import { Types, type FilterQuery } from 'mongoose';
import {
  TransactionModel,
  type Transaction,
  type TransactionStatus,
  type TransactionType
} from '../models/Transaction.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  getPaginationMeta,
  getPaginationOptions,
  type PaginationMeta
} from '../utils/paginate.js';

interface TransactionFilters {
  page?: number | undefined;
  limit?: number | undefined;
  type?: TransactionType | undefined;
  status?: TransactionStatus | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
}

interface ContactSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface TransactionHistoryItem {
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
  createdAt: Date;
}

interface TransactionHistoryResponse {
  transactions: TransactionHistoryItem[];
  pagination: PaginationMeta;
}

interface MonthlyCategorySpend {
  month: string;
  category: string;
  amount: number;
  amountPaise: number;
  count: number;
}

interface DailyVolume {
  date: string;
  amount: number;
  amountPaise: number;
  count: number;
}

interface TopContact {
  userId: string;
  name: string;
  email: string;
  phone: string;
  transferCount: number;
  totalAmount: number;
  totalAmountPaise: number;
}

interface SentReceivedSummary {
  totalSent: number;
  totalSentPaise: number;
  totalReceived: number;
  totalReceivedPaise: number;
}

interface AverageAmountSummary {
  averageAmount: number;
  averageAmountPaise: number;
  transactionCount: number;
}

interface TransactionAnalyticsResponse {
  monthlySpendingByCategory: MonthlyCategorySpend[];
  dailyTransactionVolume: DailyVolume[];
  topContacts: TopContact[];
  sentVsReceivedThisMonth: SentReceivedSummary;
  averageTransactionAmount: AverageAmountSummary;
}

interface MonthlyCategorySpendRow {
  _id: {
    month: string;
    category: string;
  };
  amountPaise: number;
  count: number;
}

interface DailyVolumeRow {
  _id: string;
  amountPaise: number;
  count: number;
}

interface TopContactRow {
  _id: Types.ObjectId;
  transferCount: number;
  totalAmountPaise: number;
  contact?: Array<{
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone: string;
  }>;
}

interface SentReceivedRow {
  _id: TransactionType;
  amountPaise: number;
}

interface AverageAmountRow {
  _id: null;
  averageAmountPaise: number;
  transactionCount: number;
}

const toPaise = (amount: number): number => Math.round(amount * 100);
const toRupees = (paise: number): number => paise / 100;

const toObjectId = (userId: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid authenticated user id', 401, 'INVALID_AUTH_USER');
  }

  return new Types.ObjectId(userId);
};

const buildTransactionFilter = (
  userId: string,
  filters: TransactionFilters
): FilterQuery<Transaction> => {
  const query: FilterQuery<Transaction> = {
    userId: toObjectId(userId)
  };

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    const createdAtFilter: { $gte?: Date; $lte?: Date } = {};

    if (filters.startDate) {
      createdAtFilter.$gte = filters.startDate;
    }

    if (filters.endDate) {
      createdAtFilter.$lte = filters.endDate;
    }

    query.createdAt = createdAtFilter;
  }

  if (filters.minAmount || filters.maxAmount) {
    const amountFilter: { $gte?: number; $lte?: number } = {};

    if (filters.minAmount) {
      amountFilter.$gte = toPaise(filters.minAmount);
    }

    if (filters.maxAmount) {
      amountFilter.$lte = toPaise(filters.maxAmount);
    }

    query.amount = amountFilter;
  }

  return query;
};

export const listTransactions = async (
  userId: string,
  filters: TransactionFilters
): Promise<TransactionHistoryResponse> => {
  const pagination = getPaginationOptions(filters);
  const query = buildTransactionFilter(userId, filters);

  const [transactions, total] = await Promise.all([
    TransactionModel.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .exec(),
    TransactionModel.countDocuments(query).exec()
  ]);

  const counterpartyIds = transactions
    .map((transaction) => transaction.counterpartyUserId)
    .filter((counterpartyId): counterpartyId is Types.ObjectId => Boolean(counterpartyId));

  const counterparties = await UserModel.find({ _id: { $in: counterpartyIds } })
    .select('name email phone')
    .exec();

  const counterpartyMap = new Map(
    counterparties.map((user) => [
      user._id.toString(),
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    ])
  );

  return {
    transactions: transactions.map((transaction) => {
      const counterparty = transaction.counterpartyUserId
        ? counterpartyMap.get(transaction.counterpartyUserId.toString())
        : undefined;

      return {
        id: transaction._id.toString(),
        type: transaction.type,
        status: transaction.status,
        channel: transaction.channel,
        category: transaction.category,
        amount: toRupees(transaction.amount),
        amountPaise: transaction.amount,
        balanceAfter: toRupees(transaction.balanceAfter),
        balanceAfterPaise: transaction.balanceAfter,
        referenceId: transaction.referenceId,
        ...(transaction.note ? { note: transaction.note } : {}),
        description: transaction.description,
        isFlagged: transaction.isFlagged,
        fraudScore: transaction.fraudScore,
        fraudReasons: transaction.fraudReasons,
        ...(counterparty ? { counterparty } : {}),
        createdAt: transaction.createdAt
      };
    }),
    pagination: getPaginationMeta(total, pagination.page, pagination.limit)
  };
};

export const getTransactionAnalytics = async (
  userId: string
): Promise<TransactionAnalyticsResponse> => {
  const userObjectId = toObjectId(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    monthlySpendingRows,
    dailyVolumeRows,
    topContactRows,
    sentReceivedRows,
    averageAmountRows
  ] = await Promise.all([
    TransactionModel.aggregate<MonthlyCategorySpendRow>([
      {
        $match: {
          userId: userObjectId,
          type: 'debit',
          status: 'completed',
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            category: '$category'
          },
          amountPaise: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1, '_id.category': 1 } }
    ]).exec(),
    TransactionModel.aggregate<DailyVolumeRow>([
      {
        $match: {
          userId: userObjectId,
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          amountPaise: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).exec(),
    TransactionModel.aggregate<TopContactRow>([
      {
        $match: {
          userId: userObjectId,
          status: 'completed',
          channel: 'wallet',
          counterpartyUserId: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$counterpartyUserId',
          transferCount: { $sum: 1 },
          totalAmountPaise: { $sum: '$amount' }
        }
      },
      { $sort: { transferCount: -1, totalAmountPaise: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'contact'
        }
      },
      { $project: { transferCount: 1, totalAmountPaise: 1, contact: 1 } }
    ]).exec(),
    TransactionModel.aggregate<SentReceivedRow>([
      {
        $match: {
          userId: userObjectId,
          status: 'completed',
          type: { $in: ['credit', 'debit'] },
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$type',
          amountPaise: { $sum: '$amount' }
        }
      }
    ]).exec(),
    TransactionModel.aggregate<AverageAmountRow>([
      {
        $match: {
          userId: userObjectId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          averageAmountPaise: { $avg: '$amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]).exec()
  ]);

  const sentPaise = sentReceivedRows.find((row) => row._id === 'debit')?.amountPaise ?? 0;
  const receivedPaise = sentReceivedRows.find((row) => row._id === 'credit')?.amountPaise ?? 0;
  const averageAmountPaise = Math.round(averageAmountRows[0]?.averageAmountPaise ?? 0);

  return {
    monthlySpendingByCategory: monthlySpendingRows.map((row) => ({
      month: row._id.month,
      category: row._id.category,
      amount: toRupees(row.amountPaise),
      amountPaise: row.amountPaise,
      count: row.count
    })),
    dailyTransactionVolume: dailyVolumeRows.map((row) => ({
      date: row._id,
      amount: toRupees(row.amountPaise),
      amountPaise: row.amountPaise,
      count: row.count
    })),
    topContacts: topContactRows
      .map((row) => {
        const contact = row.contact?.[0];

        if (!contact) {
          return null;
        }

        return {
          userId: row._id.toString(),
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          transferCount: row.transferCount,
          totalAmount: toRupees(row.totalAmountPaise),
          totalAmountPaise: row.totalAmountPaise
        };
      })
      .filter((contact): contact is TopContact => Boolean(contact)),
    sentVsReceivedThisMonth: {
      totalSent: toRupees(sentPaise),
      totalSentPaise: sentPaise,
      totalReceived: toRupees(receivedPaise),
      totalReceivedPaise: receivedPaise
    },
    averageTransactionAmount: {
      averageAmount: toRupees(averageAmountPaise),
      averageAmountPaise,
      transactionCount: averageAmountRows[0]?.transactionCount ?? 0
    }
  };
};
