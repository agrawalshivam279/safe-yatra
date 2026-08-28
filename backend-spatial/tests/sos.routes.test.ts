/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for SOS Emergency REST Endpoints (Step 4.9c).
 */

import { SOSStatus, UserRole } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../src/middleware/errorHandler';
import { authService } from '../src/modules/auth/auth.service';
import { sosRouter } from '../src/modules/sos/sos.routes';
import { sosService } from '../src/modules/sos/sos.service';
import { sosSMSService } from '../src/modules/sos/sos.sms';
import { AppError } from '../src/utils/response';

// Mock Services
jest.mock('../src/modules/sos/sos.service', () => ({
  sosService: {
    triggerSOS: jest.fn(),
    acceptSOS: jest.fn(),
    arriveSOS: jest.fn(),
    resolveSOS: jest.fn(),
    cancelSOS: jest.fn(),
    getActiveSOSEvents: jest.fn(),
    getSOSById: jest.fn(),
  },
}));

jest.mock('../src/modules/sos/sos.sms', () => ({
  sosSMSService: {
    parseSOSPayload: jest.fn(),
  },
}));

describe('SOS REST API Routes (Step 4.9c)', () => {
  let app: express.Application;
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  let touristToken: string;
  let mitraToken: string;
  let adminToken: string;

  const mockSOSEvent = {
    id: 'sos_01',
    triggeredBy: 'usr_tourist_01',
    lat: 18.7546,
    lng: 73.4062,
    altitude: 620,
    battery: 45,
    audioUrl: 'https://storage.safeyatra.in/audio/01.aac',
    status: SOSStatus.VOLUNTEER_ALERTED,
    dangerScore: 75,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/sos', sosRouter);
    app.use(errorHandler);

    touristToken = authService.generateTokens({
      id: 'usr_tourist_01',
      email: 'tourist@safeyatra.in',
      role: UserRole.TOURIST,
    }).accessToken;

    mitraToken = authService.generateTokens({
      id: 'mitra_01',
      email: 'mitra@safeyatra.in',
      role: UserRole.YAATRI_MITRA,
    }).accessToken;

    adminToken = authService.generateTokens({
      id: 'usr_admin_01',
      email: 'admin@safeyatra.in',
      role: UserRole.ADMIN,
    }).accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/sos/trigger', () => {
    it('should return 401 when authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .send({ lat: 18.7546, lng: 73.4062 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when invalid coordinates are provided', async () => {
      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ lat: 95.0, lng: 73.4062 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 201 and trigger SOS successfully', async () => {
      (sosService.triggerSOS as jest.Mock).mockResolvedValue({
        sosEvent: mockSOSEvent,
        matchResult: {
          volunteerCount: 1,
          volunteers: [],
          nearestEtaSeconds: 120,
        },
      });

      const res = await request(app)
        .post('/api/v1/sos/trigger')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({
          lat: 18.7546,
          lng: 73.4062,
          altitude: 620,
          battery: 45,
          audioUrl: 'https://storage.safeyatra.in/audio/01.aac',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sosEvent.id).toBe('sos_01');
      expect(res.body.data.matchResult.volunteerCount).toBe(1);
    });
  });

  describe('GET /api/v1/sos/active', () => {
    it('should return 401 when unauthorized', async () => {
      const res = await request(app).get('/api/v1/sos/active');
      expect(res.status).toBe(401);
    });

    it('should return 403 when accessed by TOURIST role', async () => {
      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 200 and list active SOS events for YAATRI_MITRA', async () => {
      (sosService.getActiveSOSEvents as jest.Mock).mockResolvedValue([mockSOSEvent]);

      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${mitraToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.count).toBe(1);
    });

    it('should return 200 for ADMIN role', async () => {
      (sosService.getActiveSOSEvents as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/sos/active')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.events).toEqual([]);
    });
  });

  describe('GET /api/v1/sos/:id', () => {
    it('should return 404 when SOS event not found', async () => {
      (sosService.getSOSById as jest.Mock).mockRejectedValue(
        new AppError('SOS event not found', 404, 'SOS_NOT_FOUND')
      );

      const res = await request(app)
        .get('/api/v1/sos/missing_sos')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SOS_NOT_FOUND');
    });

    it('should return 200 with SOS event detail', async () => {
      (sosService.getSOSById as jest.Mock).mockResolvedValue(mockSOSEvent);

      const res = await request(app)
        .get('/api/v1/sos/sos_01')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sos.id).toBe('sos_01');
    });
  });

  describe('PATCH /api/v1/sos/:id/accept', () => {
    it('should return 403 when called by TOURIST role', async () => {
      const res = await request(app)
        .patch('/api/v1/sos/sos_01/accept')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 409 when SOS is already accepted by another responder', async () => {
      (sosService.acceptSOS as jest.Mock).mockRejectedValue(
        new AppError('This SOS has already been accepted by another responder', 409, 'SOS_ALREADY_ACCEPTED')
      );

      const res = await request(app)
        .patch('/api/v1/sos/sos_01/accept')
        .set('Authorization', `Bearer ${mitraToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SOS_ALREADY_ACCEPTED');
    });

    it('should return 200 when accepted by YAATRI_MITRA', async () => {
      (sosService.acceptSOS as jest.Mock).mockResolvedValue({
        ...mockSOSEvent,
        status: SOSStatus.VOLUNTEER_ACCEPTED,
      });

      const res = await request(app)
        .patch('/api/v1/sos/sos_01/accept')
        .set('Authorization', `Bearer ${mitraToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.VOLUNTEER_ACCEPTED);
    });
  });

  describe('PATCH /api/v1/sos/:id/arrive', () => {
    it('should return 403 when called by TOURIST', async () => {
      const res = await request(app)
        .patch('/api/v1/sos/sos_01/arrive')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 200 when marked arrived by responder', async () => {
      (sosService.arriveSOS as jest.Mock).mockResolvedValue({
        ...mockSOSEvent,
        status: SOSStatus.VOLUNTEER_ARRIVED,
      });

      const res = await request(app)
        .patch('/api/v1/sos/sos_01/arrive')
        .set('Authorization', `Bearer ${mitraToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.VOLUNTEER_ARRIVED);
    });
  });

  describe('PATCH /api/v1/sos/:id/resolve', () => {
    it('should return 403 when called by TOURIST', async () => {
      const res = await request(app)
        .patch('/api/v1/sos/sos_01/resolve')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ resolutionNotes: 'Escorted to safety' });

      expect(res.status).toBe(403);
    });

    it('should return 200 when resolved by volunteer or admin', async () => {
      (sosService.resolveSOS as jest.Mock).mockResolvedValue({
        ...mockSOSEvent,
        status: SOSStatus.RESOLVED,
      });

      const res = await request(app)
        .patch('/api/v1/sos/sos_01/resolve')
        .set('Authorization', `Bearer ${mitraToken}`)
        .send({ resolutionNotes: 'Tourist escorted safely' });

      expect(res.status).toBe(200);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.RESOLVED);
    });
  });

  describe('PATCH /api/v1/sos/:id/cancel', () => {
    it('should return 200 when cancelled by user', async () => {
      (sosService.cancelSOS as jest.Mock).mockResolvedValue({
        ...mockSOSEvent,
        status: SOSStatus.CANCELLED,
      });

      const res = await request(app)
        .patch('/api/v1/sos/sos_01/cancel')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ reason: 'Accidental trigger' });

      expect(res.status).toBe(200);
      expect(res.body.data.sosEvent.status).toBe(SOSStatus.CANCELLED);
    });
  });

  describe('POST /api/v1/sos/sms-webhook', () => {
    it('should return 400 when body payload is missing', async () => {
      const res = await request(app)
        .post('/api/v1/sos/sms-webhook')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 and parse inbound SMS emergency webhook', async () => {
      (sosSMSService.parseSOSPayload as jest.Mock).mockReturnValue({
        type: 'SOS',
        lat: 18.7546,
        lng: 73.4062,
        battery: 35,
        userId: 'usr_tourist_01',
      });
      (sosService.triggerSOS as jest.Mock).mockResolvedValue({
        sosEvent: mockSOSEvent,
        matchResult: { volunteerCount: 1, volunteers: [] },
      });

      const res = await request(app)
        .post('/api/v1/sos/sms-webhook')
        .send({
          Body: 'SOS|LAT:18.7546|LNG:73.4062|BAT:35|UID:usr_tourist_01',
          From: '+919876543210',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsed.lat).toBe(18.7546);
      expect(res.body.data.triggered).toBe(true);
    });
  });
});
