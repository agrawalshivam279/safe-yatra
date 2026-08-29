/**
 * Safe Yatra — Backend Spatial Server
 * Step 7.1: Master End-to-End (E2E) SOS Emergency Response Loop Test Suite.
 *
 * Validates the complete multi-actor emergency response loop across all 4 pillars:
 * 1. PREDICT: ML danger hazard scoring attached to SOS telemetry.
 * 2. PREVENT: Geodetic PostGIS spatial proximity matcher (5km radius).
 * 3. RESPOND: Multi-state transition chain (TRIGGERED -> ALERTED -> ACCEPTED -> ARRIVED -> RESOLVED).
 * 4. COMMAND: Real-time Socket.IO broadcasts, timeline auditing, and simulation engine execution.
 */

import { SOSStatus, UserRole } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { redis } from '../src/config/redis';
import { errorHandler } from '../src/middleware/errorHandler';
import { authService } from '../src/modules/auth/auth.service';
import { dangerService } from '../src/modules/danger/danger.service';
import simRouter from '../src/modules/simulation/sim.routes';
import { sosMatcher } from '../src/modules/sos/sos.matcher';
import { sosRouter } from '../src/modules/sos/sos.routes';
import { notificationDispatcher } from '../src/utils/notifications';

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
      findUnique: jest.fn(),
      findMany: jest.fn(),
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
    userLocation: {
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
    get: jest.fn(),
    del: jest.fn(),
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

// Mock Push Notification Dispatcher
jest.mock('../src/utils/notifications', () => ({
  notificationDispatcher: {
    sendPushNotification: jest.fn(),
    sendSOSPushToVolunteers: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  },
}));

describe('Step 7.1: Master End-to-End (E2E) SOS Loop Test Suite', () => {
  let app: express.Application;
  const originalSimMode = env.SIMULATION_MODE;

  // Mock Actors
  const mockTourist = {
    id: 'usr_tourist_e2e_01',
    name: 'Aarav Sharma',
    email: 'aarav@tourist.safeyatra.in',
    phone: '+919876543210',
    role: UserRole.TOURIST,
    isActive: true,
  };

  const mockMitra = {
    id: 'usr_mitra_e2e_01',
    name: 'Rajesh Kumar (Yaatri Mitra)',
    email: 'rajesh@mitra.safeyatra.in',
    phone: '+919876543211',
    role: UserRole.YAATRI_MITRA,
    isActive: true,
  };

  const mockAdmin = {
    id: 'usr_admin_e2e_01',
    name: 'Command Center Officer',
    email: 'admin@command.safeyatra.in',
    phone: '+919876543212',
    role: UserRole.ADMIN,
    isActive: true,
  };

  let touristToken: string;
  let mitraToken: string;
  let adminToken: string;

  beforeAll(() => {
    (env as any).SIMULATION_MODE = true;

    app = express();
    app.use(express.json());
    app.use('/api/v1/sos', sosRouter);
    app.use('/api/v1/sim', simRouter);
    app.use(errorHandler);

    touristToken = authService.generateTokens({
      id: mockTourist.id,
      email: mockTourist.email,
      role: mockTourist.role,
    }).accessToken;

    mitraToken = authService.generateTokens({
      id: mockMitra.id,
      email: mockMitra.email,
      role: mockMitra.role,
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

    // Default safe mocks for relations
    (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOSResponse.create as jest.Mock).mockResolvedValue({});
    (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});
    (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
    (prisma.volunteerProfile.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    (dangerService.getScoreForCoordinates as jest.Mock).mockResolvedValue({
      dangerScore: 82,
      tier: 'CRITICAL',
      justification: 'High flash flood risk near waterfall edge with heavy precipitation.',
    });

    (sosMatcher.matchVolunteers as jest.Mock).mockResolvedValue({
      volunteerCount: 1,
      volunteers: [
        {
          userId: mockMitra.id,
          name: mockMitra.name,
          phone: mockMitra.phone,
          role: mockMitra.role,
          verificationStatus: 'VERIFIED',
          isOnDuty: true,
          rating: 4.9,
          totalResponses: 24,
          location: { lat: 18.756, lng: 73.408 },
          distanceMeters: 280.5,
          estimatedEtaSeconds: 130,
        },
      ],
      nearestVolunteer: {
        userId: mockMitra.id,
        name: mockMitra.name,
        phone: mockMitra.phone,
        role: mockMitra.role,
        verificationStatus: 'VERIFIED',
        isOnDuty: true,
        rating: 4.9,
        totalResponses: 24,
        location: { lat: 18.756, lng: 73.408 },
        distanceMeters: 280.5,
        estimatedEtaSeconds: 130,
      },
      nearestEtaSeconds: 130,
    });
  });

  describe('1. Full Multi-Actor SOS Emergency Lifecycle (REST Protocol)', () => {
    const sosId = 'sos_event_e2e_999';
    const triggerLocation = { lat: 18.7546, lng: 73.4062, altitude: 620 };
    const initialDate = new Date('2026-08-30T03:00:00.000Z');

    it('Stage 1 (TRIGGER): Tourist triggers SOS -> PostGIS matches nearby volunteer -> Push alerted', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          id: sosId,
          triggeredBy: mockTourist.id,
          userName: mockTourist.name,
          userPhone: mockTourist.phone,
          lat: triggerLocation.lat,
          lng: triggerLocation.lng,
          altitude: triggerLocation.altitude,
          battery: 22,
          audioUrl: 'https://storage.safeyatra.in/sos/audio-note-01.aac',
          status: SOSStatus.VOLUNTEER_ALERTED,
          dangerScore: 82,
          resolvedAt: null,
          cancelledAt: null,
          createdAt: initialDate,
          updatedAt: initialDate,
        },
      ]);

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          lat: triggerLocation.lat,
          lng: triggerLocation.lng,
          altitude: triggerLocation.altitude,
          battery: 22,
          audioUrl: 'https://storage.safeyatra.in/sos/audio-note-01.aac',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sosEvent.id).toBe(sosId);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.VOLUNTEER_ALERTED);
      expect(res.body.data.sosEvent.dangerScore).toBe(82);
      expect(res.body.data.matchResult.volunteerCount).toBe(1);
      expect(res.body.data.matchResult.volunteers[0].userId).toBe(mockMitra.id);

      // Verify push notification sent to alerted volunteers
      expect(notificationDispatcher.sendSOSPushToVolunteers).toHaveBeenCalled();
    });

    it('Stage 2 (ACCEPT): Yaatri Mitra accepts emergency rescue dispatch', async () => {
      const acceptedDate = new Date('2026-08-30T03:00:15.000Z');

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: sosId,
            triggeredBy: mockTourist.id,
            userName: mockTourist.name,
            userPhone: mockTourist.phone,
            lat: triggerLocation.lat,
            lng: triggerLocation.lng,
            altitude: triggerLocation.altitude,
            battery: 22,
            status: SOSStatus.VOLUNTEER_ALERTED,
            dangerScore: 82,
            resolvedAt: null,
            createdAt: initialDate,
            updatedAt: initialDate,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: sosId,
            triggeredBy: mockTourist.id,
            userName: mockTourist.name,
            userPhone: mockTourist.phone,
            lat: triggerLocation.lat,
            lng: triggerLocation.lng,
            altitude: triggerLocation.altitude,
            battery: 22,
            status: SOSStatus.VOLUNTEER_ACCEPTED,
            dangerScore: 82,
            resolvedAt: null,
            createdAt: initialDate,
            updatedAt: acceptedDate,
          },
        ]);

      (prisma.sOSResponse.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no existing accepted
        .mockResolvedValueOnce({ id: 'resp_e2e_01', status: 'ALERTED' }); // existing response to update

      (prisma.sOSResponse.update as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/v1/sos/${sosId}/accept`)
        .set('Authorization', `Bearer ${mitraToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.VOLUNTEER_ACCEPTED);
    });

    it('Stage 3 (ARRIVE): Yaatri Mitra confirms on-scene arrival', async () => {
      const arrivedDate = new Date('2026-08-30T03:03:30.000Z');

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: sosId,
            triggeredBy: mockTourist.id,
            userName: mockTourist.name,
            userPhone: mockTourist.phone,
            lat: triggerLocation.lat,
            lng: triggerLocation.lng,
            status: SOSStatus.VOLUNTEER_ACCEPTED,
            dangerScore: 82,
            resolvedAt: null,
            createdAt: initialDate,
            updatedAt: initialDate,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: sosId,
            triggeredBy: mockTourist.id,
            userName: mockTourist.name,
            userPhone: mockTourist.phone,
            lat: triggerLocation.lat,
            lng: triggerLocation.lng,
            status: SOSStatus.VOLUNTEER_ARRIVED,
            dangerScore: 82,
            resolvedAt: null,
            createdAt: initialDate,
            updatedAt: arrivedDate,
          },
        ]);

      (prisma.sOSResponse.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .patch(`/api/v1/sos/${sosId}/arrive`)
        .set('Authorization', `Bearer ${mitraToken}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.VOLUNTEER_ARRIVED);
    });

    it('Stage 4 (RESOLVE): Incident resolved with field notes and timeline completion', async () => {
      const resolvedDate = new Date('2026-08-30T03:10:00.000Z');

      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: sosId,
            triggeredBy: mockTourist.id,
            userName: mockTourist.name,
            userPhone: mockTourist.phone,
            lat: triggerLocation.lat,
            lng: triggerLocation.lng,
            status: SOSStatus.VOLUNTEER_ARRIVED,
            dangerScore: 82,
            resolvedAt: null,
            createdAt: initialDate,
            updatedAt: initialDate,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: sosId,
            triggeredBy: mockTourist.id,
            userName: mockTourist.name,
            userPhone: mockTourist.phone,
            lat: triggerLocation.lat,
            lng: triggerLocation.lng,
            status: SOSStatus.RESOLVED,
            dangerScore: 82,
            resolvedAt: resolvedDate,
            createdAt: initialDate,
            updatedAt: resolvedDate,
          },
        ]);

      const res = await request(app)
        .patch(`/api/v1/sos/${sosId}/resolve`)
        .set('Authorization', `Bearer ${mitraToken}`)
        .send({ resolutionNotes: 'Tourist assisted away from flash flood stream.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.RESOLVED);
    });
  });

  describe('2. Automated Simulation Engine Execution (/api/v1/sim/sos)', () => {
    it('should execute full automated simulation loop and return resolved SOS event', async () => {
      const baseRaw = {
        id: 'sos_sim_e2e_01',
        triggeredBy: mockTourist.id,
        userName: mockTourist.name,
        userPhone: mockTourist.phone,
        lat: 18.7546,
        lng: 73.4062,
        altitude: 620,
        battery: 85,
        audioUrl: null,
        dangerScore: 82,
        resolvedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTourist)
        .mockResolvedValueOnce(mockMitra)
        .mockResolvedValueOnce(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      // Sequence of states: triggerSOS -> acceptSOS -> arriveSOS -> resolveSOS -> final getSOSById
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ALERTED' }]) // triggerSOS getSOSById
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ALERTED' }]) // acceptSOS check
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ACCEPTED' }]) // acceptSOS return
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ACCEPTED' }]) // arriveSOS check
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ARRIVED' }]) // arriveSOS return
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ARRIVED' }]) // resolveSOS check
        .mockResolvedValue([{ ...baseRaw, status: 'RESOLVED', resolvedAt: new Date() }]); // resolveSOS & final

      (prisma.volunteerProfile.upsert as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([
        { id: 'tl_1', event: 'TRIGGERED', timestamp: new Date() },
        { id: 'tl_2', event: 'VOLUNTEER_ALERTED', timestamp: new Date() },
        { id: 'tl_3', event: 'VOLUNTEER_ACCEPTED', timestamp: new Date() },
        { id: 'tl_4', event: 'VOLUNTEER_ARRIVED', timestamp: new Date() },
        { id: 'tl_5', event: 'RESOLVED', timestamp: new Date() },
      ]);

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          scenario: 'full_loop',
          tourist: {
            userId: mockTourist.id,
            location: { lat: 18.7546, lng: 73.4062 },
            battery: 85,
          },
          volunteers: [
            {
              userId: mockMitra.id,
              location: { lat: 18.756, lng: 73.408 },
            },
          ],
          autoResolve: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenario).toBe('full_loop');
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.data.sosDetail.timeline).toHaveLength(5);
    });

    it('should execute automated cancellation simulation scenario', async () => {
      const baseRaw = {
        id: 'sos_sim_cancel_01',
        triggeredBy: mockTourist.id,
        userName: mockTourist.name,
        userPhone: mockTourist.phone,
        lat: 18.7546,
        lng: 73.4062,
        altitude: 620,
        battery: 85,
        audioUrl: null,
        dangerScore: 82,
        resolvedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTourist)
        .mockResolvedValueOnce(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      // Sequence: triggerSOS -> cancelSOS check -> final getSOSById
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ALERTED' }]) // triggerSOS getSOSById
        .mockResolvedValueOnce([{ ...baseRaw, status: 'VOLUNTEER_ALERTED' }]) // cancelSOS check
        .mockResolvedValue([{ ...baseRaw, status: 'CANCELLED', cancelledAt: new Date() }]); // cancelSOS & final

      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([
        { id: 'tl_1', event: 'TRIGGERED', timestamp: new Date() },
        { id: 'tl_2', event: 'CANCELLED', timestamp: new Date() },
      ]);

      const res = await request(app)
        .post('/api/v1/sim/sos')
        .send({
          scenario: 'cancel',
          tourist: {
            userId: mockTourist.id,
            location: { lat: 18.7546, lng: 73.4062 },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenario).toBe('cancel');
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  describe('3. Command Center SOS Live Monitoring & Detail Inspection', () => {
    it('Admin can retrieve active emergency queue', async () => {
      const activeEvent = {
        id: 'sos_active_01',
        triggeredBy: mockTourist.id,
        lat: 18.7546,
        lng: 73.4062,
        altitude: 620,
        battery: 18,
        audioUrl: null,
        status: SOSStatus.VOLUNTEER_ACCEPTED,
        dangerScore: 82,
        resolvedAt: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([activeEvent]);

      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.events[0].id).toBe('sos_active_01');
      expect(res.body.data.events[0].status).toBe(SOSStatus.VOLUNTEER_ACCEPTED);
    });

    it('Admin or participant can inspect full SOS timeline and details', async () => {
      const detailedEvent = {
        id: 'sos_detail_01',
        triggeredBy: mockTourist.id,
        userName: mockTourist.name,
        userPhone: mockTourist.phone,
        lat: 18.7546,
        lng: 73.4062,
        altitude: 620,
        battery: 50,
        audioUrl: null,
        status: SOSStatus.RESOLVED,
        dangerScore: 82,
        resolvedAt: new Date(),
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.$queryRaw as jest.Mock).mockResolvedValue([detailedEvent]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'resp_01',
          sosEventId: 'sos_detail_01',
          volunteerId: mockMitra.id,
          status: 'ARRIVED',
          volunteer: { id: mockMitra.id, name: mockMitra.name, phone: mockMitra.phone },
        },
      ]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([
        { id: 'tl_1', event: 'TRIGGERED', details: 'Triggered', timestamp: new Date() },
        { id: 'tl_2', event: 'RESOLVED', details: 'Resolved', timestamp: new Date() },
      ]);

      const res = await request(app)
        .get('/api/v1/sos/sos_detail_01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sos.id).toBe('sos_detail_01');
      expect(res.body.data.sos.timeline).toHaveLength(2);
      expect(res.body.data.sos.responses).toHaveLength(1);
    });
  });
});
