import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type KycDocumentType = 'aadhaar' | 'pan';
export type KycReviewStatus = 'pending' | 'verified' | 'rejected';

export interface KYC {
  userId: Types.ObjectId;
  aadhaarPath: string;
  panPath: string;
  status: KycReviewStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type KYCDocument = HydratedDocument<KYC>;

const kycSchema = new Schema<KYC>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    aadhaarPath: {
      type: String,
      required: true
    },
    panPath: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 240
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

kycSchema.index({ createdAt: -1 });

export const KYCModel = model<KYC>('KYC', kycSchema);
