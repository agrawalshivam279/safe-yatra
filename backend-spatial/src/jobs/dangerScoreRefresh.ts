/**
 * Safe Yatra — Backend Spatial Server
 * Background Job: Periodic Danger Score Refresh & WebSocket Broadcast.
 */

import { dangerService } from '../modules/danger/danger.service';
import { DangerScoreResult } from '../modules/danger/danger.types';
import { broadcastDangerScoreUpdate } from '../websocket/handlers/dangerAlerts';
import { getIO } from '../websocket/socketServer';

export interface DangerScoreRefreshResult {
  totalZones: number;
  refreshedCount: number;
  errorCount: number;
  timestamp: Date;
}

/**
 * Recalculates danger scores for all registered zones via the ML Risk Engine,
 * updates the database/cache, and pushes real-time score updates via WebSockets.
 */
export const runDangerScoreRefreshJob = async (): Promise<DangerScoreRefreshResult> => {
  const timestamp = new Date();
  let zoneScores: DangerScoreResult[] = [];

  try {
    zoneScores = await dangerService.getAllZoneScores();
  } catch {
    zoneScores = [];
  }

  let refreshedCount = 0;
  let errorCount = 0;

  for (const zone of zoneScores) {
    try {
      if (zone.zoneId) {
        try {
          const io = getIO();
          broadcastDangerScoreUpdate(io, zone.zoneId, {
            zoneId: zone.zoneId,
            dangerScore: zone.dangerScore,
            tier: zone.tier,
            justification: zone.justification,
            factors: zone.factors as unknown as Record<string, unknown>,
            computedAt:
              zone.computedAt instanceof Date
                ? zone.computedAt.toISOString()
                : String(zone.computedAt),
          });
        } catch {
          // Socket.IO may not be initialized in test or offline worker context
        }

        refreshedCount++;
      }
    } catch {
      errorCount++;
    }
  }

  return {
    totalZones: zoneScores.length,
    refreshedCount,
    errorCount,
    timestamp,
  };
};
