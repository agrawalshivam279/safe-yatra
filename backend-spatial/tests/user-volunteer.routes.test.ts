/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for User & Volunteer Routes (/api/v1/users & /api/v1/volunteers).
 */

import request from 'supertest';
import { app } from '../src/index';
import { authService } from '../src/modules/auth/auth.service';
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

describe('User & Volunteer Routes (/api/v1/users & /api/v1/volunteers)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockTourist = {
    id: 'tourist_user_01',
    email: 'tourist@safeyatra.in',
    passwordHash: 'hash',
    name: 'Aarav Patel',
    phone: '+919876543210',
    role: 'TOURIST' as UserRole,
    profileImageUrl: null,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    volunteerProfile: null,
  };

  const mockVolunteer = {
    id: 'volunteer_user_01',
    email: 'mitra@safeyatra.in',
    passwordHash: 'hash',
    name: 'Vikram Shinde',
    phone: '+919876543222',
    role: 'YAATRI_MITRA' as UserRole,
    profileImageUrl: null,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    volunteerProfile: {
      id: 'vol_profile_01',
      userId: 'volunteer_user_01',
      aadharNumber: '1234-5678-9012',
      verificationStatus: 'VERIFIED' as VerificationStatus,
      isOnDuty: true,
      totalResponses: 10,
      avgResponseTime: 120,
      rating: 4.9,
      createdAt: mockDate,
      updatedAt: mockDate,
    },
  };

  let touristToken: string;
  let volunteerToken: string;

  beforeAll(() => {
    const touristTokens = authService.generateTokens({
      id: mockTourist.id,
      email: mockTourist.email,
      role: mockTourist.role,
    });
    touristToken = touristTokens.accessToken;

    const volunteerTokens = authService.generateTokens({
      id: mockVolunteer.id,
      email: mockVolunteer.email,
      role: mockVolunteer.role,
    });
    volunteerToken = volunteerTokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Endpoints (/api/v1/users)', () => {
    it('GET /api/v1/users/me should return authenticated user profile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(mockTourist.id);
      expect(res.body.data.user.name).toBe(mockTourist.name);
    });

    it('PATCH /api/v1/users/profile should update user details', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockTourist,
        name: 'Aarav N. Patel',
      });

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ name: 'Aarav N. Patel' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Aarav N. Patel');
    });

    it('DELETE /api/v1/users/account should deactivate user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockTourist,
        isActive: false,
      });

      const res = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Account deactivated successfully');
    });
  });

  describe('Volunteer Endpoints (/api/v1/volunteers)', () => {
    it('POST /api/v1/volunteers/register should register volunteer profile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockTourist);
      (prisma.volunteerProfile.upsert as jest.Mock).mockResolvedValue(
        mockVolunteer.volunteerProfile
      );

      const res = await request(app)
        .post('/api/v1/volunteers/register')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ aadharNumber: '1234-5678-9012' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.volunteerProfile.userId).toBe(mockVolunteer.id);
    });

    it('PATCH /api/v1/volunteers/duty should allow YAATRI_MITRA to toggle duty', async () => {
      (prisma.volunteerProfile.findUnique as jest.Mock).mockResolvedValue(
        mockVolunteer.volunteerProfile
      );
      (prisma.volunteerProfile.update as jest.Mock).mockResolvedValue({
        ...mockVolunteer.volunteerProfile,
        isOnDuty: false,
      });

      const res = await request(app)
        .patch('/api/v1/volunteers/duty')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({ isOnDuty: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.volunteerProfile.isOnDuty).toBe(false);
    });

    it('PATCH /api/v1/volunteers/duty should return 403 FORBIDDEN for TOURIST role', async () => {
      const res = await request(app)
        .patch('/api/v1/volunteers/duty')
        .set('Authorization', `Bearer ${touristToken}`)
        .send({ isOnDuty: true });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/volunteers/location should record GPS ping', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { id: 'loc_ping_01', timestamp: mockDate },
      ]);

      const res = await request(app)
        .post('/api/v1/volunteers/location')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          lat: 18.7546,
          lng: 73.4062,
          altitude: 620.5,
          battery: 88,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('loc_ping_01');
    });

    it('GET /api/v1/volunteers/nearby should return nearby on-duty volunteers', async () => {
      const mockRawNearby = [
        {
          userId: 'volunteer_user_01',
          name: 'Vikram Shinde',
          phone: '+919876543222',
          role: 'YAATRI_MITRA',
          verificationStatus: 'VERIFIED',
          isOnDuty: true,
          rating: 4.9,
          totalResponses: 10,
          lat: 18.755,
          lng: 73.407,
          altitude: 620,
          battery: 88,
          lastPing: mockDate,
          distanceMeters: 150.0,
        },
      ];

      (prisma.$queryRaw as jest.Mock).mockResolvedValue(mockRawNearby);

      const res = await request(app)
        .get('/api/v1/volunteers/nearby')
        .query({ lat: '18.7546', lng: '73.4062', radius: '3000' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.volunteers[0].name).toBe('Vikram Shinde');
      expect(res.body.data.volunteers[0].distanceMeters).toBe(150.0);
    });

    it('GET /api/v1/volunteers/nearby should return 400 for missing/invalid coordinates', async () => {
      const res = await request(app)
        .get('/api/v1/volunteers/nearby')
        .query({ lat: 'invalid_lat', lng: '73.4062' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
