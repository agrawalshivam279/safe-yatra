/**
 * Safe Yatra — Backend Spatial Server
 * Background Job: Archive Unresolved Expired SOS Emergencies (>24h).
 */

import { SOSStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';

export interface ExpiredSOSCleanupResult {
  expiredCount: number;
  timestamp: Date;
}

/**
 * Scans for active, unresolved SOS emergencies that have remained open past the expiration threshold,
 * transitions their status to EXPIRED, and records an immutable audit log in SOSTimeline.
 */
export const runCleanupExpiredSOSJob = async (
  maxAgeHours = 24
): Promise<ExpiredSOSCleanupResult> => {
  const timestamp = new Date();
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  // Find active SOS records older than the cutoff timestamp
  const expiredEvents = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "SOSEvent"
    WHERE "status"::text NOT IN ('RESOLVED', 'CANCELLED', 'EXPIRED')
      AND "createdAt" <= ${cutoff};
  `;

  if (!expiredEvents || expiredEvents.length === 0) {
    return {
      expiredCount: 0,
      timestamp,
    };
  }

  // Update status and append timeline entries for each expired event
  for (const event of expiredEvents) {
    await prisma.sOSEvent.update({
      where: { id: event.id },
      data: { status: SOSStatus.EXPIRED },
    });

    await prisma.sOSTimeline.create({
      data: {
        id: uuidv4(),
        sosEventId: event.id,
        event: 'EXPIRED',
        details: `Archived automatically after ${maxAgeHours}h expiration threshold`,
      },
    });
  }

  return {
    expiredCount: expiredEvents.length,
    timestamp,
  };
};
