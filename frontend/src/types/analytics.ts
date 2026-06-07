export interface MonthlyCategorySpend {
  month: string;
  category: string;
  amount: number;
  amountPaise: number;
  count: number;
}

export interface DailyVolume {
  date: string;
  amount: number;
  amountPaise: number;
  count: number;
}

export interface TopContact {
  userId: string;
  name: string;
  email: string;
  phone: string;
  transferCount: number;
  totalAmount: number;
  totalAmountPaise: number;
}

export interface TransactionAnalytics {
  monthlySpendingByCategory: MonthlyCategorySpend[];
  dailyTransactionVolume: DailyVolume[];
  topContacts: TopContact[];
  sentVsReceivedThisMonth: {
    totalSent: number;
    totalSentPaise: number;
    totalReceived: number;
    totalReceivedPaise: number;
  };
  averageTransactionAmount: {
    averageAmount: number;
    averageAmountPaise: number;
    transactionCount: number;
  };
}
