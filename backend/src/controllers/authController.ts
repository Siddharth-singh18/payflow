import type { Request } from 'express';
import { z } from 'zod';
import {
  loginUser,
  refreshTokens,
  registerUser,
  resetPassword,
  sendPasswordResetOtp,
  verifyEmailOtp
} from '../services/authService.js';
import { blacklistAccessToken, revokeRefreshToken, verifyRefreshToken } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Phone must be a valid Indian mobile number'),
  password: z.string().min(8).max(128)
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits')
});

export const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(3),
  password: z.string().min(8).max(128)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  newPassword: z.string().min(8).max(128)
});

const getIpAddress = (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown';

export const register = asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const user = await registerUser({ ...body, ip: getIpAddress(req) });

  res.status(201).json({
    success: true,
    message: 'Registration successful. OTP sent to email',
    data: { user }
  });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const body = verifyOtpSchema.parse(req.body);
  await verifyEmailOtp(body.email, body.otp);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

export const login = asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await loginUser(body);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const tokens = await refreshTokens(body.refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: { tokens }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const body = refreshSchema.parse(req.body);
  const refreshPayload = verifyRefreshToken(body.refreshToken);

  await revokeRefreshToken(refreshPayload.userId, refreshPayload.sessionId);

  if (!req.accessToken) {
    throw new AppError('Access token missing from request', 401, 'ACCESS_TOKEN_MISSING');
  }

  await blacklistAccessToken(req.accessToken);

  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const body = forgotPasswordSchema.parse(req.body);
  await sendPasswordResetOtp(body.email, getIpAddress(req));

  res.status(200).json({
    success: true,
    message: 'Password reset OTP sent'
  });
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const body = resetPasswordSchema.parse(req.body);
  await resetPassword(body.email, body.otp, body.newPassword);

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});
