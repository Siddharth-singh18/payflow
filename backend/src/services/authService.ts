import mongoose from 'mongoose';
import { UserModel, type UserDocument } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  enforceOtpRequestLimit,
  generateOtp,
  storeOtp,
  verifyStoredOtp,
  type OtpPurpose
} from '../utils/otp.js';
import { sendOtpEmail } from './emailService.js';
import type { TokenPair } from '../types/auth.js';
import { createTokenPair, rotateRefreshToken } from './tokenService.js';
import { createWalletForUser } from './walletService.js';

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  ip: string;
}

interface LoginInput {
  emailOrPhone: string;
  password: string;
}

interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isEmailVerified: boolean;
  kycStatus: string;
  kycTier: string;
}

interface LoginResponse {
  user: AuthUserResponse;
  tokens: TokenPair;
}

const toAuthUser = (user: UserDocument): AuthUserResponse => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  kycStatus: user.kycStatus,
  kycTier: user.kycTier
});

const requestOtp = async (
  email: string,
  ip: string,
  purpose: OtpPurpose,
  subject: string
): Promise<void> => {
  await enforceOtpRequestLimit(ip, purpose);
  const otp = generateOtp();
  await storeOtp(purpose, email, otp);
  await sendOtpEmail(email, otp, subject);
};

export const registerUser = async (input: RegisterInput): Promise<AuthUserResponse> => {
  const email = input.email.toLowerCase();
  const existingUser = await UserModel.findOne({
    $or: [{ email }, { phone: input.phone }]
  }).exec();

  if (existingUser) {
    throw new AppError('User with this email or phone already exists', 409, 'USER_EXISTS');
  }

  const session = await mongoose.startSession();

  try {
    const createdUser = await session.withTransaction(async () => {
      const users = await UserModel.create(
        [
          {
            name: input.name,
            email,
            phone: input.phone,
            password: input.password
          }
        ],
        { session }
      );

      const user = users[0];

      if (!user) {
        throw new AppError('Unable to create user', 500, 'USER_CREATE_FAILED');
      }

      await createWalletForUser(user._id, session);
      return user;
    });

    await requestOtp(email, input.ip, 'email_verification', 'Verify your PayFlow account');

    return toAuthUser(createdUser);
  } finally {
    await session.endSession();
  }
};

export const verifyEmailOtp = async (email: string, otp: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  await verifyStoredOtp('email_verification', normalizedEmail, otp);

  const user = await UserModel.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: { isEmailVerified: true } },
    { new: true }
  ).exec();

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
};

export const loginUser = async (input: LoginInput): Promise<LoginResponse> => {
  const user = await UserModel.findOne({
    $or: [{ email: input.emailOrPhone.toLowerCase() }, { phone: input.emailOrPhone }]
  })
    .select('+password')
    .exec();

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (user.isBlocked) {
    throw new AppError('Your account has been blocked', 403, 'USER_BLOCKED');
  }

  const passwordMatches = await user.comparePassword(input.password);

  if (!passwordMatches) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await createTokenPair(user._id.toString(), user.role);
  return { user: toAuthUser(user), tokens };
};

export const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  return rotateRefreshToken(refreshToken);
};

export const sendPasswordResetOtp = async (email: string, ip: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail }).exec();

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  await requestOtp(normalizedEmail, ip, 'password_reset', 'Reset your PayFlow password');
};

export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<void> => {
  const normalizedEmail = email.toLowerCase();
  await verifyStoredOtp('password_reset', normalizedEmail, otp);

  const user = await UserModel.findOne({ email: normalizedEmail }).select('+password').exec();

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  user.password = newPassword;
  await user.save();
};
