/**
 * Safe Yatra — Backend Spatial Server
 * Step 7.3: Master End-to-End (E2E) Offline SMS Fallback & Telecom Webhook Test Suite.
 *
 * Validates the OFFLINE-FIRST safety guarantee:
 * 1. Reception and parsing of ultra-compact (<60-char) SMS telemetry payloads.
 * 2. Automatic triggering of the emergency response state machine and Yaatri Mitra dispatch.
 * 3. Cross-module telemetry encoding parity between mobile client and backend gateway.
 */

import { SOSStatus, UserRole } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { prisma } from '../src/config/database';
import { errorHandler } from '../src/middleware/errorHandler';
import { dangerService } from '../src/modules/danger/danger.service';
import { sosMatcher } from '../src/modules/sos/sos.matcher';
import { sosRouter } from '../src/modules/sos/sos.routes';
import { sosSMSService } from '../src/modules/sos/sos.sms';
import { notificationDispatcher } from '../src/utils/notifications';

// Mock database
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    volunteerProfile: {
      updateMany: jest.fn(),
    },
    sOSEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
    sOSResponse: {
      create: jest.fn(),
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

describe('Step 7.3: Master End-to-End (E2E) Offline SMS Fallback Test Suite', () => {
  let app: express.Application;

  const mockTourist = {
    id: 'usr_tourist_sms_01',
    name: 'Neha Gupta',
    email: 'neha@tourist.safeyatra.in',
    phone: '+919876543230',
    role: UserRole.TOURIST,
    isActive: true,
  };

  const mockVolunteer = {
    userId: 'usr_mitra_sms_01',
    name: 'Suresh Patil (Mitra)',
    phone: '+919876543231',
    role: UserRole.YAATRI_MITRA,
    verificationStatus: 'VERIFIED',
    isOnDuty: true,
    rating: 4.8,
    totalResponses: 15,
    location: { lat: 18.756, lng: 73.408 },
    distanceMeters: 310,
    estimatedEtaSeconds: 140,
  };

  const mockSOSEventRaw = {
    id: 'sos_sms_event_01',
    triggeredBy: mockTourist.id,
    userName: mockTourist.name,
    userPhone: mockTourist.phone,
    lat: 18.7546,
    lng: 73.4062,
    altitude: null,
    battery: 22,
    audioUrl: null,
    status: 'VOLUNTEER_ALERTED',
    dangerScore: 78,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/v1/sos', sosRouter);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.sOSResponse.create as jest.Mock).mockResolvedValue({});
    (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});
    (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
    (prisma.volunteerProfile.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    (dangerService.getScoreForCoordinates as jest.Mock).mockResolvedValue({
      dangerScore: 78,
      tier: 'SEVERE',
      justification: 'High flash flood hazard at gorge approach.',
    });

    (sosMatcher.matchVolunteers as jest.Mock).mockResolvedValue({
      volunteerCount: 1,
      volunteers: [mockVolunteer],
      nearestVolunteer: mockVolunteer,
      nearestEtaSeconds: 140,
    });
  });

  describe('1. Inbound Telecom SMS Webhook Ingestion (/api/v1/sos/sms-webhook)', () => {
    it('should ingest compact Twilio SMS payload, trigger SOS event, and alert nearby volunteers', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockSOSEventRaw]);

      const smsPayload = 'SOS|LAT:18.7546|LNG:73.4062|BAT:22|UID:usr_tourist_sms_01';

      const res = await request(app)
        .post('/api/v1/sos/sms-webhook')
        .send({
          Body: smsPayload,
          From: '+919876543230',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsed.type).toBe('SOS');
      expect(res.body.data.parsed.lat).toBe(18.7546);
      expect(res.body.data.parsed.lng).toBe(73.4062);
      expect(res.body.data.parsed.battery).toBe(22);
      expect(res.body.data.parsed.userId).toBe('usr_tourist_sms_01');
      expect(res.body.data.triggered).toBe(true);
      expect(res.body.data.sosEvent.id).toBe('sos_sms_event_01');
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.VOLUNTEER_ALERTED);

      // Verify volunteer matcher and push notification dispatched
      expect(sosMatcher.matchVolunteers).toHaveBeenCalledWith(18.7546, 73.4062, 5000, 10);
      expect(notificationDispatcher.sendSOSPushToVolunteers).toHaveBeenCalled();
    });

    it('should support lowercase body field for generic telecom gateways (MSG91 / custom relays)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockSOSEventRaw]);

      const res = await request(app)
        .post('/api/v1/sos/sms-webhook')
        .send({
          body: 'SOS|LAT:18.7546|LNG:73.4062|BAT:22|UID:usr_tourist_sms_01',
          from: '+919876543230',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.triggered).toBe(true);
      expect(res.body.data.parsed.lat).toBe(18.7546);
    });

    it('should parse anonymous telemetry payload when userId is omitted without unhandled error', async () => {
      const res = await request(app)
        .post('/api/v1/sos/sms-webhook')
        .send({
          Body: 'SOS|LAT:18.7546|LNG:73.4062|BAT:15',
          From: '+919876543230',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsed.lat).toBe(18.7546);
      expect(res.body.data.parsed.lng).toBe(73.4062);
      expect(res.body.data.parsed.battery).toBe(15);
      expect(res.body.data.parsed.userId).toBeUndefined();
      expect(res.body.data.triggered).toBe(false); // cannot auto-trigger without userId
    });

    it('should return 400 VALIDATION_ERROR when both Body and body fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/sos/sms-webhook')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Cross-Module Telemetry Encoding Parity', () => {
    it('should verify encoder output string is under 60 characters and fully round-trips through parser', () => {
      const lat = 18.75461;
      const lng = 73.40623;
      const battery = 85;
      const userId = 'usr_tourist_01';

      // 1. Encode payload
      const encoded = sosSMSService.encodeSOSPayload(lat, lng, battery, userId);

      // Verify compact length standard (< 60 chars)
      expect(encoded.length).toBeLessThan(60);
      expect(encoded).toBe('SOS|LAT:18.754610|LNG:73.406230|BAT:85|UID:usr_tourist_01');

      // 2. Decode payload via parser
      const parsed = sosSMSService.parseSOSPayload(encoded);

      expect(parsed.type).toBe('SOS');
      expect(parsed.lat).toBeCloseTo(lat, 4);
      expect(parsed.lng).toBeCloseTo(lng, 4);
      expect(parsed.battery).toBe(85);
      expect(parsed.userId).toBe('usr_tourist_01');
    });

    it('should reject invalid coordinates during encoding with 400 INVALID_COORDINATES', () => {
      expect(() => {
        sosSMSService.encodeSOSPayload(105.0, 73.4062);
      }).toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_COORDINATES',
        })
      );
    });
  });
});
