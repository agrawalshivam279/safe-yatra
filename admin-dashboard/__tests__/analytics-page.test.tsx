/**
 * Safe Yatra — Admin Command Center Analytics Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsPage from '../src/app/analytics/page';
import { analyticsService, fallbackAnalyticsData } from '../src/services/analyticsService';
import { apiClient } from '../src/services/api';

// Mock Recharts ResponsiveContainer for jsdom
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: '500px', height: '300px' }}>
        {children}
      </div>
    ),
  };
});

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

describe('1. Analytics Service & Aggregation API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches analytics overview dataset from GET /admin/analytics', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { overview: fallbackAnalyticsData },
    } as any);

    const data = await analyticsService.getAnalyticsOverview(7);
    expect(data.summary.totalIncidents).toBe(48);
    expect(data.sla.avgResponseTimeMinutes).toBe(3.4);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/analytics?days=7');
  });

  it('returns structured fallback data gracefully on network error', async () => {
    jest.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'));

    const data = await analyticsService.getAnalyticsOverview(7);
    expect(data).toEqual(fallbackAnalyticsData);
  });
});

describe('2. Command Center Analytics Page Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
    jest.spyOn(analyticsService, 'getAnalyticsOverview').mockResolvedValue(fallbackAnalyticsData);
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsPage />
      </QueryClientProvider>
    );
  }

  it('renders top telemetry metric banners and headline', async () => {
    renderPage();

    expect(screen.getByText('Command Center Analytics')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('3.4').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('97.9%')).toBeInTheDocument();
      expect(screen.getByText('14,850')).toBeInTheDocument();
    });
  });

  it('renders all 4 primary analytics charts and gauges', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('chart-danger-trends')).toBeInTheDocument();
      expect(screen.getByTestId('chart-daily-sos')).toBeInTheDocument();
      expect(screen.getByTestId('chart-incident-distribution')).toBeInTheDocument();
      expect(screen.getByTestId('chart-sla-gauge')).toBeInTheDocument();
    });
  });

  it('toggles timeframe buttons between 7 Days and 30 Days', async () => {
    renderPage();

    const btn30d = screen.getByTestId('timeframe-30d-btn');
    fireEvent.click(btn30d);

    await waitFor(() => {
      expect(analyticsService.getAnalyticsOverview).toHaveBeenCalledWith(30);
    });
  });
});
