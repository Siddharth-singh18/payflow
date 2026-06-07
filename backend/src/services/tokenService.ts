import crypto from 'node:crypto';
import jwt, { type JwtPayload, type Secret } from 'jsonwebtoken';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import type { JwtUserPayload, TokenPair, UserRole } from '../types/auth.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const refreshKey = (userId: string, sessionId: string): string => `refresh:${userId}:${sessionId}`;
const accessBlacklistKey = (token: string): string => `blacklist:access:${token}`;

const signToken = (
  payload: JwtUserPayload,
  secret: string,
  expiresIn: number
): string => {
  return jwt.sign(payload, secret as Secret, { expiresIn });
};

export const createTokenPair = async (userId: string, role: UserRole): Promise<TokenPair> => {
  const sessionId = crypto.randomUUID();
  const payload: JwtUserPayload = { userId, role, sessionId };
  const accessToken = signToken(payload, env.JWT_ACCESS_SECRET, ACCESS_TOKEN_TTL_SECONDS);
  const refreshToken = signToken(payload, env.JWT_REFRESH_SECRET, REFRESH_TOKEN_TTL_SECONDS);

  await redis.set(refreshKey(userId, sessionId), refreshToken, 'EX', REFRESH_TOKEN_TTL_SECONDS);

  return { accessToken, refreshToken };
};

export const rotateRefreshToken = async (refreshToken: string): Promise<TokenPair> => {
  const decoded = verifyRefreshToken(refreshToken);
  const storedToken = await redis.get(refreshKey(decoded.userId, decoded.sessionId));

  if (!storedToken || storedToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  await redis.del(refreshKey(decoded.userId, decoded.sessionId));
  return createTokenPair(decoded.userId, decoded.role);
};

export const revokeRefreshToken = async (userId: string, sessionId: string): Promise<void> => {
  await redis.del(refreshKey(userId, sessionId));
};

export const blacklistAccessToken = async (accessToken: string): Promise<void> => {
  const decoded = jwt.decode(accessToken) as JwtPayload | null;

  if (!decoded || typeof decoded.exp !== 'number') {
    return;
  }

  const ttl = decoded.exp - Math.floor(Date.now() / 1000);

  if (ttl > 0) {
    await redis.set(accessBlacklistKey(accessToken), '1', 'EX', ttl);
  }
};

export const isAccessTokenBlacklisted = async (accessToken: string): Promise<boolean> => {
  const value = await redis.get(accessBlacklistKey(accessToken));
  return value === '1';
};

export const verifyAccessToken = (accessToken: string): JwtUserPayload => {
  return verifyToken(accessToken, env.JWT_ACCESS_SECRET, 'INVALID_ACCESS_TOKEN');
};

export const verifyRefreshToken = (refreshToken: string): JwtUserPayload => {
  return verifyToken(refreshToken, env.JWT_REFRESH_SECRET, 'INVALID_REFRESH_TOKEN');
};

const verifyToken = (token: string, secret: string, code: string): JwtUserPayload => {
  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === 'string') {
      throw new AppError('Invalid token payload', 401, code);
    }

    const payload: Record<string, unknown> = decoded;

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.sessionId !== 'string' ||
      (payload.role !== 'user' && payload.role !== 'admin')
    ) {
      throw new AppError('Invalid token payload', 401, code);
    }

    return {
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired token', 401, code);
  }
};
