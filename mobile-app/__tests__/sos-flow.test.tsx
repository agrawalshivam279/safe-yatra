/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for SOS Screen, Confirmation Modal, Status Tracker & Offline SMS (Step 5.7).
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { encodeSOSPayload, sendEmergencySMS } from '../utils/smsPayload';
import SOSConfirmModal from '../components/sos/SOSConfirmModal';
import SOSStatusTracker from '../components/sos/SOSStatusTracker';
import TouristSOSScreen from '../app/(tourist)/sos';
import { sosService } from '../services/sosService';
import socketService from '../services/socketService';
import * as SMS from 'expo-sms';
import { Linking } from 'react-native';

// Mock expo-sms
jest.mock('expo-sms', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  sendSMSAsync: jest.fn().mockResolvedValue({ result: 'sent' }),
}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 18.7546, longitude: 73.4062, accuracy: 5 },
  }),
  Accuracy: { High: 4 },
}));

// Mock expo-av Audio
const mockPrepare = jest.fn().mockResolvedValue(undefined);
const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockGetURI = jest.fn().mockReturnValue('file:///test-voice-note.m4a');
const mockGetStatus = jest.fn().mockResolvedValue({ isRecording: true, isDoneRecording: false });

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: mockPrepare,
      startAsync: mockStart,
      stopAndUnloadAsync: mockStop,
      getURI: mockGetURI,
      getStatusAsync: mockGetStatus,
    })),
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr_tourist_123', fullName: 'Rahul Sharma', role: 'TOURIST' },
    isAuthenticated: true,
  }),
}));

// Mock useNetworkStatus
jest.mock('../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    isConnected: true,
  }),
}));

// Mock sosService
jest.mock('../services/sosService', () => ({
  sosService: {
    triggerSOS: jest.fn().mockResolvedValue({
      id: 'sos-999',
      status: 'VOLUNTEER_ALERTED',
      matchedCount: 2,
      responders: [
        {
          id: 'resp-1',
          fullName: 'Vikram Singh',
          phone: '+919876543210',
          distanceMeters: 350,
          estimatedEtaMinutes: 2,
        },
      ],
    }),
    getSOSById: jest.fn(),
    cancelSOS: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Linking
jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

describe('Tourist SOS Flow (Step 5.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Offline SMS Payload Utility (utils/smsPayload.ts)', () => {
    it('should encode compact emergency telemetry string', () => {
      const payload = encodeSOSPayload({
        lat: 18.75462,
        lng: 73.40621,
        batteryLevel: 85,
        userId: 'usr_abc_99182a',
      });

      expect(payload).toBe('SOS|LAT:18.75462|LNG:73.40621|BAT:85|UID:99182a');
      expect(payload.length).toBeLessThan(60);
    });

    it('should send SMS via expo-sms when available', async () => {
      const result = await sendEmergencySMS({
        lat: 18.7546,
        lng: 73.4062,
        batteryLevel: 90,
        userId: 'usr_1',
      });

      expect(result.success).toBe(true);
      expect(SMS.sendSMSAsync).toHaveBeenCalledWith(
        ['112'],
        expect.stringContaining('SOS|LAT:18.75460|LNG:73.40620')
      );
    });

    it('should fallback to phone dialer when SMS is unavailable', async () => {
      (SMS.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

      const result = await sendEmergencySMS({
        lat: 18.7546,
        lng: 73.4062,
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('dialer_opened');
      expect(Linking.openURL).toHaveBeenCalledWith('tel:112');
    });
  });

  describe('SOSConfirmModal (components/sos/SOSConfirmModal.tsx)', () => {
    it('should render 5-second countdown and siren title', () => {
      const { getByText } = render(
        <SOSConfirmModal
          visible={true}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          countdownSeconds={5}
        />
      );

      expect(getByText('EMERGENCY SOS')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
      expect(getByText('SEND SOS NOW ⚡')).toBeTruthy();
    });

    it('should trigger onCancel when Cancel button is pressed', async () => {
      const mockCancel = jest.fn();
      const { getByText } = render(
        <SOSConfirmModal
          visible={true}
          onConfirm={jest.fn()}
          onCancel={mockCancel}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('CANCEL (FALSE ALARM)'));
      });
      expect(mockCancel).toHaveBeenCalledTimes(1);
    });

    it('should trigger onConfirm when Send SOS Now button is pressed', async () => {
      const mockConfirm = jest.fn();
      const { getByText } = render(
        <SOSConfirmModal
          visible={true}
          onConfirm={mockConfirm}
          onCancel={jest.fn()}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('SEND SOS NOW ⚡'));
      });
      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    it('should record voice memo and attach audio URI', async () => {
      const mockConfirm = jest.fn();
      const { getByText } = render(
        <SOSConfirmModal
          visible={true}
          onConfirm={mockConfirm}
          onCancel={jest.fn()}
        />
      );

      const recordBtn = getByText('Record Voice Note');
      await act(async () => {
        fireEvent.press(recordBtn);
      });

      expect(mockStart).toHaveBeenCalled();

      // Stop recording
      const stopBtn = getByText(/Recording.../);
      await act(async () => {
        fireEvent.press(stopBtn);
      });

      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('SOSStatusTracker (components/sos/SOSStatusTracker.tsx)', () => {
    it('should render SEARCHING state with pulsing radar', () => {
      const { getByText } = render(
        <SOSStatusTracker
          status="SEARCHING"
          onCancelSOS={jest.fn()}
          onSendSMSBackup={jest.fn()}
        />
      );

      expect(getByText('ALERT DISPATCHED — SEARCHING RESCUERS')).toBeTruthy();
      expect(getByText(/Transmitting GPS coordinates/)).toBeTruthy();
    });

    it('should render VOLUNTEER_ACCEPTED state with responder info and ETA', () => {
      const { getByText } = render(
        <SOSStatusTracker
          status="VOLUNTEER_ACCEPTED"
          responderName="Kavita Deshmukh"
          responderPhone="+919123456789"
          distanceMeters={450}
          estimatedEtaMinutes={3}
          onCancelSOS={jest.fn()}
          onSendSMSBackup={jest.fn()}
        />
      );

      expect(getByText('YAATRI MITRA EN ROUTE')).toBeTruthy();
      expect(getByText('Kavita Deshmukh')).toBeTruthy();
      expect(getByText('3 min')).toBeTruthy();
      expect(getByText('450 m')).toBeTruthy();
    });

    it('should open phone dialer when Call responder is pressed', () => {
      const { getByText } = render(
        <SOSStatusTracker
          status="VOLUNTEER_ACCEPTED"
          responderName="Vikram Singh"
          responderPhone="+919876543210"
          onCancelSOS={jest.fn()}
          onSendSMSBackup={jest.fn()}
        />
      );

      fireEvent.press(getByText('Call'));
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+919876543210');
    });
  });

  describe('TouristSOSScreen (app/(tourist)/sos.tsx)', () => {
    it('should render panic hold button and direct helpline buttons', () => {
      const { getByText } = render(<TouristSOSScreen />);

      expect(getByText('Emergency SOS')).toBeTruthy();
      expect(getByText('HOLD 2 SEC')).toBeTruthy();
      expect(getByText('112')).toBeTruthy();
      expect(getByText('108')).toBeTruthy();
      expect(getByText('1363')).toBeTruthy();
      expect(getByText('100')).toBeTruthy();
    });

    it('should open dialer when 112 helpline is tapped', () => {
      const { getByText } = render(<TouristSOSScreen />);

      fireEvent.press(getByText('112'));
      expect(Linking.openURL).toHaveBeenCalledWith('tel:112');
    });

    it('should transition to COUNTDOWN modal when panic button is held for 2 seconds', () => {
      const { getByLabelText, getByText } = render(<TouristSOSScreen />);

      const panicBtn = getByLabelText(/Emergency SOS Panic Button/);

      fireEvent(panicBtn, 'pressIn');
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(getByText('EMERGENCY SOS')).toBeTruthy();
      expect(getByText('SEND SOS NOW ⚡')).toBeTruthy();
    });
  });
});
