/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for Safety Briefing Card & Briefing Screen (Step 5.6).
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SafetyBriefingCard, { SafetyBriefingData } from '../components/briefing/SafetyBriefingCard';
import BriefingScreen from '../app/(tourist)/briefing';
import apiClient from '../services/api';

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

// Mock API Client
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('Pre-Trip Safety Briefing (Step 5.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockBriefingData: SafetyBriefingData = {
    destination: 'Kedarnath',
    overallScore: 82,
    tier: 'CRITICAL',
    factors: {
      weather: { score: 88, weight: 0.35, details: 'Heavy rainfall 180mm/6hr' },
      terrain: { score: 85, weight: 0.20, details: 'Steep 45° slope, 12m from waterfall' },
      crowd: { score: 75, weight: 0.25, details: 'Estimated 1,400 tourists present' },
      history: { score: 80, weight: 0.20, details: 'Past flash flood occurrences' },
    },
    advisory: 'Avoid trekking past 4 PM. Exercise caution near stream crossings.',
    generatedAt: '2026-08-29T14:30:00Z',
  };

  describe('SafetyBriefingCard Component', () => {
    it('should render destination, risk score gauge and tier badge', () => {
      const { getByText } = render(<SafetyBriefingCard briefing={mockBriefingData} />);

      expect(getByText('Kedarnath')).toBeTruthy();
      expect(getByText('82')).toBeTruthy();
      expect(getByText('CRITICAL DANGER')).toBeTruthy();
    });

    it('should render all 4 risk factor breakdowns with details', () => {
      const { getByText } = render(<SafetyBriefingCard briefing={mockBriefingData} />);

      expect(getByText(/Weather & Meteorology/)).toBeTruthy();
      expect(getByText('88/100')).toBeTruthy();
      expect(getByText(/Heavy rainfall 180mm\/6hr/)).toBeTruthy();

      expect(getByText(/Terrain & Elevation/)).toBeTruthy();
      expect(getByText('85/100')).toBeTruthy();

      expect(getByText(/Crowd Density/)).toBeTruthy();
      expect(getByText('75/100')).toBeTruthy();

      expect(getByText(/Historical Incidents/)).toBeTruthy();
      expect(getByText('80/100')).toBeTruthy();
    });

    it('should render actionable travel advisory', () => {
      const { getByText } = render(<SafetyBriefingCard briefing={mockBriefingData} />);

      expect(getByText('Actionable Travel Advisory')).toBeTruthy();
      expect(getByText(/Avoid trekking past 4 PM/)).toBeTruthy();
    });
  });

  describe('BriefingScreen (app/(tourist)/briefing.tsx)', () => {
    it('should display empty state guidance initially', () => {
      const { getByText, getByPlaceholderText } = render(<BriefingScreen />);

      expect(getByText('Pre-Trip Safety Briefing')).toBeTruthy();
      expect(getByText('Proactive Pilgrimage Safety')).toBeTruthy();
      expect(getByPlaceholderText('Search destination (e.g. Kedarnath)')).toBeTruthy();
    });

    it('should trigger API call on quick destination pill press and render result', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: mockBriefingData },
      });

      const { getByLabelText, getByText } = render(<BriefingScreen />);

      fireEvent.press(getByLabelText('Select Kedarnath'));

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/danger/briefing/Kedarnath');
        expect(getByText('CRITICAL DANGER')).toBeTruthy();
        expect(getByText(/Avoid trekking past 4 PM/)).toBeTruthy();
      });
    });

    it('should display error banner when API returns error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValueOnce(
        new Error('Network error loading briefing')
      );

      const { getByPlaceholderText, getByLabelText, getByText } = render(<BriefingScreen />);

      fireEvent.changeText(
        getByPlaceholderText('Search destination (e.g. Kedarnath)'),
        'UnknownPlace'
      );
      fireEvent.press(getByLabelText('Search destination safety briefing'));

      await waitFor(() => {
        expect(getByText(/Network error loading briefing/)).toBeTruthy();
      });
    });
  });
});
