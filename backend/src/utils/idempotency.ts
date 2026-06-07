import { redis } from '../config/redis.js';
import { AppError } from './AppError.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

const idempotencyKey = (userId: string, key: string): string => `idempotency:transfer:${userId}:${key}`;

export const reserveTransferIdempotencyKey = async (
  userId: string,
  key: string
): Promise<void> => {
  const result = await redis.set(
    idempotencyKey(userId, key),
    'processing',
    'EX',
    IDEMPOTENCY_TTL_SECONDS,
    'NX'
  );

  if (result !== 'OK') {
    throw new AppError('Duplicate transfer request', 409, 'IDEMPOTENCY_KEY_CONFLICT');
  }
};

export const completeTransferIdempotencyKey = async (
  userId: string,
  key: string,
  referenceId: string
): Promise<void> => {
  await redis.set(idempotencyKey(userId, key), referenceId, 'EX', IDEMPOTENCY_TTL_SECONDS);
};
