/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for Geofence Routes (/api/v1/geofences).
 */

import { UserRole } from '@prisma/client';
import request from 'supertest';
import { prisma } from '../src/config/database';
import { app } from '../src/index';
import { authService } from '../src/modules/auth/auth.service';

// Mock Prisma client methods
jest.mock('../src/config/database', () => ({
  prisma: {
    geofence: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

describe('Geofence Routes (/api/v1/geofences)', () => {
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

  const mockRawGeofence = {
    id: 'gf_01',
    zoneId: 'zone_01',
    name: 'Bhushi Dam High Risk Perimeter',
    type: 'AUTO_DANGER',
    severity: 'CRITICAL',
    message: 'High flash flood risk! Evacuate immediately.',
    isActive: true,
    createdBy: 'admin_01',
    createdAt: mockDate,
    expiresAt: null,
    boundaryGeoJson: JSON.stringify(mockGeoJSONPolygon),
    centerLat: 18.7555,
    centerLng: 73.4065,
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

  describe('GET /api/v1/geofences (Public)', () => {
    it('should return list of active geofences in standard envelope', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

      const res = await request(app).get('/api/v1/geofences');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.geofences[0].name).toBe('Bhushi Dam High Risk Perimeter');
      expect(res.body.data.geofences[0].severity).toBe('CRITICAL');
    });

    it('should support includeInactive=true query parameter', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        mockRawGeofence,
        { ...mockRawGeofence, id: 'gf_inactive', isActive: false },
      ]);

      const res = await request(app).get('/api/v1/geofences?includeInactive=true');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(2);
    });
  });

  describe('GET /api/v1/geofences/:id (Public)', () => {
    it('should return single geofence by ID', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

      const res = await request(app).get('/api/v1/geofences/gf_01');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.geofence.id).toBe('gf_01');
      expect(res.body.data.geofence.boundary.type).toBe('Polygon');
    });

    it('should return 404 when geofence is not found', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get('/api/v1/geofences/missing_gf');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GEOFENCE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/geofences/check (Public)', () => {
    it('should return containment and proximity results for a coordinate', async () => {
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([mockRawGeofence]) // checkPointInGeofences
        .mockResolvedValueOnce([]); // findGeofencesNearPoint

      const res = await request(app)
        .post('/api/v1/geofences/check')
        .send({
          lat: 18.7555,
          lng: 73.4065,
          bufferMeters: 500,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inside).toBe(true);
      expect(res.body.data.breachedGeofences.length).toBe(1);
      expect(res.body.data.breachedGeofences[0].id).toBe('gf_01');
    });

    it('should return 400 validation error when coordinates are out of bounds', async () => {
      const res = await request(app)
        .post('/api/v1/geofences/check')
        .send({
          lat: 105.0, // Invalid latitude > 90
          lng: 73.4065,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/geofences (Admin Only)', () => {
    it('should allow ADMIN to create a new geofence with polygon boundary', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

      const res = await request(app)
        .post('/api/v1/geofences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bhushi Dam High Risk Perimeter',
          type: 'AUTO_DANGER',
          severity: 'CRITICAL',
          boundary: mockGeoJSONPolygon,
          message: 'High flash flood risk!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.geofence.name).toBe('Bhushi Dam High Risk Perimeter');
    });

    it('should allow ADMIN to create a circular buffer geofence', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawGeofence,
          name: 'Tiger Point Warning Radius',
        },
      ]);

      const res = await request(app)
        .post('/api/v1/geofences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Tiger Point Warning Radius',
          type: 'MANUAL_NOENTRY',
          severity: 'SEVERE',
          centerLat: 18.755,
          centerLng: 73.406,
          radiusMeters: 250,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.geofence.name).toBe('Tiger Point Warning Radius');
    });

    it('should return 400 VALIDATION_ERROR when missing geometry input', async () => {
      const res = await request(app)
        .post('/api/v1/geofences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Geometry Geofence',
          type: 'MANUAL_NOENTRY',
          severity: 'LOW',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 FORBIDDEN when TOURIST attempts to create geofence', async () => {
      const res = await request(app)
        .post('/api/v1/geofences')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          name: 'Unauthorized Geofence',
          type: 'AUTO_DANGER',
          severity: 'LOW',
          boundary: mockGeoJSONPolygon,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 UNAUTHORIZED when no token is supplied', async () => {
      const res = await request(app)
        .post('/api/v1/geofences')
        .send({
          name: 'No Auth Geofence',
          type: 'AUTO_DANGER',
          severity: 'LOW',
          boundary: mockGeoJSONPolygon,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/v1/geofences/:id (Admin Only)', () => {
    it('should allow ADMIN to update geofence properties', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);
      (prisma.geofence.update as jest.Mock).mockResolvedValue(mockRawGeofence);

      const res = await request(app)
        .patch('/api/v1/geofences/gf_01')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Geofence Name',
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.geofence.id).toBe('gf_01');
    });

    it('should return 403 FORBIDDEN when non-admin calls update', async () => {
      const res = await request(app)
        .patch('/api/v1/geofences/gf_01')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          name: 'Updated Geofence Name',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/geofences/:id (Admin Only)', () => {
    it('should allow ADMIN to delete a geofence', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);
      (prisma.geofence.delete as jest.Mock).mockResolvedValue(mockRawGeofence);

      const res = await request(app)
        .delete('/api/v1/geofences/gf_01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Geofence deleted successfully');
    });

    it('should return 403 FORBIDDEN when non-admin calls delete', async () => {
      const res = await request(app)
        .delete('/api/v1/geofences/gf_01')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
