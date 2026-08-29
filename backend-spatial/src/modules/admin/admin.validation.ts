/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast Validation Schemas (Zod).
 */

import { z } from 'zod';
import { DangerTier } from '@prisma/client';

export const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z
    .array(
      z.array(
        z.tuple([
          z.number().min(-180).max(180), // lng
          z.number().min(-90).max(90),   // lat
        ])
      ).min(4, 'Polygon linear ring must have at least 4 coordinates')
    )
    .min(1, 'Polygon must have at least one linear ring')
    .refine(
      (rings) => {
        const exteriorRing = rings[0];
        if (!exteriorRing || exteriorRing.length < 4) return false;
        const first = exteriorRing[0];
        const last = exteriorRing[exteriorRing.length - 1];
        return first[0] === last[0] && first[1] === last[1];
      },
      {
        message: 'Polygon exterior ring must be closed (first coordinate must match last coordinate)',
      }
    ),
});

export const createBroadcastSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    message: z.string().min(5, 'Message must be at least 5 characters').max(2000),
    severity: z.nativeEnum(DangerTier, {
      errorMap: () => ({ message: 'Severity must be one of LOW, MODERATE, SEVERE, CRITICAL' }),
    }),
    targetArea: polygonSchema.optional(),
    centerLat: z.number().min(-90).max(90).optional(),
    centerLng: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().positive('radiusMeters must be positive').max(100000).optional(),
    expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
  })
  .refine(
    (data) => {
      const hasPolygon = !!data.targetArea;
      const hasCircle =
        data.centerLat !== undefined &&
        data.centerLng !== undefined &&
        data.radiusMeters !== undefined;
      return hasPolygon || hasCircle;
    },
    {
      message: 'Either targetArea GeoJSON polygon or (centerLat, centerLng, radiusMeters) must be provided',
      path: ['targetArea'],
    }
  );

export const broadcastQuerySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  severity: z.nativeEnum(DangerTier).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
