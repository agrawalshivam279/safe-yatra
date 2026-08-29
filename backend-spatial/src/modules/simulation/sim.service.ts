/**
 * Safe Yatra — Backend Spatial Server
 * Simulation Service & Telemetry Injection Engine.
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { geofenceService } from '../geofence/geofence.service';
import {
  InjectLocationInput,
  InjectLocationResult,
  InjectedLocationRecord,
  ReplayTrajectoryInput,
  TrajectoryReplayResult,
  TrajectoryWaypoint,
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
}

export const simService = new SimulationService();
export default simService;
