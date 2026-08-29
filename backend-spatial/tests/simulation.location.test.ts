/**
 * Safe Yatra — Backend Spatial Server
 * Integration & Unit Tests for Simulation Location Injection & Trajectory Replay.
 */

import request from 'supertest';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { app } from '../src/index';
import { geofenceService } from '../src/modules/geofence/geofence.service';

// Mock Prisma client methods
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

// Mock Geofence service
jest.mock('../src/modules/geofence/geofence.service', () => ({
  geofenceService: {
    checkPoint: jest.fn(),
  },
}));

describe('Simulation Location & Trajectory Routes (/api/v1/sim)', () => {
  const originalSimMode = env.SIMULATION_MODE;

  const mockUser = {
    id: 'user_sim_01',
    name: 'Simulation Tourist',
    email: 'simtourist@safeyatra.in',
    phone: '+919876543210',
    role: 'TOURIST',
    isActive: true,
  };

  const sampleCoordinates = [
    { lat: 18.7546, lng: 73.4062, altitude: 620, accuracy: 5, battery: 85 },
    { lat: 18.755, lng: 73.407, altitude: 625, accuracy: 4, battery: 84 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (env as any).SIMULATION_MODE = true;
  });

  afterAll(() => {
    (env as any).SIMULATION_MODE = originalSimMode;
  });

  describe('Simulation Environment Guard', () => {
    it('should return 404 NOT_FOUND when SIMULATION_MODE is disabled', async () => {
      (env as any).SIMULATION_MODE = false;

      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: 'user_sim_01',
          coordinates: sampleCoordinates,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should block trajectory endpoint with 404 when SIMULATION_MODE is disabled', async () => {
      (env as any).SIMULATION_MODE = false;

      const res = await request(app)
        .post('/api/v1/sim/trajectory')
        .send({
          userId: 'user_sim_01',
          coordinates: sampleCoordinates,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/sim/location', () => {
    it('should inject batch of GPS coordinate records and return 201', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: 'user_sim_01',
          coordinates: sampleCoordinates,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('user_sim_01');
      expect(res.body.data.injectedCount).toBe(2);
      expect(res.body.data.records.length).toBe(2);
      expect(res.body.data.records[0].lat).toBe(18.7546);
      expect(res.body.data.records[0].lng).toBe(73.4062);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should return 404 USER_NOT_FOUND when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: 'non_existent_user',
          coordinates: sampleCoordinates,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 VALIDATION_ERROR when coordinates array is empty', async () => {
      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: 'user_sim_01',
          coordinates: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when latitude is out of bounds', async () => {
      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: 'user_sim_01',
          coordinates: [{ lat: 95.0, lng: 73.4062 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when longitude is out of bounds', async () => {
      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: 'user_sim_01',
          coordinates: [{ lat: 18.7546, lng: 185.0 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when userId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          coordinates: sampleCoordinates,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/sim/trajectory', () => {
    it('should replay trajectory waypoints with geofence checks and return 200', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      // Mock geofence results: point 1 safe, point 2 inside breach
      (geofenceService.checkPoint as jest.Mock)
        .mockResolvedValueOnce({
          inside: false,
          breachedGeofences: [],
          approachingGeofences: [],
        })
        .mockResolvedValueOnce({
          inside: true,
          breachedGeofences: [
            {
              id: 'gf_critical_01',
              name: 'Bhushi Dam Breach Zone',
              type: 'AUTO_DANGER',
              severity: 'CRITICAL',
              message: 'Evacuate immediately!',
              isActive: true,
              boundary: { type: 'Polygon', coordinates: [] },
              center: { lat: 18.755, lng: 73.407 },
            },
          ],
          approachingGeofences: [],
        });

      const res = await request(app)
        .post('/api/v1/sim/trajectory')
        .send({
          userId: 'user_sim_01',
          coordinates: sampleCoordinates,
          intervalSeconds: 15,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('user_sim_01');
      expect(res.body.data.totalWaypoints).toBe(2);
      expect(res.body.data.intervalSeconds).toBe(15);
      expect(res.body.data.violationsDetected).toBe(1);
      expect(res.body.data.waypoints[0].geofenceStatus.inside).toBe(false);
      expect(res.body.data.waypoints[1].geofenceStatus.inside).toBe(true);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
      expect(geofenceService.checkPoint).toHaveBeenCalledTimes(2);
    });

    it('should return 404 USER_NOT_FOUND when user does not exist in trajectory replay', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/sim/trajectory')
        .send({
          userId: 'non_existent_user',
          coordinates: sampleCoordinates,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 400 VALIDATION_ERROR when trajectory coordinates array is empty', async () => {
      const res = await request(app)
        .post('/api/v1/sim/trajectory')
        .send({
          userId: 'user_sim_01',
          coordinates: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
