/**
 * Safe Yatra — Backend Spatial Server
 * Geofence Controller (Route Handlers).
 */

import { NextFunction, Request, Response } from 'express';
import { ok } from '../../utils/response';
import { geofenceService } from './geofence.service';
import {
  checkPointSchema,
  createGeofenceSchema,
  geofenceQuerySchema,
  updateGeofenceSchema,
} from './geofence.validation';

export class GeofenceController {
  /**
   * GET /api/v1/geofences
   * Retrieves all active (or all) geofences with GeoJSON boundaries.
   */
  public getAllGeofences = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { includeInactive } = geofenceQuerySchema.parse(req.query);
      const geofences = await geofenceService.getAllGeofences(includeInactive);
      ok(res, { geofences, count: geofences.length });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/geofences/:id
   * Retrieves a single geofence by ID.
   */
  public getGeofenceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const geofence = await geofenceService.getGeofenceById(req.params.id);
      ok(res, { geofence });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/geofences/check
   * Public endpoint to check if coordinate point is inside or approaching any geofences.
   */
  public checkPoint = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { lat, lng, bufferMeters } = checkPointSchema.parse(req.body);
      const result = await geofenceService.checkPoint(lat, lng, bufferMeters);
      ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/geofences
   * Creates a new geofence with PostGIS Polygon geometry or circular buffer (Admin only).
   */
  public createGeofence = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = createGeofenceSchema.parse(req.body);
      const geofence = await geofenceService.createGeofence({
        ...validatedInput,
        createdBy: req.user?.id ?? null,
      });
      ok(res, { geofence }, undefined, 201);
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/geofences/:id
   * Updates geofence properties and/or boundary geometry (Admin only).
   */
  public updateGeofence = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedInput = updateGeofenceSchema.parse(req.body);
      const geofence = await geofenceService.updateGeofence(
        req.params.id,
        validatedInput
      );
      ok(res, { geofence });
    } catch (err) {
      next(err);
    }
  };

  /**
   * DELETE /api/v1/geofences/:id
   * Deletes a geofence by ID (Admin only).
   */
  public deleteGeofence = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await geofenceService.deleteGeofence(req.params.id);
      ok(res, { message: 'Geofence deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export const geofenceController = new GeofenceController();
export default geofenceController;
