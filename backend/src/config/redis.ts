import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {}
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (error) => {
  console.error('Redis error', error);
});

export const connectRedis = async (): Promise<void> => {
  await redis.ping();
};

export const disconnectRedis = async (): Promise<void> => {
  await redis.quit();
};
