/**
 * Safe Yatra — Admin Dashboard Map Service
 * Fetches spatial heatmap density clusters and PostGIS zone boundaries.
 */

import { apiClient } from './api';

export interface HeatmapCluster {
  lat: number;
  lng: number;
  count: number;
  intensity: number;
}

export interface HeatmapData {
  clusters: HeatmapCluster[];
  totalPoints: number;
  generatedAt: string;
}

export interface ZoneData {
  id: string;
  name: string;
  dangerScore: number;
  tier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  coordinates: {
    lat: number;
    lng: number;
  };
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  factors?: {
    weather: { score: number; weight: number };
    terrain: { score: number; weight: number };
    crowd: { score: number; weight: number };
    history: { score: number; weight: number };
  };
  justification?: string;
  updatedAt?: string;
}

export const mapService = {
  /**
   * Fetch aggregated tourist location density clusters from /admin/heatmap.
   */
  async getHeatmapData(lookbackHours: number = 24, gridSizeDegrees: number = 0.005): Promise<HeatmapData> {
    const response = (await apiClient.get('/admin/heatmap', {
      params: { lookbackHours, gridSizeDegrees },
    })) as any;
    const data: HeatmapData = response.data || response;
    return data;
  },

  /**
   * Fetch all registered hazard zones with polygons and danger tiers from /zones.
   */
  async getZones(): Promise<ZoneData[]> {
    const response = (await apiClient.get('/zones')) as any;
    const data: ZoneData[] = response.data?.zones || response.data || response || [];
    return Array.isArray(data) ? data : [];
  },
};
