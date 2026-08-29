/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for Socket Service, Geofence Hook & 3-Second Hold Modal (Step 5.5).
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import socketService, { GeofenceAlertPayload } from '../services/socketService';
import GeofenceWarning from '../components/alerts/GeofenceWarning';

// Mock Socket.io Client
const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
    disconnect: mockDisconnect,
  })),
}));

// Mock Storage
jest.mock('../services/storage', () => ({
  storage: {
    getAccessToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  },
}));

// Mock AccessibilityInfo
jest.mock('react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
  announceForAccessibility: jest.fn(),
}));

describe('Location Streaming & Geofence Alerts (Step 5.5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('SocketService (services/socketService.ts)', () => {
    it('should connect socket and emit location:update', async () => {
      await socketService.connect();

      const locationPayload = {
        lat: 30.7352,
        lng: 79.0669,
        accuracy: 5.0,
        speed: 1.2,
      };

      const emitted = socketService.emitLocationUpdate(locationPayload);
      expect(emitted).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('location:update', locationPayload);
    });

    it('should register geofence:alert event listener and unsubscribe cleanly', () => {
      const mockCallback = jest.fn();
      const unsubscribe = socketService.onGeofenceAlert(mockCallback);

      expect(mockOn).toHaveBeenCalledWith('geofence:alert', expect.any(Function));

      unsubscribe();
      expect(mockOff).toHaveBeenCalledWith('geofence:alert', expect.any(Function));
    });
  });

  describe('GeofenceWarning Modal (components/alerts/GeofenceWarning.tsx)', () => {
    const mockAlert: GeofenceAlertPayload = {
      zoneId: 'zone-kedarnath-glacier',
      zoneName: 'Kedarnath Glacier Restricted Sector',
      dangerScore: 92,
      tier: 'CRITICAL',
      breachType: 'ENTRY',
      justification: 'High probability of serac collapse and torrential rain upstream.',
      timestamp: '2026-08-29T14:30:00Z',
    };

    it('should render danger alert details and zone title', () => {
      const { getByText } = render(
        <GeofenceWarning
          alert={mockAlert}
          visible={true}
          onTurnBack={jest.fn()}
          onAcknowledgeRisk={jest.fn()}
        />
      );

      expect(getByText('CRITICAL HAZARD WARNING')).toBeTruthy();
      expect(getByText('Kedarnath Glacier Restricted Sector')).toBeTruthy();
      expect(getByText(/92\/100/)).toBeTruthy();
      expect(getByText(/High probability of serac collapse/)).toBeTruthy();
    });

    it('should trigger onTurnBack when Turn Back button is clicked', () => {
      const mockTurnBack = jest.fn();
      const { getByText } = render(
        <GeofenceWarning
          alert={mockAlert}
          visible={true}
          onTurnBack={mockTurnBack}
          onAcknowledgeRisk={jest.fn()}
        />
      );

      fireEvent.press(getByText('🛡️ Turn Back (Safe Route)'));
      expect(mockTurnBack).toHaveBeenCalledTimes(1);
    });

    it('should NOT trigger onAcknowledgeRisk if press is released before 3 seconds', () => {
      const mockAcknowledge = jest.fn();
      const { getByLabelText } = render(
        <GeofenceWarning
          alert={mockAlert}
          visible={true}
          onTurnBack={jest.fn()}
          onAcknowledgeRisk={mockAcknowledge}
        />
      );

      const overrideBtn = getByLabelText('I Understand the Risk, Hold for 3 seconds');

      // User presses down
      fireEvent(overrideBtn, 'pressIn');
      act(() => {
        jest.advanceTimersByTime(1500); // Only 1.5 seconds held
      });

      // User releases early
      fireEvent(overrideBtn, 'pressOut');
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockAcknowledge).not.toHaveBeenCalled();
    });

    it('should trigger onAcknowledgeRisk when held for full 3000ms', () => {
      const mockAcknowledge = jest.fn();
      const { getByLabelText } = render(
        <GeofenceWarning
          alert={mockAlert}
          visible={true}
          onTurnBack={jest.fn()}
          onAcknowledgeRisk={mockAcknowledge}
        />
      );

      const button = getByLabelText('I Understand the Risk, Hold for 3 seconds');

      // User initiates hold
      fireEvent(button, 'pressIn');

      act(() => {
        jest.advanceTimersByTime(3000); // Full 3 seconds
      });

      expect(mockAcknowledge).toHaveBeenCalledWith('zone-kedarnath-glacier');
    });
  });
});
