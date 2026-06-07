import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type SplitBillStatus = 'active' | 'settled' | 'cancelled';
export type SplitParticipantStatus = 'pending' | 'settled';

export interface SplitParticipant {
  userId: Types.ObjectId;
  amount: number;
  status: SplitParticipantStatus;
  settledAt?: Date;
  referenceId?: string;
}

export interface SplitBill {
  createdBy: Types.ObjectId;
  title: string;
  totalAmount: number;
  status: SplitBillStatus;
  participants: SplitParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

export type SplitBillDocument = HydratedDocument<SplitBill>;

const splitParticipantSchema = new Schema<SplitParticipant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending',
      index: true
    },
    settledAt: {
      type: Date
    },
    referenceId: {
      type: String
    }
  },
  { _id: false }
);

const splitBillSchema = new Schema<SplitBill>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['active', 'settled', 'cancelled'],
      default: 'active',
      index: true
    },
    participants: {
      type: [splitParticipantSchema],
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

splitBillSchema.index({ createdAt: -1 });
splitBillSchema.index({ 'participants.userId': 1, status: 1, createdAt: -1 });

export const SplitBillModel = model<SplitBill>('SplitBill', splitBillSchema);
