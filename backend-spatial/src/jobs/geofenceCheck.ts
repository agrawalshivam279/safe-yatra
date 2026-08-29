/**
 * Safe Yatra — Backend Spatial Server
 * Background Job: Periodic Active User Geofence Safety Monitoring (Every 30s).
 */

import { prisma } from '../config/database';
import { geofenceService } from '../modules/geofence/geofence.service';
import { emitToUser } from '../websocket/rooms';
import { getIO } from '../websocket/socketServer';

export interface GeofenceCheckJobResult {
  activeUsersEvaluated: number;
  alertCount: number;
  timestamp: Date;
}

/**
 * Scans recent GPS telemetry from active tourists and volunteers in the system,
 * evaluates each user's latest coordinates against active hazard geofences,
 * and pushes targeted WebSocket alerts for any perimeter breaches.
 */
export const runGeofenceCheckJob = async (
  lookbackMinutes = 5
): Promise<GeofenceCheckJobResult> => {
  const timestamp = new Date();
  const cutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000);

  // 1. Fetch the most recent distinct location for all users active within the lookback window
  const activeUserLocations = await prisma.$queryRaw<
    Array<{
      userId: string;
      lat: number;
      lng: number;
      timestamp: Date;
    }>
  >`
    SELECT DISTINCT ON ("userId")
      "userId",
      ST_Y("location"::geometry) AS "lat",
      ST_X("location"::geometry) AS "lng",
      "timestamp"
    FROM "UserLocation"
    WHERE "timestamp" >= ${cutoff}
    ORDER BY "userId", "timestamp" DESC;
  `;

  if (!activeUserLocations || activeUserLocations.length === 0) {
    return {
      activeUsersEvaluated: 0,
      alertCount: 0,
      timestamp,
    };
  }

  let alertCount = 0;

  for (const userLoc of activeUserLocations) {
    try {
      const lat = Number(userLoc.lat);
      const lng = Number(userLoc.lng);

      const checkResult = await geofenceService.checkPoint(lat, lng, 500);

      // If user is inside an active geofence or near a high-severity boundary
      if (checkResult.inside || checkResult.breachedGeofences.length > 0) {
        try {
          const io = getIO();
          emitToUser(io, userLoc.userId, 'geofence:alert', {
            type: 'INSIDE_GEOFENCE',
            inside: checkResult.inside,
            breachedGeofences: checkResult.breachedGeofences,
            approachingGeofences: checkResult.approachingGeofences,
            timestamp: new Date().toISOString(),
          });
        } catch {
          // Socket.IO may not be initialized in offline or test context
        }

        alertCount++;
      }
    } catch {
      // Isolate per-user errors so one failure does not halt the monitoring loop
    }
  }

  return {
    activeUsersEvaluated: activeUserLocations.length,
    alertCount,
    timestamp,
  };
};
