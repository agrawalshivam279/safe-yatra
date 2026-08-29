/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Periodic Geofence Monitoring Job (Step 4.11b).
 */

import { prisma } from '../src/config/database';
import { runGeofenceCheckJob } from '../src/jobs/geofenceCheck';
import {
  isJobsRunning,
  startBackgroundJobs,
  stopBackgroundJobs,
} from '../src/jobs/jobScheduler';
import { geofenceService } from '../src/modules/geofence/geofence.service';
import { emitToUser } from '../src/websocket/rooms';
import { getIO } from '../src/websocket/socketServer';

// Mock Dependencies
jest.mock('../src/config/database', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../src/modules/geofence/geofence.service', () => ({
  geofenceService: {
    checkPoint: jest.fn(),
  },
}));

jest.mock('../src/websocket/rooms', () => ({
  emitToUser: jest.fn(),
}));

jest.mock('../src/websocket/socketServer', () => ({
  getIO: jest.fn(),
}));

describe('Periodic Geofence Safety Monitoring Job (Step 4.11b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopBackgroundJobs();
  });

  afterEach(() => {
    stopBackgroundJobs();
  });

  const mockActiveUsers = [
    {
      userId: 'usr_tourist_01',
      lat: 18.7546,
      lng: 73.4062,
      timestamp: new Date(),
    },
    {
      userId: 'usr_tourist_02',
      lat: 18.76,
      lng: 73.41,
      timestamp: new Date(),
    },
  ];

  it('should scan active users, detect geofence breaches, and emit alerts to affected users', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockActiveUsers);
    (geofenceService.checkPoint as jest.Mock)
      // User 1 is inside a danger geofence
      .mockResolvedValueOnce({
        inside: true,
        breachedGeofences: [
          {
            id: 'gf_01',
            name: 'Bhushi Dam Danger Zone',
            type: 'AUTO_DANGER',
            severity: 'CRITICAL',
            message: 'Evacuate immediately!',
          },
        ],
        approachingGeofences: [],
      })
      // User 2 is outside all geofences
      .mockResolvedValueOnce({
        inside: false,
        breachedGeofences: [],
        approachingGeofences: [],
      });
    (getIO as jest.Mock).mockReturnValue({});

    const result = await runGeofenceCheckJob(5);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(geofenceService.checkPoint).toHaveBeenCalledWith(18.7546, 73.4062, 500);
    expect(geofenceService.checkPoint).toHaveBeenCalledWith(18.76, 73.41, 500);
    expect(emitToUser).toHaveBeenCalledTimes(1);
    expect(emitToUser).toHaveBeenCalledWith(
      expect.anything(),
      'usr_tourist_01',
      'geofence:alert',
      expect.objectContaining({
        type: 'INSIDE_GEOFENCE',
        inside: true,
      })
    );
    expect(result.activeUsersEvaluated).toBe(2);
    expect(result.alertCount).toBe(1);
  });

  it('should handle empty active user list gracefully', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    const result = await runGeofenceCheckJob(5);

    expect(result.activeUsersEvaluated).toBe(0);
    expect(result.alertCount).toBe(0);
    expect(geofenceService.checkPoint).not.toHaveBeenCalled();
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it('should isolate per-user evaluation errors without halting the job', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockActiveUsers);
    (geofenceService.checkPoint as jest.Mock)
      .mockRejectedValueOnce(new Error('Spatial index error'))
      .mockResolvedValueOnce({
        inside: true,
        breachedGeofences: [
          {
            id: 'gf_02',
            name: 'Tiger Point Cliff',
            type: 'CLIFF_EDGE',
            severity: 'SEVERE',
          },
        ],
        approachingGeofences: [],
      });
    (getIO as jest.Mock).mockReturnValue({});

    const result = await runGeofenceCheckJob(5);

    expect(result.activeUsersEvaluated).toBe(2);
    expect(result.alertCount).toBe(1);
    expect(emitToUser).toHaveBeenCalledWith(
      expect.anything(),
      'usr_tourist_02',
      'geofence:alert',
      expect.anything()
    );
  });

  it('should start and stop geofence check timer via jobScheduler', () => {
    expect(isJobsRunning()).toBe(false);

    startBackgroundJobs({
      dangerRefreshIntervalMs: 1000,
      expiredSOSIntervalMs: 2000,
      geofenceCheckIntervalMs: 500,
    });

    expect(isJobsRunning()).toBe(true);

    stopBackgroundJobs();
    expect(isJobsRunning()).toBe(false);
  });
});
