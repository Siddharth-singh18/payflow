export type SplitStatus = 'active' | 'settled' | 'cancelled';
export type SplitParticipantStatus = 'pending' | 'settled';

export interface SplitParticipant {
  userId: string;
  amount: number;
  amountPaise: number;
  status: SplitParticipantStatus;
  settledAt?: string;
  referenceId?: string;
}

export interface SplitBill {
  id: string;
  title: string;
  createdBy: string;
  totalAmount: number;
  totalAmountPaise: number;
  status: SplitStatus;
  participants: SplitParticipant[];
  createdAt: string;
}
