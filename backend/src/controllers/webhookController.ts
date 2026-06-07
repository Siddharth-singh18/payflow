import crypto from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';
import {
  creditWalletFromRazorpayPayment,
  type RazorpayCapturedPayment
} from '../services/walletService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

interface RazorpayWebhookPayload {
  event: string;
  payload?: {
    payment?: {
      entity?: RazorpayCapturedPayment;
    };
  };
}

const getRawBody = (req: Request): Buffer => {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  throw new AppError('Webhook raw body is required', 400, 'WEBHOOK_RAW_BODY_REQUIRED');
};

const parseWebhookPayload = (rawBody: Buffer): RazorpayWebhookPayload => {
  const parsed = JSON.parse(rawBody.toString('utf8')) as unknown;

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('event' in parsed) ||
    typeof (parsed as { event?: unknown }).event !== 'string'
  ) {
    throw new AppError('Invalid Razorpay webhook payload', 400, 'INVALID_WEBHOOK_PAYLOAD');
  }

  return parsed as RazorpayWebhookPayload;
};

const verifyRazorpaySignature = (rawBody: Buffer, signature: string | undefined): void => {
  if (!signature) {
    throw new AppError('Razorpay signature header is required', 400, 'RAZORPAY_SIGNATURE_MISSING');
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new AppError('Invalid Razorpay webhook signature', 400, 'INVALID_RAZORPAY_SIGNATURE');
  }
};

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const rawBody = getRawBody(req);
  const signatureHeader = req.headers['x-razorpay-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  verifyRazorpaySignature(rawBody, signature);

  const payload = parseWebhookPayload(rawBody);

  if (payload.event !== 'payment.captured') {
    res.status(200).json({
      success: true,
      message: 'Webhook ignored',
      data: { event: payload.event }
    });
    return;
  }

  const payment = payload.payload?.payment?.entity;

  if (!payment) {
    throw new AppError('Razorpay payment entity missing', 400, 'PAYMENT_ENTITY_MISSING');
  }

  const result = await creditWalletFromRazorpayPayment(payment);

  res.status(200).json({
    success: true,
    message: result.credited ? 'Wallet credited successfully' : 'Webhook already processed',
    data: result
  });
});
