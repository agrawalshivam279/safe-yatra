/**
 * Safe Yatra — Admin Dashboard Analytics & Telemetry Service
 * Aggregates historical danger trends, SOS dispatch volumes, and responder SLA metrics.
 */

import { apiClient } from './api';

export interface DangerTrendPoint {
  date: string;
  [zoneName: string]: number | string;
}

export interface DailySOSPoint {
  date: string;
  triggered: number;
  resolved: number;
}

export interface IncidentTypeDistribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SLAStats {
  avgResponseTimeMinutes: number;
  targetMinutes: number;
  withinTargetPercentage: number;
  totalRescues: number;
}

export interface AnalyticsOverviewData {
  timeframe: string;
  dangerTrends: DangerTrendPoint[];
  dailySOS: DailySOSPoint[];
  incidentTypes: IncidentTypeDistribution[];
  sla: SLAStats;
  summary: {
    totalIncidents: number;
    activeZonesCount: number;
    resolutionRatePercentage: number;
    protectedTouristsCount: number;
  };
}

export const fallbackAnalyticsData: AnalyticsOverviewData = {
  timeframe: '7 Days',
  summary: {
    totalIncidents: 48,
    activeZonesCount: 12,
    resolutionRatePercentage: 97.9,
    protectedTouristsCount: 14850,
  },
  dangerTrends: [
    { date: 'Mon', 'Tiger Point': 68, 'Bhushi Dam': 45, 'Khandala Trail': 55, 'Rajmachi Fort': 35, 'Amarnath Pass': 72 },
    { date: 'Tue', 'Tiger Point': 74, 'Bhushi Dam': 52, 'Khandala Trail': 58, 'Rajmachi Fort': 38, 'Amarnath Pass': 75 },
    { date: 'Wed', 'Tiger Point': 82, 'Bhushi Dam': 60, 'Khandala Trail': 64, 'Rajmachi Fort': 42, 'Amarnath Pass': 80 },
    { date: 'Thu', 'Tiger Point': 88, 'Bhushi Dam': 78, 'Khandala Trail': 70, 'Rajmachi Fort': 48, 'Amarnath Pass': 85 },
    { date: 'Fri', 'Tiger Point': 85, 'Bhushi Dam': 72, 'Khandala Trail': 66, 'Rajmachi Fort': 45, 'Amarnath Pass': 82 },
    { date: 'Sat', 'Tiger Point': 91, 'Bhushi Dam': 84, 'Khandala Trail': 76, 'Rajmachi Fort': 52, 'Amarnath Pass': 89 },
    { date: 'Sun', 'Tiger Point': 82, 'Bhushi Dam': 65, 'Khandala Trail': 60, 'Rajmachi Fort': 40, 'Amarnath Pass': 78 },
  ],
  dailySOS: [
    { date: 'Mon', triggered: 4, resolved: 4 },
    { date: 'Tue', triggered: 6, resolved: 6 },
    { date: 'Wed', triggered: 8, resolved: 8 },
    { date: 'Thu', triggered: 11, resolved: 10 },
    { date: 'Fri', triggered: 7, resolved: 7 },
    { date: 'Sat', triggered: 14, resolved: 14 },
    { date: 'Sun', triggered: 9, resolved: 9 },
  ],
  incidentTypes: [
    { name: 'Medical Emergency', count: 18, percentage: 37.5, color: '#f43f5e' },
    { name: 'Flash Flood / Water', count: 12, percentage: 25.0, color: '#0ea5e9' },
    { name: 'Stranded / Lost Trail', count: 9, percentage: 18.8, color: '#f59e0b' },
    { name: 'Landslide / Rockfall', count: 6, percentage: 12.5, color: '#8b5cf6' },
    { name: 'General Safety Guidance', count: 3, percentage: 6.2, color: '#10b981' },
  ],
  sla: {
    avgResponseTimeMinutes: 3.4,
    targetMinutes: 5.0,
    withinTargetPercentage: 96.2,
    totalRescues: 59,
  },
};

export const analyticsService = {
  /**
   * Fetch aggregate analytics telemetry overview.
   */
  async getAnalyticsOverview(days: number = 7): Promise<AnalyticsOverviewData> {
    try {
      const response = (await apiClient.get(`/admin/analytics?days=${days}`)) as any;
      const data: AnalyticsOverviewData =
        response.data?.overview || response.data || response || fallbackAnalyticsData;
      return {
        ...fallbackAnalyticsData,
        ...data,
      };
    } catch {
      return fallbackAnalyticsData;
    }
  },
};
