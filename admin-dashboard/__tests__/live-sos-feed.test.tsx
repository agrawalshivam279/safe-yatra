/**
 * Safe Yatra — Admin Live SOS Feed & Dispatch Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LiveSOSPage from '../src/app/sos/page';
import { SOSListPanel } from '../src/components/sos/SOSListPanel';
import { SOSMapPanel } from '../src/components/sos/SOSMapPanel';
import { sosService, SOSEvent } from '../src/services/sosService';
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

const mockSOSEvents: SOSEvent[] = [
  {
    id: 'sos_rahul_01',
    userId: 'user_rahul',
    userName: 'Rahul Sharma',
    userPhone: '+919876543210',
    location: { lat: 18.7546, lng: 73.4062 },
    batteryLevel: 35,
    audioRecordingUrl: 'https://storage.safeyatra.in/sos/audio_01.aac',
    status: 'ACCEPTED',
    createdAt: '2026-08-29T17:20:00.000Z',
    responders: [
      {
        id: 'vol_amit',
        name: 'Amit Deshmukh (Mitra)',
        phone: '+919822011223',
        location: { lat: 18.7565, lng: 73.4075 },
        status: 'ACCEPTED',
        batteryLevel: 88,
      },
    ],
  },
  {
    id: 'sos_priya_02',
    userId: 'user_priya',
    userName: 'Priya Patel',
    userPhone: '+919811223344',
    location: { lat: 18.7421, lng: 73.4211 },
    batteryLevel: 15,
    status: 'PENDING',
    createdAt: '2026-08-29T17:22:00.000Z',
    responders: [],
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

describe('1. SOS Service & API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches active SOS events from GET /sos/active', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: mockSOSEvents,
    } as any);

    const data = await sosService.getActiveSOS();
    expect(data).toEqual(mockSOSEvents);
    expect(apiClient.get).toHaveBeenCalledWith('/sos/active');
  });

  it('resolves an SOS event via PATCH /sos/:id/resolve', async () => {
    jest.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: { ...mockSOSEvents[0], status: 'RESOLVED' },
    } as any);

    const data = await sosService.resolveSOS('sos_rahul_01');
    expect(data.status).toBe('RESOLVED');
    expect(apiClient.patch).toHaveBeenCalledWith('/sos/sos_rahul_01/resolve');
  });
});

describe('2. SOSListPanel Component Unit Tests', () => {
  it('renders caller names, phone links, and battery percentages', () => {
    const handleSelect = jest.fn();

    render(
      <SOSListPanel
        events={mockSOSEvents}
        selectedId={null}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByTestId('audio-player-sos_rahul_01')).toBeInTheDocument();
  });

  it('filters queue items by search term', () => {
    render(
      <SOSListPanel
        events={mockSOSEvents}
        selectedId={null}
        onSelect={jest.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('search-sos-input'), {
      target: { value: 'Priya' },
    });

    expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    expect(screen.queryByText('Rahul Sharma')).not.toBeInTheDocument();
  });
});

describe('3. SOSMapPanel Component Unit Tests', () => {
  it('renders tourist beacon, responder beacon, and distance/ETA calculation', () => {
    const handleResolve = jest.fn();

    render(
      <SOSMapPanel
        event={mockSOSEvents[0]}
        onResolve={handleResolve}
      />
    );

    expect(screen.getByTestId('tourist-beacon')).toHaveTextContent('Rahul Sharma');
    expect(screen.getByTestId('responder-beacon')).toHaveTextContent('Amit Deshmukh (Mitra)');
    expect(screen.getByTestId('eta-banner')).toBeInTheDocument();
    expect(screen.getByTestId('resolve-sos-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('resolve-sos-btn'));
    expect(handleResolve).toHaveBeenCalledWith('sos_rahul_01');
  });

  it('renders empty placeholder state when no event is selected', () => {
    render(<SOSMapPanel event={null} />);
    expect(screen.getByTestId('sos-map-empty')).toBeInTheDocument();
    expect(screen.getByText('No Emergency Selected')).toBeInTheDocument();
  });
});

describe('4. LiveSOSPage Split-Screen Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <LiveSOSPage />
      </QueryClientProvider>
    );
  }

  it('renders split view and automatically selects the first active SOS', async () => {
    jest.spyOn(sosService, 'getActiveSOS').mockResolvedValue(mockSOSEvents);

    renderPage();

    expect(screen.getByText('Live Emergency SOS Command Feed')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('tourist-beacon')).toBeInTheDocument();
    });
  });

  it('subscribes to real-time SOS WebSocket events on mount', async () => {
    jest.spyOn(sosService, 'getActiveSOS').mockResolvedValue(mockSOSEvents);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThanOrEqual(1);
    });

    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:triggered', expect.any(Function));
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:mitra_location', expect.any(Function));
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:resolved', expect.any(Function));
  });
});
