/**
 * Safe Yatra — Admin Macro Heatmap & Hazard Layers Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MacroHeatmapPage from '../src/app/heatmap/page';
import { HeatmapMap } from '../src/components/maps/HeatmapMap';
import { mapService, HeatmapData, ZoneData } from '../src/services/mapService';
import { socketService } from '../src/services/socketService';
import { apiClient } from '../src/services/api';

// Mock Socket.IO client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: true,
    connect: jest.fn().mockReturnThis(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
  return {
    io: jest.fn(() => mockSocket),
    Socket: jest.fn(),
  };
});

const mockHeatmapData: HeatmapData = {
  clusters: [
    { lat: 18.7546, lng: 73.4062, count: 42, intensity: 0.85 },
    { lat: 18.7612, lng: 73.4125, count: 15, intensity: 0.35 },
  ],
  totalPoints: 57,
  generatedAt: '2026-08-29T17:00:00.000Z',
};

const mockZonesData: ZoneData[] = [
  {
    id: 'zone_tiger_point',
    name: 'Tiger Point Cliff',
    dangerScore: 82,
    tier: 'CRITICAL',
    coordinates: { lat: 18.7546, lng: 73.4062 },
    factors: {
      weather: { score: 90, weight: 0.35 },
      terrain: { score: 85, weight: 0.2 },
      crowd: { score: 70, weight: 0.25 },
      history: { score: 80, weight: 0.2 },
    },
    justification: 'Extreme flash flood hazard and slippery ravine edge.',
  },
  {
    id: 'zone_bhushi_dam',
    name: 'Bhushi Dam Steps',
    dangerScore: 45,
    tier: 'MODERATE',
    coordinates: { lat: 18.7421, lng: 73.4211 },
    factors: {
      weather: { score: 40, weight: 0.35 },
      terrain: { score: 50, weight: 0.2 },
      crowd: { score: 60, weight: 0.25 },
      history: { score: 30, weight: 0.2 },
    },
    justification: 'Moderate water flow across tourist steps.',
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
}

describe('1. Map Service & REST Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches heatmap density clusters from /admin/heatmap', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockHeatmapData,
    } as any);

    const data = await mapService.getHeatmapData();
    expect(data).toEqual(mockHeatmapData);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/heatmap', {
      params: { lookbackHours: 24, gridSizeDegrees: 0.005 },
    });
  });

  it('fetches danger zones from /zones', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { zones: mockZonesData },
    } as any);

    const data = await mapService.getZones();
    expect(data).toEqual(mockZonesData);
    expect(apiClient.get).toHaveBeenCalledWith('/zones');
  });
});

describe('2. HeatmapMap Component Unit Tests', () => {
  it('renders zone polygons and footfall cluster markers', () => {
    const handleSelectZone = jest.fn();

    render(
      <HeatmapMap
        clusters={mockHeatmapData.clusters}
        zones={mockZonesData}
        showHeatmap={true}
        showZones={true}
        selectedZoneId={null}
        onSelectZone={handleSelectZone}
      />
    );

    expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
    expect(screen.getByText('Bhushi Dam Steps')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('triggers onSelectZone when a hazard polygon card is clicked', () => {
    const handleSelectZone = jest.fn();

    render(
      <HeatmapMap
        clusters={mockHeatmapData.clusters}
        zones={mockZonesData}
        showHeatmap={true}
        showZones={true}
        selectedZoneId={null}
        onSelectZone={handleSelectZone}
      />
    );

    fireEvent.click(screen.getByTestId('zone-polygon-zone_tiger_point'));
    expect(handleSelectZone).toHaveBeenCalledWith(mockZonesData[0]);
  });

  it('hides clusters and polygons when layer switches are toggled off', () => {
    render(
      <HeatmapMap
        clusters={mockHeatmapData.clusters}
        zones={mockZonesData}
        showHeatmap={false}
        showZones={false}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
      />
    );

    expect(screen.queryByText('Tiger Point Cliff')).not.toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });
});

describe('3. MacroHeatmapPage Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MacroHeatmapPage />
      </QueryClientProvider>
    );
  }

  it('renders the page, filters zones by severity, and inspects selected zone details', async () => {
    jest.spyOn(mapService, 'getHeatmapData').mockResolvedValue(mockHeatmapData);
    jest.spyOn(mapService, 'getZones').mockResolvedValue(mockZonesData);

    renderPage();

    // Verify header
    expect(screen.getByText('Macro Heatmap & Hazard Polygons')).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
      expect(screen.getByText('Bhushi Dam Steps')).toBeInTheDocument();
    });

    // Click on CRITICAL filter button
    fireEvent.click(screen.getByTestId('filter-critical-btn'));

    // Should show Tiger Point Cliff (CRITICAL) and hide Bhushi Dam Steps (MODERATE)
    expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
    expect(screen.queryByText('Bhushi Dam Steps')).not.toBeInTheDocument();

    // Click on Tiger Point zone card to inspect
    fireEvent.click(screen.getByTestId('zone-polygon-zone_tiger_point'));

    // Verify Inspector Drawer contents
    expect(screen.getByTestId('selected-zone-inspector')).toBeInTheDocument();
    expect(screen.getByText('Extreme flash flood hazard and slippery ravine edge.')).toBeInTheDocument();
    expect(screen.getByText('🌧️ Weather (35%)')).toBeInTheDocument();
  });

  it('subscribes to danger:score_update socket events for real-time map invalidation', async () => {
    jest.spyOn(mapService, 'getHeatmapData').mockResolvedValue(mockHeatmapData);
    jest.spyOn(mapService, 'getZones').mockResolvedValue(mockZonesData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
    });

    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('danger:score_update', expect.any(Function));
  });
});
