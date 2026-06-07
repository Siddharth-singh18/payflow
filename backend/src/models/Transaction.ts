import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type TransactionType = 'credit' | 'debit' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'flagged';
export type TransactionChannel = 'wallet' | 'razorpay' | 'qr' | 'split' | 'scheduled';

export interface Transaction {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  counterpartyUserId?: Types.ObjectId;
  type: TransactionType;
  status: TransactionStatus;
  channel: TransactionChannel;
  amount: number;
  balanceAfter: number;
  currency: 'INR';
  category: string;
  referenceId: string;
  idempotencyKey?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  note?: string;
  description: string;
  metadata?: Record<string, string | number | boolean | null>;
  isFlagged: boolean;
  fraudScore: number;
  fraudReasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionDocument = HydratedDocument<Transaction>;

const transactionSchema = new Schema<Transaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true
    },
    counterpartyUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'refund'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'flagged'],
      required: true,
      index: true
    },
    channel: {
      type: String,
      enum: ['wallet', 'razorpay', 'qr', 'split', 'scheduled'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR'
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: 'wallet_transfer',
      index: true
    },
    referenceId: {
      type: String,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      index: true
    },
    providerOrderId: {
      type: String,
      index: true
    },
    providerPaymentId: {
      type: String
    },
    note: {
      type: String,
      trim: true,
      maxlength: 180
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true
    },
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    fraudReasons: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, category: 1, createdAt: -1 });
transactionSchema.index({ isFlagged: 1, createdAt: -1 });
transactionSchema.index({ referenceId: 1, userId: 1 });
transactionSchema.index({ providerOrderId: 1, userId: 1 });
transactionSchema.index(
  { providerPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerPaymentId: { $exists: true } }
  }
);
transactionSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true } }
  }
);

export const TransactionModel = model<Transaction>('Transaction', transactionSchema);
