/**
 * Safe Yatra — Backend Spatial Server
 * User Profile Zod Validation Schemas.
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone must be at most 15 digits')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  profileImageUrl: z.string().url('Invalid profile image URL').optional(),
});

export type UpdateProfileInputSchema = z.infer<typeof updateProfileSchema>;
