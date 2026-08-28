/**
 * Safe Yatra — Backend Spatial Server
 * Geofence Spatial Calculation Engine & PostGIS Query Handler.
 */

import { DangerTier } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { GeoJSONPolygon } from '../zones/zone.types';
import {
  GeofenceCheckResult,
  GeofenceEntity,
  ProximityGeofence,
} from './geofence.types';

export class GeofenceEngine {
  /**
   * Validates coordinate bounds.
   */
  public validateCoordinates(lat: number, lng: number): void {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      throw new AppError('Latitude and longitude must be valid numbers', 400, 'INVALID_COORDINATES');
    }

    if (lat < -90 || lat > 90) {
      throw new AppError('Latitude must be between -90 and 90 degrees', 400, 'INVALID_LATITUDE');
    }

    if (lng < -180 || lng > 180) {
      throw new AppError('Longitude must be between -180 and 180 degrees', 400, 'INVALID_LONGITUDE');
    }
  }

  /**
   * Checks if a point is strictly contained inside any active geofences using PostGIS ST_Contains.
   */
  public async checkPointInGeofences(lat: number, lng: number): Promise<GeofenceEntity[]> {
    this.validateCoordinates(lat, lng);

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
      WHERE g."isActive" = true
        AND (g."expiresAt" IS NULL OR g."expiresAt" > NOW())
        AND ST_Contains(g."boundary", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      ORDER BY
        CASE g."severity"::text
          WHEN 'CRITICAL' THEN 1
          WHEN 'SEVERE' THEN 2
          WHEN 'MODERATE' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END ASC;
    `;

    return rawGeofences.map(this.toGeofenceEntity);
  }

  /**
   * Finds active geofences within a proximity buffer distance using PostGIS ST_DWithin & ST_Distance.
   * Excludes geofences the point is already strictly contained within.
   */
  public async findGeofencesNearPoint(
    lat: number,
    lng: number,
    bufferMeters: number = 500
  ): Promise<ProximityGeofence[]> {
    this.validateCoordinates(lat, lng);

    if (bufferMeters < 0) {
      throw new AppError('Buffer distance must be non-negative', 400, 'INVALID_BUFFER_DISTANCE');
    }

    const rawProximity = await prisma.$queryRaw<Array<{
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
      distanceMeters: number;
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
        ST_X(ST_Centroid(g."boundary")) AS "centerLng",
        ST_Distance(
          g."boundary"::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS "distanceMeters"
      FROM "Geofence" g
      WHERE g."isActive" = true
        AND (g."expiresAt" IS NULL OR g."expiresAt" > NOW())
        AND ST_DWithin(
          g."boundary"::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${bufferMeters}
        )
        AND NOT ST_Contains(g."boundary", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
      ORDER BY "distanceMeters" ASC;
    `;

    return rawProximity.map((row) => ({
      geofence: this.toGeofenceEntity(row),
      distanceMeters: Math.round(Number(row.distanceMeters)),
    }));
  }

  /**
   * Evaluates complete location status: both active containment and approaching warnings.
   */
  public async evaluateLocation(
    lat: number,
    lng: number,
    bufferMeters: number = 500
  ): Promise<GeofenceCheckResult> {
    const [breachedGeofences, approachingGeofences] = await Promise.all([
      this.checkPointInGeofences(lat, lng),
      this.findGeofencesNearPoint(lat, lng, bufferMeters),
    ]);

    return {
      inside: breachedGeofences.length > 0,
      breachedGeofences,
      approachingGeofences,
    };
  }

  /**
   * Deserializes raw PostGIS SQL query record to GeofenceEntity.
   */
  public toGeofenceEntity(raw: any): GeofenceEntity {
    let boundary: GeoJSONPolygon | null = null;
    if (raw.boundaryGeoJson) {
      try {
        boundary = typeof raw.boundaryGeoJson === 'string'
          ? JSON.parse(raw.boundaryGeoJson)
          : raw.boundaryGeoJson;
      } catch {
        boundary = null;
      }
    }

    return {
      id: raw.id,
      zoneId: raw.zoneId ?? null,
      name: raw.name,
      type: raw.type,
      boundary,
      centerLat: raw.centerLat !== null && raw.centerLat !== undefined ? Number(raw.centerLat) : undefined,
      centerLng: raw.centerLng !== null && raw.centerLng !== undefined ? Number(raw.centerLng) : undefined,
      isActive: Boolean(raw.isActive),
      severity: raw.severity as DangerTier,
      message: raw.message ?? null,
      createdBy: raw.createdBy ?? null,
      createdAt: raw.createdAt instanceof Date ? raw.createdAt : new Date(raw.createdAt),
      expiresAt: raw.expiresAt ? (raw.expiresAt instanceof Date ? raw.expiresAt : new Date(raw.expiresAt)) : null,
    };
  }
}

export const geofenceEngine = new GeofenceEngine();
export default geofenceEngine;
