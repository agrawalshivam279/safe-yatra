/**
 * Safe Yatra — Backend Spatial Server
 * Volunteer & Location Zod Validation Schemas.
 */

import { z } from 'zod';

export const registerVolunteerSchema = z.object({
  aadharNumber: z
    .string()
    .regex(/^\d{4}-?\d{4}-?\d{4}$/, 'Invalid Aadhar card number format')
    .optional(),
});

export type RegisterVolunteerInputSchema = z.infer<
  typeof registerVolunteerSchema
>;

export const toggleDutySchema = z.object({
  isOnDuty: z.boolean().optional(),
});

export type ToggleDutyInputSchema = z.infer<typeof toggleDutySchema>;

export const locationPingSchema = z.object({
  lat: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  altitude: z.number().optional(),
  accuracy: z.number().min(0).optional(),
  battery: z.number().min(0).max(100).optional(),
});

export type LocationPingInputSchema = z.infer<typeof locationPingSchema>;

export const nearbyVolunteersQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radius: z.coerce.number().min(100).max(50000).default(5000),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type NearbyVolunteersQuerySchema = z.infer<
  typeof nearbyVolunteersQuerySchema
>;
