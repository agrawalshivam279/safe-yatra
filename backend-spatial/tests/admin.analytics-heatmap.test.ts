/**
 * Safe Yatra — Backend Spatial Server
 * Integration & Unit Tests for Admin Analytics & Heatmap Aggregations (/api/v1/admin/analytics, /api/v1/admin/heatmap).
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { app } from '../src/index';

// Mock Prisma
jest.mock('../src/config/database', () => ({
  prisma: {
    sOSEvent: {
      count: jest.fn(),
    },
    volunteerProfile: {
      count: jest.fn(),
    },
    zone: {
      count: jest.fn(),
    },
    geofence: {
      count: jest.fn(),
    },
    broadcastAlert: {
      count: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

describe('Admin Analytics & Heatmap REST Routes (/api/v1/admin/analytics, /api/v1/admin/heatmap)', () => {
  const adminUser = {
    id: 'admin_user_01',
    email: 'admin@safeyatra.in',
    role: 'ADMIN',
  };

  const touristUser = {
    id: 'tourist_user_01',
    email: 'tourist@safeyatra.in',
    role: 'TOURIST',
  };

  const adminToken = jwt.sign(
    { userId: adminUser.id, email: adminUser.email, role: adminUser.role, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const touristToken = jwt.sign(
    { userId: touristUser.id, email: touristUser.email, role: touristUser.role, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & RBAC', () => {
    it('should return 401 UNAUTHORIZED on GET /analytics when no token is provided', async () => {
      const res = await request(app).get('/api/v1/admin/analytics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN on GET /analytics when a TOURIST token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${touristToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 UNAUTHORIZED on GET /heatmap when no token is provided', async () => {
      const res = await request(app).get('/api/v1/admin/heatmap');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN on GET /heatmap when a TOURIST token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/heatmap')
        .set('Authorization', `Bearer ${touristToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/analytics', () => {
    it('should return 200 OK with aggregated command center analytics for admin', async () => {
      // Mock SOS counts
      (prisma.sOSEvent.count as jest.Mock)
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(2)  // active
        .mockResolvedValueOnce(10) // resolved
        .mockResolvedValueOnce(3); // cancelled

      // Mock avg response time query
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ avgSec: 145.4 }]) // avg response time
        .mockResolvedValueOnce([{ count: 28 }]);    // active tourists

      // Mock volunteer counts
      (prisma.volunteerProfile.count as jest.Mock)
        .mockResolvedValueOnce(6)  // on duty
        .mockResolvedValueOnce(12); // total volunteers

      // Mock zone counts
      (prisma.zone.count as jest.Mock)
        .mockResolvedValueOnce(4) // total zones
        .mockResolvedValueOnce(1) // LOW
        .mockResolvedValueOnce(1) // MODERATE
        .mockResolvedValueOnce(1) // SEVERE
        .mockResolvedValueOnce(1); // CRITICAL

      // Mock alert counts
      (prisma.geofence.count as jest.Mock).mockResolvedValueOnce(3);
      (prisma.broadcastAlert.count as jest.Mock).mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sos.total).toBe(15);
      expect(res.body.data.sos.active).toBe(2);
      expect(res.body.data.sos.avgResponseTimeSeconds).toBe(145);
      expect(res.body.data.users.activeTourists).toBe(28);
      expect(res.body.data.users.activeVolunteersOnDuty).toBe(6);
      expect(res.body.data.zones.tierDistribution.CRITICAL).toBe(1);
      expect(res.body.data.alerts.activeGeofences).toBe(3);
      expect(res.body.data.alerts.activeBroadcasts).toBe(1);
    });
  });

  describe('GET /api/v1/admin/heatmap', () => {
    it('should return 200 OK with privacy-preserving crowd density clusters', async () => {
      const mockClusters = [
        { lat: 18.7546, lng: 73.4062, intensity: 15, pointCount: 35 },
        { lat: 18.7612, lng: 73.4125, intensity: 8, pointCount: 15 },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(mockClusters);

      const res = await request(app)
        .get('/api/v1/admin/heatmap?lookbackMinutes=30&gridSize=0.005')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalPoints).toBe(50);
      expect(res.body.data.clusterCount).toBe(2);
      expect(res.body.data.lookbackMinutes).toBe(30);
      expect(res.body.data.clusters).toHaveLength(2);
      expect(res.body.data.clusters[0].intensity).toBe(15);
    });

    it('should return 400 VALIDATION_ERROR when lookbackMinutes is less than 5', async () => {
      const res = await request(app)
        .get('/api/v1/admin/heatmap?lookbackMinutes=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when gridSize is negative', async () => {
      const res = await request(app)
        .get('/api/v1/admin/heatmap?gridSize=-0.01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
