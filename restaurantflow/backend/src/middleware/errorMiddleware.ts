import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, err.message);
    } else {
      logger.warn({ path: req.path, method: req.method, code: err.code }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.errors ? { errors: err.errors } : {}),
    });
    return;
  }

  // Handle unexpected or database errors
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');

  // Postgres specific error code translations
  const pgError = err as any;
  if (pgError.code === '23505') {
    // Unique violation
    res.status(409).json({
      success: false,
      message: 'A duplicate record already exists with this information.',
      code: 'DUPLICATE_KEY_ERROR',
    });
    return;
  }

  if (pgError.code === '23503') {
    // Foreign key violation
    res.status(400).json({
      success: false,
      message: 'Referenced entity not found.',
      code: 'FOREIGN_KEY_VIOLATION',
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred',
    code: 'INTERNAL_SERVER_ERROR',
    error: err.message,
    ...(err.stack && env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
}
