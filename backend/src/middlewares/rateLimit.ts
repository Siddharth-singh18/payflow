import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { redis } from '../config/redis.js';
import { AppError } from '../utils/AppError.js';

interface RedisRateLimitOptions {
  prefix: string;
  windowSeconds: number;
  maxRequests: number;
}

const getClientKey = (req: Request, prefix: string): string => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `rate:${prefix}:${ip}`;
};

export const redisRateLimit = (options: RedisRateLimitOptions): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = getClientKey(req, options.prefix);
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, options.windowSeconds);
      }

      const ttl = await redis.ttl(key);
      const remaining = Math.max(options.maxRequests - count, 0);

      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.max(ttl, 0)));

      if (count > options.maxRequests) {
        throw new AppError('Too many requests. Please try again later', 429, 'RATE_LIMITED');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const globalRateLimiter = redisRateLimit({
  prefix: 'global',
  windowSeconds: 15 * 60,
  maxRequests: 100
});

export const authRateLimiter = redisRateLimit({
  prefix: 'auth',
  windowSeconds: 15 * 60,
  maxRequests: 10
});
