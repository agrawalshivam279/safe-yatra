/**
 * Safe Yatra — Admin Dashboard Admin Service
 * Consumes /api/v1/admin endpoints for telemetry, analytics, and broadcasts.
 */

import { apiClient } from './api';

export interface AdminAnalyticsData {
  totalSosCount: number;
  activeSosCount: number;
  resolvedSosCount: number;
  avgResponseTimeMinutes: number;
  activeTourists: number;
  onDutyMitras: number;
  totalVolunteers: number;
  criticalZones: number;
  severeZones: number;
  moderateZones: number;
  lowZones: number;
  zoneTierDistribution: {
    CRITICAL: number;
    SEVERE: number;
    MODERATE: number;
    LOW: number;
  };
}

export const adminService = {
  /**
   * Fetch aggregated command center analytics metrics.
   */
  async getAnalytics(): Promise<AdminAnalyticsData> {
    const response = (await apiClient.get('/admin/analytics')) as any;
    const data: AdminAnalyticsData = response.data || response;
    return data;
  },
};
