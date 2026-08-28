/**
 * Safe Yatra — Backend Spatial Server
 * User Profile Controller (Route Handlers).
 */

import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { updateProfileSchema } from './user.validation';
import { ok, fail } from '../../utils/response';

export class UserController {
  /**
   * GET /api/v1/users/me
   * Retrieves profile of current authenticated user.
   */
  public getMe = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const user = await userService.getUserById(req.user.id);
      ok(res, { user });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/users/profile
   * Updates profile fields for the authenticated user.
   */
  public updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const validatedInput = updateProfileSchema.parse(req.body);
      const updatedUser = await userService.updateProfile(
        req.user.id,
        validatedInput
      );
      ok(res, { user: updatedUser });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/users/account
   * Deactivates the authenticated user account.
   */
  public deleteAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      await userService.deleteAccount(req.user.id);
      ok(res, { message: 'Account deactivated successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const userController = new UserController();
export default userController;
