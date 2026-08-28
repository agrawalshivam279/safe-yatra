/**
 * Safe Yatra — Backend Spatial Server
 * Unit tests for Configuration & Client Singletons (env, database, redis).
 */

import { envSchema, validateEnv } from '../src/config/env';
import { prisma } from '../src/config/database';
import { redis, createRedisClient } from '../src/config/redis';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

describe('Configuration & Client Singletons', () => {
  const validMockEnv = {
    PORT: '3000',
    NODE_ENV: 'test',
    SIMULATION_MODE: 'true',
    DATABASE_URL: 'postgresql://safeyatra_user:safeyatra_pass@localhost:5432/safeyatra',
    REDIS_URL: 'redis://localhost:6379',
    ML_ENGINE_URL: 'http://localhost:8000',
    JWT_SECRET: 'safeyatra_jwt_super_secret_dev_key_min_32_chars_2026',
    JWT_EXPIRES_IN: '7d',
    FCM_SERVER_KEY: 'mock_fcm_key',
    TWILIO_ACCOUNT_SID: 'AC1234567890',
    TWILIO_AUTH_TOKEN: 'mock_twilio_token',
    TWILIO_PHONE_NUMBER: '+1234567890',
  };

  describe('Environment Validation (env.ts)', () => {
    it('should successfully parse valid environment variables', () => {
      const parsed = validateEnv(validMockEnv);
      expect(parsed.PORT).toBe(3000);
      expect(parsed.NODE_ENV).toBe('test');
      expect(parsed.SIMULATION_MODE).toBe(true);
      expect(parsed.DATABASE_URL).toBe(validMockEnv.DATABASE_URL);
      expect(parsed.REDIS_URL).toBe(validMockEnv.REDIS_URL);
      expect(parsed.ML_ENGINE_URL).toBe(validMockEnv.ML_ENGINE_URL);
      expect(parsed.JWT_SECRET).toBe(validMockEnv.JWT_SECRET);
      expect(parsed.JWT_EXPIRES_IN).toBe('7d');
      expect(parsed.FCM_SERVER_KEY).toBe('mock_fcm_key');
      expect(parsed.TWILIO_ACCOUNT_SID).toBe('AC1234567890');
    });

    it('should correctly apply default values for optional settings', () => {
      const minimalEnv = {
        DATABASE_URL: 'postgresql://localhost:5432/safeyatra',
        JWT_SECRET: '12345678901234567890123456789012', // 32 chars
      };

      const parsed = validateEnv(minimalEnv);
      expect(parsed.PORT).toBe(3000);
      expect(parsed.NODE_ENV).toBe('development');
      expect(parsed.SIMULATION_MODE).toBe(false);
      expect(parsed.REDIS_URL).toBe('redis://localhost:6379');
      expect(parsed.ML_ENGINE_URL).toBe('http://localhost:8000');
      expect(parsed.JWT_EXPIRES_IN).toBe('7d');
      expect(parsed.FCM_SERVER_KEY).toBe('');
      expect(parsed.TWILIO_ACCOUNT_SID).toBe('');
    });

    it('should parse SIMULATION_MODE boolean transform accurately', () => {
      const trueEnv = validateEnv({ ...validMockEnv, SIMULATION_MODE: 'true' });
      expect(trueEnv.SIMULATION_MODE).toBe(true);

      const falseEnv = validateEnv({ ...validMockEnv, SIMULATION_MODE: 'false' });
      expect(falseEnv.SIMULATION_MODE).toBe(false);

      const emptyEnv = validateEnv({ ...validMockEnv, SIMULATION_MODE: undefined });
      expect(emptyEnv.SIMULATION_MODE).toBe(false);
    });

    it('should throw an error when JWT_SECRET is shorter than 32 characters', () => {
      expect(() => {
        validateEnv({
          ...validMockEnv,
          JWT_SECRET: 'short_secret_under_32_chars',
        });
      }).toThrow(/JWT_SECRET must be at least 32 characters long/);
    });

    it('should throw an error when DATABASE_URL is missing', () => {
      expect(() => {
        validateEnv({
          ...validMockEnv,
          DATABASE_URL: '',
        });
      }).toThrow(/DATABASE_URL is required/);
    });

    it('should throw an error on invalid port values', () => {
      expect(() => {
        validateEnv({
          ...validMockEnv,
          PORT: 'not-a-number',
        });
      }).toThrow(/Invalid environment configuration/);
    });
  });

  describe('Database Client Singleton (database.ts)', () => {
    it('should export an instantiated PrismaClient instance', () => {
      expect(prisma).toBeDefined();
      expect(prisma instanceof PrismaClient).toBe(true);
    });
  });

  describe('Redis Client Singleton (redis.ts)', () => {
    afterAll(async () => {
      // Disconnect clients to ensure clean test exit
      await redis.quit().catch(() => {});
    });

    it('should export an instantiated Redis client', () => {
      expect(redis).toBeDefined();
      expect(redis instanceof Redis).toBe(true);
    });

    it('should allow creating isolated Redis clients via createRedisClient factory', async () => {
      const customClient = createRedisClient('redis://localhost:6379');
      expect(customClient).toBeDefined();
      expect(customClient instanceof Redis).toBe(true);
      await customClient.quit().catch(() => {});
    });
  });
});
