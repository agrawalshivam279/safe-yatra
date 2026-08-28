/**
 * Safe Yatra — Backend Spatial Server
 * SOS Emergency Dispatch Service & State Transition Machine.
 */

import { SOSStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { dangerService } from '../danger/danger.service';
import { sosMatcher } from './sos.matcher';
import {
  SOSDetailEntity,
  SOSEntity,
  TriggerSOSInput,
  TriggerSOSResult,
} from './sos.types';

export class SOSService {
  /**
   * Triggers a new emergency SOS event, captures real-time danger score snapshot,
   * logs timeline, and matches nearby Yaatri Mitra volunteer responders within 5km.
   */
  public async triggerSOS(input: TriggerSOSInput): Promise<TriggerSOSResult> {
    if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
      throw new AppError('Invalid coordinate boundaries', 400, 'INVALID_COORDINATES');
    }

    // Verify triggering user exists
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Capture environmental danger score snapshot at coordinate
    let dangerScore = 0;
    try {
      const scoreResult = await dangerService.getScoreForCoordinates(input.lat, input.lng);
      dangerScore = scoreResult.dangerScore;
    } catch {
      dangerScore = 0;
    }

    const sosId = uuidv4();

    // 1. Create SOSEvent in database with PostGIS Point
    await prisma.$executeRaw`
      INSERT INTO "SOSEvent" (
        "id", "triggeredBy", "coordinates", "altitude", "battery",
        "audioUrl", "status", "dangerScore", "createdAt", "updatedAt"
      ) VALUES (
        ${sosId},
        ${input.userId},
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326),
        ${input.altitude ?? null},
        ${input.battery ?? null},
        ${input.audioUrl ?? null},
        'TRIGGERED'::"SOSStatus",
        ${dangerScore},
        NOW(),
        NOW()
      );
    `;

    // 2. Log initial SOSTimeline entry
    await prisma.sOSTimeline.create({
      data: {
        id: uuidv4(),
        sosEventId: sosId,
        event: 'TRIGGERED',
        details: 'Emergency SOS triggered by user',
      },
    });

    // 3. Match nearby on-duty volunteers within 5km radius
    const matchResult = await sosMatcher.matchVolunteers(input.lat, input.lng, 5000, 10);

    // 4. If volunteers are available, alert them and update state to VOLUNTEER_ALERTED
    if (matchResult.volunteers.length > 0) {
      await prisma.sOSEvent.update({
        where: { id: sosId },
        data: { status: SOSStatus.VOLUNTEER_ALERTED },
      });

      // Create SOSResponse records for alerted responders
      for (const vol of matchResult.volunteers) {
        await prisma.sOSResponse.create({
          data: {
            id: uuidv4(),
            sosEventId: sosId,
            volunteerId: vol.userId,
            status: 'ALERTED',
            etaSeconds: vol.estimatedEtaSeconds,
          },
        });
      }

      await prisma.sOSTimeline.create({
        data: {
          id: uuidv4(),
          sosEventId: sosId,
          event: 'VOLUNTEERS_ALERTED',
          details: `Alerted ${matchResult.volunteerCount} nearby Yaatri Mitra responders within 5km`,
        },
      });
    }

    const sosEvent = await this.getSOSById(sosId);

    return {
      sosEvent,
      matchResult,
    };
  }

  /**
   * Accepts an active emergency mission for a volunteer responder.
   */
  public async acceptSOS(sosId: string, volunteerId: string): Promise<SOSEntity> {
    const sos = await this.getSOSById(sosId);

    if (
      sos.status === SOSStatus.RESOLVED ||
      sos.status === SOSStatus.CANCELLED ||
      sos.status === SOSStatus.EXPIRED
    ) {
      throw new AppError(
        'Cannot accept an SOS that is already resolved, cancelled, or expired',
        400,
        'INVALID_SOS_STATE'
      );
    }

    // Guard against race condition: check if already accepted by another volunteer
    const existingAccepted = await prisma.sOSResponse.findFirst({
      where: {
        sosEventId: sosId,
        status: 'ACCEPTED',
      },
    });

    if (existingAccepted && existingAccepted.volunteerId !== volunteerId) {
      throw new AppError(
        'This SOS has already been accepted by another responder',
        409,
        'SOS_ALREADY_ACCEPTED'
      );
    }

    // Upsert or update volunteer response record
    const existingResponse = await prisma.sOSResponse.findFirst({
      where: {
        sosEventId: sosId,
        volunteerId,
      },
    });

    if (existingResponse) {
      await prisma.sOSResponse.update({
        where: { id: existingResponse.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
    } else {
      await prisma.sOSResponse.create({
        data: {
          id: uuidv4(),
          sosEventId: sosId,
          volunteerId,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });
    }

    // Update SOSEvent status to VOLUNTEER_ACCEPTED
    await prisma.sOSEvent.update({
      where: { id: sosId },
      data: { status: SOSStatus.VOLUNTEER_ACCEPTED },
    });

    // Increment volunteer total responses metric
    await prisma.volunteerProfile.updateMany({
      where: { userId: volunteerId },
      data: { totalResponses: { increment: 1 } },
    });

    // Log timeline entry
    await prisma.sOSTimeline.create({
      data: {
        id: uuidv4(),
        sosEventId: sosId,
        event: 'VOLUNTEER_ACCEPTED',
        details: `Emergency mission accepted by volunteer responder ${volunteerId}`,
      },
    });

    return this.getSOSById(sosId);
  }

  /**
   * Marks that the volunteer responder has arrived on-scene.
   */
  public async arriveSOS(sosId: string, volunteerId: string): Promise<SOSEntity> {
    const sos = await this.getSOSById(sosId);

    if (
      sos.status === SOSStatus.RESOLVED ||
      sos.status === SOSStatus.CANCELLED ||
      sos.status === SOSStatus.EXPIRED
    ) {
      throw new AppError(
        'Cannot arrive on an SOS that is already resolved, cancelled, or expired',
        400,
        'INVALID_SOS_STATE'
      );
    }

    await prisma.sOSResponse.updateMany({
      where: {
        sosEventId: sosId,
        volunteerId,
      },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date(),
      },
    });

    await prisma.sOSEvent.update({
      where: { id: sosId },
      data: { status: SOSStatus.VOLUNTEER_ARRIVED },
    });

    await prisma.sOSTimeline.create({
      data: {
        id: uuidv4(),
        sosEventId: sosId,
        event: 'VOLUNTEER_ARRIVED',
        details: `Volunteer responder ${volunteerId} arrived on scene`,
      },
    });

    return this.getSOSById(sosId);
  }

  /**
   * Marks an active SOS event as fully resolved.
   */
  public async resolveSOS(
    sosId: string,
    resolvedByUserId?: string,
    resolutionNotes?: string
  ): Promise<SOSEntity> {
    const sos = await this.getSOSById(sosId);

    if (sos.status === SOSStatus.RESOLVED) {
      return sos;
    }

    if (sos.status === SOSStatus.CANCELLED || sos.status === SOSStatus.EXPIRED) {
      throw new AppError(
        'Cannot resolve an SOS that was cancelled or expired',
        400,
        'INVALID_SOS_STATE'
      );
    }

    await prisma.sOSEvent.update({
      where: { id: sosId },
      data: {
        status: SOSStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    await prisma.sOSTimeline.create({
      data: {
        id: uuidv4(),
        sosEventId: sosId,
        event: 'RESOLVED',
        details: resolutionNotes ?? `Emergency resolved by user ${resolvedByUserId ?? 'system'}`,
      },
    });

    return this.getSOSById(sosId);
  }

  /**
   * Cancels an active SOS event.
   */
  public async cancelSOS(
    sosId: string,
    userId: string,
    reason?: string
  ): Promise<SOSEntity> {
    const sos = await this.getSOSById(sosId);

    if (
      sos.status === SOSStatus.RESOLVED ||
      sos.status === SOSStatus.CANCELLED ||
      sos.status === SOSStatus.EXPIRED
    ) {
      throw new AppError(
        'Cannot cancel an already completed SOS',
        400,
        'INVALID_SOS_STATE'
      );
    }

    await prisma.sOSEvent.update({
      where: { id: sosId },
      data: {
        status: SOSStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await prisma.sOSTimeline.create({
      data: {
        id: uuidv4(),
        sosEventId: sosId,
        event: 'CANCELLED',
        details: reason ?? `Emergency cancelled by user ${userId}`,
      },
    });

    return this.getSOSById(sosId);
  }

  /**
   * Retrieves a single SOS event with coordinates, user info, responses, and timeline.
   */
  public async getSOSById(sosId: string): Promise<SOSDetailEntity> {
    const rawEvents = await prisma.$queryRaw<Array<{
      id: string;
      triggeredBy: string;
      userName: string;
      userPhone: string;
      lat: number;
      lng: number;
      altitude: number | null;
      battery: number | null;
      audioUrl: string | null;
      status: string;
      dangerScore: number | null;
      resolvedAt: Date | null;
      cancelledAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT
        s."id",
        s."triggeredBy",
        u."name" AS "userName",
        u."phone" AS "userPhone",
        ST_Y(s."coordinates"::geometry) AS "lat",
        ST_X(s."coordinates"::geometry) AS "lng",
        s."altitude",
        s."battery",
        s."audioUrl",
        s."status"::text AS "status",
        s."dangerScore",
        s."resolvedAt",
        s."cancelledAt",
        s."createdAt",
        s."updatedAt"
      FROM "SOSEvent" s
      JOIN "User" u ON u."id" = s."triggeredBy"
      WHERE s."id" = ${sosId}
      LIMIT 1;
    `;

    if (!rawEvents || rawEvents.length === 0) {
      throw new AppError('SOS event not found', 404, 'SOS_NOT_FOUND');
    }

    const event = rawEvents[0];

    // Fetch responses and timeline relations
    const [responses, timeline] = await Promise.all([
      prisma.sOSResponse.findMany({
        where: { sosEventId: sosId },
        include: {
          volunteer: {
            select: { id: true, name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.sOSTimeline.findMany({
        where: { sosEventId: sosId },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    return {
      id: event.id,
      triggeredBy: event.triggeredBy,
      lat: Number(event.lat),
      lng: Number(event.lng),
      altitude: event.altitude !== null ? Number(event.altitude) : null,
      battery: event.battery !== null ? Number(event.battery) : null,
      audioUrl: event.audioUrl,
      status: event.status as SOSStatus,
      dangerScore: event.dangerScore !== null ? Number(event.dangerScore) : null,
      resolvedAt: event.resolvedAt,
      cancelledAt: event.cancelledAt,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      user: {
        id: event.triggeredBy,
        name: event.userName,
        phone: event.userPhone,
      },
      responses: responses.map((r) => ({
        id: r.id,
        sosEventId: r.sosEventId,
        volunteerId: r.volunteerId,
        status: r.status,
        acceptedAt: r.acceptedAt,
        arrivedAt: r.arrivedAt,
        currentLat: r.currentLat,
        currentLng: r.currentLng,
        etaSeconds: r.etaSeconds,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        volunteer: r.volunteer,
      })),
      timeline: timeline.map((t) => ({
        id: t.id,
        sosEventId: t.sosEventId,
        event: t.event,
        details: t.details,
        timestamp: t.timestamp,
      })),
    };
  }

  /**
   * Retrieves all active SOS events (status not resolved, cancelled, or expired).
   */
  public async getActiveSOSEvents(limit = 50): Promise<SOSEntity[]> {
    const rawEvents = await prisma.$queryRaw<Array<{
      id: string;
      triggeredBy: string;
      lat: number;
      lng: number;
      altitude: number | null;
      battery: number | null;
      audioUrl: string | null;
      status: string;
      dangerScore: number | null;
      resolvedAt: Date | null;
      cancelledAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT
        s."id",
        s."triggeredBy",
        ST_Y(s."coordinates"::geometry) AS "lat",
        ST_X(s."coordinates"::geometry) AS "lng",
        s."altitude",
        s."battery",
        s."audioUrl",
        s."status"::text AS "status",
        s."dangerScore",
        s."resolvedAt",
        s."cancelledAt",
        s."createdAt",
        s."updatedAt"
      FROM "SOSEvent" s
      WHERE s."status"::text NOT IN ('RESOLVED', 'CANCELLED', 'EXPIRED')
      ORDER BY s."createdAt" DESC
      LIMIT ${limit};
    `;

    return rawEvents.map((e) => ({
      id: e.id,
      triggeredBy: e.triggeredBy,
      lat: Number(e.lat),
      lng: Number(e.lng),
      altitude: e.altitude !== null ? Number(e.altitude) : null,
      battery: e.battery !== null ? Number(e.battery) : null,
      audioUrl: e.audioUrl,
      status: e.status as SOSStatus,
      dangerScore: e.dangerScore !== null ? Number(e.dangerScore) : null,
      resolvedAt: e.resolvedAt,
      cancelledAt: e.cancelledAt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));
  }
}

export const sosService = new SOSService();
export default sosService;
