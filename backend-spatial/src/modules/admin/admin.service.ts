/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast, Analytics & Command Center Service.
 */

import { v4 as uuidv4 } from 'uuid';
import { DangerTier } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { getIO } from '../../websocket/socketServer';
import { emitToRole } from '../../websocket/rooms';
import {
  AdminAnalyticsResult,
  BroadcastAlertEntity,
  BroadcastFilterQuery,
  BroadcastRecipient,
  CreateBroadcastInput,
  GeoJSONPolygon,
  HeatmapCluster,
  HeatmapQueryInput,
  HeatmapResult,
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
   * Aggregates real-time command center analytics across SOS events, user telemetry,
   * zone danger distributions, and active system alerts.
   */
  public async getSystemAnalytics(): Promise<AdminAnalyticsResult> {
    // 1. SOS event metrics
    const totalSOS = await prisma.sOSEvent.count();
    const activeSOS = await prisma.sOSEvent.count({
      where: {
        status: {
          in: [
            'TRIGGERED',
            'MATCHING',
            'VOLUNTEER_ALERTED',
            'VOLUNTEER_ACCEPTED',
            'VOLUNTEER_EN_ROUTE',
            'VOLUNTEER_ARRIVED',
          ],
        },
      },
    });
    const resolvedSOS = await prisma.sOSEvent.count({ where: { status: 'RESOLVED' } });
    const cancelledSOS = await prisma.sOSEvent.count({ where: { status: 'CANCELLED' } });

    // Average response time in seconds
    const avgResponseTimeRaw: any[] = await prisma.$queryRaw`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (r."acceptedAt" - e."createdAt"))), 0)::float as "avgSec"
      FROM "SOSResponse" r
      JOIN "SOSEvent" e ON e."id" = r."sosEventId"
      WHERE r."acceptedAt" IS NOT NULL;
    `;
    const avgResponseTimeSeconds = Math.round(avgResponseTimeRaw[0]?.avgSec || 0);

    // 2. User metrics
    const activeTouristsRaw: any[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT ul."userId")::int as "count"
      FROM "UserLocation" ul
      JOIN "User" u ON u."id" = ul."userId"
      WHERE u."role" = 'TOURIST'
        AND u."isActive" = true
        AND ul."timestamp" >= NOW() - INTERVAL '30 minutes';
    `;
    const activeTourists = Number(activeTouristsRaw[0]?.count || 0);

    const activeVolunteersOnDuty = await prisma.volunteerProfile.count({
      where: { isOnDuty: true, verificationStatus: 'VERIFIED' },
    });
    const totalVolunteers = await prisma.volunteerProfile.count();

    // 3. Zone & Danger Tier distribution
    const totalZones = await prisma.zone.count();
    const lowTier = await prisma.zone.count({ where: { dangerTier: 'LOW' } });
    const moderateTier = await prisma.zone.count({ where: { dangerTier: 'MODERATE' } });
    const severeTier = await prisma.zone.count({ where: { dangerTier: 'SEVERE' } });
    const criticalTier = await prisma.zone.count({ where: { dangerTier: 'CRITICAL' } });

    // 4. Active alerts & geofences
    const activeGeofences = await prisma.geofence.count({ where: { isActive: true } });
    const activeBroadcasts = await prisma.broadcastAlert.count({ where: { isActive: true } });

    return {
      sos: {
        total: totalSOS,
        active: activeSOS,
        resolved: resolvedSOS,
        cancelled: cancelledSOS,
        avgResponseTimeSeconds,
      },
      users: {
        activeTourists,
        activeVolunteersOnDuty,
        totalVolunteers,
      },
      zones: {
        totalZones,
        tierDistribution: {
          LOW: lowTier,
          MODERATE: moderateTier,
          SEVERE: severeTier,
          CRITICAL: criticalTier,
        },
      },
      alerts: {
        activeGeofences,
        activeBroadcasts,
      },
    };
  }

  /**
   * Generates privacy-preserving crowd density clusters using PostGIS ST_SnapToGrid
   * without exposing individual user GPS trajectories.
   */
  public async getHeatmapData(query: HeatmapQueryInput = {}): Promise<HeatmapResult> {
    const lookbackMinutes = query.lookbackMinutes ?? 60;
    const gridSize = query.gridSize ?? 0.005;

    const rawClusters: any[] = await prisma.$queryRaw`
      SELECT
        ROUND(ST_Y(ST_Centroid(ST_Collect(coordinates::geometry)))::numeric, 6)::float as "lat",
        ROUND(ST_X(ST_Centroid(ST_Collect(coordinates::geometry)))::numeric, 6)::float as "lng",
        COUNT(DISTINCT "userId")::int as "intensity",
        COUNT(*)::int as "pointCount"
      FROM "UserLocation"
      WHERE "timestamp" >= NOW() - (${lookbackMinutes} * INTERVAL '1 minute')
      GROUP BY ST_SnapToGrid(coordinates::geometry, ${gridSize})
      ORDER BY "intensity" DESC;
    `;

    const clusters: HeatmapCluster[] = (rawClusters || []).map((c) => ({
      lat: Number(c.lat),
      lng: Number(c.lng),
      intensity: Number(c.intensity),
      pointCount: Number(c.pointCount),
    }));

    const totalPoints = clusters.reduce((acc, curr) => acc + curr.pointCount, 0);

    return {
      totalPoints,
      clusterCount: clusters.length,
      lookbackMinutes,
      clusters,
    };
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
