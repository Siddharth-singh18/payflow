import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface Wallet {
  userId: Types.ObjectId;
  balance: number;
  currency: 'INR';
  virtualAccountNumber: string;
  isFrozen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type WalletDocument = HydratedDocument<Wallet>;

const walletSchema = new Schema<Wallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      enum: ['INR'],
      default: 'INR'
    },
    virtualAccountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    isFrozen: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

walletSchema.index({ createdAt: -1 });

export const WalletModel = model<Wallet>('Wallet', walletSchema);
