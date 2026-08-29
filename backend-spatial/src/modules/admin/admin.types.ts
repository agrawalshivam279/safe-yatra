/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast & Command Center Type Definitions.
 */

import { DangerTier } from '@prisma/client';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  severity: DangerTier;
  targetArea?: GeoJSONPolygon;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  expiresAt?: string | Date;
}

export interface BroadcastAlertEntity {
  id: string;
  title: string;
  message: string;
  severity: DangerTier;
  targetArea: GeoJSONPolygon;
  centerLat?: number;
  centerLng?: number;
  createdBy: string;
  isActive: boolean;
  recipientCount?: number;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface BroadcastRecipient {
  userId: string;
  name: string;
  phone: string;
  role: string;
  lastLat?: number;
  lastLng?: number;
}

export interface BroadcastFilterQuery {
  isActive?: boolean;
  severity?: DangerTier;
  limit?: number;
  offset?: number;
}
