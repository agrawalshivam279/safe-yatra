/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for Zones Routes (/api/v1/zones).
 */

import request from 'supertest';
import { app } from '../src/index';
import { authService } from '../src/modules/auth/auth.service';
import { prisma } from '../src/config/database';
import { UserRole } from '@prisma/client';

// Mock Prisma client methods
jest.mock('../src/config/database', () => ({
  prisma: {
    zone: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

describe('Zones Routes (/api/v1/zones)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockGeoJSONPolygon = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [73.405, 18.754],
        [73.408, 18.754],
        [73.408, 18.757],
        [73.405, 18.757],
        [73.405, 18.754],
      ],
    ],
  };

  const mockRawZone = {
    id: 'zone_01',
    name: 'Tiger Point Cliff Edge',
    description: 'Steep drop-off risk area',
    boundaryGeoJson: JSON.stringify(mockGeoJSONPolygon),
    centerLat: 18.7555,
    centerLng: 73.4065,
    dangerScore: 78,
    dangerTier: 'CRITICAL',
    justification: 'High landslide risk',
    isManualOverride: false,
    lastScoreUpdate: mockDate,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  let touristToken: string;
  let adminToken: string;

  beforeAll(() => {
    const touristTokens = authService.generateTokens({
      id: 'tourist_01',
      email: 'tourist@safeyatra.in',
      role: 'TOURIST' as UserRole,
    });
    touristToken = touristTokens.accessToken;

    const adminTokens = authService.generateTokens({
      id: 'admin_01',
      email: 'admin@safeyatra.in',
      role: 'ADMIN' as UserRole,
    });
    adminToken = adminTokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/zones (Public)', () => {
    it('should return list of all active zones', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);

      const res = await request(app).get('/api/v1/zones');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.zones[0].name).toBe('Tiger Point Cliff Edge');
    });
  });

  describe('GET /api/v1/zones/:id (Public)', () => {
    it('should return single zone by ID', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);

      const res = await request(app).get('/api/v1/zones/zone_01');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zone.id).toBe('zone_01');
    });

    it('should return 404 when zone is not found', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get('/api/v1/zones/missing_zone');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ZONE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/zones (Admin Only)', () => {
    it('should allow ADMIN to create a new zone', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);

      const res = await request(app)
        .post('/api/v1/zones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Tiger Point Cliff Edge',
          description: 'Steep drop-off risk area',
          boundary: mockGeoJSONPolygon,
          dangerScore: 78,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zone.name).toBe('Tiger Point Cliff Edge');
    });

    it('should return 403 FORBIDDEN when TOURIST attempts to create zone', async () => {
      const res = await request(app)
        .post('/api/v1/zones')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          name: 'Unauthorized Zone',
          boundary: mockGeoJSONPolygon,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 UNAUTHORIZED when no token is supplied', async () => {
      const res = await request(app)
        .post('/api/v1/zones')
        .send({
          name: 'No Auth Zone',
          boundary: mockGeoJSONPolygon,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/v1/zones/:id/override (Admin Only)', () => {
    it('should allow ADMIN to manually override danger score', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);
      (prisma.zone.update as jest.Mock).mockResolvedValue({
        ...mockRawZone,
        dangerScore: 92,
        dangerTier: 'CRITICAL',
        isManualOverride: true,
        justification: 'Flash flood alert from IMD radar',
      });

      const res = await request(app)
        .patch('/api/v1/zones/zone_01/override')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          score: 92,
          justification: 'Flash flood alert from IMD radar',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zone.id).toBe('zone_01');
    });

    it('should return 403 FORBIDDEN when non-admin calls override', async () => {
      const res = await request(app)
        .patch('/api/v1/zones/zone_01/override')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          score: 92,
          justification: 'Flash flood alert',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/zones/:id (Admin Only)', () => {
    it('should allow ADMIN to delete a zone', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);
      (prisma.zone.delete as jest.Mock).mockResolvedValue(mockRawZone);

      const res = await request(app)
        .delete('/api/v1/zones/zone_01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Zone deleted successfully');
    });
  });
});
