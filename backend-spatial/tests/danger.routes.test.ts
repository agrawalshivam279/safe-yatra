/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for Danger Routes (/api/v1/danger).
 */

import request from 'supertest';
import { app } from '../src/index';
import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';

// Mock Prisma client and Redis
jest.mock('../src/config/database', () => ({
  prisma: {
    zone: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../src/config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

// Global fetch mock
const originalFetch = global.fetch;

describe('Danger Routes (/api/v1/danger)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockNearestZone = {
    id: 'zone_01',
    name: 'Tiger Point Cliff Edge',
    dangerScore: 78,
    dangerTier: 'CRITICAL',
    isManualOverride: false,
    justification: 'High landslide risk',
    distanceMeters: 45.0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('GET /api/v1/danger/score', () => {
    it('should return danger score for valid coordinates', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockNearestZone]);

      const cachedPayload = {
        zoneId: 'zone_01',
        zoneName: 'Tiger Point Cliff Edge',
        coordinates: { lat: 18.7546, lng: 73.4062 },
        dangerScore: 78,
        tier: 'CRITICAL',
        justification: 'High landslide risk',
        computedAt: mockDate.toISOString(),
        source: 'CACHE',
        ttlSeconds: 300,
      };

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedPayload));

      const res = await request(app).get('/api/v1/danger/score?lat=18.7546&lng=73.4062');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score.dangerScore).toBe(78);
      expect(res.body.data.score.tier).toBe('CRITICAL');
    });

    it('should return 400 VALIDATION_ERROR when latitude is out of bounds', async () => {
      const res = await request(app).get('/api/v1/danger/score?lat=95.0&lng=73.4062');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 VALIDATION_ERROR when coordinates are missing', async () => {
      const res = await request(app).get('/api/v1/danger/score');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/danger/zones', () => {
    it('should return all zones with danger scores', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          id: 'zone_01',
          name: 'Tiger Point Cliff Edge',
          dangerScore: 78,
          dangerTier: 'CRITICAL',
          isManualOverride: false,
          justification: 'High landslide risk',
          centerLat: 18.7555,
          centerLng: 73.4065,
        },
      ]);

      const res = await request(app).get('/api/v1/danger/zones');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.zones[0].dangerScore).toBe(78);
    });
  });

  describe('GET /api/v1/danger/briefing/:destination', () => {
    it('should return pre-trip safety briefing for destination', async () => {
      (prisma.zone.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'zone_01',
          name: 'Lonavala Ghats',
          dangerScore: 40,
        },
      ]);

      const res = await request(app).get('/api/v1/danger/briefing/Lonavala');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.briefing.destination).toBe('Lonavala');
      expect(res.body.data.briefing.emergencyContacts.police).toBe('112');
    });

    it('should return 400 VALIDATION_ERROR when destination is too short', async () => {
      const res = await request(app).get('/api/v1/danger/briefing/a');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
