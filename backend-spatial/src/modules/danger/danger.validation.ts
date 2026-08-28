/**
 * Safe Yatra — Backend Spatial Server
 * Danger Risk Assessment Zod Validation Schemas.
 */

import { z } from 'zod';

export const dangerScoreQuerySchema = z.object({
  lat: z.coerce
    .number({ invalid_type_error: 'Latitude must be a valid number' })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce
    .number({ invalid_type_error: 'Longitude must be a valid number' })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

export type DangerScoreQueryInput = z.infer<typeof dangerScoreQuerySchema>;

export const safetyBriefingParamSchema = z.object({
  destination: z
    .string()
    .min(2, 'Destination must be at least 2 characters long')
    .trim(),
});

export type SafetyBriefingParamInput = z.infer<
  typeof safetyBriefingParamSchema
>;
