/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Zones Service (PostGIS Polygon Ingestion, Danger Tiers, and Overrides).
 */

import { zoneService } from '../src/modules/zones/zone.service';
import { prisma } from '../src/config/database';
import { DangerTier } from '@prisma/client';

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

describe('ZoneService (zone.service.ts)', () => {
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
    id: 'zone_lonavala_01',
    name: 'Bhushi Dam Overflow',
    description: 'High flash flood risk zone near waterfall',
    boundaryGeoJson: JSON.stringify(mockGeoJSONPolygon),
    centerLat: 18.7555,
    centerLng: 73.4065,
    dangerScore: 82,
    dangerTier: 'CRITICAL',
    justification: 'High flash flood risk',
    isManualOverride: false,
    lastScoreUpdate: mockDate,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scoreToDangerTier', () => {
    it('should map scores correctly to DangerTier enums', () => {
      expect(zoneService.scoreToDangerTier(0)).toBe(DangerTier.LOW);
      expect(zoneService.scoreToDangerTier(25)).toBe(DangerTier.LOW);
      expect(zoneService.scoreToDangerTier(26)).toBe(DangerTier.MODERATE);
      expect(zoneService.scoreToDangerTier(50)).toBe(DangerTier.MODERATE);
      expect(zoneService.scoreToDangerTier(51)).toBe(DangerTier.SEVERE);
      expect(zoneService.scoreToDangerTier(75)).toBe(DangerTier.SEVERE);
      expect(zoneService.scoreToDangerTier(76)).toBe(DangerTier.CRITICAL);
      expect(zoneService.scoreToDangerTier(100)).toBe(DangerTier.CRITICAL);
    });

    it('should reject scores outside [0, 100]', () => {
      expect(() => zoneService.scoreToDangerTier(-5)).toThrow(/Danger score must be between 0 and 100/);
      expect(() => zoneService.scoreToDangerTier(105)).toThrow(/Danger score must be between 0 and 100/);
    });
  });

  describe('createZone', () => {
    it('should create zone with GeoJSON Polygon', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);

      const zone = await zoneService.createZone({
        name: 'Bhushi Dam Overflow',
        description: 'High flash flood risk zone near waterfall',
        boundary: mockGeoJSONPolygon,
        dangerScore: 82,
      });

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(zone.id).toBe('zone_lonavala_01');
      expect(zone.dangerTier).toBe(DangerTier.CRITICAL);
      expect(zone.boundary?.type).toBe('Polygon');
      expect(zone.centerLat).toBe(18.7555);
    });

    it('should create circular buffer zone when centerLat/centerLng/radiusMeters provided', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawZone,
          boundaryGeoJson: null,
        },
      ]);

      const zone = await zoneService.createZone({
        name: 'Circular Danger Area',
        centerLat: 18.755,
        centerLng: 73.406,
        radiusMeters: 500,
        dangerScore: 35,
      });

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(zone.name).toBe('Bhushi Dam Overflow');
    });

    it('should throw 400 INVALID_ZONE_GEOMETRY when geometry input is missing', async () => {
      await expect(
        zoneService.createZone({
          name: 'Invalid Zone',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_ZONE_GEOMETRY',
        })
      );
    });
  });

  describe('getAllZones', () => {
    it('should return all zones with parsed GeoJSON polygons', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);

      const zones = await zoneService.getAllZones();
      expect(zones.length).toBe(1);
      expect(zones[0].id).toBe('zone_lonavala_01');
      expect(zones[0].boundary?.type).toBe('Polygon');
      expect(zones[0].dangerTier).toBe(DangerTier.CRITICAL);
    });
  });

  describe('getZoneById', () => {
    it('should return a zone by ID', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);

      const zone = await zoneService.getZoneById('zone_lonavala_01');
      expect(zone.id).toBe('zone_lonavala_01');
      expect(zone.name).toBe('Bhushi Dam Overflow');
    });

    it('should throw 404 ZONE_NOT_FOUND when zone does not exist', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(zoneService.getZoneById('missing_zone')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'ZONE_NOT_FOUND',
        })
      );
    });
  });

  describe('overrideScore', () => {
    it('should manually override score, update dangerTier and set isManualOverride true', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);
      (prisma.zone.update as jest.Mock).mockResolvedValue({
        ...mockRawZone,
        dangerScore: 95,
        dangerTier: 'CRITICAL',
        isManualOverride: true,
        justification: 'Severe upstream cloudburst detected',
      });

      const updated = await zoneService.overrideScore('zone_lonavala_01', {
        score: 95,
        justification: 'Severe upstream cloudburst detected',
      });

      expect(prisma.zone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'zone_lonavala_01' },
          data: expect.objectContaining({
            dangerScore: 95,
            dangerTier: DangerTier.CRITICAL,
            isManualOverride: true,
            justification: 'Severe upstream cloudburst detected',
          }),
        })
      );
      expect(updated.dangerScore).toBe(82); // returns mocked record
    });
  });

  describe('deleteZone', () => {
    it('should delete zone by ID', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawZone]);
      (prisma.zone.delete as jest.Mock).mockResolvedValue(mockRawZone);

      await zoneService.deleteZone('zone_lonavala_01');
      expect(prisma.zone.delete).toHaveBeenCalledWith({
        where: { id: 'zone_lonavala_01' },
      });
    });
  });
});
