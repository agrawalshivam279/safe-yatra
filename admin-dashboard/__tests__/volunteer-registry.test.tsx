/**
 * Safe Yatra — Admin Yaatri Mitra Volunteer Registry Test Suite
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VolunteersPage from '../src/app/volunteers/page';
import { volunteerAdminService, VolunteerRecord } from '../src/services/volunteerAdminService';
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

const mockVolunteers: VolunteerRecord[] = [
  {
    id: 'vol_01',
    userId: 'usr_01',
    name: 'Rajesh Sharma',
    phone: '+919876543210',
    verificationStatus: 'VERIFIED',
    isOnDuty: true,
    totalResponses: 14,
    rating: 4.9,
    joinedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'vol_02',
    userId: 'usr_02',
    name: 'Amit Deshmukh',
    phone: '+919811223344',
    verificationStatus: 'PENDING_VERIFICATION',
    isOnDuty: false,
    totalResponses: 0,
    rating: 5.0,
    joinedAt: '2026-08-20T12:00:00Z',
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

describe('1. Volunteer Administration Service & API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches volunteer list from GET /volunteers', async () => {
    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { volunteers: mockVolunteers },
    } as any);

    const volunteers = await volunteerAdminService.getVolunteers();
    expect(volunteers).toEqual(mockVolunteers);
    expect(apiClient.get).toHaveBeenCalledWith('/volunteers');
  });

  it('verifies a volunteer via PATCH /volunteers/:id/verify', async () => {
    jest.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: { volunteer: { ...mockVolunteers[1], verificationStatus: 'VERIFIED' } },
    } as any);

    const result = await volunteerAdminService.verifyVolunteer('vol_02');
    expect(result.verificationStatus).toBe('VERIFIED');
    expect(apiClient.patch).toHaveBeenCalledWith('/volunteers/vol_02/verify', {});
  });

  it('toggles duty status via PATCH /volunteers/:id/status', async () => {
    jest.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      success: true,
      data: { volunteer: { ...mockVolunteers[0], isOnDuty: false } },
    } as any);

    const result = await volunteerAdminService.toggleDutyStatus('vol_01', false);
    expect(result.isOnDuty).toBe(false);
    expect(apiClient.patch).toHaveBeenCalledWith('/volunteers/vol_01/status', { isOnDuty: false });
  });
});

describe('2. Volunteer Registry Page Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
    jest.spyOn(volunteerAdminService, 'getVolunteers').mockResolvedValue(mockVolunteers);
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <VolunteersPage />
      </QueryClientProvider>
    );
  }

  it('renders KPI summary cards and volunteer rows', async () => {
    renderPage();

    expect(screen.getByText('Yaatri Mitra Volunteer Registry')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Rajesh Sharma')).toBeInTheDocument();
      expect(screen.getByText('Amit Deshmukh')).toBeInTheDocument();
      expect(screen.getByText('+919876543210')).toBeInTheDocument();
      expect(screen.getByText('VERIFIED')).toBeInTheDocument();
      expect(screen.getByText('PENDING CHECK')).toBeInTheDocument();
    });
  });

  it('filters volunteers by pending verification tab', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Rajesh Sharma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('filter-pending_verification-btn'));

    expect(screen.getByText('Amit Deshmukh')).toBeInTheDocument();
    expect(screen.queryByText('Rajesh Sharma')).not.toBeInTheDocument();
  });

  it('toggles on-duty status when clicking duty button', async () => {
    jest.spyOn(volunteerAdminService, 'toggleDutyStatus').mockResolvedValue({
      ...mockVolunteers[0],
      isOnDuty: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('toggle-duty-vol_01')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('toggle-duty-vol_01'));

    await waitFor(() => {
      expect(volunteerAdminService.toggleDutyStatus).toHaveBeenCalledWith('vol_01', false);
      expect(screen.getByTestId('volunteer-feedback-alert')).toBeInTheDocument();
    });
  });

  it('approves volunteer verification on 1-click Verify button', async () => {
    jest.spyOn(volunteerAdminService, 'verifyVolunteer').mockResolvedValue({
      ...mockVolunteers[1],
      verificationStatus: 'VERIFIED',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('verify-volunteer-vol_02')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('verify-volunteer-vol_02'));

    await waitFor(() => {
      expect(volunteerAdminService.verifyVolunteer).toHaveBeenCalledWith('vol_02');
      expect(screen.getByTestId('volunteer-feedback-alert')).toHaveTextContent(/successfully verified/i);
    });
  });
});
