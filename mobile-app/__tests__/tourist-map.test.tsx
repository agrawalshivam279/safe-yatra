/**
 * Safe Yatra — Mobile App
 * Unit & Integration Tests for Tourist Home Map, Danger Polygons & SOS Button (Step 5.4).
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DangerZoneMap, {
  parseGeoJsonCoordinates,
  getTierColor,
  DangerZone,
} from '../components/maps/DangerZoneMap';
import SOSButton from '../components/sos/SOSButton';
import TouristHomeScreen from '../app/(tourist)/index';
import apiClient from '../services/api';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props: any) => <View testID="mock-map-view" {...props} />;
  const MockPolygon = (props: any) => <View testID="mock-polygon" {...props} />;
  const MockMarker = (props: any) => <View testID="mock-marker" {...props} />;
  const MockCallout = (props: any) => <View testID="mock-callout" {...props} />;

  return {
    __esModule: true,
    default: MockMapView,
    Polygon: MockPolygon,
    Marker: MockMarker,
    Callout: MockCallout,
    PROVIDER_DEFAULT: 'default',
  };
});

// Mock Expo Router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

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

describe('Tourist Home Map & Danger Polygons (Step 5.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GeoJSON Coordinate Parser & Tier Colors', () => {
    it('should correctly invert PostGIS [lng, lat] to { latitude, longitude }', () => {
      const geoJsonBoundary = {
        type: 'Polygon',
        coordinates: [
          [
            [79.0669, 30.7352],
            [79.0769, 30.7352],
            [79.0769, 30.7452],
            [79.0669, 30.7352],
          ],
        ],
      };

      const parsed = parseGeoJsonCoordinates(geoJsonBoundary);
      expect(parsed).toHaveLength(4);
      expect(parsed[0]).toEqual({ latitude: 30.7352, longitude: 79.0669 });
      expect(parsed[2]).toEqual({ latitude: 30.7452, longitude: 79.0769 });
    });

    it('should parse stringified GeoJSON boundary safely', () => {
      const stringified = JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [73.4062, 18.7546],
            [73.4162, 18.7546],
            [73.4062, 18.7546],
          ],
        ],
      });

      const parsed = parseGeoJsonCoordinates(stringified);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual({ latitude: 18.7546, longitude: 73.4062 });
    });

    it('should return correct color specifications for all 4 danger tiers', () => {
      expect(getTierColor('LOW').strokeColor).toBe('#27AE60');
      expect(getTierColor('LOW').fillColor).toContain('39, 174, 96');

      expect(getTierColor('MODERATE').strokeColor).toBe('#F39C12');
      expect(getTierColor('MODERATE').fillColor).toContain('243, 156, 18');

      expect(getTierColor('SEVERE').strokeColor).toBe('#E67E22');
      expect(getTierColor('SEVERE').fillColor).toContain('230, 126, 34');

      expect(getTierColor('CRITICAL').strokeColor).toBe('#E74C3C');
      expect(getTierColor('CRITICAL').fillColor).toContain('231, 76, 60');
    });
  });

  describe('Floating SOSButton Component', () => {
    it('should render panic button with accessibility attributes', () => {
      const mockOnPress = jest.fn();
      const { getByText, getByLabelText } = render(
        <SOSButton onPress={mockOnPress} size={68} />
      );

      expect(getByText('SOS')).toBeTruthy();
      expect(getByText('🚨')).toBeTruthy();

      const button = getByLabelText('Emergency SOS Panic Button');
      expect(button).toBeTruthy();

      fireEvent.press(button);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('DangerZoneMap Component', () => {
    it('should render map view with danger zone polygons', () => {
      const mockZones: DangerZone[] = [
        {
          id: 'zone-1',
          name: 'Kedarnath Temple Sector',
          dangerScore: 82,
          currentTier: 'CRITICAL',
          centerLat: 30.7352,
          centerLng: 79.0669,
          boundary: {
            type: 'Polygon',
            coordinates: [
              [
                [79.06, 30.73],
                [79.07, 30.73],
                [79.07, 30.74],
                [79.06, 30.73],
              ],
            ],
          },
        },
      ];

      const { getByTestId, getAllByTestId } = render(
        <DangerZoneMap
          zones={mockZones}
          userLocation={{ latitude: 30.7352, longitude: 79.0669 }}
        />
      );

      expect(getByTestId('mock-map-view')).toBeTruthy();
      expect(getAllByTestId('mock-polygon').length).toBe(1);
    });
  });

  describe('TouristHomeScreen (app/(tourist)/index.tsx)', () => {
    it('should fetch zones on mount and render top status pill', async () => {
      const mockZonesData = [
        {
          id: 'zone-1',
          name: 'Kedarnath Temple Sector',
          dangerScore: 82,
          currentTier: 'CRITICAL',
          centerLat: 30.7352,
          centerLng: 79.0669,
          boundary: {
            type: 'Polygon',
            coordinates: [
              [
                [79.06, 30.73],
                [79.07, 30.73],
                [79.07, 30.74],
                [79.06, 30.73],
              ],
            ],
          },
        },
        {
          id: 'zone-2',
          name: 'Gaurikund Basecamp',
          dangerScore: 20,
          currentTier: 'LOW',
          centerLat: 30.6500,
          centerLng: 79.0300,
          boundary: {
            type: 'Polygon',
            coordinates: [
              [
                [79.02, 30.64],
                [79.04, 30.64],
                [79.04, 30.66],
                [79.02, 30.64],
              ],
            ],
          },
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: mockZonesData },
      });

      const { getByText, getByLabelText } = render(<TouristHomeScreen />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/api/v1/danger/zones');
        expect(getByText('Kedarnath Hotspot')).toBeTruthy();
      });

      // Press floating SOS button
      const sosButton = getByLabelText('Emergency SOS Panic Button');
      fireEvent.press(sosButton);
      expect(mockPush).toHaveBeenCalledWith('/(tourist)/sos');
    });
  });
});
