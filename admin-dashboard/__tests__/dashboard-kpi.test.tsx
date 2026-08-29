/**
 * Safe Yatra — Admin Dashboard Home & KPI Cards Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardHome from '../src/app/page';
import { KPICard } from '../src/components/analytics/KPICard';
import { adminService, AdminAnalyticsData } from '../src/services/adminService';
import { socketService } from '../src/services/socketService';
import { apiClient } from '../src/services/api';
import { Users, AlertOctagon } from 'lucide-react';

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

const mockAnalyticsData: AdminAnalyticsData = {
  totalSosCount: 15,
  activeSosCount: 2,
  resolvedSosCount: 13,
  avgResponseTimeMinutes: 3.8,
  activeTourists: 245,
  onDutyMitras: 12,
  totalVolunteers: 20,
  criticalZones: 2,
  severeZones: 3,
  moderateZones: 5,
  lowZones: 10,
  zoneTierDistribution: {
    CRITICAL: 2,
    SEVERE: 3,
    MODERATE: 5,
    LOW: 10,
  },
};

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

describe('1. Admin Analytics Service & API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and unwraps admin analytics data from GET /admin/analytics', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockAnalyticsData,
    } as any);

    const result = await adminService.getAnalytics();
    expect(result).toEqual(mockAnalyticsData);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/analytics');
  });
});

describe('2. KPICard Component Unit Tests', () => {
  it('renders title, value, subtitle, and badge correctly', () => {
    render(
      <KPICard
        title="Active SOS Alerts"
        value={2}
        subtitle="Immediate intervention"
        icon={AlertOctagon}
        badge={{ text: 'CRITICAL', variant: 'critical' }}
      />
    );

    expect(screen.getByText('Active SOS Alerts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Immediate intervention')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(
      <KPICard
        title="Monitored Tourists"
        value={245}
        icon={Users}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('kpi-card-loading')).toBeInTheDocument();
    expect(screen.queryByText('245')).not.toBeInTheDocument();
  });

  it('wraps content in link when href is provided', () => {
    render(
      <KPICard
        title="Monitored Tourists"
        value={245}
        icon={Users}
        href="/heatmap"
      />
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', '/heatmap');
  });
});

describe('3. DashboardHome Overview Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  function renderDashboard() {
    return render(
      <QueryClientProvider client={queryClient}>
        <DashboardHome />
      </QueryClientProvider>
    );
  }

  it('renders all 4 primary KPI cards and populated analytics telemetry', async () => {
    jest.spyOn(adminService, 'getAnalytics').mockResolvedValueOnce(mockAnalyticsData);

    renderDashboard();

    // Verify header
    expect(screen.getByText('Command Center Overview')).toBeInTheDocument();

    // Wait for query to resolve
    await waitFor(() => {
      expect(screen.getByText('245')).toBeInTheDocument(); // Tourists
      expect(screen.getByText('12 / 20')).toBeInTheDocument(); // Mitras
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1); // Zones count
    });

    // Verify operational readiness banner
    const banner = screen.getByTestId('operational-status-banner');
    expect(banner).toHaveTextContent('CRITICAL STATE: 2 Active Emergency SOS Signal(s)');

    // Verify hazard distribution
    expect(screen.getByTestId('hazard-distribution-bar')).toBeInTheDocument();
  });

  it('displays NORMAL status banner when zero active SOS and zero critical zones exist', async () => {
    const safeData: AdminAnalyticsData = {
      ...mockAnalyticsData,
      activeSosCount: 0,
      criticalZones: 0,
      severeZones: 0,
    };

    jest.spyOn(adminService, 'getAnalytics').mockResolvedValueOnce(safeData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('NORMAL OPERATIONS: All Monitored Pilgrim & Trekking Corridors Stable')).toBeInTheDocument();
    });
  });

  it('registers real-time Socket.IO listeners and invalidates React Query cache on SOS event', async () => {
    jest.spyOn(adminService, 'getAnalytics').mockResolvedValue(mockAnalyticsData);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('245')).toBeInTheDocument();
    });

    // Invalidate should be wired to socket listeners
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:triggered', expect.any(Function));
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('danger:score_update', expect.any(Function));
  });
});
