/**
 * Safe Yatra — Backend Spatial Server
 * Danger Risk Assessment Controller (Route Handlers).
 */

import { Request, Response, NextFunction } from 'express';
import { dangerService } from './danger.service';
import {
  dangerScoreQuerySchema,
  safetyBriefingParamSchema,
} from './danger.validation';
import { ok } from '../../utils/response';

export class DangerController {
  /**
   * GET /api/v1/danger/score?lat=X&lng=Y
   * Computes or retrieves dynamic danger score for given coordinates.
   */
  public getScore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { lat, lng } = dangerScoreQuerySchema.parse(req.query);
      const score = await dangerService.getScoreForCoordinates(lat, lng);
      ok(res, { score });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/danger/zones
   * Retrieves danger scores across all predefined zones.
   */
  public getZones = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const zones = await dangerService.getAllZoneScores();
      ok(res, { zones, count: zones.length });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/danger/briefing/:destination
   * Generates a pre-trip safety briefing for a named destination.
   */
  public getBriefing = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { destination } = safetyBriefingParamSchema.parse(req.params);
      const briefing = await dangerService.getSafetyBriefing(destination);
      ok(res, { briefing });
    } catch (err) {
      next(err);
    }
  };
}

export const dangerController = new DangerController();
export default dangerController;
