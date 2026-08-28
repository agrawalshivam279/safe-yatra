/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Danger Score Proxy Service & Redis Cache Layer.
 */

import { dangerService } from '../src/modules/danger/danger.service';
import { dangerCache } from '../src/modules/danger/danger.cache';
import { prisma } from '../src/config/database';
import { redis } from '../src/config/redis';
import { DangerTier } from '@prisma/client';

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

describe('DangerService & DangerCache (danger.service.ts & danger.cache.ts)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockNearestZone = {
    id: 'zone_waterfall_01',
    name: 'Bhushi Dam Overflow',
    dangerScore: 75,
    dangerTier: 'SEVERE',
    isManualOverride: false,
    justification: null,
    distanceMeters: 120.5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('scoreToDangerTier', () => {
    it('should map score ranges to correct DangerTier', () => {
      expect(dangerService.scoreToDangerTier(10)).toBe(DangerTier.LOW);
      expect(dangerService.scoreToDangerTier(35)).toBe(DangerTier.MODERATE);
      expect(dangerService.scoreToDangerTier(65)).toBe(DangerTier.SEVERE);
      expect(dangerService.scoreToDangerTier(90)).toBe(DangerTier.CRITICAL);
    });
  });

  describe('DangerCache (danger.cache.ts)', () => {
    it('should retrieve parsed object from Redis', async () => {
      const mockCached = {
        zoneId: 'zone_01',
        coordinates: { lat: 18.75, lng: 73.4 },
        dangerScore: 55,
        tier: 'SEVERE',
        justification: 'High crowd risk',
        computedAt: mockDate.toISOString(),
        source: 'ML_ENGINE',
        ttlSeconds: 300,
      };

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockCached));

      const result = await dangerCache.get('danger:score:zone_01');
      expect(result).not.toBeNull();
      expect(result?.dangerScore).toBe(55);
      expect(result?.source).toBe('CACHE');
    });

    it('should return null when key not found or Redis errors', async () => {
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis connection failed'));

      const result = await dangerCache.get('danger:score:missing');
      expect(result).toBeNull();
    });

    it('should set key with TTL in Redis', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      await dangerCache.set('danger:score:zone_01', {
        coordinates: { lat: 18.75, lng: 73.4 },
        dangerScore: 55,
        tier: DangerTier.SEVERE,
        justification: 'High risk',
        computedAt: mockDate,
        source: 'ML_ENGINE',
        ttlSeconds: 300,
      });

      expect(redis.set).toHaveBeenCalledWith(
        'danger:score:zone_01',
        expect.any(String),
        'EX',
        300
      );
    });
  });

  describe('getScoreForCoordinates (Proxy Pipeline)', () => {
    it('Priority 1: should return Manual Override immediately if active', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockNearestZone,
          isManualOverride: true,
          dangerScore: 95,
          dangerTier: 'CRITICAL',
          justification: 'Emergency manual evacuation active',
          distanceMeters: 50.0,
        },
      ]);

      const result = await dangerService.getScoreForCoordinates(18.7546, 73.4062);

      expect(result.source).toBe('OVERRIDE');
      expect(result.dangerScore).toBe(95);
      expect(result.tier).toBe(DangerTier.CRITICAL);
      expect(result.justification).toContain('Emergency manual evacuation');
      expect(redis.get).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('Priority 2: should return from Redis on cache hit', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockNearestZone]);

      const cachedPayload = {
        zoneId: 'zone_waterfall_01',
        zoneName: 'Bhushi Dam Overflow',
        coordinates: { lat: 18.7546, lng: 73.4062 },
        dangerScore: 82,
        tier: 'CRITICAL',
        justification: 'Flash flood risk upstream',
        computedAt: mockDate.toISOString(),
        source: 'ML_ENGINE',
        ttlSeconds: 300,
      };

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedPayload));

      const result = await dangerService.getScoreForCoordinates(18.7546, 73.4062);

      expect(result.source).toBe('CACHE');
      expect(result.dangerScore).toBe(82);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('Priority 3: should call ML microservice on cache miss, cache result and return', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockNearestZone]);
      (redis.get as jest.Mock).mockResolvedValue(null); // cache miss

      const mockMLResponse = {
        danger_score: 88,
        tier: 'CRITICAL',
        justification: 'Heavy rainfall upstream (180mm) and high slope angle.',
        factors: {
          weather: { score: 90, weight: 0.35 },
          terrain: { score: 85, weight: 0.2 },
          crowd: { score: 60, weight: 0.25 },
          history: { score: 70, weight: 0.2 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockMLResponse,
      });

      const result = await dangerService.getScoreForCoordinates(18.7546, 73.4062);

      expect(result.source).toBe('ML_ENGINE');
      expect(result.dangerScore).toBe(88);
      expect(result.tier).toBe(DangerTier.CRITICAL);
      expect(result.factors?.weather.score).toBe(90);
      expect(redis.set).toHaveBeenCalled();
    });

    it('Priority 4: should return graceful fallback if ML microservice is unreachable', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockNearestZone]);
      (redis.get as jest.Mock).mockResolvedValue(null); // cache miss
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection refused')); // ML engine down

      const result = await dangerService.getScoreForCoordinates(18.7546, 73.4062);

      expect(result.source).toBe('FALLBACK');
      expect(result.dangerScore).toBe(75); // zone stored score
      expect(result.tier).toBe(DangerTier.SEVERE);
      expect(result.ttlSeconds).toBe(60);
    });

    it('should reject invalid coordinates', async () => {
      await expect(
        dangerService.getScoreForCoordinates(100, 73.4062)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_COORDINATES',
        })
      );
    });
  });

  describe('getAllZoneScores', () => {
    it('should return list of danger scores across zones', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          id: 'zone_01',
          name: 'Bhushi Dam',
          dangerScore: 80,
          dangerTier: 'CRITICAL',
          isManualOverride: false,
          justification: 'High water level',
          centerLat: 18.755,
          centerLng: 73.406,
        },
      ]);

      const results = await dangerService.getAllZoneScores();
      expect(results.length).toBe(1);
      expect(results[0].zoneName).toBe('Bhushi Dam');
      expect(results[0].dangerScore).toBe(80);
    });
  });

  describe('getSafetyBriefing', () => {
    it('should return pre-trip safety briefing with emergency contacts', async () => {
      (prisma.zone.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'zone_01',
          name: 'Lonavala Waterfall',
          dangerScore: 65,
        },
      ]);

      const briefing = await dangerService.getSafetyBriefing('Lonavala');

      expect(briefing.destination).toBe('Lonavala');
      expect(briefing.dangerScore).toBe(65);
      expect(briefing.overallDangerTier).toBe(DangerTier.SEVERE);
      expect(briefing.emergencyContacts.police).toBe('112');
      expect(briefing.precautions.length).toBeGreaterThan(1);
    });
  });
});
