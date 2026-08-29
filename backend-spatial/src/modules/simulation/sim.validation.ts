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

export type CoordinatePointSchema = z.infer<typeof coordinatePointSchema>;
export type InjectLocationSchema = z.infer<typeof injectLocationSchema>;
export type ReplayTrajectorySchema = z.infer<typeof replayTrajectorySchema>;
