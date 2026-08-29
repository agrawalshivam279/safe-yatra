/**
 * Safe Yatra — Backend Spatial Server
 * Admin Broadcast, Analytics & Command Center Type Definitions.
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

export interface AdminAnalyticsResult {
  sos: {
    total: number;
    active: number;
    resolved: number;
    cancelled: number;
    avgResponseTimeSeconds: number;
  };
  users: {
    activeTourists: number;
    activeVolunteersOnDuty: number;
    totalVolunteers: number;
  };
  zones: {
    totalZones: number;
    tierDistribution: {
      LOW: number;
      MODERATE: number;
      SEVERE: number;
      CRITICAL: number;
    };
  };
  alerts: {
    activeGeofences: number;
    activeBroadcasts: number;
  };
}

export interface HeatmapCluster {
  lat: number;
  lng: number;
  intensity: number;
  pointCount: number;
}

export interface HeatmapResult {
  totalPoints: number;
  clusterCount: number;
  lookbackMinutes: number;
  clusters: HeatmapCluster[];
}

export interface HeatmapQueryInput {
  lookbackMinutes?: number;
  gridSize?: number;
}
