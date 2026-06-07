import { z } from 'zod';
import { getKycStatus, reviewKyc, submitKyc } from '../services/kycService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const rejectKycSchema = z.object({
  reason: z.string().trim().min(3).max(240).optional()
});

export const kycUserParamsSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id')
});

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError('Authenticated user missing from request', 401, 'AUTH_USER_MISSING');
  }

  return userId;
};

const getKycFiles = (files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] } | undefined) => {
  if (!files || Array.isArray(files)) {
    throw new AppError('Aadhaar and PAN documents are required', 400, 'KYC_FILES_REQUIRED');
  }

  const aadhaar = files.aadhaar?.[0];
  const pan = files.pan?.[0];

  if (!aadhaar || !pan) {
    throw new AppError('Aadhaar and PAN documents are required', 400, 'KYC_FILES_REQUIRED');
  }

  return { aadhaar, pan };
};

export const submitKycController = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req.userId);
  const files = getKycFiles(req.files);
  const result = await submitKyc({
    userId,
    aadhaarPath: files.aadhaar.path,
    panPath: files.pan.path
  });

  res.status(201).json({
    success: true,
    message: 'KYC submitted successfully',
    data: { kyc: result }
  });
});

export const getKycStatusController = asyncHandler(async (req, res) => {
  const status = await getKycStatus(getAuthenticatedUserId(req.userId));

  res.status(200).json({
    success: true,
    message: 'KYC status fetched successfully',
    data: { kyc: status }
  });
});

export const approveKycController = asyncHandler(async (req, res) => {
  const params = kycUserParamsSchema.parse(req.params);
  const result = await reviewKyc({
    userId: params.userId,
    adminUserId: getAuthenticatedUserId(req.userId),
    action: 'approve'
  });

  res.status(200).json({
    success: true,
    message: 'KYC approved successfully',
    data: { kyc: result }
  });
});

export const rejectKycController = asyncHandler(async (req, res) => {
  const params = kycUserParamsSchema.parse(req.params);
  const body = rejectKycSchema.parse(req.body);
  const result = await reviewKyc({
    userId: params.userId,
    adminUserId: getAuthenticatedUserId(req.userId),
    action: 'reject',
    ...(body.reason ? { reason: body.reason } : {})
  });

  res.status(200).json({
    success: true,
    message: 'KYC rejected successfully',
    data: { kyc: result }
  });
});
