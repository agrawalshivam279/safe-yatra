/**
 * Safe Yatra — Backend Spatial Server
 * JWT Authentication Middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService } from '../modules/auth/auth.service';
import { fail } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Strict authentication middleware.
 * Halts request pipeline if Authorization Bearer token is missing or invalid.
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(
      res,
      'UNAUTHORIZED',
      'Authorization header with Bearer token is required',
      401
    );
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    fail(res, 'UNAUTHORIZED', 'Access token is required', 401);
    return;
  }

  try {
    const payload = authService.verifyToken(token, 'access');
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err: unknown) {
    next(err);
  }
};

/**
 * Optional authentication middleware.
 * Populates req.user if a valid Bearer token is supplied, otherwise continues.
 */
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next();
  }

  try {
    const payload = authService.verifyToken(token, 'access');
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // Ignore error for optional authentication
  }

  next();
};
