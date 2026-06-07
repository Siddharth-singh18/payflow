import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleStatus = 'active' | 'cancelled' | 'failed';

export interface ScheduledPayment {
  userId: Types.ObjectId;
  recipient: string;
  amount: number;
  frequency: ScheduleFrequency;
  note?: string;
  nextRunAt: Date;
  lastRunAt?: Date;
  status: ScheduleStatus;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledPaymentDocument = HydratedDocument<ScheduledPayment>;

const scheduledPaymentSchema = new Schema<ScheduledPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true
    },
    note: {
      type: String,
      trim: true,
      maxlength: 180
    },
    nextRunAt: {
      type: Date,
      required: true,
      index: true
    },
    lastRunAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'failed'],
      default: 'active',
      index: true
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 240
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scheduledPaymentSchema.index({ userId: 1, status: 1, nextRunAt: 1 });

export const ScheduledPaymentModel = model<ScheduledPayment>(
  'ScheduledPayment',
  scheduledPaymentSchema
);
