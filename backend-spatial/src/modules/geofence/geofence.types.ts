/**
 * Safe Yatra — Backend Spatial Server
 * Geofence Module Data Types & Interfaces.
 */

import { DangerTier } from '@prisma/client';
import { GeoJSONPolygon } from '../zones/zone.types';

export type GeofenceType = 'AUTO_DANGER' | 'MANUAL_NOENTRY' | 'ADMIN_OVERRIDE';

export interface GeofenceEntity {
  id: string;
  zoneId: string | null;
  name: string;
  type: string;
  boundary: GeoJSONPolygon | null;
  isActive: boolean;
  severity: DangerTier;
  message: string | null;
  createdBy: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  centerLat?: number;
  centerLng?: number;
}

export interface CreateGeofenceInput {
  name: string;
  type: string;
  severity: DangerTier;
  zoneId?: string | null;
  boundary?: GeoJSONPolygon;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  message?: string | null;
  createdBy?: string | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface UpdateGeofenceInput {
  name?: string;
  type?: string;
  severity?: DangerTier;
  zoneId?: string | null;
  boundary?: GeoJSONPolygon;
  message?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export interface ProximityGeofence {
  geofence: GeofenceEntity;
  distanceMeters: number;
}

export interface GeofenceCheckResult {
  inside: boolean;
  breachedGeofences: GeofenceEntity[];
  approachingGeofences: ProximityGeofence[];
}

export interface PointCheckInput {
  lat: number;
  lng: number;
  bufferMeters?: number;
}
