/**
 * Safe Yatra — Backend Spatial Server
 * Zones & Spatial Polygon Data Types.
 */

import { DangerTier } from '@prisma/client';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

export interface ZoneEntity {
  id: string;
  name: string;
  description?: string | null;
  boundary: GeoJSONPolygon | null;
  centerLat?: number;
  centerLng?: number;
  dangerScore: number;
  dangerTier: DangerTier;
  justification?: string | null;
  isManualOverride: boolean;
  lastScoreUpdate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateZoneInput {
  name: string;
  description?: string;
  boundary?: GeoJSONPolygon;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  dangerScore?: number;
  justification?: string;
}

export interface UpdateZoneInput {
  name?: string;
  description?: string;
  boundary?: GeoJSONPolygon;
  justification?: string;
}

export interface OverrideScoreInput {
  score: number;
  justification: string;
}
