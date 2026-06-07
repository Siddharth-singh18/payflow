import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

export const notFoundHandler = (
  req: Parameters<ErrorRequestHandler>[1],
  _res: Parameters<ErrorRequestHandler>[2],
  next: Parameters<ErrorRequestHandler>[3]
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  void _next;

  if (error instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      message: 'Request validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.flatten()
    };

    res.status(400).json(response);
    return;
  }

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    };

    res.status(error.statusCode).json(response);
    return;
  }

  console.error('Unhandled error', error);

  const response: ErrorResponse = {
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : 'Unhandled server error',
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500
  };

  if (env.NODE_ENV !== 'production') {
    response.details = error instanceof Error ? error.message : error;
  }

  res.status(500).json(response);
};
