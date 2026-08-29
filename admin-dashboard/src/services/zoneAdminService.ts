/**
 * Safe Yatra — Admin Dashboard Zone Administration Service
 * Manages hazard zones, manual score overrides, and geofence provisioning.
 */

import { apiClient } from './api';
import { ZoneData } from './mapService';

export interface ZoneScoreOverridePayload {
  dangerScore: number;
  reason: string;
  expiresAt?: string;
}

export interface CreateZonePayload {
  name: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  severity?: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
}

export interface AdminZoneDetail extends ZoneData {
  isManualOverride?: boolean;
  overrideReason?: string;
  overrideExpiresAt?: string;
  description?: string;
}

export const zoneAdminService = {
  /**
   * Fetch all registered hazard zones.
   */
  async getZones(): Promise<AdminZoneDetail[]> {
    const response = (await apiClient.get('/zones')) as any;
    const data: AdminZoneDetail[] = response.data?.zones || response.data || response || [];
    return Array.isArray(data) ? data : [];
  },

  /**
   * Fetch a single zone detail with ML justification and factors.
   */
  async getZoneById(id: string): Promise<AdminZoneDetail> {
    const response = (await apiClient.get(`/zones/${id}`)) as any;
    const data: AdminZoneDetail = response.data?.zone || response.data || response;
    return data;
  },

  /**
   * Apply a manual danger score override to a zone.
   */
  async overrideZoneScore(id: string, payload: ZoneScoreOverridePayload): Promise<AdminZoneDetail> {
    const response = (await apiClient.patch(`/admin/zones/${id}/override`, payload)) as any;
    return response.data?.zone || response.data || response;
  },

  /**
   * Provision a new geofenced hazard zone.
   */
  async createZone(payload: CreateZonePayload): Promise<AdminZoneDetail> {
    const response = (await apiClient.post('/geofences', payload)) as any;
    return response.data?.geofence || response.data?.zone || response.data || response;
  },
};
