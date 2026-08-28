/**
 * Safe Yatra — Backend Spatial Server
 * Volunteer Service & PostGIS Spatial Proximity Engine.
 */

import { VolunteerProfile } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import {
  LocationPingInput,
  NearbyVolunteerResult,
} from './volunteer.types';

export class VolunteerService {
  /**
   * Registers or updates a volunteer profile for a user.
   */
  public async registerVolunteer(
    userId: string,
    aadharNumber?: string
  ): Promise<VolunteerProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const profile = await prisma.volunteerProfile.upsert({
      where: { userId },
      create: {
        userId,
        aadharNumber,
        verificationStatus: 'PENDING',
        isOnDuty: false,
      },
      update: {
        ...(aadharNumber ? { aadharNumber } : {}),
      },
    });

    return profile;
  }

  /**
   * Toggles or sets the on-duty status of a volunteer.
   */
  public async toggleDutyStatus(
    userId: string,
    isOnDuty?: boolean
  ): Promise<VolunteerProfile> {
    const profile = await prisma.volunteerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new AppError(
        'Volunteer profile not found for this user',
        404,
        'VOLUNTEER_PROFILE_NOT_FOUND'
      );
    }

    const updatedProfile = await prisma.volunteerProfile.update({
      where: { userId },
      data: {
        isOnDuty: isOnDuty !== undefined ? isOnDuty : !profile.isOnDuty,
      },
    });

    return updatedProfile;
  }

  /**
   * Records an ephemeral user GPS position ping into UserLocation using PostGIS Point.
   */
  public async recordLocation(
    input: LocationPingInput
  ): Promise<{ id: string; timestamp: Date }> {
    if (input.lat < -90 || input.lat > 90 || input.lng < -180 || input.lng > 180) {
      throw new AppError('Invalid coordinate boundaries', 400, 'INVALID_COORDINATES');
    }

    const locationId = uuidv4();
    const result = await prisma.$queryRaw<Array<{ id: string; timestamp: Date }>>`
      INSERT INTO "UserLocation" ("id", "userId", "coordinates", "altitude", "accuracy", "battery", "timestamp")
      VALUES (
        ${locationId},
        ${input.userId},
        ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326),
        ${input.altitude ?? null},
        ${input.accuracy ?? null},
        ${input.battery ?? null},
        NOW()
      )
      RETURNING "id", "timestamp";
    `;

    return result[0];
  }

  /**
   * Finds on-duty verified volunteers within a given radius in meters using PostGIS ST_DWithin.
   */
  public async findNearbyVolunteers(
    lat: number,
    lng: number,
    radiusMeters = 5000,
    limit = 20
  ): Promise<NearbyVolunteerResult[]> {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new AppError('Invalid coordinate boundaries', 400, 'INVALID_COORDINATES');
    }

    const rawVolunteers = await prisma.$queryRaw<Array<{
      userId: string;
      name: string;
      phone: string;
      role: string;
      verificationStatus: string;
      isOnDuty: boolean;
      rating: number | null;
      totalResponses: number;
      lat: number;
      lng: number;
      altitude: number | null;
      battery: number | null;
      lastPing: Date;
      distanceMeters: number;
    }>>`
      WITH latest_locations AS (
        SELECT DISTINCT ON ("userId")
          "id",
          "userId",
          "coordinates",
          "altitude",
          "battery",
          "timestamp",
          ST_X("coordinates"::geometry) AS lng,
          ST_Y("coordinates"::geometry) AS lat,
          ROUND(ST_Distance(
            "coordinates"::geography,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          )::numeric, 1) AS distance_meters
        FROM "UserLocation"
        WHERE ST_DWithin(
          "coordinates"::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
        ORDER BY "userId", "timestamp" DESC
      )
      SELECT
        ll."userId",
        u."name",
        u."phone",
        u."role"::text AS "role",
        vp."verificationStatus"::text AS "verificationStatus",
        vp."isOnDuty",
        vp."rating",
        vp."totalResponses",
        ll.lat,
        ll.lng,
        ll.altitude,
        ll.battery,
        ll.timestamp AS "lastPing",
        ll.distance_meters::float AS "distanceMeters"
      FROM latest_locations ll
      JOIN "User" u ON u."id" = ll."userId"
      JOIN "VolunteerProfile" vp ON vp."userId" = ll."userId"
      WHERE vp."isOnDuty" = true
        AND u."isActive" = true
      ORDER BY ll.distance_meters ASC
      LIMIT ${limit};
    `;

    return rawVolunteers.map((vol) => {
      // Calculate estimated response ETA: average movement speed 4.0 m/s + 60s reaction buffer
      const estimatedEtaSeconds = Math.round(vol.distanceMeters / 4.0 + 60);

      return {
        userId: vol.userId,
        name: vol.name,
        phone: vol.phone,
        role: vol.role as any,
        verificationStatus: vol.verificationStatus as any,
        isOnDuty: vol.isOnDuty,
        rating: vol.rating,
        totalResponses: vol.totalResponses,
        location: {
          lat: vol.lat,
          lng: vol.lng,
          altitude: vol.altitude,
          battery: vol.battery,
          lastPing: vol.lastPing,
        },
        distanceMeters: vol.distanceMeters,
        estimatedEtaSeconds,
      };
    });
  }
}

export const volunteerService = new VolunteerService();
export default volunteerService;
