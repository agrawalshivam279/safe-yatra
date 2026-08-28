/**
 * Safe Yatra — Backend Spatial Server
 * Zones Controller (Route Handlers).
 */

import { Request, Response, NextFunction } from 'express';
import { zoneService } from './zone.service';
import {
  createZoneSchema,
  updateZoneSchema,
  overrideScoreSchema,
} from './zone.validation';
import { ok } from '../../utils/response';

export class ZoneController {
  /**
   * GET /api/v1/zones
   * Retrieves all zones with GeoJSON boundaries and current scores.
   */
  public getAllZones = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const zones = await zoneService.getAllZones();
      ok(res, { zones, count: zones.length });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/zones/:id
   * Retrieves a single zone by ID.
   */
  public getZoneById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const zone = await zoneService.getZoneById(req.params.id);
      ok(res, { zone });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/zones
   * Creates a new zone with PostGIS Polygon geometry (Admin only).
   */
  public createZone = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = createZoneSchema.parse(req.body);
      const zone = await zoneService.createZone(validatedInput);
      ok(res, { zone }, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/zones/:id
   * Updates zone properties and boundary (Admin only).
   */
  public updateZone = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = updateZoneSchema.parse(req.body);
      const zone = await zoneService.updateZone(req.params.id, validatedInput);
      ok(res, { zone });
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/zones/:id/override
   * Manually overrides a zone's danger score with justification (Admin only).
   */
  public overrideScore = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = overrideScoreSchema.parse(req.body);
      const zone = await zoneService.overrideScore(
        req.params.id,
        validatedInput
      );
      ok(res, { zone });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/zones/:id
   * Deletes a zone by ID (Admin only).
   */
  public deleteZone = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await zoneService.deleteZone(req.params.id);
      ok(res, { message: 'Zone deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const zoneController = new ZoneController();
export default zoneController;
