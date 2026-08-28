/**
 * Safe Yatra — Backend Spatial Server
 * Geofence Zod Validation Schemas.
 */

import { z } from 'zod';

const geoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
});

export const createGeofenceSchema = z
  .object({
    name: z.string().min(2, 'Geofence name must be at least 2 characters long').trim(),
    type: z.enum(['AUTO_DANGER', 'MANUAL_NOENTRY', 'ADMIN_OVERRIDE']),
    severity: z.enum(['LOW', 'MODERATE', 'SEVERE', 'CRITICAL']),
    zoneId: z.string().uuid('Zone ID must be a valid UUID').optional().nullable(),
    message: z.string().optional().nullable(),
    boundary: geoJSONPolygonSchema.optional(),
    centerLat: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90').optional(),
    centerLng: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180').optional(),
    radiusMeters: z.number().positive('Radius must be greater than 0 meters').optional(),
    isActive: z.boolean().optional(),
    expiresAt: z
      .string()
      .datetime({ message: 'expiresAt must be a valid ISO 8601 timestamp' })
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
  })
  .refine(
    (data) =>
      data.boundary !== undefined ||
      (data.centerLat !== undefined &&
        data.centerLng !== undefined &&
        data.radiusMeters !== undefined),
    {
      message:
        'Geofence must have either a GeoJSON polygon boundary or centerLat/centerLng with radiusMeters',
      path: ['boundary'],
    }
  );

export type CreateGeofenceInputSchema = z.infer<typeof createGeofenceSchema>;

export const updateGeofenceSchema = z.object({
  name: z.string().min(2, 'Geofence name must be at least 2 characters long').optional(),
  type: z.enum(['AUTO_DANGER', 'MANUAL_NOENTRY', 'ADMIN_OVERRIDE']).optional(),
  severity: z.enum(['LOW', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
  zoneId: z.string().uuid('Zone ID must be a valid UUID').optional().nullable(),
  message: z.string().optional().nullable(),
  boundary: geoJSONPolygonSchema.optional(),
  isActive: z.boolean().optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'expiresAt must be a valid ISO 8601 timestamp' })
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
});

export type UpdateGeofenceInputSchema = z.infer<typeof updateGeofenceSchema>;

export const checkPointSchema = z.object({
  lat: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  lng: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  bufferMeters: z.coerce.number().min(0, 'Buffer distance must be non-negative').optional().default(500),
});

export type CheckPointInputSchema = z.infer<typeof checkPointSchema>;

export const geofenceQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export type GeofenceQueryInputSchema = z.infer<typeof geofenceQuerySchema>;
