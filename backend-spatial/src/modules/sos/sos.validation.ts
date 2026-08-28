/**
 * Safe Yatra — Backend Spatial Server
 * Zod Validation Schemas for SOS Emergency Endpoints.
 */

import { z } from 'zod';

export const triggerSOSSchema = z.object({
  lat: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
  altitude: z.number().optional(),
  battery: z.number().min(0, 'Battery must be >= 0').max(100, 'Battery must be <= 100').optional(),
  audioUrl: z.string().url('Audio URL must be a valid URL').optional(),
});

export const resolveSOSSchema = z.object({
  resolutionNotes: z.string().min(3, 'Resolution notes must be at least 3 characters').optional(),
});

export const cancelSOSSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').optional(),
});

export const smsWebhookSchema = z
  .object({
    Body: z.string().optional(),
    body: z.string().optional(),
    From: z.string().optional(),
    from: z.string().optional(),
  })
  .refine((data) => Boolean(data.Body || data.body), {
    message: 'SMS webhook must include Body or body payload',
  });
