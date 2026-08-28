/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Geofence Service and PostGIS Spatial Engine.
 */

import { DangerTier } from '@prisma/client';
import { prisma } from '../src/config/database';
import { geofenceEngine } from '../src/modules/geofence/geofence.engine';
import { geofenceService } from '../src/modules/geofence/geofence.service';

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

describe('Geofence Spatial Engine & Service', () => {
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
    id: 'gf_lonavala_01',
    zoneId: 'zone_lonavala_01',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GeofenceEngine (geofence.engine.ts)', () => {
    describe('validateCoordinates', () => {
      it('should accept valid coordinates', () => {
        expect(() => geofenceEngine.validateCoordinates(18.755, 73.406)).not.toThrow();
        expect(() => geofenceEngine.validateCoordinates(-90, -180)).not.toThrow();
        expect(() => geofenceEngine.validateCoordinates(90, 180)).not.toThrow();
      });

      it('should reject invalid coordinate types and NaN', () => {
        expect(() => geofenceEngine.validateCoordinates(NaN, 73.406)).toThrow(/must be valid numbers/);
        expect(() => geofenceEngine.validateCoordinates(18.755, 'invalid' as any)).toThrow(/must be valid numbers/);
      });

      it('should reject latitude outside [-90, 90]', () => {
        expect(() => geofenceEngine.validateCoordinates(95.0, 73.406)).toThrow(/Latitude must be between -90 and 90/);
        expect(() => geofenceEngine.validateCoordinates(-95.0, 73.406)).toThrow(/Latitude must be between -90 and 90/);
      });

      it('should reject longitude outside [-180, 180]', () => {
        expect(() => geofenceEngine.validateCoordinates(18.755, 185.0)).toThrow(/Longitude must be between -180 and 180/);
        expect(() => geofenceEngine.validateCoordinates(18.755, -185.0)).toThrow(/Longitude must be between -180 and 180/);
      });
    });

    describe('checkPointInGeofences', () => {
      it('should return matched geofences when point is contained', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

        const result = await geofenceEngine.checkPointInGeofences(18.7555, 73.4065);

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('gf_lonavala_01');
        expect(result[0].severity).toBe(DangerTier.CRITICAL);
        expect(result[0].boundary?.type).toBe('Polygon');
        expect(result[0].centerLat).toBe(18.7555);
        expect(result[0].centerLng).toBe(73.4065);
      });

      it('should return empty array when point is outside all geofences', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

        const result = await geofenceEngine.checkPointInGeofences(18.7000, 73.3000);
        expect(result).toEqual([]);
      });
    });

    describe('findGeofencesNearPoint', () => {
      it('should return geofences within proximity buffer with rounded distance', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([
          {
            ...mockRawGeofence,
            distanceMeters: 142.7,
          },
        ]);

        const result = await geofenceEngine.findGeofencesNearPoint(18.753, 73.404, 500);

        expect(result.length).toBe(1);
        expect(result[0].geofence.id).toBe('gf_lonavala_01');
        expect(result[0].distanceMeters).toBe(143);
      });

      it('should reject negative buffer distance', async () => {
        await expect(
          geofenceEngine.findGeofencesNearPoint(18.753, 73.404, -50)
        ).rejects.toThrow(/Buffer distance must be non-negative/);
      });
    });

    describe('evaluateLocation', () => {
      it('should return inside=true when point is inside breached geofence', async () => {
        (prisma.$queryRaw as jest.Mock)
          .mockResolvedValueOnce([mockRawGeofence]) // checkPointInGeofences
          .mockResolvedValueOnce([]); // findGeofencesNearPoint

        const evalResult = await geofenceEngine.evaluateLocation(18.7555, 73.4065, 500);

        expect(evalResult.inside).toBe(true);
        expect(evalResult.breachedGeofences.length).toBe(1);
        expect(evalResult.approachingGeofences.length).toBe(0);
      });

      it('should return inside=false and approaching geofences when outside but near', async () => {
        (prisma.$queryRaw as jest.Mock)
          .mockResolvedValueOnce([]) // checkPointInGeofences
          .mockResolvedValueOnce([
            {
              ...mockRawGeofence,
              distanceMeters: 250,
            },
          ]); // findGeofencesNearPoint

        const evalResult = await geofenceEngine.evaluateLocation(18.753, 73.404, 500);

        expect(evalResult.inside).toBe(false);
        expect(evalResult.breachedGeofences.length).toBe(0);
        expect(evalResult.approachingGeofences.length).toBe(1);
        expect(evalResult.approachingGeofences[0].distanceMeters).toBe(250);
      });
    });

    describe('toGeofenceEntity', () => {
      it('should handle unparseable boundary GeoJSON gracefully', () => {
        const raw = {
          ...mockRawGeofence,
          boundaryGeoJson: 'invalid-json',
        };

        const entity = geofenceEngine.toGeofenceEntity(raw);
        expect(entity.boundary).toBeNull();
      });
    });
  });

  describe('GeofenceService (geofence.service.ts)', () => {
    describe('createGeofence', () => {
      it('should create geofence with explicit GeoJSON Polygon', async () => {
        (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

        const geofence = await geofenceService.createGeofence({
          name: 'Bhushi Dam High Risk Perimeter',
          type: 'AUTO_DANGER',
          severity: DangerTier.CRITICAL,
          boundary: mockGeoJSONPolygon,
          message: 'High flash flood risk!',
        });

        expect(prisma.$executeRaw).toHaveBeenCalled();
        expect(geofence.id).toBe('gf_lonavala_01');
        expect(geofence.severity).toBe(DangerTier.CRITICAL);
        expect(geofence.boundary?.type).toBe('Polygon');
      });

      it('should create circular buffer geofence with centerLat/centerLng/radiusMeters', async () => {
        (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([
          {
            ...mockRawGeofence,
            name: 'Circular Buffer Zone',
          },
        ]);

        const geofence = await geofenceService.createGeofence({
          name: 'Circular Buffer Zone',
          type: 'MANUAL_NOENTRY',
          severity: DangerTier.SEVERE,
          centerLat: 18.755,
          centerLng: 73.406,
          radiusMeters: 300,
        });

        expect(prisma.$executeRaw).toHaveBeenCalled();
        expect(geofence.name).toBe('Circular Buffer Zone');
      });

      it('should reject circular buffer with radius <= 0', async () => {
        await expect(
          geofenceService.createGeofence({
            name: 'Zero Radius',
            type: 'MANUAL_NOENTRY',
            severity: DangerTier.SEVERE,
            centerLat: 18.755,
            centerLng: 73.406,
            radiusMeters: 0,
          })
        ).rejects.toThrow(/Radius must be greater than 0/);
      });

      it('should reject when both polygon and circular buffer inputs are missing', async () => {
        await expect(
          geofenceService.createGeofence({
            name: 'No Geometry',
            type: 'MANUAL_NOENTRY',
            severity: DangerTier.LOW,
          })
        ).rejects.toThrow(
          expect.objectContaining({
            statusCode: 400,
            code: 'INVALID_GEOFENCE_GEOMETRY',
          })
        );
      });
    });

    describe('getAllGeofences', () => {
      it('should return active geofences by default', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

        const geofences = await geofenceService.getAllGeofences();
        expect(geofences.length).toBe(1);
        expect(geofences[0].id).toBe('gf_lonavala_01');
      });

      it('should support includeInactive=true', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([
          mockRawGeofence,
          { ...mockRawGeofence, id: 'gf_inactive', isActive: false },
        ]);

        const geofences = await geofenceService.getAllGeofences(true);
        expect(geofences.length).toBe(2);
      });
    });

    describe('getGeofenceById', () => {
      it('should return geofence by ID', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);

        const geofence = await geofenceService.getGeofenceById('gf_lonavala_01');
        expect(geofence.id).toBe('gf_lonavala_01');
      });

      it('should throw 404 when geofence not found', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

        await expect(geofenceService.getGeofenceById('missing_id')).rejects.toThrow(
          expect.objectContaining({
            statusCode: 404,
            code: 'GEOFENCE_NOT_FOUND',
          })
        );
      });
    });

    describe('updateGeofence', () => {
      it('should update metadata and boundary polygon', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);
        (prisma.geofence.update as jest.Mock).mockResolvedValue(mockRawGeofence);
        (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

        const updated = await geofenceService.updateGeofence('gf_lonavala_01', {
          name: 'Updated Name',
          boundary: mockGeoJSONPolygon,
          isActive: false,
        });

        expect(prisma.geofence.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'gf_lonavala_01' },
            data: expect.objectContaining({
              name: 'Updated Name',
              isActive: false,
            }),
          })
        );
        expect(prisma.$executeRaw).toHaveBeenCalled();
        expect(updated.id).toBe('gf_lonavala_01');
      });
    });

    describe('deleteGeofence', () => {
      it('should delete geofence by ID', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawGeofence]);
        (prisma.geofence.delete as jest.Mock).mockResolvedValue(mockRawGeofence);

        await geofenceService.deleteGeofence('gf_lonavala_01');
        expect(prisma.geofence.delete).toHaveBeenCalledWith({
          where: { id: 'gf_lonavala_01' },
        });
      });
    });

    describe('checkPoint', () => {
      it('should delegate to geofenceEngine.evaluateLocation', async () => {
        (prisma.$queryRaw as jest.Mock)
          .mockResolvedValueOnce([mockRawGeofence])
          .mockResolvedValueOnce([]);

        const result = await geofenceService.checkPoint(18.7555, 73.4065, 500);
        expect(result.inside).toBe(true);
      });
    });
  });
});
