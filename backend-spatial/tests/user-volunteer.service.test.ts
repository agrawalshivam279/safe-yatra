/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for User & Volunteer Services (Profile management & PostGIS Spatial Matching).
 */

import { userService } from '../src/modules/user/user.service';
import { volunteerService } from '../src/modules/volunteer/volunteer.service';
import { prisma } from '../src/config/database';
import { UserRole, VerificationStatus } from '@prisma/client';

// Mock Prisma client methods
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    volunteerProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

describe('User & Volunteer Services (user.service.ts & volunteer.service.ts)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockUserRecord = {
    id: 'user_01',
    email: 'user@safeyatra.in',
    passwordHash: 'hashed_password',
    name: 'Sunil Gavaskar',
    phone: '+919876543210',
    role: 'YAATRI_MITRA' as UserRole,
    profileImageUrl: 'https://example.com/avatar.jpg',
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    volunteerProfile: {
      id: 'vol_01',
      userId: 'user_01',
      aadharNumber: '1234-5678-9012',
      verificationStatus: 'VERIFIED' as VerificationStatus,
      isOnDuty: true,
      totalResponses: 15,
      avgResponseTime: 180,
      rating: 4.9,
      createdAt: mockDate,
      updatedAt: mockDate,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UserService', () => {
    it('getUserById should return sanitized user profile with volunteerProfile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const user = await userService.getUserById('user_01');
      expect(user.id).toBe('user_01');
      expect(user.name).toBe('Sunil Gavaskar');
      expect((user as any).passwordHash).toBeUndefined();
      expect(user.volunteerProfile?.isOnDuty).toBe(true);
    });

    it('getUserById should throw 404 USER_NOT_FOUND when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(userService.getUserById('non_existent')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        })
      );
    });

    it('updateProfile should update user name and phone number', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // phone uniqueness check
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        name: 'Sunil G. Gavaskar',
        phone: '+919999988888',
      });

      const updated = await userService.updateProfile('user_01', {
        name: 'Sunil G. Gavaskar',
        phone: '+919999988888',
      });

      expect(updated.name).toBe('Sunil G. Gavaskar');
      expect(updated.phone).toBe('+919999988888');
    });

    it('updateProfile should throw 409 PHONE_EXISTS if phone belongs to another user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        id: 'different_user_id',
      });

      await expect(
        userService.updateProfile('user_01', {
          phone: '+919876543210',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'PHONE_EXISTS',
        })
      );
    });

    it('deleteAccount should deactivate the user account', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        isActive: false,
      });

      await userService.deleteAccount('user_01');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_01' },
        data: { isActive: false },
      });
    });
  });

  describe('VolunteerService', () => {
    it('registerVolunteer should upsert a VolunteerProfile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);
      (prisma.volunteerProfile.upsert as jest.Mock).mockResolvedValue(
        mockUserRecord.volunteerProfile
      );

      const profile = await volunteerService.registerVolunteer(
        'user_01',
        '1234-5678-9012'
      );
      expect(profile.userId).toBe('user_01');
      expect(profile.aadharNumber).toBe('1234-5678-9012');
    });

    it('toggleDutyStatus should flip isOnDuty', async () => {
      (prisma.volunteerProfile.findUnique as jest.Mock).mockResolvedValue(
        mockUserRecord.volunteerProfile
      );
      (prisma.volunteerProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserRecord.volunteerProfile,
        isOnDuty: false,
      });

      const updated = await volunteerService.toggleDutyStatus('user_01');
      expect(updated.isOnDuty).toBe(false);
      expect(prisma.volunteerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user_01' },
        data: { isOnDuty: false },
      });
    });

    it('toggleDutyStatus should set explicit isOnDuty when provided', async () => {
      (prisma.volunteerProfile.findUnique as jest.Mock).mockResolvedValue(
        mockUserRecord.volunteerProfile
      );
      (prisma.volunteerProfile.update as jest.Mock).mockResolvedValue({
        ...mockUserRecord.volunteerProfile,
        isOnDuty: true,
      });

      const updated = await volunteerService.toggleDutyStatus('user_01', true);
      expect(updated.isOnDuty).toBe(true);
      expect(prisma.volunteerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user_01' },
        data: { isOnDuty: true },
      });
    });

    it('recordLocation should insert PostGIS point geometry', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'loc_01', timestamp: mockDate },
      ]);

      const result = await volunteerService.recordLocation({
        userId: 'user_01',
        lat: 18.7546,
        lng: 73.4062,
        altitude: 620.5,
        battery: 85,
      });

      expect(result.id).toBe('loc_01');
      expect(result.timestamp).toEqual(mockDate);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('recordLocation should reject out-of-bounds coordinates', async () => {
      await expect(
        volunteerService.recordLocation({
          userId: 'user_01',
          lat: 120, // out of range
          lng: 73.4062,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_COORDINATES',
        })
      );
    });

    it('findNearbyVolunteers should execute spatial query and return sorted list with ETA', async () => {
      const mockRawNearby = [
        {
          userId: 'vol_user_1',
          name: 'Pooja Patil',
          phone: '+919876543201',
          role: 'YAATRI_MITRA',
          verificationStatus: 'VERIFIED',
          isOnDuty: true,
          rating: 4.8,
          totalResponses: 12,
          lat: 18.755,
          lng: 73.407,
          altitude: 620,
          battery: 90,
          lastPing: mockDate,
          distanceMeters: 240.5,
        },
        {
          userId: 'vol_user_2',
          name: 'Rahul Deshmukh',
          phone: '+919876543202',
          role: 'YAATRI_MITRA',
          verificationStatus: 'VERIFIED',
          isOnDuty: true,
          rating: 5.0,
          totalResponses: 25,
          lat: 18.76,
          lng: 73.41,
          altitude: 630,
          battery: 75,
          lastPing: mockDate,
          distanceMeters: 850.0,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockRawNearby);

      const volunteers = await volunteerService.findNearbyVolunteers(
        18.7546,
        73.4062,
        5000
      );

      expect(volunteers.length).toBe(2);
      expect(volunteers[0].userId).toBe('vol_user_1');
      expect(volunteers[0].distanceMeters).toBe(240.5);
      // ETA: 240.5 / 4.0 + 60 = 60.125 + 60 = 120s
      expect(volunteers[0].estimatedEtaSeconds).toBe(120);

      expect(volunteers[1].userId).toBe('vol_user_2');
      expect(volunteers[1].distanceMeters).toBe(850.0);
      // ETA: 850.0 / 4.0 + 60 = 212.5 + 60 = 273s
      expect(volunteers[1].estimatedEtaSeconds).toBe(273);
    });

    it('findNearbyVolunteers should reject invalid coordinates', async () => {
      await expect(
        volunteerService.findNearbyVolunteers(100, 73.4062)
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'INVALID_COORDINATES',
        })
      );
    });
  });
});
