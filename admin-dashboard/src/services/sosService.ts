/**
 * Safe Yatra — Admin Dashboard SOS Service
 * Real-time distress telemetry, responder assignment, and emergency resolution.
 */

import { apiClient } from './api';

export interface SOSResponder {
  id: string;
  name: string;
  phone?: string;
  location?: {
    lat: number;
    lng: number;
  };
  status: string;
  batteryLevel?: number;
}

export interface SOSEvent {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  location: {
    lat: number;
    lng: number;
  };
  batteryLevel?: number;
  audioRecordingUrl?: string;
  status: 'PENDING' | 'ACCEPTED' | 'ARRIVED' | 'RESOLVED' | 'CANCELLED';
  createdAt: string;
  responders?: SOSResponder[];
}

export const sosService = {
  /**
   * Fetch all active and recent emergency SOS events.
   */
  async getActiveSOS(): Promise<SOSEvent[]> {
    const response = (await apiClient.get('/sos/active')) as any;
    const data: SOSEvent[] = response.data?.events || response.data || response || [];
    return Array.isArray(data) ? data : [];
  },

  /**
   * Mark an emergency SOS event as resolved.
   */
  async resolveSOS(id: string): Promise<SOSEvent> {
    const response = (await apiClient.patch(`/sos/${id}/resolve`)) as any;
    return response.data || response;
  },
};
