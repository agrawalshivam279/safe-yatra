/**
 * Safe Yatra — Backend Spatial Server
 * Integration & Unit Tests for Admin Broadcast Alerts & Sector Messaging (/api/v1/admin/broadcast*).
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { app } from '../src/index';

// Mock Prisma
jest.mock('../src/config/database', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

describe('Admin Broadcast Alerts REST Routes (/api/v1/admin/broadcast*)', () => {
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

  const validPolygon = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [73.40, 18.75],
        [73.42, 18.75],
        [73.42, 18.77],
        [73.40, 18.77],
        [73.40, 18.75],
      ],
    ],
  };

  const mockRawAlert = {
    id: 'alert_broadcast_01',
    title: 'Flash Flood Warning',
    message: 'Sudden water surge upstream. Evacuate immediately.',
    severity: 'CRITICAL',
    targetAreaGeoJson: JSON.stringify(validPolygon),
    centerLat: 18.76,
    centerLng: 73.41,
    createdBy: 'admin_user_01',
    isActive: true,
    expiresAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication & RBAC', () => {
    it('should return 401 UNAUTHORIZED when no authorization header is provided', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .send({
          title: 'Emergency Evacuation',
          message: 'High risk area alert',
          severity: 'CRITICAL',
          targetArea: validPolygon,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 FORBIDDEN when a non-admin (TOURIST) attempts to create a broadcast', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          title: 'Emergency Evacuation',
          message: 'High risk area alert',
          severity: 'CRITICAL',
          targetArea: validPolygon,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 FORBIDDEN when a non-admin attempts to deactivate a broadcast', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/broadcasts/alert_broadcast_01/deactivate')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/admin/broadcast', () => {
    it('should create a broadcast alert with GeoJSON polygon and return 201 Created', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          {
            userId: 'tourist_01',
            name: 'Tourist One',
            phone: '+919876543210',
            role: 'TOURIST',
            lastLat: 18.755,
            lastLng: 73.405,
          },
        ]) // findRecipientsInAlertArea
        .mockResolvedValueOnce([mockRawAlert]); // getBroadcastById

      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Flash Flood Warning',
          message: 'Sudden water surge upstream. Evacuate immediately.',
          severity: 'CRITICAL',
          targetArea: validPolygon,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Flash Flood Warning');
      expect(res.body.data.severity).toBe('CRITICAL');
      expect(res.body.data.recipientCount).toBe(1);
      expect(res.body.data.targetArea.type).toBe('Polygon');
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should create a broadcast alert with circular buffer (centerLat, centerLng, radiusMeters)', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([]) // no recipients
        .mockResolvedValueOnce([mockRawAlert]); // getBroadcastById

      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Dam Water Release Notice',
          message: 'Spillway opening in 30 minutes. Stay clear of riverbanks.',
          severity: 'SEVERE',
          centerLat: 18.7546,
          centerLng: 73.4062,
          radiusMeters: 3000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should return 400 VALIDATION_ERROR when title is too short', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Hi',
          message: 'Short title test',
          severity: 'LOW',
          targetArea: validPolygon,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when neither targetArea nor circular coordinates are provided', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Missing Area Alert',
          message: 'No boundary specified in request body',
          severity: 'MODERATE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when polygon linear ring is unclosed', async () => {
      const unclosedPolygon = {
        type: 'Polygon' as const,
        coordinates: [
          [
            [73.40, 18.75],
            [73.42, 18.75],
            [73.42, 18.77],
            [73.40, 18.77], // Not matching first coordinate
          ],
        ],
      };

      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Unclosed Polygon',
          message: 'Testing geometry validation',
          severity: 'MODERATE',
          targetArea: unclosedPolygon,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/admin/broadcasts', () => {
    it('should return 200 OK with list of broadcast alerts', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawAlert]);

      const res = await request(app)
        .get('/api/v1/admin/broadcasts?isActive=true&limit=10')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('alert_broadcast_01');
      expect(res.body.data[0].targetArea.type).toBe('Polygon');
    });
  });

  describe('GET /api/v1/admin/broadcasts/:id', () => {
    it('should return 200 OK with broadcast detail', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawAlert]);

      const res = await request(app)
        .get('/api/v1/admin/broadcasts/alert_broadcast_01')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('alert_broadcast_01');
      expect(res.body.data.title).toBe('Flash Flood Warning');
    });

    it('should return 404 NOT_FOUND when broadcast alert does not exist', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/broadcasts/non_existent_alert')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/admin/broadcasts/:id/deactivate', () => {
    it('should deactivate an active broadcast alert and return 200 OK', async () => {
      const inactiveMockAlert = {
        ...mockRawAlert,
        isActive: false,
      };

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([mockRawAlert]) // check existence
        .mockResolvedValueOnce([inactiveMockAlert]); // return after update
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .patch('/api/v1/admin/broadcasts/alert_broadcast_01/deactivate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
