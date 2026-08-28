/**
 * Safe Yatra — Backend Spatial Server
 * Environment configuration schema and validator.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SIMULATION_MODE: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  // Database & Cache
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Internal Microservices
  ML_ENGINE_URL: z.string().url().default('http://localhost:8000'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Push Notifications & SMS Gateway (Optional for Dev / Dev Mock Available)
  FCM_SERVER_KEY: z.string().optional().default(''),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates given environment record against envSchema.
 * Throws a descriptive error on validation failure.
 */
export const validateEnv = (customEnv?: Record<string, unknown>): Env => {
  const targetEnv = customEnv || process.env;
  const result = envSchema.safeParse(targetEnv);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment configuration:\n${errorDetails}`);
  }

  return result.data;
};

export const env: Env = validateEnv();
export default env;
