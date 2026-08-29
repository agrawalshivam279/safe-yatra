/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast & Command Center Service.
 */

import { v4 as uuidv4 } from 'uuid';
import { DangerTier } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { getIO } from '../../websocket/socketServer';
import { emitToRole } from '../../websocket/rooms';
import {
  BroadcastAlertEntity,
  BroadcastFilterQuery,
  BroadcastRecipient,
  CreateBroadcastInput,
  GeoJSONPolygon,
} from './admin.types';

export class AdminService {
  /**
   * Creates a new geospatial safety broadcast alert, persists the boundary in PostGIS,
   * discovers all active tourists situated inside the sector, and pushes real-time WebSocket alerts.
   */
  public async createBroadcastAlert(
    input: CreateBroadcastInput,
    createdBy: string
  ): Promise<BroadcastAlertEntity> {
    const id = uuidv4();
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    if (input.targetArea) {
      const targetAreaGeoJson = JSON.stringify(input.targetArea);
      await prisma.$executeRaw`
        INSERT INTO "BroadcastAlert" (
          "id", "title", "message", "severity", "targetArea", "createdBy", "isActive", "expiresAt", "createdAt"
        ) VALUES (
          ${id},
          ${input.title},
          ${input.message},
          ${input.severity}::"DangerTier",
          ST_SetSRID(ST_GeomFromGeoJSON(${targetAreaGeoJson}), 4326),
          ${createdBy},
          true,
          ${expiresAt},
          NOW()
        );
      `;
    } else if (
      input.centerLat !== undefined &&
      input.centerLng !== undefined &&
      input.radiusMeters !== undefined
    ) {
      await prisma.$executeRaw`
        INSERT INTO "BroadcastAlert" (
          "id", "title", "message", "severity", "targetArea", "createdBy", "isActive", "expiresAt", "createdAt"
        ) VALUES (
          ${id},
          ${input.title},
          ${input.message},
          ${input.severity}::"DangerTier",
          ST_SetSRID(
            ST_Buffer(
              ST_SetSRID(ST_MakePoint(${input.centerLng}, ${input.centerLat}), 4326)::geography,
              ${input.radiusMeters}
            )::geometry,
            4326
          ),
          ${createdBy},
          true,
          ${expiresAt},
          NOW()
        );
      `;
    } else {
      throw new AppError(
        'Either targetArea GeoJSON polygon or (centerLat, centerLng, radiusMeters) must be provided',
        400,
        'VALIDATION_ERROR'
      );
    }

    // 2. Discover recipients currently located within the targeted broadcast area
    const recipients = await this.findRecipientsInAlertArea(id);

    // 3. Retrieve formatted broadcast alert entity
    const alertEntity = await this.getBroadcastById(id);
    alertEntity.recipientCount = recipients.length;

    // 4. Emit real-time WebSocket notifications
    try {
      const io = getIO();
      emitToRole(io, 'TOURIST', 'admin:broadcast', alertEntity);
      emitToRole(io, 'YAATRI_MITRA', 'admin:broadcast', alertEntity);
      emitToRole(io, 'ADMIN', 'admin:broadcast', alertEntity);
    } catch {
      // Gracefully continue in headless / mock test environments
    }

    return alertEntity;
  }

  /**
   * Retrieves all active users whose latest GPS coordinates fall within the alert boundary.
   */
  public async findRecipientsInAlertArea(alertId: string): Promise<BroadcastRecipient[]> {
    const rawRecipients: any[] = await prisma.$queryRaw`
      SELECT DISTINCT ON (ul."userId")
        ul."userId",
        u."name",
        u."phone",
        u."role"::text as "role",
        ST_Y(ul."coordinates"::geometry) as "lastLat",
        ST_X(ul."coordinates"::geometry) as "lastLng"
      FROM "UserLocation" ul
      JOIN "User" u ON u."id" = ul."userId"
      WHERE ST_Contains(
        (SELECT "targetArea" FROM "BroadcastAlert" WHERE "id" = ${alertId}),
        ul."coordinates"::geometry
      )
      AND ul."timestamp" >= NOW() - INTERVAL '30 minutes'
      AND u."isActive" = true;
    `;

    return rawRecipients.map((r) => ({
      userId: r.userId,
      name: r.name,
      phone: r.phone,
      role: r.role,
      lastLat: r.lastLat ? Number(r.lastLat) : undefined,
      lastLng: r.lastLng ? Number(r.lastLng) : undefined,
    }));
  }

  /**
   * Retrieves a list of broadcast alerts with PostGIS geometry deserialized to GeoJSON.
   */
  public async getAllBroadcasts(query: BroadcastFilterQuery = {}): Promise<BroadcastAlertEntity[]> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    let rawAlerts: any[];

    if (query.isActive !== undefined && query.severity) {
      rawAlerts = await prisma.$queryRaw`
        SELECT
          b."id",
          b."title",
          b."message",
          b."severity"::text as "severity",
          ST_AsGeoJSON(b."targetArea") as "targetAreaGeoJson",
          ST_Y(ST_Centroid(b."targetArea"::geometry)) as "centerLat",
          ST_X(ST_Centroid(b."targetArea"::geometry)) as "centerLng",
          b."createdBy",
          b."isActive",
          b."expiresAt",
          b."createdAt"
        FROM "BroadcastAlert" b
        WHERE b."isActive" = ${query.isActive}
          AND b."severity" = ${query.severity}::"DangerTier"
        ORDER BY b."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (query.isActive !== undefined) {
      rawAlerts = await prisma.$queryRaw`
        SELECT
          b."id",
          b."title",
          b."message",
          b."severity"::text as "severity",
          ST_AsGeoJSON(b."targetArea") as "targetAreaGeoJson",
          ST_Y(ST_Centroid(b."targetArea"::geometry)) as "centerLat",
          ST_X(ST_Centroid(b."targetArea"::geometry)) as "centerLng",
          b."createdBy",
          b."isActive",
          b."expiresAt",
          b."createdAt"
        FROM "BroadcastAlert" b
        WHERE b."isActive" = ${query.isActive}
        ORDER BY b."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else if (query.severity) {
      rawAlerts = await prisma.$queryRaw`
        SELECT
          b."id",
          b."title",
          b."message",
          b."severity"::text as "severity",
          ST_AsGeoJSON(b."targetArea") as "targetAreaGeoJson",
          ST_Y(ST_Centroid(b."targetArea"::geometry)) as "centerLat",
          ST_X(ST_Centroid(b."targetArea"::geometry)) as "centerLng",
          b."createdBy",
          b."isActive",
          b."expiresAt",
          b."createdAt"
        FROM "BroadcastAlert" b
        WHERE b."severity" = ${query.severity}::"DangerTier"
        ORDER BY b."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
    } else {
      rawAlerts = await prisma.$queryRaw`
        SELECT
          b."id",
          b."title",
          b."message",
          b."severity"::text as "severity",
          ST_AsGeoJSON(b."targetArea") as "targetAreaGeoJson",
          ST_Y(ST_Centroid(b."targetArea"::geometry)) as "centerLat",
          ST_X(ST_Centroid(b."targetArea"::geometry)) as "centerLng",
          b."createdBy",
          b."isActive",
          b."expiresAt",
          b."createdAt"
        FROM "BroadcastAlert" b
        ORDER BY b."createdAt" DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
    }

    return rawAlerts.map((row) => this.mapRawToAlertEntity(row));
  }

  /**
   * Retrieves a single broadcast alert by unique identifier.
   */
  public async getBroadcastById(id: string): Promise<BroadcastAlertEntity> {
    const rawAlerts: any[] = await prisma.$queryRaw`
      SELECT
        b."id",
        b."title",
        b."message",
        b."severity"::text as "severity",
        ST_AsGeoJSON(b."targetArea") as "targetAreaGeoJson",
        ST_Y(ST_Centroid(b."targetArea"::geometry)) as "centerLat",
        ST_X(ST_Centroid(b."targetArea"::geometry)) as "centerLng",
        b."createdBy",
        b."isActive",
        b."expiresAt",
        b."createdAt"
      FROM "BroadcastAlert" b
      WHERE b."id" = ${id}
      LIMIT 1;
    `;

    if (!rawAlerts || rawAlerts.length === 0) {
      throw new AppError('Broadcast alert not found', 404, 'NOT_FOUND');
    }

    return this.mapRawToAlertEntity(rawAlerts[0]);
  }

  /**
   * Deactivates an active broadcast alert.
   */
  public async deactivateBroadcast(id: string): Promise<BroadcastAlertEntity> {
    // Verify existence
    await this.getBroadcastById(id);

    await prisma.$executeRaw`
      UPDATE "BroadcastAlert"
      SET "isActive" = false
      WHERE "id" = ${id};
    `;

    return this.getBroadcastById(id);
  }

  /**
   * Maps raw database records with GeoJSON strings into typed entities.
   */
  private mapRawToAlertEntity(row: any): BroadcastAlertEntity {
    let parsedTargetArea: GeoJSONPolygon;
    try {
      parsedTargetArea =
        typeof row.targetAreaGeoJson === 'string'
          ? JSON.parse(row.targetAreaGeoJson)
          : row.targetAreaGeoJson;
    } catch {
      parsedTargetArea = {
        type: 'Polygon',
        coordinates: [],
      };
    }

    return {
      id: row.id,
      title: row.title,
      message: row.message,
      severity: row.severity as DangerTier,
      targetArea: parsedTargetArea,
      centerLat: row.centerLat !== null && row.centerLat !== undefined ? Number(row.centerLat) : undefined,
      centerLng: row.centerLng !== null && row.centerLng !== undefined ? Number(row.centerLng) : undefined,
      createdBy: row.createdBy,
      isActive: Boolean(row.isActive),
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
      createdAt: new Date(row.createdAt),
    };
  }
}

export const adminService = new AdminService();
export default adminService;
