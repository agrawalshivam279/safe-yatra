/**
 * Safe Yatra — Backend Spatial Server
 * Volunteer & Spatial Location Controller (Route Handlers).
 */

import { Request, Response, NextFunction } from 'express';
import { volunteerService } from './volunteer.service';
import {
  registerVolunteerSchema,
  toggleDutySchema,
  locationPingSchema,
  nearbyVolunteersQuerySchema,
} from './volunteer.validation';
import { ok, fail } from '../../utils/response';

export class VolunteerController {
  /**
   * POST /api/v1/volunteers/register
   * Registers/updates volunteer profile for authenticated user.
   */
  public register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const validatedInput = registerVolunteerSchema.parse(req.body);
      const profile = await volunteerService.registerVolunteer(
        req.user.id,
        validatedInput.aadharNumber
      );
      ok(res, { volunteerProfile: profile }, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/volunteers/duty
   * Toggles on-duty status for authenticated volunteer.
   */
  public toggleDuty = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const validatedInput = toggleDutySchema.parse(req.body);
      const profile = await volunteerService.toggleDutyStatus(
        req.user.id,
        validatedInput.isOnDuty
      );
      ok(res, { volunteerProfile: profile });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/volunteers/location
   * Streams ephemeral GPS coordinate ping into UserLocation.
   */
  public recordLocation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const validatedInput = locationPingSchema.parse(req.body);
      const result = await volunteerService.recordLocation({
        userId: req.user.id,
        ...validatedInput,
      });
      ok(res, result, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/volunteers/nearby
   * Executes PostGIS ST_DWithin spatial proximity search for on-duty volunteers.
   */
  public getNearby = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query = nearbyVolunteersQuerySchema.parse(req.query);
      const volunteers = await volunteerService.findNearbyVolunteers(
        query.lat,
        query.lng,
        query.radius,
        query.limit
      );
      ok(res, { volunteers, count: volunteers.length });
    } catch (err) {
      next(err);
    }
  };
}

export const volunteerController = new VolunteerController();
export default volunteerController;
