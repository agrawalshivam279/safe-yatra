/**
 * Safe Yatra — Admin Hazard Zone Management & Override Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ZonesListPage from '../src/app/zones/page';
import ZoneDetailPage from '../src/app/zones/[id]/page';
import CreateZonePage from '../src/app/zones/create/page';
import { zoneAdminService, AdminZoneDetail } from '../src/services/zoneAdminService';
import { socketService } from '../src/services/socketService';
import { apiClient } from '../src/services/api';

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

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

const mockZones: AdminZoneDetail[] = [
  {
    id: 'zone_tiger_point',
    name: 'Tiger Point Cliff',
    dangerScore: 82,
    tier: 'CRITICAL',
    coordinates: { lat: 18.7546, lng: 73.4062 },
    isManualOverride: false,
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
    isManualOverride: true,
    overrideReason: 'Seasonal overflow safety protocol',
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

describe('1. Zone Administration Service & API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches zone list from GET /zones', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { zones: mockZones },
    } as any);

    const zones = await zoneAdminService.getZones();
    expect(zones).toEqual(mockZones);
    expect(apiClient.get).toHaveBeenCalledWith('/zones');
  });

  it('fetches single zone detail from GET /zones/:id', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { zone: mockZones[0] },
    } as any);

    const zone = await zoneAdminService.getZoneById('zone_tiger_point');
    expect(zone).toEqual(mockZones[0]);
    expect(apiClient.get).toHaveBeenCalledWith('/zones/zone_tiger_point');
  });

  it('applies danger score override via PATCH /admin/zones/:id/override', async () => {
    jest.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: { zone: { ...mockZones[0], dangerScore: 95, isManualOverride: true } },
    } as any);

    const updated = await zoneAdminService.overrideZoneScore('zone_tiger_point', {
      dangerScore: 95,
      reason: 'Emergency Landslide Detected',
    });

    expect(updated.dangerScore).toBe(95);
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/zones/zone_tiger_point/override', {
      dangerScore: 95,
      reason: 'Emergency Landslide Detected',
    });
  });

  it('provisions a new geofenced hazard sector via POST /geofences', async () => {
    const newZonePayload = {
      name: 'Khandala Lookout',
      description: 'Steep hill trail',
      coordinates: { lat: 18.755, lng: 73.402 },
      severity: 'SEVERE' as const,
    };

    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: { zone: { id: 'zone_khandala_01', ...newZonePayload, dangerScore: 65, tier: 'SEVERE' } },
    } as any);

    const result = await zoneAdminService.createZone(newZonePayload);
    expect(result.id).toBe('zone_khandala_01');
    expect(apiClient.post).toHaveBeenCalledWith('/geofences', newZonePayload);
  });
});

describe('2. Zones Registry Table Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it('renders zone rows with scores, tiers, and override indicators', async () => {
    jest.spyOn(zoneAdminService, 'getZones').mockResolvedValue(mockZones);

    render(
      <QueryClientProvider client={queryClient}>
        <ZonesListPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Hazard Zone Management')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
      expect(screen.getByText('Bhushi Dam Steps')).toBeInTheDocument();
      expect(screen.getByText('MANUAL OVERRIDE')).toBeInTheDocument();
    });
  });

  it('filters zones using severity tier buttons', async () => {
    jest.spyOn(zoneAdminService, 'getZones').mockResolvedValue(mockZones);

    render(
      <QueryClientProvider client={queryClient}>
        <ZonesListPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('filter-moderate-btn'));

    expect(screen.getByText('Bhushi Dam Steps')).toBeInTheDocument();
    expect(screen.queryByText('Tiger Point Cliff')).not.toBeInTheDocument();
  });
});

describe('3. Zone Detail & Score Override Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it('renders 4-factor risk breakdown and submits manual score override', async () => {
    jest.spyOn(zoneAdminService, 'getZoneById').mockResolvedValue(mockZones[0]);
    jest.spyOn(zoneAdminService, 'overrideZoneScore').mockResolvedValue({
      ...mockZones[0],
      dangerScore: 90,
      isManualOverride: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ZoneDetailPage params={{ id: 'zone_tiger_point' }} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tiger Point Cliff')).toBeInTheDocument();
      expect(screen.getByText('🌧️ Meteorological & Rainfall Risk (35%)')).toBeInTheDocument();
    });

    // Change slider
    fireEvent.change(screen.getByTestId('danger-score-slider'), {
      target: { value: '90' },
    });

    // Fill reason
    fireEvent.change(screen.getByTestId('override-reason-input'), {
      target: { value: 'Heavy upstream dam release observed' },
    });

    // Submit override
    fireEvent.click(screen.getByTestId('apply-override-btn'));

    await waitFor(() => {
      expect(zoneAdminService.overrideZoneScore).toHaveBeenCalledWith('zone_tiger_point', {
        dangerScore: 90,
        reason: 'Heavy upstream dam release observed',
      });
      expect(screen.getByTestId('override-feedback-alert')).toBeInTheDocument();
    });
  });
});

describe('4. Create Geofenced Zone Page', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it('validates required inputs and submits geofence creation', async () => {
    jest.spyOn(zoneAdminService, 'createZone').mockResolvedValue({
      id: 'zone_new_01',
      name: 'Khandala Cliff',
      dangerScore: 50,
      tier: 'MODERATE',
      coordinates: { lat: 18.7546, lng: 73.4062 },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CreateZonePage />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByTestId('zone-name-input'), {
      target: { value: 'Khandala Cliff' },
    });
    fireEvent.change(screen.getByTestId('zone-desc-input'), {
      target: { value: 'Monitored trail' },
    });

    fireEvent.click(screen.getByTestId('submit-create-zone-btn'));

    await waitFor(() => {
      expect(zoneAdminService.createZone).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Khandala Cliff',
          description: 'Monitored trail',
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/zones');
    });
  });
});
