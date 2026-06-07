export interface WalletBalance {
  balance: number;
  balancePaise: number;
  currency: 'INR';
  virtualAccountNumber: string;
  isFrozen: boolean;
}

export interface TransferResult {
  referenceId: string;
  amount: number;
  amountPaise: number;
  senderBalance: number;
  senderBalancePaise: number;
  receiver: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  fraud: {
    score: number;
    isFlagged: boolean;
    reasons: string[];
    requiresAdditionalVerification: boolean;
    temporarilyBlocked: boolean;
  };
}
