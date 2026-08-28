/**
 * Safe Yatra — Backend Spatial Server
 * Role-Based Access Control (RBAC) Guard Middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { fail } from '../utils/response';

/**
 * Higher-order middleware factory requiring the authenticated user to possess one of the specified roles.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      fail(res, 'UNAUTHORIZED', 'Authentication is required for this operation', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      fail(
        res,
        'FORBIDDEN',
        `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
};
