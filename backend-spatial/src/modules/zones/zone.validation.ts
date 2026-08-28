/**
 * Safe Yatra — Backend Spatial Server
 * Zones Zod Validation Schemas.
 */

import { z } from 'zod';

const geoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
});

export const createZoneSchema = z
  .object({
    name: z.string().min(2, 'Zone name must be at least 2 characters long').trim(),
    description: z.string().optional(),
    boundary: geoJSONPolygonSchema.optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLng: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().positive().optional(),
    dangerScore: z.number().min(0).max(100).optional(),
    justification: z.string().optional(),
  })
  .refine(
    (data) =>
      data.boundary !== undefined ||
      (data.centerLat !== undefined &&
        data.centerLng !== undefined &&
        data.radiusMeters !== undefined),
    {
      message:
        'Zone must have either a GeoJSON polygon boundary or centerLat/centerLng with radiusMeters',
      path: ['boundary'],
    }
  );

export type CreateZoneInputSchema = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = z.object({
  name: z.string().min(2, 'Zone name must be at least 2 characters long').optional(),
  description: z.string().optional(),
  boundary: geoJSONPolygonSchema.optional(),
  justification: z.string().optional(),
});

export type UpdateZoneInputSchema = z.infer<typeof updateZoneSchema>;

export const overrideScoreSchema = z.object({
  score: z
    .number()
    .min(0, 'Danger score must be between 0 and 100')
    .max(100, 'Danger score must be between 0 and 100'),
  justification: z
    .string()
    .min(5, 'Override justification must be at least 5 characters long')
    .trim(),
});

export type OverrideScoreInputSchema = z.infer<typeof overrideScoreSchema>;
