import Redis, { type RedisOptions } from 'ioredis';
import { env } from './env.js';

const redisOptions: RedisOptions = {
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  }
};

export const redis = new Redis(env.REDIS_URL, redisOptions);

redis.on('connect', () => {
  console.log('Redis connecting');
});

redis.on('ready', () => {
  console.log('Redis ready');
});

redis.on('error', (error: Error) => {
  console.error('Redis error', error);
});

export const connectRedis = async (): Promise<void> => {
  if (redis.status === 'ready') {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const handleReady = (): void => {
      cleanup();
      resolve();
    };

    const handleError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const cleanup = (): void => {
      redis.off('ready', handleReady);
      redis.off('error', handleError);
    };

    redis.once('ready', handleReady);
    redis.once('error', handleError);
  });
};

export const disconnectRedis = async (): Promise<void> => {
  await redis.quit();
  console.log('Redis disconnected');
};
