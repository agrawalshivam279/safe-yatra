/**
 * Safe Yatra — Mobile App
 * Push Notification Service & Persistent Local Alert History Store.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from './storage';
import apiClient from './api';

export interface StoredAlert {
  id: string;
  type: 'GEOFENCE' | 'BROADCAST' | 'SOS' | 'SYSTEM';
  tier?: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  title: string;
  message: string;
  justification?: string;
  zoneId?: string;
  zoneName?: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

const ALERTS_STORAGE_KEY = 'safe_yatra_stored_alerts';

// Initial seed alerts for high-fidelity tourist demo
const INITIAL_DEMO_ALERTS: StoredAlert[] = [
  {
    id: 'alert-demo-01',
    type: 'BROADCAST',
    tier: 'CRITICAL',
    title: 'Flash Flood Warning — Sector B4',
    message: 'High precipitation upstream. Mandakini river water level rising rapidly. Avoid riverside trails.',
    justification: 'Over 140mm rainfall in last 3 hours upstream. Upstream reservoir discharge alert active.',
    zoneId: 'zone-kedarnath-river-01',
    zoneName: 'Mandakini River Valley',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    isRead: false,
  },
  {
    id: 'alert-demo-02',
    type: 'GEOFENCE',
    tier: 'SEVERE',
    title: 'High Slope & Landslide Alert',
    message: 'Entering steep incline zone. Trekking path slippery due to overnight rain.',
    justification: 'Terrain slope > 45° with loose rock classification. Caution advised for senior pilgrims.',
    zoneId: 'zone-badrinath-steep-02',
    zoneName: 'Mana Pass Trek Sector',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    isRead: true,
  },
  {
    id: 'alert-demo-03',
    type: 'SYSTEM',
    tier: 'LOW',
    title: 'Pre-Trip Safety Briefing Ready',
    message: 'Your safety dossier for Kedarnath Shrine has been updated with real-time crowd estimates.',
    justification: 'Pilgrim footfall is currently moderate (~420 persons in queue). Weather is clear.',
    zoneId: 'zone-kedarnath-temple',
    zoneName: 'Kedarnath Temple Complex',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
    isRead: true,
  },
];

class NotificationService {
  private alertsMemoryCache: StoredAlert[] | null = null;

  /**
   * Configures foreground notification handler.
   */
  public initNotificationHandler(): void {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch {
      // Ignored in test / headless environments
    }
  }

  /**
   * Requests push notification permissions and registers push token with backend.
   */
  public async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      // Register with Backend Spatial if authenticated
      if (token) {
        try {
          await apiClient.post('/api/v1/users/push-token', { pushToken: token });
        } catch {
          // Non-blocking if endpoint is unauthenticated or offline
        }
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('emergency_alerts', {
          name: 'Emergency & Safety Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#DC2626',
        });
      }

      return token;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all stored alerts (from memory cache or SecureStore).
   */
  public async getAlerts(): Promise<StoredAlert[]> {
    if (this.alertsMemoryCache !== null) {
      return this.alertsMemoryCache;
    }

    try {
      const storedJson = await storage.getUserData();
      if (storedJson && (storedJson as any)[ALERTS_STORAGE_KEY]) {
        this.alertsMemoryCache = (storedJson as any)[ALERTS_STORAGE_KEY];
        return this.alertsMemoryCache || [];
      }
    } catch {
      // Fall back to seed alerts
    }

    this.alertsMemoryCache = [...INITIAL_DEMO_ALERTS];
    return this.alertsMemoryCache;
  }

  /**
   * Appends a new alert to history.
   */
  public async addAlert(
    alertInput: Omit<StoredAlert, 'id' | 'timestamp' | 'isRead'>
  ): Promise<StoredAlert> {
    const alerts = await this.getAlerts();
    const newAlert: StoredAlert = {
      ...alertInput,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    const updated = [newAlert, ...alerts];
    this.alertsMemoryCache = updated;
    await this.persistAlerts(updated);
    return newAlert;
  }

  /**
   * Marks a specific alert as read.
   */
  public async markAsRead(alertId: string): Promise<void> {
    const alerts = await this.getAlerts();
    const updated = alerts.map((a) =>
      a.id === alertId ? { ...a, isRead: true } : a
    );
    this.alertsMemoryCache = updated;
    await this.persistAlerts(updated);
  }

  /**
   * Marks all alerts as read.
   */
  public async markAllAsRead(): Promise<void> {
    const alerts = await this.getAlerts();
    const updated = alerts.map((a) => ({ ...a, isRead: true }));
    this.alertsMemoryCache = updated;
    await this.persistAlerts(updated);
  }

  /**
   * Clears all stored alert history.
   */
  public async clearAlerts(): Promise<void> {
    this.alertsMemoryCache = [];
    await this.persistAlerts([]);
  }

  /**
   * Subscribes to foreground notifications.
   */
  public addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Subscribes to user tapping a notification.
   */
  public addResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  private async persistAlerts(alerts: StoredAlert[]): Promise<void> {
    try {
      const existingUserData = (await storage.getUserData()) || {};
      await storage.setUserData({
        ...existingUserData,
        [ALERTS_STORAGE_KEY]: alerts,
      });
    } catch {
      // Storage fallback in memory
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
