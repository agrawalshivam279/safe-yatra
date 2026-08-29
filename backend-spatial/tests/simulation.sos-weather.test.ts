/**
 * Safe Yatra — Backend Spatial Server
 * Integration & Unit Tests for SOS Simulation Loop & Weather Overrides (/api/v1/sim/sos, /api/v1/sim/weather-override).
 */

import request from 'supertest';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { redis } from '../src/config/redis';
import { app } from '../src/index';
import { dangerService } from '../src/modules/danger/danger.service';
import { sosMatcher } from '../src/modules/sos/sos.matcher';

// Mock database
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    volunteerProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    sOSEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
    sOSResponse: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    sOSTimeline: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
  redis: {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock Danger Service
jest.mock('../src/modules/danger/danger.service', () => ({
  dangerService: {
    getScoreForCoordinates: jest.fn(),
  },
}));

// Mock SOS Matcher
jest.mock('../src/modules/sos/sos.matcher', () => ({
  sosMatcher: {
    matchVolunteers: jest.fn(),
  },
}));

describe('Simulation SOS & Weather Override Routes (/api/v1/sim)', () => {
  const originalSimMode = env.SIMULATION_MODE;

  const mockTourist = {
    id: 'tourist_sim_01',
    name: 'Test Tourist',
    email: 'tourist@safeyatra.in',
    phone: '+919876543210',
    role: 'TOURIST',
    isActive: true,
  };

  const mockVolunteer = {
    id: 'mitra_sim_01',
    name: 'Test Yaatri Mitra',
    email: 'mitra@safeyatra.in',
    phone: '+919876543211',
    role: 'YAATRI_MITRA',
    isActive: true,
  };

  const mockSOSEventRaw = {
    id: 'sos_sim_01',
    triggeredBy: 'tourist_sim_01',
    userName: 'Test Tourist',
    userPhone: '+919876543210',
    lat: 18.7546,
    lng: 73.4062,
    altitude: 620,
    battery: 80,
    audioUrl: null,
    status: 'VOLUNTEER_ALERTED',
    dangerScore: 65,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (env as any).SIMULATION_MODE = true;

    (dangerService.getScoreForCoordinates as jest.Mock).mockResolvedValue({
      dangerScore: 65,
      tier: 'SEVERE',
    });

    (sosMatcher.matchVolunteers as jest.Mock).mockResolvedValue({
      volunteerCount: 1,
      volunteers: [
        {
          userId: 'mitra_sim_01',
          name: 'Test Yaatri Mitra',
          phone: '+919876543211',
          role: 'YAATRI_MITRA',
          verificationStatus: 'VERIFIED',
          isOnDuty: true,
          rating: 4.8,
          totalResponses: 12,
          location: { lat: 18.756, lng: 73.408 },
          distanceMeters: 250,
          estimatedEtaSeconds: 120,
        },
      ],
    });

    (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'resp_01',
        sosEventId: 'sos_sim_01',
        volunteerId: 'mitra_sim_01',
        status: 'ARRIVED',
        acceptedAt: new Date(),
        arrivedAt: new Date(),
        etaSeconds: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
        volunteer: { id: 'mitra_sim_01', name: 'Test Yaatri Mitra', phone: '+919876543211' },
      },
    ]);

    (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([
      { id: 'tl_1', sosEventId: 'sos_sim_01', event: 'TRIGGERED', details: 'Triggered', timestamp: new Date() },
      { id: 'tl_2', sosEventId: 'sos_sim_01', event: 'VOLUNTEERS_ALERTED', details: 'Alerted', timestamp: new Date() },
      { id: 'tl_3', sosEventId: 'sos_sim_01', event: 'VOLUNTEER_ACCEPTED', details: 'Accepted', timestamp: new Date() },
      { id: 'tl_4', sosEventId: 'sos_sim_01', event: 'VOLUNTEER_ARRIVED', details: 'Arrived', timestamp: new Date() },
      { id: 'tl_5', sosEventId: 'sos_sim_01', event: 'RESOLVED', details: 'Resolved', timestamp: new Date() },
    ]);
  });

  afterAll(() => {
    (env as any).SIMULATION_MODE = originalSimMode;
  });

  describe('Simulation Environment Guard', () => {
    it('should return 404 NOT_FOUND on POST /sim/sos when SIMULATION_MODE is false', async () => {
      (env as any).SIMULATION_MODE = false;

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          tourist: { location: { lat: 18.7546, lng: 73.4062 } },
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 NOT_FOUND on POST /sim/weather-override when SIMULATION_MODE is false', async () => {
      (env as any).SIMULATION_MODE = false;

      const res = await request(app)
        .post('/api/v1/sim/weather-override')
        .send({
          precipitation_mm: 150,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/sim/sos', () => {
    it('should simulate full_loop scenario (trigger -> alert -> accept -> arrive -> resolve)', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTourist) // tourist check
        .mockResolvedValueOnce(mockVolunteer) // volunteer check
        .mockResolvedValueOnce(mockTourist); // triggerSOS user lookup
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([mockSOSEventRaw]) // triggerSOS getSOSById
        .mockResolvedValueOnce([mockSOSEventRaw]) // acceptSOS getSOSById
        .mockResolvedValueOnce([{ ...mockSOSEventRaw, status: 'VOLUNTEER_ACCEPTED' }])
        .mockResolvedValueOnce([{ ...mockSOSEventRaw, status: 'VOLUNTEER_ACCEPTED' }]) // arriveSOS getSOSById
        .mockResolvedValueOnce([{ ...mockSOSEventRaw, status: 'VOLUNTEER_ARRIVED' }])
        .mockResolvedValueOnce([{ ...mockSOSEventRaw, status: 'VOLUNTEER_ARRIVED' }]) // resolveSOS getSOSById
        .mockResolvedValue([{ ...mockSOSEventRaw, status: 'RESOLVED', resolvedAt: new Date() }]);

      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSResponse.create as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});
      (prisma.volunteerProfile.upsert as jest.Mock).mockResolvedValue({});
      (prisma.volunteerProfile.updateMany as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          scenario: 'full_loop',
          tourist: {
            userId: 'tourist_sim_01',
            location: { lat: 18.7546, lng: 73.4062 },
            battery: 75,
          },
          volunteers: [
            {
              userId: 'mitra_sim_01',
              location: { lat: 18.756, lng: 73.408 },
            },
          ],
          autoResolve: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenario).toBe('full_loop');
      expect(res.body.data.touristId).toBe('tourist_sim_01');
      expect(res.body.data.respondingVolunteerId).toBe('mitra_sim_01');
      expect(res.body.data.sosDetail.status).toBe('RESOLVED');
    });

    it('should simulate cancel scenario', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTourist)
        .mockResolvedValueOnce(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([mockSOSEventRaw]) // triggerSOS getSOSById
        .mockResolvedValueOnce([mockSOSEventRaw]) // cancelSOS getSOSById
        .mockResolvedValue([{ ...mockSOSEventRaw, status: 'CANCELLED', cancelledAt: new Date() }]);

      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          scenario: 'cancel',
          tourist: {
            userId: 'tourist_sim_01',
            location: { lat: 18.7546, lng: 73.4062 },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenario).toBe('cancel');
      expect(res.body.data.sosDetail.status).toBe('CANCELLED');
    });

    it('should simulate volunteer_timeout scenario', async () => {
      const mockAlertedEvent = {
        ...mockSOSEventRaw,
        status: 'VOLUNTEER_ALERTED',
        resolvedAt: null,
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTourist)
        .mockResolvedValueOnce(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockAlertedEvent]);
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          scenario: 'volunteer_timeout',
          tourist: {
            userId: 'tourist_sim_01',
            location: { lat: 18.7546, lng: 73.4062 },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenario).toBe('volunteer_timeout');
      expect(res.body.data.sosDetail.status).toBe('VOLUNTEER_ALERTED');
    });

    it('should return 400 VALIDATION_ERROR when tourist latitude is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          tourist: {
            location: { lat: 105.0, lng: 73.4062 },
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 USER_NOT_FOUND when explicit tourist userId does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          tourist: {
            userId: 'missing_tourist_id',
            location: { lat: 18.7546, lng: 73.4062 },
          },
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /api/v1/sim/weather-override', () => {
    it('should store environmental overrides in Redis with TTL and return 200', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      const res = await request(app)
        .post('/api/v1/sim/weather-override')
        .send({
          precipitation_mm: 180,
          wind_speed_kmh: 65,
          visibility_meters: 250,
          temperature_c: 24,
          ttlSeconds: 600,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.active).toBe(true);
      expect(res.body.data.ttlSeconds).toBe(600);
      expect(res.body.data.overrides.precipitation_mm).toBe(180);
      expect(redis.set).toHaveBeenCalledWith(
        'sim:weather:override',
        JSON.stringify({
          precipitation_mm: 180,
          wind_speed_kmh: 65,
          visibility_meters: 250,
          temperature_c: 24,
        }),
        'EX',
        600
      );
    });

    it('should clear weather overrides when clear: true is supplied', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .post('/api/v1/sim/weather-override')
        .send({
          clear: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.active).toBe(false);
      expect(redis.del).toHaveBeenCalledWith('sim:weather:override');
    });

    it('should return 400 VALIDATION_ERROR when negative precipitation is provided', async () => {
      const res = await request(app)
        .post('/api/v1/sim/weather-override')
        .send({
          precipitation_mm: -25,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
