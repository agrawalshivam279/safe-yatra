/**
 * Safe Yatra — Backend Spatial Server
 * Geofence CRUD Management Service & PostGIS Spatial Coordinator.
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { geofenceEngine } from './geofence.engine';
import {
  CreateGeofenceInput,
  GeofenceCheckResult,
  GeofenceEntity,
  UpdateGeofenceInput,
} from './geofence.types';

export class GeofenceService {
  /**
   * Creates a new geofence with PostGIS Polygon geometry or circular buffer.
   */
  public async createGeofence(input: CreateGeofenceInput): Promise<GeofenceEntity> {
    const geofenceId = uuidv4();
    const isActive = input.isActive !== undefined ? input.isActive : true;

    if (input.boundary) {
      // Insert with explicit GeoJSON Polygon
      await prisma.$executeRaw`
        INSERT INTO "Geofence" (
          "id", "zoneId", "name", "type", "boundary",
          "isActive", "severity", "message", "createdBy",
          "createdAt", "expiresAt"
        ) VALUES (
          ${geofenceId},
          ${input.zoneId ?? null},
          ${input.name},
          ${input.type},
          ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.boundary)}), 4326),
          ${isActive},
          ${input.severity}::"DangerTier",
          ${input.message ?? null},
          ${input.createdBy ?? null},
          NOW(),
          ${input.expiresAt ?? null}
        );
      `;
    } else if (
      input.centerLat !== undefined &&
      input.centerLng !== undefined &&
      input.radiusMeters !== undefined
    ) {
      geofenceEngine.validateCoordinates(input.centerLat, input.centerLng);

      if (input.radiusMeters <= 0) {
        throw new AppError('Radius must be greater than 0 meters', 400, 'INVALID_RADIUS');
      }

      // Generate circular polygon buffer around center point
      await prisma.$executeRaw`
        INSERT INTO "Geofence" (
          "id", "zoneId", "name", "type", "boundary",
          "isActive", "severity", "message", "createdBy",
          "createdAt", "expiresAt"
        ) VALUES (
          ${geofenceId},
          ${input.zoneId ?? null},
          ${input.name},
          ${input.type},
          ST_SetSRID(ST_Buffer(ST_SetSRID(ST_MakePoint(${input.centerLng}, ${input.centerLat}), 4326)::geography, ${input.radiusMeters})::geometry, 4326),
          ${isActive},
          ${input.severity}::"DangerTier",
          ${input.message ?? null},
          ${input.createdBy ?? null},
          NOW(),
          ${input.expiresAt ?? null}
        );
      `;
    } else {
      throw new AppError(
        'Geofence must have either a polygon boundary or a center (lat/lng) with radiusMeters',
        400,
        'INVALID_GEOFENCE_GEOMETRY'
      );
    }

    return this.getGeofenceById(geofenceId);
  }

  /**
   * Retrieves all geofences with parsed GeoJSON boundaries.
   */
  public async getAllGeofences(includeInactive: boolean = false): Promise<GeofenceEntity[]> {
    const rawGeofences = includeInactive
      ? await prisma.$queryRaw<Array<{
          id: string;
          zoneId: string | null;
          name: string;
          type: string;
          severity: string;
          message: string | null;
          isActive: boolean;
          createdBy: string | null;
          createdAt: Date;
          expiresAt: Date | null;
          boundaryGeoJson: string | null;
          centerLat: number | null;
          centerLng: number | null;
        }>>`
          SELECT
            g."id",
            g."zoneId",
            g."name",
            g."type",
            g."severity"::text AS "severity",
            g."message",
            g."isActive",
            g."createdBy",
            g."createdAt",
            g."expiresAt",
            ST_AsGeoJSON(g."boundary") AS "boundaryGeoJson",
            ST_Y(ST_Centroid(g."boundary")) AS "centerLat",
            ST_X(ST_Centroid(g."boundary")) AS "centerLng"
          FROM "Geofence" g
          ORDER BY g."createdAt" DESC;
        `
      : await prisma.$queryRaw<Array<{
          id: string;
          zoneId: string | null;
          name: string;
          type: string;
          severity: string;
          message: string | null;
          isActive: boolean;
          createdBy: string | null;
          createdAt: Date;
          expiresAt: Date | null;
          boundaryGeoJson: string | null;
          centerLat: number | null;
          centerLng: number | null;
        }>>`
          SELECT
            g."id",
            g."zoneId",
            g."name",
            g."type",
            g."severity"::text AS "severity",
            g."message",
            g."isActive",
            g."createdBy",
            g."createdAt",
            g."expiresAt",
            ST_AsGeoJSON(g."boundary") AS "boundaryGeoJson",
            ST_Y(ST_Centroid(g."boundary")) AS "centerLat",
            ST_X(ST_Centroid(g."boundary")) AS "centerLng"
          FROM "Geofence" g
          WHERE g."isActive" = true
          ORDER BY g."createdAt" DESC;
        `;

    return rawGeofences.map(geofenceEngine.toGeofenceEntity);
  }

  /**
   * Retrieves a single geofence by ID with deserialized GeoJSON polygon.
   */
  public async getGeofenceById(id: string): Promise<GeofenceEntity> {
    const rawGeofences = await prisma.$queryRaw<Array<{
      id: string;
      zoneId: string | null;
      name: string;
      type: string;
      severity: string;
      message: string | null;
      isActive: boolean;
      createdBy: string | null;
      createdAt: Date;
      expiresAt: Date | null;
      boundaryGeoJson: string | null;
      centerLat: number | null;
      centerLng: number | null;
    }>>`
      SELECT
        g."id",
        g."zoneId",
        g."name",
        g."type",
        g."severity"::text AS "severity",
        g."message",
        g."isActive",
        g."createdBy",
        g."createdAt",
        g."expiresAt",
        ST_AsGeoJSON(g."boundary") AS "boundaryGeoJson",
        ST_Y(ST_Centroid(g."boundary")) AS "centerLat",
        ST_X(ST_Centroid(g."boundary")) AS "centerLng"
      FROM "Geofence" g
      WHERE g."id" = ${id}
      LIMIT 1;
    `;

    if (!rawGeofences || rawGeofences.length === 0) {
      throw new AppError('Geofence not found', 404, 'GEOFENCE_NOT_FOUND');
    }

    return geofenceEngine.toGeofenceEntity(rawGeofences[0]);
  }

  /**
   * Updates general fields and optionally boundary geometry of a geofence.
   */
  public async updateGeofence(
    id: string,
    input: UpdateGeofenceInput
  ): Promise<GeofenceEntity> {
    // Verify geofence exists
    await this.getGeofenceById(id);

    await prisma.geofence.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
        ...(input.message !== undefined ? { message: input.message } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      },
    });

    if (input.boundary) {
      await prisma.$executeRaw`
        UPDATE "Geofence"
        SET "boundary" = ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.boundary)}), 4326)
        WHERE "id" = ${id};
      `;
    }

    return this.getGeofenceById(id);
  }

  /**
   * Deletes a geofence by ID.
   */
  public async deleteGeofence(id: string): Promise<void> {
    await this.getGeofenceById(id);

    await prisma.geofence.delete({
      where: { id },
    });
  }

  /**
   * Checks if a GPS coordinate is inside or approaching any active geofences.
   */
  public async checkPoint(
    lat: number,
    lng: number,
    bufferMeters: number = 500
  ): Promise<GeofenceCheckResult> {
    return geofenceEngine.evaluateLocation(lat, lng, bufferMeters);
  }
}

export const geofenceService = new GeofenceService();
export default geofenceService;
