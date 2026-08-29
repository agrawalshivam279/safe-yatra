/**
 * Safe Yatra — Backend Spatial Server
 * WebSocket Danger Score & Threat Level Broadcaster.
 */

import { Server as SocketIOServer } from 'socket.io';
import { UserRole } from '@prisma/client';
import { emitToRole, emitToZone } from '../rooms';

export interface DangerScoreUpdatePayload {
  zoneId: string;
  dangerScore: number;
  tier: string;
  justification?: string;
  factors?: Record<string, unknown>;
  computedAt?: string;
}

/**
 * Broadcasts a danger score update to the specific geographic zone and the command center.
 */
export const broadcastDangerScoreUpdate = (
  io: SocketIOServer,
  zoneId: string,
  payload: DangerScoreUpdatePayload
): void => {
  const eventData = {
    ...payload,
    timestamp: payload.computedAt ?? new Date().toISOString(),
  };

  // Broadcast to all connected clients in the affected zone
  emitToZone(io, zoneId, 'danger:score_update', eventData);

  // Broadcast to command center dashboard
  emitToRole(io, UserRole.ADMIN, 'danger:score_update', eventData);
};
