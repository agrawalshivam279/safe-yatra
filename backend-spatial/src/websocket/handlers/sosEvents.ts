/**
 * Safe Yatra — Backend Spatial Server
 * WebSocket SOS Lifecycle Event Broadcasters.
 */

import { Server as SocketIOServer } from 'socket.io';
import { UserRole } from '@prisma/client';
import { SOSEntity, SOSMatchResult } from '../../modules/sos/sos.types';
import { emitToRole, emitToUser } from '../rooms';

/**
 * Broadcasts an emergency trigger event to on-duty volunteers and command center.
 */
export const broadcastSOSTriggered = (
  io: SocketIOServer,
  sosEvent: SOSEntity,
  matchResult: SOSMatchResult
): void => {
  const payload = {
    sosEvent,
    matchResult,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to all Yaatri Mitra responders and Admins
  emitToRole(io, UserRole.YAATRI_MITRA, 'sos:triggered', payload);
  emitToRole(io, UserRole.ADMIN, 'sos:triggered', payload);

  // Send targeted assignment alert to each matched volunteer within 5km
  if (matchResult?.volunteers) {
    for (const vol of matchResult.volunteers) {
      emitToUser(io, vol.userId, 'sos:assigned', {
        sosId: sosEvent.id,
        lat: sosEvent.lat,
        lng: sosEvent.lng,
        battery: sosEvent.battery,
        distanceMeters: vol.distanceMeters,
        estimatedEtaSeconds: vol.estimatedEtaSeconds,
        timestamp: new Date().toISOString(),
      });
    }
  }
};

/**
 * Broadcasts when a volunteer responder accepts an emergency mission.
 */
export const broadcastSOSAccepted = (
  io: SocketIOServer,
  sosEvent: SOSEntity,
  volunteer?: { id: string; name: string; phone: string }
): void => {
  const payload = {
    sosEvent,
    volunteer,
    timestamp: new Date().toISOString(),
  };

  // Notify the tourist directly
  emitToUser(io, sosEvent.triggeredBy, 'sos:accepted', payload);

  // Notify command center & volunteer network
  emitToRole(io, UserRole.ADMIN, 'sos:accepted', payload);
  emitToRole(io, UserRole.YAATRI_MITRA, 'sos:accepted', payload);
};

/**
 * Broadcasts when a volunteer responder arrives on-scene.
 */
export const broadcastSOSArrived = (
  io: SocketIOServer,
  sosEvent: SOSEntity,
  volunteer?: { id: string; name: string; phone: string }
): void => {
  const payload = {
    sosEvent,
    volunteer,
    timestamp: new Date().toISOString(),
  };

  emitToUser(io, sosEvent.triggeredBy, 'sos:arrived', payload);
  emitToRole(io, UserRole.ADMIN, 'sos:arrived', payload);
};

/**
 * Broadcasts when an emergency SOS is successfully resolved.
 */
export const broadcastSOSResolved = (
  io: SocketIOServer,
  sosEvent: SOSEntity
): void => {
  const payload = {
    sosEvent,
    timestamp: new Date().toISOString(),
  };

  emitToUser(io, sosEvent.triggeredBy, 'sos:resolved', payload);
  emitToRole(io, UserRole.YAATRI_MITRA, 'sos:resolved', payload);
  emitToRole(io, UserRole.ADMIN, 'sos:resolved', payload);
};

/**
 * Broadcasts when an emergency SOS is cancelled.
 */
export const broadcastSOSCancelled = (
  io: SocketIOServer,
  sosEvent: SOSEntity
): void => {
  const payload = {
    sosEvent,
    timestamp: new Date().toISOString(),
  };

  emitToRole(io, UserRole.YAATRI_MITRA, 'sos:cancelled', payload);
  emitToRole(io, UserRole.ADMIN, 'sos:cancelled', payload);
};
