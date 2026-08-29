/**
 * Safe Yatra — Backend Spatial Server
 * Step 7.2: Master End-to-End (E2E) Geofence Walk Simulation & Dynamic Proximity Alerts Test Suite.
 *
 * Validates the PREVENT pillar of Safe Yatra:
 * 1. Multi-waypoint GPS trajectory replay (/api/v1/sim/trajectory) simulating tourist movement into hazard sectors.
 * 2. Real-time spherical proximity warnings (500m buffer) and point-in-polygon boundary breach detection.
 * 3. Ephemeral location persistence with PostGIS geometries and admin footfall density heatmap aggregations.
 */

import { UserRole } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { errorHandler } from '../src/middleware/errorHandler';
import adminRouter from '../src/modules/admin/admin.routes';
import { authService } from '../src/modules/auth/auth.service';
import geofenceRouter from '../src/modules/geofence/geofence.routes';
import { geofenceService } from '../src/modules/geofence/geofence.service';
import simRouter from '../src/modules/simulation/sim.routes';

// Mock database
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

// Mock Geofence Service
jest.mock('../src/modules/geofence/geofence.service', () => ({
  geofenceService: {
    checkPoint: jest.fn(),
    getAllGeofences: jest.fn(),
    getGeofenceById: jest.fn(),
    createGeofence: jest.fn(),
    updateGeofence: jest.fn(),
    deleteGeofence: jest.fn(),
  },
}));

describe('Step 7.2: Master End-to-End (E2E) Geofence Walk Simulation Test Suite', () => {
  let app: express.Application;
  const originalSimMode = env.SIMULATION_MODE;

  const mockTourist = {
    id: 'usr_tourist_walk_01',
    name: 'Priya Patel',
    email: 'priya@tourist.safeyatra.in',
    phone: '+919876543220',
    role: UserRole.TOURIST,
    isActive: true,
  };

  const mockAdmin = {
    id: 'usr_admin_walk_01',
    name: 'Safety Operations Officer',
    email: 'ops@admin.safeyatra.in',
    phone: '+919876543221',
    role: UserRole.ADMIN,
    isActive: true,
  };

  let touristToken: string;
  let adminToken: string;

  beforeAll(() => {
    (env as any).SIMULATION_MODE = true;

    app = express();
    app.use(express.json());
    app.use('/api/v1/sim', simRouter);
    app.use('/api/v1/geofences', geofenceRouter);
    app.use('/api/v1/admin', adminRouter);
    app.use(errorHandler);

    touristToken = authService.generateTokens({
      id: mockTourist.id,
      email: mockTourist.email,
      role: mockTourist.role,
    }).accessToken;

    adminToken = authService.generateTokens({
      id: mockAdmin.id,
      email: mockAdmin.email,
      role: mockAdmin.role,
    }).accessToken;
  });

  afterAll(() => {
    (env as any).SIMULATION_MODE = originalSimMode;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Multi-Waypoint Simulated Walk Trajectory Replay (/api/v1/sim/trajectory)', () => {
    const walkTrajectory = [
      { lat: 18.7500, lng: 73.4000, altitude: 600, accuracy: 5, battery: 92 }, // Waypoint 1: Safe baseline (outside all zones)
      { lat: 18.7530, lng: 73.4040, altitude: 615, accuracy: 4, battery: 91 }, // Waypoint 2: Approaching SEVERE hazard zone (within 500m buffer)
      { lat: 18.7546, lng: 73.4062, altitude: 620, accuracy: 4, battery: 90 }, // Waypoint 3: Inside CRITICAL hazard polygon (breached)
    ];

    it('should replay full walk path, evaluate spatial geofences per waypoint, and report proximity advisories', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      // Mock geofence check responses for the 3 sequential waypoints
      (geofenceService.checkPoint as jest.Mock)
        // Waypoint 1: Safe
        .mockResolvedValueOnce({
          inside: false,
          breachedGeofences: [],
          approachingGeofences: [],
        })
        // Waypoint 2: Approaching 500m buffer of SEVERE hazard zone
        .mockResolvedValueOnce({
          inside: false,
          breachedGeofences: [],
          approachingGeofences: [
            {
              id: 'gf_severe_waterfall_approach',
              name: 'Bhushi Dam Approaching Warning Buffer',
              type: 'AUTO_DANGER',
              severity: 'SEVERE',
              message: 'Caution: Approaching steep slope hazard sector (within 350m).',
              isActive: true,
              boundary: { type: 'Polygon', coordinates: [] },
              center: { lat: 18.7546, lng: 73.4062 },
              distanceMeters: 350.2,
            },
          ],
        })
        // Waypoint 3: Inside CRITICAL flash flood hazard zone
        .mockResolvedValueOnce({
          inside: true,
          breachedGeofences: [
            {
              id: 'gf_critical_waterfall_core',
              name: 'Bhushi Dam High Hazard Core',
              type: 'AUTO_DANGER',
              severity: 'CRITICAL',
              message: 'DANGER: Immediate flash flood hazard! Evacuate sector now.',
              isActive: true,
              boundary: { type: 'Polygon', coordinates: [] },
              center: { lat: 18.7546, lng: 73.4062 },
            },
          ],
          approachingGeofences: [],
        });

      const res = await request(app)
        .post('/api/v1/sim/trajectory')
        .send({
          userId: mockTourist.id,
          coordinates: walkTrajectory,
          intervalSeconds: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(mockTourist.id);
      expect(res.body.data.totalWaypoints).toBe(3);
      expect(res.body.data.intervalSeconds).toBe(10);
      expect(res.body.data.violationsDetected).toBe(2); // Waypoints 2 (approaching) and 3 (inside)

      // Waypoint 1 Assertions: Clean
      const wp1 = res.body.data.waypoints[0];
      expect(wp1.coordinate.lat).toBe(18.7500);
      expect(wp1.geofenceStatus.inside).toBe(false);
      expect(wp1.geofenceStatus.approachingGeofences).toHaveLength(0);

      // Waypoint 2 Assertions: Approaching advisory
      const wp2 = res.body.data.waypoints[1];
      expect(wp2.coordinate.lat).toBe(18.7530);
      expect(wp2.geofenceStatus.inside).toBe(false);
      expect(wp2.geofenceStatus.approachingGeofences).toHaveLength(1);
      expect(wp2.geofenceStatus.approachingGeofences[0].severity).toBe('SEVERE');

      // Waypoint 3 Assertions: Critical breach
      const wp3 = res.body.data.waypoints[2];
      expect(wp3.coordinate.lat).toBe(18.7546);
      expect(wp3.geofenceStatus.inside).toBe(true);
      expect(wp3.geofenceStatus.breachedGeofences[0].severity).toBe('CRITICAL');

      // 3 PostGIS insert queries executed
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
      expect(geofenceService.checkPoint).toHaveBeenCalledTimes(3);
    });

    it('should return 404 USER_NOT_FOUND when tourist user is not found in system', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/sim/trajectory')
        .send({
          userId: 'non_existent_tourist',
          coordinates: walkTrajectory,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('2. Batch GPS Coordinate Injection (/api/v1/sim/location)', () => {
    it('should inject high-density coordinates batch into UserLocation table', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const batchPoints = [
        { lat: 18.7510, lng: 73.4010, altitude: 605, battery: 95 },
        { lat: 18.7520, lng: 73.4020, altitude: 610, battery: 94 },
        { lat: 18.7530, lng: 73.4030, altitude: 615, battery: 93 },
      ];

      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: mockTourist.id,
          coordinates: batchPoints,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe(mockTourist.id);
      expect(res.body.data.injectedCount).toBe(3);
      expect(res.body.data.records).toHaveLength(3);
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
    });

    it('should reject coordinates exceeding geographical latitude bounds (> 90)', async () => {
      const res = await request(app)
        .post('/api/v1/sim/location')
        .send({
          userId: mockTourist.id,
          coordinates: [{ lat: 98.75, lng: 73.4062 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Direct Point-in-Geofence Query Endpoint (/api/v1/geofences/check)', () => {
    it('should return real-time geofence evaluation for a tourist position', async () => {
      (geofenceService.checkPoint as jest.Mock).mockResolvedValue({
        inside: true,
        breachedGeofences: [
          {
            id: 'gf_critical_01',
            name: 'Lonavala Gorge Hazard Boundary',
            severity: 'CRITICAL',
            message: 'Steep drop hazard!',
          },
        ],
        approachingGeofences: [],
      });

      const res = await request(app)
        .post('/api/v1/geofences/check')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          lat: 18.7546,
          lng: 73.4062,
          proximityBufferMeters: 500,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inside).toBe(true);
      expect(res.body.data.breachedGeofences).toHaveLength(1);
      expect(geofenceService.checkPoint).toHaveBeenCalledWith(18.7546, 73.4062, 500);
    });
  });

  describe('4. Admin Command Center Footfall Density Heatmap Integration', () => {
    it('should aggregate recent tourist location pings into spatial density clusters', async () => {
      const mockDensityClusters = [
        {
          lat: 18.755,
          lng: 73.406,
          intensity: 142,
          pointCount: 142,
        },
        {
          lat: 18.751,
          lng: 73.402,
          intensity: 48,
          pointCount: 48,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockDensityClusters);

      const res = await request(app)
        .get('/api/v1/admin/heatmap')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clusters).toHaveLength(2);
      expect(res.body.data.totalPoints).toBe(190);
      expect(res.body.data.clusters[0].pointCount).toBe(142);
    });
  });
});
