/**
 * Safe Yatra — Backend Spatial Server
 * Simulation Validation Schemas (Zod).
 */

import { z } from 'zod';

export const coordinatePointSchema = z.object({
  lat: z
    .number({ required_error: 'Latitude is required' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number({ required_error: 'Longitude is required' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  altitude: z.number().optional(),
  accuracy: z.number().nonnegative().optional(),
  battery: z.number().min(0).max(100).optional(),
  timestamp: z.union([z.string(), z.date()]).optional(),
});

export const injectLocationSchema = z.object({
  userId: z.string({ required_error: 'userId is required' }).min(1, 'userId cannot be empty'),
  coordinates: z
    .array(coordinatePointSchema)
    .min(1, 'At least one coordinate point is required'),
});

export const replayTrajectorySchema = z.object({
  userId: z.string({ required_error: 'userId is required' }).min(1, 'userId cannot be empty'),
  coordinates: z
    .array(coordinatePointSchema)
    .min(1, 'At least one coordinate point is required'),
  intervalSeconds: z.number().int().positive().optional().default(10),
});

export const mockTouristSchema = z.object({
  userId: z.string().min(1).optional(),
  location: z.object({
    lat: z
      .number({ required_error: 'Tourist latitude is required' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    lng: z
      .number({ required_error: 'Tourist longitude is required' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  }),
  battery: z.number().min(0).max(100).optional(),
  audioUrl: z.string().url('Audio URL must be a valid URL').optional(),
});

export const mockVolunteerSchema = z.object({
  userId: z.string().min(1).optional(),
  location: z.object({
    lat: z
      .number({ required_error: 'Volunteer latitude is required' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    lng: z
      .number({ required_error: 'Volunteer longitude is required' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  }),
  responseDelaySeconds: z.number().nonnegative().optional().default(0),
});

export const simulateSOSSchema = z.object({
  scenario: z
    .enum(['full_loop', 'volunteer_timeout', 'cancel'])
    .optional()
    .default('full_loop'),
  tourist: mockTouristSchema,
  volunteers: z.array(mockVolunteerSchema).optional(),
  autoResolve: z.boolean().optional().default(true),
  resolveAfterSeconds: z.number().nonnegative().optional().default(60),
});

export const weatherOverrideSchema = z.object({
  precipitation_mm: z.number().min(0, 'Precipitation cannot be negative').optional(),
  wind_speed_kmh: z.number().min(0, 'Wind speed cannot be negative').optional(),
  visibility_meters: z.number().min(0, 'Visibility cannot be negative').optional(),
  temperature_c: z.number().optional(),
  ttlSeconds: z.number().int().positive('TTL must be a positive integer').optional().default(300),
  clear: z.boolean().optional().default(false),
});

export type CoordinatePointSchema = z.infer<typeof coordinatePointSchema>;
export type InjectLocationSchema = z.infer<typeof injectLocationSchema>;
export type ReplayTrajectorySchema = z.infer<typeof replayTrajectorySchema>;
export type MockTouristSchema = z.infer<typeof mockTouristSchema>;
export type MockVolunteerSchema = z.infer<typeof mockVolunteerSchema>;
export type SimulateSOSSchema = z.infer<typeof simulateSOSSchema>;
export type WeatherOverrideSchema = z.infer<typeof weatherOverrideSchema>;
