/**
 * Safe Yatra — Backend Spatial Server
 * Integration tests for Authentication Routes & Middleware Guards.
 */

import request from 'supertest';
import express from 'express';
import { app } from '../src/index';
import { authService } from '../src/modules/auth/auth.service';
import { prisma } from '../src/config/database';
import { requireRole } from '../src/middleware/roleGuard';
import { authenticate } from '../src/middleware/auth';
import { ok } from '../src/utils/response';
import { errorHandler } from '../src/middleware/errorHandler';
import { UserRole, VerificationStatus } from '@prisma/client';

// Mock Prisma client methods
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Auth Routes & Middleware Guards (/api/v1/auth)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockUserRecord = {
    id: 'user_tourist_01',
    email: 'tourist@safeyatra.in',
    passwordHash: '',
    name: 'Ravi Verma',
    phone: '+919876543210',
    role: 'TOURIST' as UserRole,
    profileImageUrl: null,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    volunteerProfile: null,
  };

  const mockAdminRecord = {
    id: 'user_admin_01',
    email: 'admin@safeyatra.in',
    passwordHash: '',
    name: 'Admin Officer',
    phone: '+919999999999',
    role: 'ADMIN' as UserRole,
    profileImageUrl: null,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    volunteerProfile: null,
  };

  let touristToken: string;
  let adminToken: string;
  let refreshTokenStr: string;

  beforeAll(async () => {
    mockUserRecord.passwordHash = await authService.hashPassword('SecurePass123!');
    mockAdminRecord.passwordHash = await authService.hashPassword('AdminPass123!');

    const touristTokens = authService.generateTokens({
      id: mockUserRecord.id,
      email: mockUserRecord.email,
      role: mockUserRecord.role,
    });
    touristToken = touristTokens.accessToken;
    refreshTokenStr = touristTokens.refreshToken;

    const adminTokens = authService.generateTokens({
      id: mockAdminRecord.id,
      email: mockAdminRecord.email,
      role: mockAdminRecord.role,
    });
    adminToken = adminTokens.accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201 with standard ok() envelope', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUserRecord);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'tourist@safeyatra.in',
          password: 'SecurePass123!',
          name: 'Ravi Verma',
          phone: '+919876543210',
          role: 'TOURIST',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('tourist@safeyatra.in');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.error).toBeNull();
    });

    it('should return 400 VALIDATION_ERROR when input is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
          name: 'R',
          phone: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 EMAIL_EXISTS if email already taken', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUserRecord);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'tourist@safeyatra.in',
          password: 'SecurePass123!',
          name: 'Ravi Verma',
          phone: '+919876543210',
          role: 'TOURIST',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should log in with valid credentials and return 200 with tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'tourist@safeyatra.in',
          password: 'SecurePass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('user_tourist_01');
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 401 INVALID_CREDENTIALS for wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'tourist@safeyatra.in',
          password: 'IncorrectPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return a new access token when valid refreshToken is supplied', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshTokenStr,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'corrupted.jwt.string',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when Authorization Bearer token is provided', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('user_tourist_01');
      expect(res.body.data.user.email).toBe('tourist@safeyatra.in');
    });

    it('should return 401 UNAUTHORIZED when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for invalid token in header', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Role Guard Middleware (requireRole)', () => {
    let roleApp: express.Application;

    beforeAll(() => {
      roleApp = express();
      roleApp.use(express.json());

      // Admin-only route
      roleApp.get('/admin-only', authenticate, requireRole('ADMIN'), (_req, res) => {
        ok(res, { secretAdminData: true });
      });

      roleApp.use(errorHandler);
    });

    it('should allow ADMIN role to access protected route', async () => {
      const res = await request(roleApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secretAdminData).toBe(true);
    });

    it('should return 403 FORBIDDEN when TOURIST tries to access ADMIN route', async () => {
      const res = await request(roleApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${touristToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
