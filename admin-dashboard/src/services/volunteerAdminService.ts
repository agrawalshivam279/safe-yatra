/**
 * Safe Yatra — Admin Dashboard Yaatri Mitra Volunteer Administration Service
 * Manages volunteer directory, on-duty status, and verification workflows.
 */

import { apiClient } from './api';

export interface VolunteerRecord {
  id: string;
  userId: string;
  name: string;
  phone: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  isOnDuty: boolean;
  totalResponses: number;
  rating: number;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  joinedAt: string;
}

export const volunteerAdminService = {
  /**
   * Fetch list of all registered Yaatri Mitra volunteers.
   */
  async getVolunteers(): Promise<VolunteerRecord[]> {
    const response = (await apiClient.get('/volunteers')) as any;
    const data: VolunteerRecord[] =
      response.data?.volunteers || response.data || response || [];
    return Array.isArray(data) ? data : [];
  },

  /**
   * Verify a pending Yaatri Mitra volunteer.
   */
  async verifyVolunteer(id: string): Promise<VolunteerRecord> {
    const response = (await apiClient.patch(`/volunteers/${id}/verify`, {})) as any;
    return response.data?.volunteer || response.data || response;
  },

  /**
   * Toggle or update a volunteer's on-duty status.
   */
  async toggleDutyStatus(id: string, isOnDuty: boolean): Promise<VolunteerRecord> {
    const response = (await apiClient.patch(`/volunteers/${id}/status`, { isOnDuty })) as any;
    return response.data?.volunteer || response.data || response;
  },
};
