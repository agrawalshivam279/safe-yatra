/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Background Jobs & Scheduler (Step 4.11a).
 */

import { DangerTier, SOSStatus } from '@prisma/client';
import { prisma } from '../src/config/database';
import { runCleanupExpiredSOSJob } from '../src/jobs/cleanupExpiredSOS';
import { runDangerScoreRefreshJob } from '../src/jobs/dangerScoreRefresh';
import {
  isJobsRunning,
  startBackgroundJobs,
  stopBackgroundJobs,
} from '../src/jobs/jobScheduler';
import { dangerService } from '../src/modules/danger/danger.service';
import { broadcastDangerScoreUpdate } from '../src/websocket/handlers/dangerAlerts';
import { getIO } from '../src/websocket/socketServer';

// Mock Dependencies
jest.mock('../src/config/database', () => ({
  prisma: {
    sOSEvent: {
      update: jest.fn(),
    },
    sOSTimeline: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../src/modules/danger/danger.service', () => ({
  dangerService: {
    getAllZoneScores: jest.fn(),
  },
}));

jest.mock('../src/websocket/handlers/dangerAlerts', () => ({
  broadcastDangerScoreUpdate: jest.fn(),
}));

jest.mock('../src/websocket/socketServer', () => ({
  getIO: jest.fn(),
}));

describe('Background Jobs Infrastructure (Step 4.11a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopBackgroundJobs();
  });

  afterEach(() => {
    stopBackgroundJobs();
  });

  describe('runDangerScoreRefreshJob (dangerScoreRefresh.ts)', () => {
    const mockZoneScores = [
      {
        zoneId: 'zone_01',
        zoneName: 'Lonavala Waterfall',
        coordinates: { lat: 18.7546, lng: 73.4062 },
        dangerScore: 78,
        tier: DangerTier.CRITICAL,
        justification: 'High flash flood hazard',
        source: 'CACHE' as const,
        computedAt: new Date(),
      },
      {
        zoneId: 'zone_02',
        zoneName: 'Tiger Point',
        coordinates: { lat: 18.76, lng: 73.41 },
        dangerScore: 45,
        tier: DangerTier.MODERATE,
        justification: 'Moderate caution advised',
        source: 'CACHE' as const,
        computedAt: new Date(),
      },
    ];

    it('should refresh danger scores for all zones and broadcast updates', async () => {
      (dangerService.getAllZoneScores as jest.Mock).mockResolvedValue(mockZoneScores);
      (getIO as jest.Mock).mockReturnValue({});

      const result = await runDangerScoreRefreshJob();

      expect(dangerService.getAllZoneScores).toHaveBeenCalled();
      expect(broadcastDangerScoreUpdate).toHaveBeenCalledTimes(2);
      expect(result.totalZones).toBe(2);
      expect(result.refreshedCount).toBe(2);
      expect(result.errorCount).toBe(0);
    });

    it('should handle empty zone list gracefully', async () => {
      (dangerService.getAllZoneScores as jest.Mock).mockResolvedValue([]);

      const result = await runDangerScoreRefreshJob();

      expect(result.totalZones).toBe(0);
      expect(result.refreshedCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });

    it('should handle service exception gracefully', async () => {
      (dangerService.getAllZoneScores as jest.Mock).mockRejectedValue(
        new Error('Database Connection Error')
      );

      const result = await runDangerScoreRefreshJob();

      expect(result.totalZones).toBe(0);
      expect(result.refreshedCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('runCleanupExpiredSOSJob (cleanupExpiredSOS.ts)', () => {
    it('should transition expired active SOS records to EXPIRED and log timeline audits', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'sos_old_01' },
        { id: 'sos_old_02' },
      ]);
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const result = await runCleanupExpiredSOSJob(24);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.sOSEvent.update).toHaveBeenCalledTimes(2);
      expect(prisma.sOSEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sos_old_01' },
          data: { status: SOSStatus.EXPIRED },
        })
      );
      expect(prisma.sOSTimeline.create).toHaveBeenCalledTimes(2);
      expect(result.expiredCount).toBe(2);
    });

    it('should return 0 when no expired events exist', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await runCleanupExpiredSOSJob(24);

      expect(result.expiredCount).toBe(0);
      expect(prisma.sOSEvent.update).not.toHaveBeenCalled();
    });
  });

  describe('Job Scheduler Lifecycle (jobScheduler.ts)', () => {
    it('should start and stop background job timers properly', () => {
      expect(isJobsRunning()).toBe(false);

      startBackgroundJobs({
        dangerRefreshIntervalMs: 1000,
        expiredSOSIntervalMs: 2000,
      });

      expect(isJobsRunning()).toBe(true);

      stopBackgroundJobs();
      expect(isJobsRunning()).toBe(false);
    });
  });
});
