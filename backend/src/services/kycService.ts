import { Types } from 'mongoose';
import { KYCModel } from '../models/KYC.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { createNotification } from './notificationService.js';

interface SubmitKycInput {
  userId: string;
  aadhaarPath: string;
  panPath: string;
}

interface ReviewKycInput {
  userId: string;
  adminUserId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export const submitKyc = async (input: SubmitKycInput) => {
  const kyc = await KYCModel.findOneAndUpdate(
    { userId: input.userId },
    {
      $set: {
        aadhaarPath: input.aadhaarPath,
        panPath: input.panPath,
        status: 'pending',
        rejectionReason: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined
      }
    },
    { upsert: true, new: true }
  ).exec();

  await UserModel.findByIdAndUpdate(input.userId, { $set: { kycStatus: 'pending' } }).exec();

  return {
    status: kyc.status,
    aadhaarPath: kyc.aadhaarPath,
    panPath: kyc.panPath,
    submittedAt: kyc.updatedAt
  };
};

export const getKycStatus = async (userId: string) => {
  const [user, kyc] = await Promise.all([
    UserModel.findById(userId).select('kycStatus kycTier').exec(),
    KYCModel.findOne({ userId }).exec()
  ]);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return {
    status: user.kycStatus,
    tier: user.kycTier,
    rejectionReason: kyc?.rejectionReason,
    submittedAt: kyc?.createdAt,
    reviewedAt: kyc?.reviewedAt
  };
};

export const reviewKyc = async (input: ReviewKycInput) => {
  const kyc = await KYCModel.findOne({ userId: input.userId }).exec();

  if (!kyc) {
    throw new AppError('KYC submission not found', 404, 'KYC_NOT_FOUND');
  }

  const isApproved = input.action === 'approve';
  kyc.status = isApproved ? 'verified' : 'rejected';
  kyc.reviewedBy = new Types.ObjectId(input.adminUserId);
  kyc.reviewedAt = new Date();

  if (!isApproved) {
    kyc.rejectionReason = input.reason ?? 'KYC documents rejected';
  }

  await kyc.save();

  await UserModel.findByIdAndUpdate(input.userId, {
    $set: {
      kycStatus: kyc.status,
      kycTier: isApproved ? 'verified' : 'unverified'
    }
  }).exec();

  await createNotification({
    userId: input.userId,
    type: 'kyc',
    title: isApproved ? 'KYC approved' : 'KYC rejected',
    message: isApproved
      ? 'Your PayFlow KYC is verified. Higher wallet limits are now active.'
      : kyc.rejectionReason ?? 'Your PayFlow KYC was rejected.',
    metadata: {
      status: kyc.status
    }
  });

  return {
    status: kyc.status,
    reviewedAt: kyc.reviewedAt,
    rejectionReason: kyc.rejectionReason
  };
};
