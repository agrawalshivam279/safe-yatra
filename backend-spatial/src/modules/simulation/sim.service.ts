/**
 * Safe Yatra — Backend Spatial Server
 * Simulation Service & Telemetry Injection Engine.
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { AppError } from '../../utils/response';
import { geofenceService } from '../geofence/geofence.service';
import { sosService } from '../sos/sos.service';
import {
  InjectLocationInput,
  InjectLocationResult,
  InjectedLocationRecord,
  ReplayTrajectoryInput,
  SimulateSOSInput,
  SimulateSOSResult,
  TrajectoryReplayResult,
  TrajectoryWaypoint,
  WeatherOverrideFactors,
  WeatherOverrideInput,
  WeatherOverrideResult,
} from './sim.types';

export class SimulationService {
  /**
   * Injects a batch of GPS location pings into the UserLocation table with PostGIS geometries.
   */
  public async injectLocations(input: InjectLocationInput): Promise<InjectLocationResult> {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const records: InjectedLocationRecord[] = [];

    for (const coord of input.coordinates) {
      if (coord.lat < -90 || coord.lat > 90 || coord.lng < -180 || coord.lng > 180) {
        throw new AppError('Invalid coordinate boundaries', 400, 'INVALID_COORDINATES');
      }

      const locationId = uuidv4();
      const timestamp = coord.timestamp ? new Date(coord.timestamp) : new Date();

      await prisma.$executeRaw`
        INSERT INTO "UserLocation" (
          "id", "userId", "coordinates", "altitude", "accuracy", "battery", "timestamp"
        ) VALUES (
          ${locationId},
          ${input.userId},
          ST_SetSRID(ST_MakePoint(${coord.lng}, ${coord.lat}), 4326),
          ${coord.altitude ?? null},
          ${coord.accuracy ?? null},
          ${coord.battery ?? null},
          ${timestamp}
        );
      `;

      records.push({
        id: locationId,
        userId: input.userId,
        lat: coord.lat,
        lng: coord.lng,
        altitude: coord.altitude ?? null,
        accuracy: coord.accuracy ?? null,
        battery: coord.battery ?? null,
        timestamp,
      });
    }

    return {
      userId: input.userId,
      injectedCount: records.length,
      records,
    };
  }

  /**
   * Replays a sequence of trajectory coordinates, persists waypoints to UserLocation,
   * and runs real-time geofence evaluation for each waypoint.
   */
  public async replayTrajectory(input: ReplayTrajectoryInput): Promise<TrajectoryReplayResult> {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const intervalSeconds = input.intervalSeconds ?? 10;
    const baseTime = Date.now();
    const waypoints: TrajectoryWaypoint[] = [];
    let violationsDetected = 0;

    for (let i = 0; i < input.coordinates.length; i++) {
      const coord = input.coordinates[i];

      if (coord.lat < -90 || coord.lat > 90 || coord.lng < -180 || coord.lng > 180) {
        throw new AppError('Invalid coordinate boundaries', 400, 'INVALID_COORDINATES');
      }

      const locationId = uuidv4();
      const pointTime = coord.timestamp
        ? new Date(coord.timestamp)
        : new Date(baseTime + i * intervalSeconds * 1000);

      await prisma.$executeRaw`
        INSERT INTO "UserLocation" (
          "id", "userId", "coordinates", "altitude", "accuracy", "battery", "timestamp"
        ) VALUES (
          ${locationId},
          ${input.userId},
          ST_SetSRID(ST_MakePoint(${coord.lng}, ${coord.lat}), 4326),
          ${coord.altitude ?? null},
          ${coord.accuracy ?? null},
          ${coord.battery ?? null},
          ${pointTime}
        );
      `;

      // Evaluate geofences at this waypoint (500m proximity buffer)
      const geofenceStatus = await geofenceService.checkPoint(coord.lat, coord.lng, 500);

      if (geofenceStatus.inside || geofenceStatus.approachingGeofences.length > 0) {
        violationsDetected++;
      }

      waypoints.push({
        index: i,
        coordinate: coord,
        timestamp: pointTime,
        geofenceStatus,
      });
    }

    return {
      userId: input.userId,
      totalWaypoints: waypoints.length,
      intervalSeconds,
      waypoints,
      violationsDetected,
      completedAt: new Date(),
    };
  }

  /**
   * Simulates an automated end-to-end SOS emergency response loop or custom test scenario.
   */
  public async simulateSOS(input: SimulateSOSInput): Promise<SimulateSOSResult> {
    // 1. Resolve or verify tourist user
    let touristId = input.tourist.userId;
    if (touristId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: touristId },
      });
      if (!existingUser) {
        throw new AppError('Tourist user not found', 404, 'USER_NOT_FOUND');
      }
    } else {
      const defaultTourist = await prisma.user.findFirst({
        where: { role: 'TOURIST', isActive: true },
      });
      if (defaultTourist) {
        touristId = defaultTourist.id;
      } else {
        throw new AppError('No tourist user found in system', 404, 'USER_NOT_FOUND');
      }
    }

    // 2. Provision and position mock volunteers if provided
    let responderVolunteerId: string | undefined;

    if (input.volunteers && input.volunteers.length > 0) {
      for (const vol of input.volunteers) {
        let volId = vol.userId;
        if (volId) {
          const existingVol = await prisma.user.findUnique({
            where: { id: volId },
          });
          if (!existingVol) {
            throw new AppError(`Volunteer user ${volId} not found`, 404, 'VOLUNTEER_NOT_FOUND');
          }
        } else {
          const defaultMitra = await prisma.user.findFirst({
            where: { role: 'YAATRI_MITRA', isActive: true },
          });
          if (defaultMitra) {
            volId = defaultMitra.id;
          }
        }

        if (volId) {
          if (!responderVolunteerId) {
            responderVolunteerId = volId;
          }

          // Ensure volunteer profile is on duty
          await prisma.volunteerProfile.upsert({
            where: { userId: volId },
            create: {
              userId: volId,
              isOnDuty: true,
              verificationStatus: 'VERIFIED',
            },
            update: {
              isOnDuty: true,
              verificationStatus: 'VERIFIED',
            },
          });

          // Insert latest volunteer location point
          const volLocId = uuidv4();
          await prisma.$executeRaw`
            INSERT INTO "UserLocation" (
              "id", "userId", "coordinates", "altitude", "accuracy", "battery", "timestamp"
            ) VALUES (
              ${volLocId},
              ${volId},
              ST_SetSRID(ST_MakePoint(${vol.location.lng}, ${vol.location.lat}), 4326),
              null,
              5,
              95,
              NOW()
            );
          `;
        }
      }
    }

    // 3. Trigger initial emergency SOS
    const triggerResult = await sosService.triggerSOS({
      userId: touristId,
      lat: input.tourist.location.lat,
      lng: input.tourist.location.lng,
      battery: input.tourist.battery ?? 80,
      audioUrl: input.tourist.audioUrl,
    });

    const sosId = triggerResult.sosEvent.id;
    const scenario = input.scenario ?? 'full_loop';

    // 4. Execute scenario state transitions
    if (scenario === 'cancel') {
      await sosService.cancelSOS(sosId, touristId, 'Simulated emergency cancellation');
    } else if (scenario === 'volunteer_timeout') {
      // Intentionally leave in triggered / alerted state without responder action
    } else if (scenario === 'full_loop') {
      // Pick responding volunteer
      if (!responderVolunteerId && triggerResult.matchResult.volunteers.length > 0) {
        responderVolunteerId = triggerResult.matchResult.volunteers[0].userId;
      }

      if (!responderVolunteerId) {
        const anyOnDutyMitra = await prisma.volunteerProfile.findFirst({
          where: { isOnDuty: true },
        });
        if (anyOnDutyMitra) {
          responderVolunteerId = anyOnDutyMitra.userId;
        }
      }

      if (responderVolunteerId) {
        // Accept -> Arrive -> Resolve
        await sosService.acceptSOS(sosId, responderVolunteerId);
        await sosService.arriveSOS(sosId, responderVolunteerId);

        if (input.autoResolve !== false) {
          await sosService.resolveSOS(
            sosId,
            responderVolunteerId,
            'Auto-resolved by simulation engine'
          );
        }
      }
    }

    const sosDetail = await sosService.getSOSById(sosId);

    return {
      sosId,
      scenario,
      status: sosDetail.status,
      touristId,
      respondingVolunteerId: responderVolunteerId,
      sosDetail,
    };
  }

  /**
   * Overrides environmental parameters in Redis cache for dynamic danger score simulation.
   */
  public async overrideWeather(input: WeatherOverrideInput): Promise<WeatherOverrideResult> {
    const isAllEmpty =
      input.precipitation_mm === undefined &&
      input.wind_speed_kmh === undefined &&
      input.visibility_meters === undefined &&
      input.temperature_c === undefined;

    if (input.clear || isAllEmpty) {
      await redis.del('sim:weather:override');
      return {
        active: false,
        message: 'Weather overrides cleared successfully',
      };
    }

    const overrides: WeatherOverrideFactors = {};
    if (input.precipitation_mm !== undefined) overrides.precipitation_mm = input.precipitation_mm;
    if (input.wind_speed_kmh !== undefined) overrides.wind_speed_kmh = input.wind_speed_kmh;
    if (input.visibility_meters !== undefined) overrides.visibility_meters = input.visibility_meters;
    if (input.temperature_c !== undefined) overrides.temperature_c = input.temperature_c;

    const ttlSeconds = input.ttlSeconds ?? 300;
    await redis.set('sim:weather:override', JSON.stringify(overrides), 'EX', ttlSeconds);

    return {
      active: true,
      overrides,
      ttlSeconds,
      message: 'Weather overrides set successfully',
    };
  }
}

export const simService = new SimulationService();
export default simService;
