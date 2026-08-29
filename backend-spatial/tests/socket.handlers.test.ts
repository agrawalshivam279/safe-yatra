/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for WebSocket Event Handlers (Step 4.10b).
 */

import { SOSStatus, UserRole } from '@prisma/client';
import { createServer, Server as HTTPServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient } from 'socket.io-client';
import { authService } from '../src/modules/auth/auth.service';
import { geofenceService } from '../src/modules/geofence/geofence.service';
import { SOSEntity, SOSMatchResult } from '../src/modules/sos/sos.types';
import { volunteerService } from '../src/modules/volunteer/volunteer.service';
import { broadcastDangerScoreUpdate } from '../src/websocket/handlers/dangerAlerts';
import {
  broadcastSOSAccepted,
  broadcastSOSArrived,
  broadcastSOSCancelled,
  broadcastSOSResolved,
  broadcastSOSTriggered,
} from '../src/websocket/handlers/sosEvents';
import {
  closeSocketServer,
  getIO,
  initSocketServer,
} from '../src/websocket/socketServer';

// Mock Services
jest.mock('../src/modules/volunteer/volunteer.service', () => ({
  volunteerService: {
    recordLocation: jest.fn(),
  },
}));

jest.mock('../src/modules/geofence/geofence.service', () => ({
  geofenceService: {
    checkPoint: jest.fn(),
  },
}));

describe('WebSocket Event Handlers (Step 4.10b)', () => {
  let httpServer: HTTPServer;
  let serverPort: number;
  let touristToken: string;
  let mitraToken: string;
  let adminToken: string;

  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockSOSEvent: SOSEntity = {
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

  const mockMatchResult: SOSMatchResult = {
    volunteerCount: 1,
    volunteers: [
      {
        userId: 'usr_mitra_01',
        name: 'Ramesh Patel',
        phone: '+919876543210',
        role: UserRole.YAATRI_MITRA,
        verificationStatus: 'VERIFIED' as any,
        isOnDuty: true,
        rating: 4.9,
        totalResponses: 10,
        location: {
          lat: 18.756,
          lng: 73.407,
          altitude: 610,
          battery: 85,
          lastPing: mockDate,
        },
        distanceMeters: 250,
        estimatedEtaSeconds: 122,
      },
    ],
    nearestVolunteer: undefined,
    nearestEtaSeconds: 122,
  };

  beforeAll((done) => {
    httpServer = createServer();
    initSocketServer(httpServer);

    httpServer.listen(0, () => {
      const address = httpServer.address() as AddressInfo;
      serverPort = address.port;
      done();
    });

    touristToken = authService.generateTokens({
      id: 'usr_tourist_01',
      email: 'tourist@safeyatra.in',
      role: UserRole.TOURIST,
    }).accessToken;

    mitraToken = authService.generateTokens({
      id: 'usr_mitra_01',
      email: 'mitra@safeyatra.in',
      role: UserRole.YAATRI_MITRA,
    }).accessToken;

    adminToken = authService.generateTokens({
      id: 'usr_admin_01',
      email: 'admin@safeyatra.in',
      role: UserRole.ADMIN,
    }).accessToken;
  });

  afterAll(async () => {
    await closeSocketServer();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location Streaming & Geofence Breaches (locationUpdate.ts)', () => {
    it('should reject invalid coordinates in location:update', (done) => {
      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        client.emit('location:update', { lat: 100, lng: 73.40 }, (ack: { success: boolean; error?: string }) => {
          expect(ack.success).toBe(false);
          expect(ack.error).toMatch(/Invalid coordinate bounds/);
          client.disconnect();
          done();
        });
      });
    });

    it('should record location and emit geofence:alert when inside geofence', (done) => {
      (volunteerService.recordLocation as jest.Mock).mockResolvedValue({
        id: 'loc_01',
        timestamp: new Date(),
      });
      (geofenceService.checkPoint as jest.Mock).mockResolvedValue({
        inside: true,
        breachedGeofences: [
          {
            id: 'gf_01',
            name: 'Bhushi Dam Danger Zone',
            type: 'AUTO_DANGER',
            severity: 'CRITICAL',
            message: 'Evacuate immediately!',
          },
        ],
        approachingGeofences: [],
      });

      const client = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect', () => {
        client.on('geofence:alert', (alert: { type: string; breachedGeofences: any[] }) => {
          expect(alert.type).toBe('INSIDE_GEOFENCE');
          expect(alert.breachedGeofences).toHaveLength(1);
          expect(alert.breachedGeofences[0].name).toBe('Bhushi Dam Danger Zone');
          client.disconnect();
          done();
        });

        client.emit('location:update', {
          lat: 18.7546,
          lng: 73.4062,
          altitude: 620,
          battery: 88,
        });
      });
    });
  });

  describe('SOS Lifecycle Event Broadcasters (sosEvents.ts)', () => {
    it('should broadcast sos:triggered to volunteers and admins, and sos:assigned to matched responders', (done) => {
      const mitraClient = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: mitraToken },
        transports: ['websocket'],
        reconnection: false,
      });

      let triggeredReceived = false;
      let assignedReceived = false;

      const checkDone = () => {
        if (triggeredReceived && assignedReceived) {
          mitraClient.disconnect();
          done();
        }
      };

      mitraClient.on('connect', () => {
        mitraClient.on('sos:triggered', (payload: { sosEvent: SOSEntity }) => {
          expect(payload.sosEvent.id).toBe('sos_01');
          triggeredReceived = true;
          checkDone();
        });

        mitraClient.on('sos:assigned', (payload: { sosId: string; distanceMeters: number }) => {
          expect(payload.sosId).toBe('sos_01');
          expect(payload.distanceMeters).toBe(250);
          assignedReceived = true;
          checkDone();
        });

        setTimeout(() => {
          broadcastSOSTriggered(getIO(), mockSOSEvent, mockMatchResult);
        }, 50);
      });
    });

    it('should broadcast sos:accepted to tourist and admin', (done) => {
      const touristClient = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      touristClient.on('connect', () => {
        touristClient.on('sos:accepted', (payload: { sosEvent: SOSEntity; volunteer?: any }) => {
          expect(payload.sosEvent.id).toBe('sos_01');
          expect(payload.volunteer.name).toBe('Ramesh Patel');
          touristClient.disconnect();
          done();
        });

        setTimeout(() => {
          broadcastSOSAccepted(getIO(), mockSOSEvent, {
            id: 'usr_mitra_01',
            name: 'Ramesh Patel',
            phone: '+919876543210',
          });
        }, 50);
      });
    });

    it('should broadcast sos:arrived to tourist', (done) => {
      const touristClient = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      touristClient.on('connect', () => {
        touristClient.on('sos:arrived', (payload: { sosEvent: SOSEntity }) => {
          expect(payload.sosEvent.id).toBe('sos_01');
          touristClient.disconnect();
          done();
        });

        setTimeout(() => {
          broadcastSOSArrived(getIO(), mockSOSEvent);
        }, 50);
      });
    });

    it('should broadcast sos:resolved to tourist', (done) => {
      const touristClient = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      touristClient.on('connect', () => {
        touristClient.on('sos:resolved', (payload: { sosEvent: SOSEntity }) => {
          expect(payload.sosEvent.id).toBe('sos_01');
          touristClient.disconnect();
          done();
        });

        setTimeout(() => {
          broadcastSOSResolved(getIO(), mockSOSEvent);
        }, 50);
      });
    });

    it('should broadcast sos:cancelled to role rooms', (done) => {
      const adminClient = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: adminToken },
        transports: ['websocket'],
        reconnection: false,
      });

      adminClient.on('connect', () => {
        adminClient.on('sos:cancelled', (payload: { sosEvent: SOSEntity }) => {
          expect(payload.sosEvent.id).toBe('sos_01');
          adminClient.disconnect();
          done();
        });

        setTimeout(() => {
          broadcastSOSCancelled(getIO(), mockSOSEvent);
        }, 50);
      });
    });
  });

  describe('Danger Alerts Broadcaster (dangerAlerts.ts)', () => {
    it('should broadcast danger:score_update to subscribed zone clients and admins', (done) => {
      const touristClient = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: touristToken },
        transports: ['websocket'],
        reconnection: false,
      });

      touristClient.on('connect', () => {
        touristClient.emit('zone:join', { zoneId: 'zone_lonavala_01' });

        setTimeout(() => {
          touristClient.on('danger:score_update', (data: { zoneId: string; dangerScore: number; tier: string }) => {
            expect(data.zoneId).toBe('zone_lonavala_01');
            expect(data.dangerScore).toBe(88);
            expect(data.tier).toBe('CRITICAL');
            touristClient.disconnect();
            done();
          });

          broadcastDangerScoreUpdate(getIO(), 'zone_lonavala_01', {
            zoneId: 'zone_lonavala_01',
            dangerScore: 88,
            tier: 'CRITICAL',
            justification: 'High flash flood warning',
          });
        }, 50);
      });
    });
  });
});
