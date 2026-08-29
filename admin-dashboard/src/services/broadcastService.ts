/**
 * Safe Yatra — Admin Dashboard Broadcast Alert Service
 * Transmits emergency sector broadcasts to mobile users and field responders.
 */

import { apiClient } from './api';

export interface SendBroadcastPayload {
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'EMERGENCY';
  zoneId?: string;
  expiresAt?: string;
}

export interface BroadcastResult {
  broadcastId: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'EMERGENCY';
  zoneId?: string;
  sentAt: string;
  recipientsCount?: number;
}

export const broadcastService = {
  /**
   * Transmit an emergency broadcast alert to mobile tourists and responders.
   */
  async sendBroadcast(payload: SendBroadcastPayload): Promise<BroadcastResult> {
    const response = (await apiClient.post('/admin/broadcast', payload)) as any;
    const data: BroadcastResult = response.data?.broadcast || response.data || response;
    return data;
  },
};
