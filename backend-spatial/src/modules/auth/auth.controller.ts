/**
 * Safe Yatra — Backend Spatial Server
 * Authentication Controller (Route Handlers).
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from './auth.validation';
import { ok, fail } from '../../utils/response';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Registers a new user and issues auth tokens.
   */
  public register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = registerSchema.parse(req.body);
      const authData = await authService.register(validatedInput);
      ok(res, authData, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/login
   * Authenticates credentials and issues auth tokens.
   */
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const authData = await authService.login(validatedInput);
      ok(res, authData);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/auth/refresh
   * Refreshes expired access tokens.
   */
  public refresh = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = refreshTokenSchema.parse(req.body);
      const tokenData = await authService.refreshToken(
        validatedInput.refreshToken
      );
      ok(res, tokenData);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/auth/me
   * Retrieves profile for the currently authenticated user.
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

      const profile = await authService.getUserProfile(req.user.id);
      ok(res, { user: profile });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
export default authController;
