/**
 * Safe Yatra — Admin Emergency Broadcast Composer Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BroadcastComposerPage from '../src/app/broadcast/page';
import { broadcastService, BroadcastResult } from '../src/services/broadcastService';
import { zoneAdminService } from '../src/services/zoneAdminService';
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

const mockBroadcastResult: BroadcastResult = {
  broadcastId: 'bcast_demo_123',
  title: 'Cloudburst Warning',
  message: 'Evacuate mountain trail',
  severity: 'EMERGENCY',
  zoneId: 'zone_tiger_point',
  sentAt: '2026-08-29T17:40:00.000Z',
  recipientsCount: 250,
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

describe('1. Broadcast Service & API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('transmits broadcast payload to POST /admin/broadcast', async () => {
    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: { broadcast: mockBroadcastResult },
    } as any);

    const payload = {
      title: 'Cloudburst Warning',
      message: 'Evacuate mountain trail',
      severity: 'EMERGENCY' as const,
      zoneId: 'zone_tiger_point',
    };

    const result = await broadcastService.sendBroadcast(payload);
    expect(result).toEqual(mockBroadcastResult);
    expect(apiClient.post).toHaveBeenCalledWith('/admin/broadcast', payload);
  });
});

describe('2. Broadcast Composer Page Component & Live Simulator', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
    jest.spyOn(zoneAdminService, 'getZones').mockResolvedValue([
      {
        id: 'zone_tiger_point',
        name: 'Tiger Point Cliff',
        dangerScore: 82,
        tier: 'CRITICAL',
        coordinates: { lat: 18.7546, lng: 73.4062 },
      },
    ]);
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <BroadcastComposerPage />
      </QueryClientProvider>
    );
  }

  it('renders form inputs, severity buttons, and smartphone simulator', async () => {
    renderPage();

    expect(screen.getByText('Emergency Broadcast Composer')).toBeInTheDocument();
    expect(screen.getByTestId('broadcast-title-input')).toBeInTheDocument();
    expect(screen.getByTestId('broadcast-message-input')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-simulator-frame')).toBeInTheDocument();
    expect(screen.getByTestId('simulated-notification-card')).toBeInTheDocument();
  });

  it('synchronizes text changes into smartphone notification simulator in real-time', async () => {
    renderPage();

    fireEvent.change(screen.getByTestId('broadcast-title-input'), {
      target: { value: 'Landslide Warning' },
    });
    fireEvent.change(screen.getByTestId('broadcast-message-input'), {
      target: { value: 'Road blocked near Lonavala Ghat' },
    });

    const simCard = screen.getByTestId('simulated-notification-card');
    expect(simCard).toHaveTextContent('Landslide Warning');
    expect(simCard).toHaveTextContent('Road blocked near Lonavala Ghat');
  });

  it('updates severity level and toggles simulator styling', async () => {
    renderPage();

    fireEvent.click(screen.getByTestId('severity-warning-btn'));

    const simCard = screen.getByTestId('simulated-notification-card');
    expect(simCard).toHaveTextContent('WARNING');
  });

  it('submits broadcast and renders success receipt banner', async () => {
    jest.spyOn(broadcastService, 'sendBroadcast').mockResolvedValue(mockBroadcastResult);

    renderPage();

    fireEvent.change(screen.getByTestId('broadcast-title-input'), {
      target: { value: 'Cloudburst Warning' },
    });
    fireEvent.change(screen.getByTestId('broadcast-message-input'), {
      target: { value: 'Evacuate mountain trail' },
    });

    fireEvent.click(screen.getByTestId('submit-broadcast-btn'));

    await waitFor(() => {
      expect(broadcastService.sendBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cloudburst Warning',
          message: 'Evacuate mountain trail',
          severity: 'EMERGENCY',
        })
      );
      expect(screen.getByTestId('broadcast-receipt-card')).toBeInTheDocument();
      expect(screen.getByText(/Emergency Broadcast Transmitted Successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when trying to submit empty fields', async () => {
    renderPage();

    fireEvent.change(screen.getByTestId('broadcast-title-input'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByTestId('submit-broadcast-btn'));

    expect(screen.getByTestId('broadcast-error-alert')).toHaveTextContent('Alert headline title is required.');
  });
});
