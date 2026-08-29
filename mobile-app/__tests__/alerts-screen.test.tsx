/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for Tourist Alerts Screen & Push Notification Service (Step 5.8).
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import notificationService, { StoredAlert } from '../services/notificationService';
import AlertHistoryCard, {
  formatRelativeTime,
  getAlertBadgeStyle,
} from '../components/alerts/AlertHistoryCard';
import TouristAlertsScreen from '../app/(tourist)/alerts';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock-token-123]' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { MAX: 5 },
}));

// Mock Storage
const mockStorageData: Record<string, any> = {};
jest.mock('../services/storage', () => ({
  storage: {
    getUserData: jest.fn().mockImplementation(() => Promise.resolve(mockStorageData)),
    setUserData: jest.fn().mockImplementation((data) => {
      Object.assign(mockStorageData, data);
      return Promise.resolve();
    }),
  },
}));

// Mock API Client
jest.mock('../services/api', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('Tourist Alerts & Notification Service (Step 5.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('NotificationService (services/notificationService.ts)', () => {
    it('should register for push notifications and retrieve token', async () => {
      const token = await notificationService.registerForPushNotifications();
      expect(token).toBe('ExponentPushToken[mock-token-123]');
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    });

    it('should add a new alert and retrieve stored alerts', async () => {
      const newAlert = await notificationService.addAlert({
        type: 'BROADCAST',
        tier: 'CRITICAL',
        title: 'Emergency Flood Alert',
        message: 'Evacuate low-lying trails immediately.',
        zoneName: 'Mandakini River',
      });

      expect(newAlert.id).toBeDefined();
      expect(newAlert.isRead).toBe(false);
      expect(newAlert.title).toBe('Emergency Flood Alert');

      const alerts = await notificationService.getAlerts();
      expect(alerts.some((a) => a.title === 'Emergency Flood Alert')).toBe(true);
    });

    it('should mark a single alert as read', async () => {
      const alerts = await notificationService.getAlerts();
      const target = alerts[0];

      await notificationService.markAsRead(target.id);
      const updated = await notificationService.getAlerts();
      const found = updated.find((a) => a.id === target.id);
      expect(found?.isRead).toBe(true);
    });

    it('should mark all alerts as read', async () => {
      await notificationService.markAllAsRead();
      const updated = await notificationService.getAlerts();
      expect(updated.every((a) => a.isRead)).toBe(true);
    });

    it('should clear all alerts', async () => {
      await notificationService.clearAlerts();
      const updated = await notificationService.getAlerts();
      expect(updated.length).toBe(0);
    });
  });

  describe('AlertHistoryCard (components/alerts/AlertHistoryCard.tsx)', () => {
    const mockAlert: StoredAlert = {
      id: 'test-card-01',
      type: 'GEOFENCE',
      tier: 'CRITICAL',
      title: 'Glacier Incline Danger',
      message: 'Approaching unstable glacier edge with 45° slope.',
      zoneName: 'Kedarnath Sector 1',
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    it('should render alert details, tier badge and unread dot', () => {
      const { getByText } = render(
        <AlertHistoryCard alert={mockAlert} onPress={jest.fn()} />
      );

      expect(getByText('CRITICAL')).toBeTruthy();
      expect(getByText('Glacier Incline Danger')).toBeTruthy();
      expect(getByText(/Kedarnath Sector 1/)).toBeTruthy();
      expect(getByText(/Approaching unstable glacier edge/)).toBeTruthy();
    });

    it('should trigger onPress callback when tapped', () => {
      const mockPress = jest.fn();
      const { getByText } = render(
        <AlertHistoryCard alert={mockAlert} onPress={mockPress} />
      );

      fireEvent.press(getByText('Glacier Incline Danger'));
      expect(mockPress).toHaveBeenCalledWith(mockAlert);
    });

    it('should correctly format relative time', () => {
      const justNow = formatRelativeTime(new Date().toISOString());
      expect(justNow).toBe('Just now');

      const pastMinutes = formatRelativeTime(
        new Date(Date.now() - 1000 * 60 * 25).toISOString()
      );
      expect(pastMinutes).toBe('25m ago');

      const pastHours = formatRelativeTime(
        new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
      );
      expect(pastHours).toBe('3h ago');
    });
  });

  describe('TouristAlertsScreen (app/(tourist)/alerts.tsx)', () => {
    beforeEach(async () => {
      // Clear memory cache before re-seeding
      await notificationService.clearAlerts();

      await notificationService.addAlert({
        type: 'BROADCAST',
        tier: 'CRITICAL',
        title: 'River Flash Flood Warning',
        message: 'Mandakini river level rising rapidly.',
        zoneName: 'Mandakini Valley',
      });
      await notificationService.addAlert({
        type: 'GEOFENCE',
        tier: 'SEVERE',
        title: 'Mana Pass Rockfall Hazard',
        message: 'Rockfall reported on trekking route.',
        zoneName: 'Mana Pass',
      });
    });

    it('should render header title, search bar, and filter tabs', async () => {
      const { getByText, getByPlaceholderText } = render(<TouristAlertsScreen />);

      await waitFor(() => {
        expect(getByText('Hazard Alerts')).toBeTruthy();
        expect(getByPlaceholderText('Search by sector, keyword or alert...')).toBeTruthy();
        expect(getByText('All Alerts')).toBeTruthy();
        expect(getByText('🔴 Critical')).toBeTruthy();
        expect(getByText('🟠 Severe')).toBeTruthy();
        expect(getByText('📢 Broadcast')).toBeTruthy();
      });
    });

    it('should filter alerts by CRITICAL tier', async () => {
      const { getByText, queryByText } = render(<TouristAlertsScreen />);

      await waitFor(() => {
        expect(getByText('River Flash Flood Warning')).toBeTruthy();
      });

      // Press Critical filter
      fireEvent.press(getByText('🔴 Critical'));

      await waitFor(() => {
        expect(getByText('River Flash Flood Warning')).toBeTruthy();
        expect(queryByText('Mana Pass Rockfall Hazard')).toBeNull();
      });
    });

    it('should search alerts by keyword', async () => {
      const { getByPlaceholderText, getByText, queryByText } = render(
        <TouristAlertsScreen />
      );

      await waitFor(() => {
        expect(getByText('Mana Pass Rockfall Hazard')).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Search by sector, keyword or alert...');
      fireEvent.changeText(searchInput, 'Mana Pass');

      await waitFor(() => {
        expect(getByText('Mana Pass Rockfall Hazard')).toBeTruthy();
        expect(queryByText('River Flash Flood Warning')).toBeNull();
      });
    });

    it('should mark all alerts as read when Read All button is clicked', async () => {
      const { getByText } = render(<TouristAlertsScreen />);

      await waitFor(() => {
        expect(getByText('Read All')).toBeTruthy();
      });

      fireEvent.press(getByText('Read All'));

      await waitFor(async () => {
        const alerts = await notificationService.getAlerts();
        expect(alerts.every((a) => a.isRead)).toBe(true);
      });
    });

    it('should open and dismiss detail modal when alert card is pressed', async () => {
      const { getByText, queryByText } = render(<TouristAlertsScreen />);

      await waitFor(() => {
        expect(getByText('River Flash Flood Warning')).toBeTruthy();
      });

      // Tap alert card
      fireEvent.press(getByText('River Flash Flood Warning'));

      await waitFor(() => {
        expect(getByText('Acknowledge & Close')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByText('Acknowledge & Close'));

      await waitFor(() => {
        expect(queryByText('Acknowledge & Close')).toBeNull();
      });
    });
  });
});
