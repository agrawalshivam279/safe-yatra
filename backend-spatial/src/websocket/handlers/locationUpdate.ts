/**
 * Safe Yatra — Backend Spatial Server
 * WebSocket Location Streaming & Geofence Breach Evaluator.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { geofenceService } from '../../modules/geofence/geofence.service';
import { volunteerService } from '../../modules/volunteer/volunteer.service';

export interface LocationUpdatePayload {
  lat: number;
  lng: number;
  altitude?: number;
  battery?: number;
  accuracy?: number;
}

/**
 * Registers the location:update event listener for an authenticated socket client.
 */
export const registerLocationHandler = (
  _io: SocketIOServer,
  socket: Socket
): void => {
  socket.on(
    'location:update',
    async (
      payload: LocationUpdatePayload,
      callback?: (ack: { success: boolean; error?: string }) => void
    ) => {
      try {
        const user = socket.data.user;
        if (!user) {
          if (callback) callback({ success: false, error: 'Unauthenticated socket' });
          return;
        }

        const { lat, lng, altitude, battery, accuracy } = payload || {};

        if (
          typeof lat !== 'number' ||
          typeof lng !== 'number' ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          if (callback) callback({ success: false, error: 'Invalid coordinate bounds' });
          return;
        }

        // 1. Record ephemeral GPS ping into database
        await volunteerService.recordLocation({
          userId: user.id,
          lat,
          lng,
          altitude,
          battery,
          accuracy,
        });

        // 2. Perform real-time PostGIS geofence breach & proximity evaluation
        const geofenceCheck = await geofenceService.checkPoint(lat, lng, 500);

        // 3. If user is inside an active geofence or near a high-severity perimeter, emit alert
        if (geofenceCheck.inside || geofenceCheck.breachedGeofences.length > 0) {
          socket.emit('geofence:alert', {
            type: 'INSIDE_GEOFENCE',
            inside: geofenceCheck.inside,
            breachedGeofences: geofenceCheck.breachedGeofences,
            approachingGeofences: geofenceCheck.approachingGeofences,
            timestamp: new Date().toISOString(),
          });
        }

        if (callback) {
          callback({ success: true });
        }
      } catch (err: any) {
        if (callback) {
          callback({ success: false, error: err.message });
        }
      }
    }
  );
};
