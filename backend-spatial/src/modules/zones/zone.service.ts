/**
 * Safe Yatra — Backend Spatial Server
 * Zones Service & PostGIS Polygon Management.
 */

import { DangerTier } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import {
  CreateZoneInput,
  GeoJSONPolygon,
  OverrideScoreInput,
  UpdateZoneInput,
  ZoneEntity,
} from './zone.types';

export class ZoneService {
  /**
   * Maps numeric danger score (0-100) to standard DangerTier.
   */
  public scoreToDangerTier(score: number): DangerTier {
    if (score < 0 || score > 100) {
      throw new AppError(
        'Danger score must be between 0 and 100',
        400,
        'INVALID_DANGER_SCORE'
      );
    }

    if (score <= 25) return DangerTier.LOW;
    if (score <= 50) return DangerTier.MODERATE;
    if (score <= 75) return DangerTier.SEVERE;
    return DangerTier.CRITICAL;
  }

  /**
   * Creates a new zone with PostGIS Polygon geometry or circular buffer.
   */
  public async createZone(input: CreateZoneInput): Promise<ZoneEntity> {
    const zoneId = uuidv4();
    const dangerScore = Math.round(input.dangerScore ?? 0);
    const dangerTier = this.scoreToDangerTier(dangerScore);

    if (input.boundary) {
      // Insert with explicit GeoJSON Polygon
      await prisma.$executeRaw`
        INSERT INTO "Zone" (
          "id", "name", "description", "boundary",
          "dangerScore", "dangerTier", "justification", "isManualOverride",
          "lastScoreUpdate", "createdAt", "updatedAt"
        ) VALUES (
          ${zoneId},
          ${input.name},
          ${input.description ?? null},
          ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.boundary)}), 4326),
          ${dangerScore},
          ${dangerTier}::"DangerTier",
          ${input.justification ?? null},
          false,
          NOW(),
          NOW(),
          NOW()
        );
      `;
    } else if (
      input.centerLat !== undefined &&
      input.centerLng !== undefined &&
      input.radiusMeters
    ) {
      // Generate circular polygon buffer around center point
      await prisma.$executeRaw`
        INSERT INTO "Zone" (
          "id", "name", "description", "boundary",
          "dangerScore", "dangerTier", "justification", "isManualOverride",
          "lastScoreUpdate", "createdAt", "updatedAt"
        ) VALUES (
          ${zoneId},
          ${input.name},
          ${input.description ?? null},
          ST_SetSRID(ST_Buffer(ST_SetSRID(ST_MakePoint(${input.centerLng}, ${input.centerLat}), 4326)::geography, ${input.radiusMeters})::geometry, 4326),
          ${dangerScore},
          ${dangerTier}::"DangerTier",
          ${input.justification ?? null},
          false,
          NOW(),
          NOW(),
          NOW()
        );
      `;
    } else {
      throw new AppError(
        'Zone must have either polygon boundary or a center (lat/lng) with radiusMeters',
        400,
        'INVALID_ZONE_GEOMETRY'
      );
    }

    return this.getZoneById(zoneId);
  }

  /**
   * Retrieves all zones with parsed GeoJSON boundaries.
   */
  public async getAllZones(): Promise<ZoneEntity[]> {
    const rawZones = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      description: string | null;
      boundaryGeoJson: string | null;
      centerLat: number | null;
      centerLng: number | null;
      dangerScore: number;
      dangerTier: string;
      justification: string | null;
      isManualOverride: boolean;
      lastScoreUpdate: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT
        "id",
        "name",
        "description",
        ST_AsGeoJSON("boundary") AS "boundaryGeoJson",
        ST_Y(ST_Centroid("boundary")) AS "centerLat",
        ST_X(ST_Centroid("boundary")) AS "centerLng",
        "dangerScore",
        "dangerTier"::text AS "dangerTier",
        "justification",
        "isManualOverride",
        "lastScoreUpdate",
        "createdAt",
        "updatedAt"
      FROM "Zone"
      ORDER BY "dangerScore" DESC;
    `;

    return rawZones.map(this.toZoneEntity);
  }

  /**
   * Retrieves a single zone by ID with deserialized GeoJSON polygon.
   */
  public async getZoneById(id: string): Promise<ZoneEntity> {
    const rawZones = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      description: string | null;
      boundaryGeoJson: string | null;
      centerLat: number | null;
      centerLng: number | null;
      dangerScore: number;
      dangerTier: string;
      justification: string | null;
      isManualOverride: boolean;
      lastScoreUpdate: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT
        "id",
        "name",
        "description",
        ST_AsGeoJSON("boundary") AS "boundaryGeoJson",
        ST_Y(ST_Centroid("boundary")) AS "centerLat",
        ST_X(ST_Centroid("boundary")) AS "centerLng",
        "dangerScore",
        "dangerTier"::text AS "dangerTier",
        "justification",
        "isManualOverride",
        "lastScoreUpdate",
        "createdAt",
        "updatedAt"
      FROM "Zone"
      WHERE "id" = ${id}
      LIMIT 1;
    `;

    if (!rawZones || rawZones.length === 0) {
      throw new AppError('Zone not found', 404, 'ZONE_NOT_FOUND');
    }

    return this.toZoneEntity(rawZones[0]);
  }

  /**
   * Manually overrides a zone's danger score with an audit justification.
   */
  public async overrideScore(
    id: string,
    input: OverrideScoreInput
  ): Promise<ZoneEntity> {
    const dangerScore = Math.round(input.score);
    const dangerTier = this.scoreToDangerTier(dangerScore);

    // Verify zone exists
    await this.getZoneById(id);

    await prisma.zone.update({
      where: { id },
      data: {
        dangerScore,
        dangerTier,
        isManualOverride: true,
        justification: input.justification,
        lastScoreUpdate: new Date(),
      },
    });

    return this.getZoneById(id);
  }

  /**
   * Updates general fields of a zone.
   */
  public async updateZone(
    id: string,
    input: UpdateZoneInput
  ): Promise<ZoneEntity> {
    // Verify zone exists
    await this.getZoneById(id);

    await prisma.zone.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.justification !== undefined ? { justification: input.justification } : {}),
      },
    });

    if (input.boundary) {
      await prisma.$executeRaw`
        UPDATE "Zone"
        SET "boundary" = ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.boundary)}), 4326),
            "updatedAt" = NOW()
        WHERE "id" = ${id};
      `;
    }

    return this.getZoneById(id);
  }

  /**
   * Deletes a zone by ID.
   */
  public async deleteZone(id: string): Promise<void> {
    await this.getZoneById(id);

    await prisma.zone.delete({
      where: { id },
    });
  }

  /**
   * Serializes raw SQL zone record to ZoneEntity.
   */
  private toZoneEntity(raw: any): ZoneEntity {
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
      name: raw.name,
      description: raw.description,
      boundary,
      centerLat: raw.centerLat !== null ? Number(raw.centerLat) : undefined,
      centerLng: raw.centerLng !== null ? Number(raw.centerLng) : undefined,
      dangerScore: Number(raw.dangerScore),
      dangerTier: raw.dangerTier as DangerTier,
      isManualOverride: Boolean(raw.isManualOverride),
      justification: raw.justification,
      lastScoreUpdate: raw.lastScoreUpdate,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}

export const zoneService = new ZoneService();
export default zoneService;
