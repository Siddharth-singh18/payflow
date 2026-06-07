import { z } from 'zod';
import {
  createAddMoneyOrder,
  getWalletBalance,
  transferMoney
} from '../services/walletService.js';
import { generateWalletQr, payViaQr } from '../services/qrService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const transferSchema = z.object({
  recipient: z.string().trim().min(3).max(120),
  amount: z.number().positive().max(100000),
  note: z.string().trim().max(180).optional()
});

export const addMoneySchema = z.object({
  amount: z.number().positive().max(100000)
});

export const payQrSchema = z.object({
  payload: z.string().trim().min(10).max(500),
  amount: z.number().positive().max(100000),
  note: z.string().trim().max(180).optional()
});

const getAuthenticatedUserId = (userId: string | undefined): string => {
  if (!userId) {
    throw new AppError('Authenticated user missing from request', 401, 'AUTH_USER_MISSING');
  }

  return userId;
};

const getIdempotencyKey = (header: string | string[] | undefined): string => {
  if (Array.isArray(header)) {
    throw new AppError('X-Idempotency-Key must be a single value', 400, 'INVALID_IDEMPOTENCY_KEY');
  }

  if (!header?.trim()) {
    throw new AppError('X-Idempotency-Key header is required', 400, 'IDEMPOTENCY_KEY_REQUIRED');
  }

  if (header.length > 120) {
    throw new AppError('X-Idempotency-Key is too long', 400, 'INVALID_IDEMPOTENCY_KEY');
  }

  return header;
};

const getOptionalSingleHeader = (header: string | string[] | undefined): string | undefined => {
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
};

export const getBalance = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req.userId);
  const wallet = await getWalletBalance(userId);

  res.status(200).json({
    success: true,
    message: 'Wallet balance fetched successfully',
    data: { wallet }
  });
});

export const transfer = asyncHandler(async (req, res) => {
  const body = transferSchema.parse(req.body);
  const userId = getAuthenticatedUserId(req.userId);
  const idempotencyKey = getIdempotencyKey(req.headers['x-idempotency-key']);
  const deviceFingerprint = getOptionalSingleHeader(req.headers['x-device-fingerprint']);
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = getOptionalSingleHeader(req.headers['user-agent']);
  const transferInput = {
    senderUserId: userId,
    recipient: body.recipient,
    amount: body.amount,
    idempotencyKey,
    ...(deviceFingerprint ? { deviceFingerprint } : {}),
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent ? { userAgent } : {})
  };

  const transferResult = await transferMoney(
    body.note ? { ...transferInput, note: body.note } : transferInput
  );

  res.status(201).json({
    success: true,
    message: 'Transfer completed successfully',
    data: { transfer: transferResult }
  });
});

export const addMoney = asyncHandler(async (req, res) => {
  const body = addMoneySchema.parse(req.body);
  const userId = getAuthenticatedUserId(req.userId);
  const order = await createAddMoneyOrder({ userId, amount: body.amount });

  res.status(201).json({
    success: true,
    message: 'Razorpay order created successfully',
    data: { order }
  });
});

export const getQr = asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req.userId);
  const qr = await generateWalletQr(userId);

  res.status(200).json({
    success: true,
    message: 'Wallet QR generated successfully',
    data: { qr }
  });
});

export const payQr = asyncHandler(async (req, res) => {
  const body = payQrSchema.parse(req.body);
  const userId = getAuthenticatedUserId(req.userId);
  const idempotencyKey = getIdempotencyKey(req.headers['x-idempotency-key']);
  const transfer = await payViaQr({
    senderUserId: userId,
    payload: body.payload,
    amount: body.amount,
    idempotencyKey,
    ...(body.note ? { note: body.note } : {})
  });

  res.status(201).json({
    success: true,
    message: 'QR payment completed successfully',
    data: { transfer }
  });
});
