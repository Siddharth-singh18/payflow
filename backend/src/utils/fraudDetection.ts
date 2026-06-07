import { Types } from 'mongoose';
import { redis } from '../config/redis.js';
import { AuditLogModel, type AuditSeverity } from '../models/AuditLog.js';
import { AppError } from './AppError.js';

export interface FraudContext {
  userId: string;
  amountPaise: number;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  occurredAt?: Date;
}

export interface FraudAssessment {
  score: number;
  reasons: string[];
  isFlagged: boolean;
  requiresExtraVerification: boolean;
  isBlocked: boolean;
}

const VELOCITY_WINDOW_SECONDS = 10 * 60;
const TEMP_BLOCK_SECONDS = 10 * 60;
const LARGE_TRANSFER_WINDOW_SECONDS = 60 * 60;
const HIGH_AMOUNT_THRESHOLD_PAISE = 50000 * 100;
const LARGE_TRANSFER_THRESHOLD_PAISE = 10000 * 100;

const velocityKey = (userId: string): string => `fraud:velocity:${userId}`;
const temporaryBlockKey = (userId: string): string => `fraud:block:${userId}`;
const devicesKey = (userId: string): string => `fraud:devices:${userId}`;
const largeTransfersKey = (userId: string): string => `fraud:large:${userId}`;

const clampScore = (score: number): number => Math.min(Math.max(score, 0), 100);

const addReason = (reasons: string[], reason: string): void => {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
};

const getSeverity = (assessment: FraudAssessment): AuditSeverity => {
  if (assessment.isBlocked || assessment.score >= 80) {
    return 'critical';
  }

  if (assessment.isFlagged) {
    return 'warning';
  }

  return 'info';
};

export const assertUserNotTemporarilyBlocked = async (userId: string): Promise<void> => {
  const blockTtl = await redis.ttl(temporaryBlockKey(userId));

  if (blockTtl > 0) {
    throw new AppError(
      `Transfers temporarily blocked for ${String(blockTtl)} seconds`,
      403,
      'FRAUD_TEMPORARY_BLOCK'
    );
  }
};

export const assessTransferFraud = async (context: FraudContext): Promise<FraudAssessment> => {
  await assertUserNotTemporarilyBlocked(context.userId);

  const reasons: string[] = [];
  let score = 0;
  let requiresExtraVerification = false;
  let isBlocked = false;
  const occurredAt = context.occurredAt ?? new Date();

  const transferCount = await redis.incr(velocityKey(context.userId));

  if (transferCount === 1) {
    await redis.expire(velocityKey(context.userId), VELOCITY_WINDOW_SECONDS);
  }

  if (transferCount > 5) {
    score += 35;
    isBlocked = true;
    addReason(reasons, 'More than 5 transfers in 10 minutes');
    await redis.set(temporaryBlockKey(context.userId), 'velocity', 'EX', TEMP_BLOCK_SECONDS);
  }

  if (context.amountPaise > HIGH_AMOUNT_THRESHOLD_PAISE) {
    score += 30;
    addReason(reasons, 'Single transfer above ₹50,000');
  }

  const hour = occurredAt.getHours();

  if (hour >= 1 && hour < 4) {
    score += 15;
    addReason(reasons, 'Transfer attempted between 1am and 4am');
  }

  if (context.deviceFingerprint) {
    const isKnownDevice = await redis.sismember(devicesKey(context.userId), context.deviceFingerprint);

    if (!isKnownDevice) {
      score += 20;
      requiresExtraVerification = true;
      addReason(reasons, 'First transaction from a new device fingerprint');
      await redis.sadd(devicesKey(context.userId), context.deviceFingerprint);
    }
  }

  if (context.amountPaise > LARGE_TRANSFER_THRESHOLD_PAISE) {
    const timestamp = occurredAt.getTime();
    const largeKey = largeTransfersKey(context.userId);
    await redis.zremrangebyscore(largeKey, 0, timestamp - LARGE_TRANSFER_WINDOW_SECONDS * 1000);
    await redis.zadd(largeKey, timestamp, `${String(timestamp)}:${String(context.amountPaise)}`);
    await redis.expire(largeKey, LARGE_TRANSFER_WINDOW_SECONDS);

    const largeTransferCount = await redis.zcard(largeKey);

    if (largeTransferCount >= 3) {
      score += 40;
      isBlocked = true;
      addReason(reasons, '3 transfers above ₹10,000 within 1 hour');
      await redis.set(temporaryBlockKey(context.userId), 'rapid_large_transfer', 'EX', TEMP_BLOCK_SECONDS);
    }
  }

  const assessment: FraudAssessment = {
    score: clampScore(score),
    reasons,
    isFlagged: reasons.length > 0,
    requiresExtraVerification,
    isBlocked
  };

  if (assessment.isFlagged) {
    await AuditLogModel.create({
      userId: new Types.ObjectId(context.userId),
      action: 'fraud.transfer_assessed',
      entityType: 'transaction',
      severity: getSeverity(assessment),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reasons: assessment.reasons,
      fraudScore: assessment.score,
      metadata: {
        amountPaise: context.amountPaise,
        requiresExtraVerification: assessment.requiresExtraVerification,
        isBlocked: assessment.isBlocked
      }
    });
  }

  if (assessment.isBlocked) {
    throw new AppError(
      'Transfer blocked by fraud detection. Please try again later',
      403,
      'FRAUD_TRANSFER_BLOCKED'
    );
  }

  return assessment;
};
