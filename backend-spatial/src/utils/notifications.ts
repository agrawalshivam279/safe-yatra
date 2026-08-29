/**
 * Safe Yatra — Backend Spatial
 * Cross-Platform Push Notification Dispatcher (Expo / FCM Relay).
 */

import axios from 'axios';

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default';
  priority?: 'high' | 'default';
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  ticketId?: string;
  recipientCount: number;
  error?: string;
}

export class NotificationDispatcher {
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Sends a single or batch push notification to registered Expo / FCM tokens.
   */
  public async sendPushNotification(
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const validTokens = recipients.filter((t) => typeof t === 'string' && t.trim().length > 0);

    if (validTokens.length === 0) {
      return { success: true, recipientCount: 0 };
    }

    const messages = validTokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: payload.sound || 'default',
      priority: payload.priority || 'high',
      channelId: payload.channelId || 'emergency_alerts',
    }));

    try {
      if (process.env.NODE_ENV === 'test' || process.env.MOCK_PUSH === 'true') {
        return { success: true, recipientCount: validTokens.length, ticketId: 'mock-ticket-ok' };
      }

      const response = await axios.post(NotificationDispatcher.EXPO_PUSH_URL, messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      return {
        success: true,
        recipientCount: validTokens.length,
        ticketId: response.data?.data?.[0]?.id || 'ticket-ok',
      };
    } catch (err: any) {
      console.warn(`Push notification dispatch failed: ${err.message}`);
      return {
        success: false,
        recipientCount: validTokens.length,
        error: err.message,
      };
    }
  }

  /**
   * Dispatches urgent SOS alert push notifications to matched Yaatri Mitra volunteers.
   */
  public async sendSOSPushToVolunteers(
    tokens: string[],
    sosDetails: {
      id: string;
      touristName?: string;
      lat: number;
      lng: number;
      distanceMeters?: number;
    }
  ): Promise<PushNotificationResult> {
    return this.sendPushNotification({
      to: tokens,
      title: '🚨 EMERGENCY SOS DISPATCH',
      body: `${sosDetails.touristName || 'A distressed pilgrim'} needs immediate assistance nearby!`,
      data: {
        type: 'SOS_TRIGGERED',
        sosId: sosDetails.id,
        lat: sosDetails.lat,
        lng: sosDetails.lng,
      },
      priority: 'high',
      channelId: 'emergency_alerts',
    });
  }
}

export const notificationDispatcher = new NotificationDispatcher();
export default notificationDispatcher;
