/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for SOS Emergency Service & State Transitions (Step 4.9b).
 */

import { SOSStatus, UserRole, VerificationStatus } from '@prisma/client';
import { prisma } from '../src/config/database';
import { dangerService } from '../src/modules/danger/danger.service';
import { sosMatcher } from '../src/modules/sos/sos.matcher';
import { sosService } from '../src/modules/sos/sos.service';

// Mock Dependencies
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    sOSEvent: {
      update: jest.fn(),
    },
    sOSResponse: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    sOSTimeline: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    volunteerProfile: {
      updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../src/modules/danger/danger.service', () => ({
  dangerService: {
    getScoreForCoordinates: jest.fn(),
  },
}));

jest.mock('../src/modules/sos/sos.matcher', () => ({
  sosMatcher: {
    matchVolunteers: jest.fn(),
  },
}));

describe('SOS Emergency Service & State Transitions (Step 4.9b)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockUser = {
    id: 'usr_tourist_01',
    name: 'Ananya Sharma',
    phone: '+919876543210',
    email: 'ananya@safeyatra.in',
    role: UserRole.TOURIST,
    isActive: true,
  };

  const mockRawSOSEvent = {
    id: 'sos_event_01',
    triggeredBy: 'usr_tourist_01',
    userName: 'Ananya Sharma',
    userPhone: '+919876543210',
    lat: 18.7546,
    lng: 73.4062,
    altitude: 620,
    battery: 45,
    audioUrl: 'https://storage.safeyatra.in/audio/sos_01.aac',
    status: 'TRIGGERED',
    dangerScore: 78,
    resolvedAt: null,
    cancelledAt: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockVolunteers = [
    {
      userId: 'mitra_01',
      name: 'Ramesh Patel',
      phone: '+919876543211',
      role: UserRole.YAATRI_MITRA,
      verificationStatus: VerificationStatus.VERIFIED,
      isOnDuty: true,
      rating: 4.9,
      totalResponses: 12,
      location: {
        lat: 18.756,
        lng: 73.407,
        altitude: 610,
        battery: 80,
        lastPing: mockDate,
      },
      distanceMeters: 250,
      estimatedEtaSeconds: 122,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerSOS', () => {
    it('should create SOS event, capture danger score, log timeline, and alert matched volunteers', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (dangerService.getScoreForCoordinates as jest.Mock).mockResolvedValue({
        dangerScore: 78,
      });
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});
      (sosMatcher.matchVolunteers as jest.Mock).mockResolvedValue({
        volunteerCount: 1,
        volunteers: mockVolunteers,
        nearestVolunteer: mockVolunteers[0],
        nearestEtaSeconds: 122,
      });
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSResponse.create as jest.Mock).mockResolvedValue({});
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawSOSEvent]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sosService.triggerSOS({
        userId: 'usr_tourist_01',
        lat: 18.7546,
        lng: 73.4062,
        altitude: 620,
        battery: 45,
        audioUrl: 'https://storage.safeyatra.in/audio/sos_01.aac',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'usr_tourist_01' } });
      expect(dangerService.getScoreForCoordinates).toHaveBeenCalledWith(18.7546, 73.4062);
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(sosMatcher.matchVolunteers).toHaveBeenCalledWith(18.7546, 73.4062, 5000, 10);
      expect(prisma.sOSEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: SOSStatus.VOLUNTEER_ALERTED },
        })
      );
      expect(result.sosEvent.id).toBe('sos_event_01');
      expect(result.matchResult.volunteerCount).toBe(1);
    });

    it('should reject invalid coordinates with 400 INVALID_COORDINATES', async () => {
      await expect(
        sosService.triggerSOS({
          userId: 'usr_tourist_01',
          lat: 95.0,
          lng: 73.4062,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_COORDINATES',
        })
      );
    });

    it('should reject non-existent user with 404 USER_NOT_FOUND', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        sosService.triggerSOS({
          userId: 'missing_user',
          lat: 18.7546,
          lng: 73.4062,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        })
      );
    });
  });

  describe('acceptSOS', () => {
    it('should update SOSResponse to ACCEPTED, update SOSEvent status, and increment volunteer count', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'VOLUNTEER_ALERTED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSResponse.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // no existing accepted
        .mockResolvedValueOnce({ id: 'resp_01', status: 'ALERTED' }); // existing response to update
      (prisma.sOSResponse.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.volunteerProfile.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const result = await sosService.acceptSOS('sos_event_01', 'mitra_01');

      expect(prisma.sOSEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: SOSStatus.VOLUNTEER_ACCEPTED },
        })
      );
      expect(prisma.volunteerProfile.updateMany).toHaveBeenCalledWith({
        where: { userId: 'mitra_01' },
        data: { totalResponses: { increment: 1 } },
      });
      expect(result.id).toBe('sos_event_01');
    });

    it('should reject acceptance if already accepted by another responder (409)', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'VOLUNTEER_ACCEPTED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSResponse.findFirst as jest.Mock).mockResolvedValue({
        id: 'resp_other',
        volunteerId: 'mitra_other',
        status: 'ACCEPTED',
      });

      await expect(
        sosService.acceptSOS('sos_event_01', 'mitra_01')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'SOS_ALREADY_ACCEPTED',
        })
      );
    });

    it('should reject acceptance on terminal state (400)', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'RESOLVED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        sosService.acceptSOS('sos_event_01', 'mitra_01')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_SOS_STATE',
        })
      );
    });
  });

  describe('arriveSOS', () => {
    it('should update response to ARRIVED and SOSEvent status to VOLUNTEER_ARRIVED', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'VOLUNTEER_ACCEPTED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSResponse.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const result = await sosService.arriveSOS('sos_event_01', 'mitra_01');

      expect(prisma.sOSResponse.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sosEventId: 'sos_event_01', volunteerId: 'mitra_01' },
          data: expect.objectContaining({ status: 'ARRIVED' }),
        })
      );
      expect(prisma.sOSEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: SOSStatus.VOLUNTEER_ARRIVED },
        })
      );
      expect(result.id).toBe('sos_event_01');
    });
  });

  describe('resolveSOS', () => {
    it('should mark SOS as RESOLVED and set resolvedAt timestamp', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'VOLUNTEER_ARRIVED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const result = await sosService.resolveSOS(
        'sos_event_01',
        'mitra_01',
        'Tourist safely escorted to medical camp'
      );

      expect(prisma.sOSEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SOSStatus.RESOLVED,
          }),
        })
      );
      expect(result.id).toBe('sos_event_01');
    });

    it('should be idempotent if already resolved', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'RESOLVED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);

      const result = await sosService.resolveSOS('sos_event_01');
      expect(result.status).toBe('RESOLVED');
      expect(prisma.sOSEvent.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelSOS', () => {
    it('should cancel active SOS and log cancellation timeline', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawSOSEvent]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSEvent.update as jest.Mock).mockResolvedValue({});
      (prisma.sOSTimeline.create as jest.Mock).mockResolvedValue({});

      const result = await sosService.cancelSOS(
        'sos_event_01',
        'usr_tourist_01',
        'Triggered accidentally'
      );

      expect(prisma.sOSEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SOSStatus.CANCELLED,
          }),
        })
      );
      expect(result.id).toBe('sos_event_01');
    });

    it('should reject cancelling an already completed SOS', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        {
          ...mockRawSOSEvent,
          status: 'RESOLVED',
        },
      ]);
      (prisma.sOSResponse.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sOSTimeline.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        sosService.cancelSOS('sos_event_01', 'usr_tourist_01')
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_SOS_STATE',
        })
      );
    });
  });

  describe('getSOSById', () => {
    it('should throw 404 SOS_NOT_FOUND when SOS does not exist', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await expect(sosService.getSOSById('missing_sos')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'SOS_NOT_FOUND',
        })
      );
    });
  });

  describe('getActiveSOSEvents', () => {
    it('should return list of active SOS events', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([mockRawSOSEvent]);

      const events = await sosService.getActiveSOSEvents(20);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('sos_event_01');
      expect(events[0].lat).toBe(18.7546);
    });
  });
});
