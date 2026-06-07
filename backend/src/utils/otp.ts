import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { redis } from '../config/redis.js';
import { AppError } from './AppError.js';

export type OtpPurpose = 'email_verification' | 'password_reset';

const OTP_TTL_SECONDS = 5 * 60;
const OTP_RATE_WINDOW_SECONDS = 10 * 60;
const MAX_OTP_REQUESTS = 5;

const otpKey = (purpose: OtpPurpose, email: string): string => `otp:${purpose}:${email}`;
const otpAttemptsKey = (purpose: OtpPurpose, email: string): string =>
  `otp:attempts:${purpose}:${email}`;
const otpRequestKey = (ip: string, purpose: OtpPurpose): string => `otp:req:${purpose}:${ip}`;
const otpBackoffKey = (ip: string, purpose: OtpPurpose): string => `otp:backoff:${purpose}:${ip}`;

export const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const enforceOtpRequestLimit = async (ip: string, purpose: OtpPurpose): Promise<void> => {
  const backoffTtl = await redis.ttl(otpBackoffKey(ip, purpose));

  if (backoffTtl > 0) {
    throw new AppError(
      `Please wait ${String(backoffTtl)} seconds before requesting another OTP`,
      429,
      'OTP_BACKOFF_ACTIVE'
    );
  }

  const requestCount = await redis.incr(otpRequestKey(ip, purpose));

  if (requestCount === 1) {
    await redis.expire(otpRequestKey(ip, purpose), OTP_RATE_WINDOW_SECONDS);
  }

  if (requestCount > MAX_OTP_REQUESTS) {
    const backoffSeconds = Math.min(2 ** (requestCount - MAX_OTP_REQUESTS) * 30, 15 * 60);
    await redis.set(otpBackoffKey(ip, purpose), '1', 'EX', backoffSeconds);
    throw new AppError('Too many OTP requests. Please try later', 429, 'OTP_RATE_LIMITED');
  }
};

export const storeOtp = async (
  purpose: OtpPurpose,
  email: string,
  otp: string
): Promise<void> => {
  const hashedOtp = await bcrypt.hash(otp, 12);
  await redis.set(otpKey(purpose, email), hashedOtp, 'EX', OTP_TTL_SECONDS);
  await redis.del(otpAttemptsKey(purpose, email));
};

export const verifyStoredOtp = async (
  purpose: OtpPurpose,
  email: string,
  otp: string
): Promise<void> => {
  const attempts = await redis.incr(otpAttemptsKey(purpose, email));

  if (attempts === 1) {
    await redis.expire(otpAttemptsKey(purpose, email), OTP_TTL_SECONDS);
  }

  if (attempts > 5) {
    await redis.del(otpKey(purpose, email));
    throw new AppError('Too many invalid OTP attempts', 429, 'OTP_ATTEMPTS_EXCEEDED');
  }

  const hashedOtp = await redis.get(otpKey(purpose, email));

  if (!hashedOtp) {
    throw new AppError('OTP has expired or was not requested', 400, 'OTP_NOT_FOUND');
  }

  const isValid = await bcrypt.compare(otp, hashedOtp);

  if (!isValid) {
    throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
  }

  await redis.del(otpKey(purpose, email), otpAttemptsKey(purpose, email));
};
