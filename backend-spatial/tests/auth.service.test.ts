/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Authentication Service (Password hashing, JWT, User CRUD).
 */

import { authService } from '../src/modules/auth/auth.service';
import { prisma } from '../src/config/database';
import { UserRole } from '@prisma/client';

// Mock Prisma client methods
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('AuthService (auth.service.ts)', () => {
  const mockDate = new Date('2026-08-29T00:00:00.000Z');

  const mockUserRecord = {
    id: 'user_123',
    email: 'tourist@safeyatra.in',
    passwordHash: '', // populated in beforeAll
    name: 'Amit Sharma',
    phone: '+919876543210',
    role: 'TOURIST' as UserRole,
    profileImageUrl: null,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
    volunteerProfile: null,
  };

  beforeAll(async () => {
    mockUserRecord.passwordHash = await authService.hashPassword('SecurePass123!');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Hashing & Verification', () => {
    it('should hash a plain-text password using bcrypt', async () => {
      const hash = await authService.hashPassword('MySecretPassword!');
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/);
    });

    it('should correctly verify matching password against hash', async () => {
      const hash = await authService.hashPassword('MySecretPassword!');
      const isValid = await authService.comparePassword('MySecretPassword!', hash);
      expect(isValid).toBe(true);

      const isInvalid = await authService.comparePassword('WrongPassword!', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token Issuance & Verification', () => {
    it('should generate valid access and refresh tokens', () => {
      const tokens = authService.generateTokens({
        id: 'user_123',
        email: 'test@safeyatra.in',
        role: 'TOURIST',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe('7d');
    });

    it('should successfully verify a valid access token', () => {
      const tokens = authService.generateTokens({
        id: 'user_123',
        email: 'test@safeyatra.in',
        role: 'TOURIST',
      });

      const payload = authService.verifyToken(tokens.accessToken, 'access');
      expect(payload.userId).toBe('user_123');
      expect(payload.email).toBe('test@safeyatra.in');
      expect(payload.role).toBe('TOURIST');
      expect(payload.type).toBe('access');
    });

    it('should successfully verify a valid refresh token', () => {
      const tokens = authService.generateTokens({
        id: 'user_123',
        email: 'test@safeyatra.in',
        role: 'TOURIST',
      });

      const payload = authService.verifyToken(tokens.refreshToken, 'refresh');
      expect(payload.userId).toBe('user_123');
      expect(payload.type).toBe('refresh');
    });

    it('should reject a token when expectedType does not match', () => {
      const tokens = authService.generateTokens({
        id: 'user_123',
        email: 'test@safeyatra.in',
        role: 'TOURIST',
      });

      // Pass access token when expecting refresh
      expect(() => {
        authService.verifyToken(tokens.accessToken, 'refresh');
      }).toThrow(/Invalid token type. Expected refresh token./);
    });

    it('should reject invalid or tampered tokens', () => {
      expect(() => {
        authService.verifyToken('invalid.jwt.token.string', 'access');
      }).toThrow(/Invalid or corrupted token/);
    });
  });

  describe('Registration (register)', () => {
    it('should register a new tourist user and return sanitized profile + tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUserRecord);

      const result = await authService.register({
        email: 'tourist@safeyatra.in',
        password: 'SecurePass123!',
        name: 'Amit Sharma',
        phone: '+919876543210',
        role: 'TOURIST',
      });

      expect(result.user.id).toBe('user_123');
      expect(result.user.email).toBe('tourist@safeyatra.in');
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(result.user.isActive).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw 409 EMAIL_EXISTS if email is already registered', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUserRecord);

      await expect(
        authService.register({
          email: 'tourist@safeyatra.in',
          password: 'SecurePass123!',
          name: 'Amit Sharma',
          phone: '+919876543210',
          role: 'TOURIST',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'EMAIL_EXISTS',
        })
      );
    });

    it('should throw 409 PHONE_EXISTS if phone is already registered', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // email check passes
        .mockResolvedValueOnce(mockUserRecord); // phone check fails

      await expect(
        authService.register({
          email: 'newuser@safeyatra.in',
          password: 'SecurePass123!',
          name: 'New User',
          phone: '+919876543210',
          role: 'TOURIST',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'PHONE_EXISTS',
        })
      );
    });
  });

  describe('Login (login)', () => {
    it('should authenticate valid credentials and return tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const result = await authService.login({
        email: 'tourist@safeyatra.in',
        password: 'SecurePass123!',
      });

      expect(result.user.email).toBe('tourist@safeyatra.in');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw 401 INVALID_CREDENTIALS for non-existent email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@safeyatra.in',
          password: 'Password123!',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('should throw 401 INVALID_CREDENTIALS for incorrect password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      await expect(
        authService.login({
          email: 'tourist@safeyatra.in',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('should throw 403 ACCOUNT_INACTIVE if user isActive is false', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUserRecord,
        isActive: false,
      });

      await expect(
        authService.login({
          email: 'tourist@safeyatra.in',
          password: 'SecurePass123!',
        })
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 403,
          code: 'ACCOUNT_INACTIVE',
        })
      );
    });
  });

  describe('Token Refresh (refreshToken)', () => {
    it('should issue a new access token when a valid refresh token is supplied', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const tokens = authService.generateTokens({
        id: 'user_123',
        email: 'tourist@safeyatra.in',
        role: 'TOURIST',
      });

      const refreshed = await authService.refreshToken(tokens.refreshToken);
      expect(refreshed.accessToken).toBeDefined();
      expect(refreshed.expiresIn).toBe('7d');
    });

    it('should throw 404 USER_NOT_FOUND if user in refresh token no longer exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const tokens = authService.generateTokens({
        id: 'deleted_user',
        email: 'deleted@safeyatra.in',
        role: 'TOURIST',
      });

      await expect(authService.refreshToken(tokens.refreshToken)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        })
      );
    });
  });

  describe('User Profile Retrieval (getUserProfile)', () => {
    it('should return sanitized user profile by ID', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserRecord);

      const profile = await authService.getUserProfile('user_123');
      expect(profile.id).toBe('user_123');
      expect(profile.name).toBe('Amit Sharma');
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('should throw 404 USER_NOT_FOUND if user ID is missing', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.getUserProfile('non_existent')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        })
      );
    });
  });
});
