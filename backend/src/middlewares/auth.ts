import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { isAccessTokenBlacklisted, verifyAccessToken } from '../services/tokenService.js';

const extractBearerToken = (authorizationHeader: string | undefined): string => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new AppError('Authorization bearer token is required', 401, 'AUTH_TOKEN_REQUIRED');
  }

  return authorizationHeader.slice('Bearer '.length);
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const accessToken = extractBearerToken(req.headers.authorization);

    if (await isAccessTokenBlacklisted(accessToken)) {
      throw new AppError('Token has been revoked', 401, 'TOKEN_REVOKED');
    }

    const payload = verifyAccessToken(accessToken);
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.accessToken = accessToken;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin') {
    next(new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED'));
    return;
  }

  next();
};
