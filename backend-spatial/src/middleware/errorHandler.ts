/**
 * Safe Yatra — Backend Spatial Server
 * Centralized Express Error Handling Middleware.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, fail } from '../utils/response';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Known Operational AppError
  if (err instanceof AppError) {
    fail(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // 2. Zod Schema Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    fail(
      res,
      'VALIDATION_ERROR',
      'Request validation failed',
      400,
      formattedErrors
    );
    return;
  }

  // 3. Syntax / Malformed JSON Parse Error
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    fail(res, 'INVALID_JSON', 'Malformed JSON in request body', 400);
    return;
  }

  // 4. Unhandled Internal Server Errors (500)
  if (env.NODE_ENV !== 'test') {
    console.error('💥 [Unhandled Server Error]:', err);
  }

  const message =
    env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  fail(
    res,
    'INTERNAL_SERVER_ERROR',
    message,
    500,
    env.NODE_ENV !== 'production' ? { stack: err.stack } : undefined
  );
};
