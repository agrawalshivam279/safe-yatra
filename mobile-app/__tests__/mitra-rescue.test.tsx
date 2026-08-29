/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for Yaatri Mitra Volunteer Screens & Active Rescue Flow (Step 5.9).
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import volunteerService, { ActiveSOSItem } from '../services/volunteerService';
import SOSAlertCard from '../components/mitra/SOSAlertCard';
import MitraHomeScreen from '../app/(mitra)/index';
import ActiveSOSRescueScreen from '../app/(mitra)/active-sos';
import socketService from '../services/socketService';
import * as Location from 'expo-location';
import { Linking, Alert, AccessibilityInfo } from 'react-native';

// Mock Expo Router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-mitra-01', name: 'Suresh Raina', fullName: 'Suresh Raina', role: 'YAATRI_MITRA' },
    isAuthenticated: true,
  }),
}));

// Mock Location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 18.755, longitude: 73.407, accuracy: 5, speed: 1.5 },
  }),
  Accuracy: { High: 4 },
}));

// Mock API Client
jest.mock('../services/api', () => {
  const mockApi = {
    patch: jest.fn().mockImplementation((url: string) => {
      if (url.includes('/volunteers/duty')) {
        return Promise.resolve({ data: { success: true, data: { isOnDuty: true } } });
      }
      if (url.includes('/accept')) {
        return Promise.resolve({ data: { success: true, data: { status: 'VOLUNTEER_ACCEPTED' } } });
      }
      if (url.includes('/arrive')) {
        return Promise.resolve({ data: { success: true, data: { status: 'VOLUNTEER_ARRIVED' } } });
      }
      if (url.includes('/resolve')) {
        return Promise.resolve({ data: { success: true, data: { status: 'RESOLVED' } } });
      }
      return Promise.resolve({ data: { success: true } });
    }),
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'sos-test-01',
            userId: 'usr-tourist-01',
            status: 'VOLUNTEER_ALERTED',
            batteryLevel: 25,
            distanceMeters: 420,
            estimatedEtaMinutes: 3,
            lat: 18.7546,
            lng: 73.4062,
            createdAt: new Date().toISOString(),
            user: {
              id: 'usr-tourist-01',
              fullName: 'Deepak Chopra',
              phone: '+919988776655',
            },
          },
        ],
      },
    }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  };

  return {
    __esModule: true,
    default: mockApi,
    apiClient: mockApi,
  };
});

// Mock AccessibilityInfo
AccessibilityInfo.announceForAccessibility = jest.fn();

// Mock Linking & Alert
jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
  if (buttons && buttons.length > 1 && buttons[1].onPress) {
    Promise.resolve().then(() => buttons[1].onPress?.());
  }
});

describe('Yaatri Mitra Volunteer Rescue Flow (Step 5.9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('VolunteerService (services/volunteerService.ts)', () => {
    it('should toggle volunteer duty status', async () => {
      const res = await volunteerService.toggleDutyStatus(true);
      expect(res.isOnDuty).toBe(true);
    });

    it('should retrieve list of active SOS calls', async () => {
      const list = await volunteerService.getActiveSOSList();
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].id).toBe('sos-test-01');
    });

    it('should accept, arrive, and resolve an SOS call', async () => {
      const acceptRes = await volunteerService.acceptSOS('sos-test-01');
      expect(acceptRes.status).toBe('VOLUNTEER_ACCEPTED');

      const arriveRes = await volunteerService.arriveSOS('sos-test-01');
      expect(arriveRes.status).toBe('VOLUNTEER_ARRIVED');

      const resolveRes = await volunteerService.resolveSOS('sos-test-01');
      expect(resolveRes.status).toBe('RESOLVED');
    });
  });

  describe('SOSAlertCard (components/mitra/SOSAlertCard.tsx)', () => {
    const mockSOS: ActiveSOSItem = {
      id: 'sos-card-01',
      userId: 'usr-01',
      status: 'VOLUNTEER_ALERTED',
      batteryLevel: 18,
      distanceMeters: 350,
      estimatedEtaMinutes: 2,
      lat: 18.7546,
      lng: 73.4062,
      createdAt: new Date().toISOString(),
      user: {
        id: 'usr-01',
        fullName: 'Meera Patel',
        phone: '+919123456789',
      },
    };

    it('should render tourist details, distance, ETA, and battery', () => {
      const { getByText } = render(
        <SOSAlertCard sos={mockSOS} onAccept={jest.fn()} />
      );

      expect(getByText('EMERGENCY DISTRESS CALL')).toBeTruthy();
      expect(getByText('Meera Patel')).toBeTruthy();
      expect(getByText('350 m away')).toBeTruthy();
      expect(getByText('~2 min walk')).toBeTruthy();
      expect(getByText('18%')).toBeTruthy();
    });

    it('should trigger onAccept when Accept Rescue button is pressed', () => {
      const mockAccept = jest.fn();
      const { getByLabelText } = render(
        <SOSAlertCard sos={mockSOS} onAccept={mockAccept} />
      );

      fireEvent.press(getByLabelText(/Accept emergency rescue for Meera Patel/i));
      expect(mockAccept).toHaveBeenCalledWith(mockSOS);
    });

    it('should open phone dialer when tourist phone is tapped', () => {
      const { getByText } = render(
        <SOSAlertCard sos={mockSOS} onAccept={jest.fn()} />
      );

      fireEvent.press(getByText('📞 +919123456789'));
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+919123456789');
    });
  });

  describe('MitraHomeScreen (app/(mitra)/index.tsx)', () => {
    it('should render volunteer name, duty toggle switch, and incoming queue', async () => {
      jest.spyOn(volunteerService, 'getActiveSOSList').mockResolvedValue([
        {
          id: 'sos-test-01',
          userId: 'usr-tourist-01',
          status: 'VOLUNTEER_ALERTED',
          batteryLevel: 25,
          distanceMeters: 420,
          estimatedEtaMinutes: 3,
          lat: 18.7546,
          lng: 73.4062,
          createdAt: new Date().toISOString(),
          user: {
            id: 'usr-tourist-01',
            fullName: 'Deepak Chopra',
            phone: '+919988776655',
          },
        },
      ]);

      const { getByText } = render(<MitraHomeScreen />);

      await waitFor(() => {
        expect(getByText('Suresh Raina')).toBeTruthy();
        expect(getByText('ON DUTY')).toBeTruthy();
        expect(getByText('Incoming Distress Calls')).toBeTruthy();
      });
    });

    it('should toggle duty switch', async () => {
      jest.spyOn(volunteerService, 'toggleDutyStatus').mockResolvedValue({ isOnDuty: false });

      const { getByRole } = render(<MitraHomeScreen />);

      await waitFor(() => {
        const switchControl = getByRole('switch');
        fireEvent(switchControl, 'valueChange', false);
      });
    });

    it('should accept SOS and navigate to active rescue screen', async () => {
      jest.spyOn(volunteerService, 'acceptSOS').mockResolvedValue({
        id: 'sos-test-01',
        userId: 'usr-tourist-01',
        status: 'VOLUNTEER_ACCEPTED',
        createdAt: new Date().toISOString(),
      });

      const { getByLabelText } = render(<MitraHomeScreen />);

      await waitFor(() => {
        expect(getByLabelText(/Accept emergency rescue/i)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText(/Accept emergency rescue/i));
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(mitra)/active-sos');
      });
    });
  });

  describe('ActiveSOSRescueScreen (app/(mitra)/active-sos.tsx)', () => {
    it('should render active rescue details and open navigation map', async () => {
      const { getByText, getByLabelText } = render(<ActiveSOSRescueScreen />);

      await waitFor(() => {
        expect(getByText('RESCUE IN PROGRESS — EN ROUTE')).toBeTruthy();
        expect(getByLabelText('Open Turn by Turn Navigation in Google Maps')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Open Turn by Turn Navigation in Google Maps'));
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringContaining('maps')
      );
    });

    it('should confirm arrival when I have Arrived button is pressed', async () => {
      jest.spyOn(volunteerService, 'arriveSOS').mockResolvedValue({
        id: 'sos-demo-active-01',
        userId: 'usr-pilgrim-99',
        status: 'VOLUNTEER_ARRIVED',
        createdAt: new Date().toISOString(),
      });

      const { getByLabelText } = render(<ActiveSOSRescueScreen />);

      await waitFor(() => {
        expect(getByLabelText('Confirm arrival at tourist location')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Confirm arrival at tourist location'));
      });

      await waitFor(() => {
        expect(getByLabelText('Mark emergency rescue as safely resolved')).toBeTruthy();
      });
    });

    it('should resolve rescue and navigate back to queue', async () => {
      jest.spyOn(volunteerService, 'arriveSOS').mockResolvedValue({
        id: 'sos-demo-active-01',
        userId: 'usr-pilgrim-99',
        status: 'VOLUNTEER_ARRIVED',
        createdAt: new Date().toISOString(),
      });
      jest.spyOn(volunteerService, 'resolveSOS').mockResolvedValue({
        id: 'sos-demo-active-01',
        userId: 'usr-pilgrim-99',
        status: 'RESOLVED',
        createdAt: new Date().toISOString(),
      });

      const { getByLabelText } = render(<ActiveSOSRescueScreen />);

      await waitFor(() => {
        expect(getByLabelText('Confirm arrival at tourist location')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Confirm arrival at tourist location'));
      });

      await waitFor(() => {
        expect(getByLabelText('Mark emergency rescue as safely resolved')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText('Mark emergency rescue as safely resolved'));
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/(mitra)');
      });
    });
  });
});
