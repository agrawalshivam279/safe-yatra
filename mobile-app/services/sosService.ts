/**
 * Safe Yatra — Mobile App
 * SOS Emergency Dispatch API Client Service.
 */

import apiClient from './api';

export interface TriggerSOSInput {
  lat: number;
  lng: number;
  batteryLevel?: number;
  audioUrl?: string;
}

export interface SOSEntity {
  id: string;
  userId: string;
  status: 'TRIGGERED' | 'VOLUNTEER_ALERTED' | 'VOLUNTEER_ACCEPTED' | 'VOLUNTEER_ARRIVED' | 'RESOLVED' | 'CANCELLED';
  dangerScoreSnapshot?: number;
  batteryLevel?: number;
  audioUrl?: string;
  createdAt: string;
  resolvedAt?: string;
  cancelledAt?: string;
  responder?: {
    id: string;
    fullName: string;
    phone: string;
  };
  distanceMeters?: number;
  estimatedEtaMinutes?: number;
}

export interface TriggerSOSResponse {
  id: string;
  status: string;
  matchedCount?: number;
  responders?: Array<{
    id: string;
    userId: string;
    fullName: string;
    phone: string;
    distanceMeters: number;
    estimatedEtaMinutes: number;
  }>;
}

export const sosService = {
  /**
   * Dispatches emergency SOS distress alert.
   */
  async triggerSOS(input: TriggerSOSInput): Promise<TriggerSOSResponse> {
    const response = await apiClient.post('/api/v1/sos/trigger', input);
    return response.data?.data || response.data;
  },

  /**
   * Retrieves active SOS details and responder status by ID.
   */
  async getSOSById(id: string): Promise<SOSEntity> {
    const response = await apiClient.get(`/api/v1/sos/${id}`);
    return response.data?.data || response.data;
  },

  /**
   * Cancels active emergency SOS.
   */
  async cancelSOS(id: string, reason?: string): Promise<void> {
    await apiClient.patch(`/api/v1/sos/${id}/cancel`, { reason });
  },
};

export default sosService;
