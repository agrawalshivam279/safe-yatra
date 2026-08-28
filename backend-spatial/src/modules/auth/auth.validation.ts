/**
 * Safe Yatra — Backend Spatial Server
 * Authentication Zod Validation Schemas.
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone must be at most 15 digits')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .trim(),
  role: z.enum(['TOURIST', 'YAATRI_MITRA', 'ADMIN']).default('TOURIST'),
  profileImageUrl: z.string().url('Invalid image URL').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
