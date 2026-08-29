/**
 * Safe Yatra — Mobile App
 * Yaatri Mitra Volunteer API Client Service.
 */

import { apiClient } from './api';

export interface VolunteerProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isOnDuty: boolean;
  totalResponses: number;
  rating?: number;
}

export interface ActiveSOSItem {
  id: string;
  userId: string;
  status: 'TRIGGERED' | 'VOLUNTEER_ALERTED' | 'VOLUNTEER_ACCEPTED' | 'VOLUNTEER_ARRIVED' | 'RESOLVED' | 'CANCELLED';
  dangerScoreSnapshot?: number;
  batteryLevel?: number;
  audioUrl?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    phone: string;
  };
  distanceMeters?: number;
  estimatedEtaMinutes?: number;
  lat?: number;
  lng?: number;
}

export const volunteerService = {
  /**
   * Toggles volunteer on-duty / off-duty readiness status.
   */
  async toggleDutyStatus(isOnDuty: boolean): Promise<{ isOnDuty: boolean }> {
    const response = await apiClient.patch('/api/v1/volunteers/duty', { isOnDuty });
    return response.data?.data || response.data;
  },

  /**
   * Retrieves all active SOS emergencies within the volunteer's coverage radius.
   */
  async getActiveSOSList(): Promise<ActiveSOSItem[]> {
    const response = await apiClient.get('/api/v1/sos/active');
    return response.data?.data || response.data || [];
  },

  /**
   * Accepts an emergency distress call.
   */
  async acceptSOS(sosId: string): Promise<ActiveSOSItem> {
    const response = await apiClient.patch(`/api/v1/sos/${sosId}/accept`);
    return response.data?.data || response.data;
  },

  /**
   * Confirms volunteer arrival at tourist coordinates.
   */
  async arriveSOS(sosId: string): Promise<ActiveSOSItem> {
    const response = await apiClient.patch(`/api/v1/sos/${sosId}/arrive`);
    return response.data?.data || response.data;
  },

  /**
   * Marks an active emergency as resolved.
   */
  async resolveSOS(sosId: string, notes?: string): Promise<ActiveSOSItem> {
    const response = await apiClient.patch(`/api/v1/sos/${sosId}/resolve`, { notes });
    return response.data?.data || response.data;
  },

  /**
   * Pings volunteer's current GPS location to server.
   */
  async recordLocation(lat: number, lng: number): Promise<void> {
    await apiClient.post('/api/v1/volunteers/location', { lat, lng });
  },
};

export default volunteerService;
