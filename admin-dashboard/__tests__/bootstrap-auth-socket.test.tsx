/**
 * Safe Yatra — Admin Dashboard Bootstrap, Auth, API & Socket Test Suite
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { storage, AdminUser } from '../src/services/storage';
import { apiClient, ApiError } from '../src/services/api';
import { authService } from '../src/services/authService';
import { socketService } from '../src/services/socketService';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { QueryProvider } from '../src/providers/QueryProvider';

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

describe('1. Admin Dashboard Storage Service', () => {
  beforeEach(() => {
    storage.clearStorage();
  });

  it('correctly persists, retrieves, and clears auth token', () => {
    expect(storage.getAuthToken()).toBeNull();
    storage.setAuthToken('mock_admin_jwt_123');
    expect(storage.getAuthToken()).toBe('mock_admin_jwt_123');
    storage.removeAuthToken();
    expect(storage.getAuthToken()).toBeNull();
  });

  it('correctly persists, retrieves, and clears stored Admin user object', () => {
    const mockUser: AdminUser = {
      id: 'admin_001',
      name: 'Chief Safety Commander',
      email: 'commander@safeyatra.gov.in',
      role: 'ADMIN',
    };

    expect(storage.getStoredUser()).toBeNull();
    storage.setStoredUser(mockUser);
    expect(storage.getStoredUser()).toEqual(mockUser);

    storage.clearStorage();
    expect(storage.getStoredUser()).toBeNull();
    expect(storage.getAuthToken()).toBeNull();
  });

  it('gracefully handles corrupted JSON in localStorage', () => {
    window.localStorage.setItem('safeyatra_admin_user', '{malformed_json}');
    expect(storage.getStoredUser()).toBeNull();
  });
});

describe('2. Admin Dashboard API Client & Interceptors', () => {
  beforeEach(() => {
    storage.clearStorage();
    jest.clearAllMocks();
  });

  it('instantiates apiClient with correct configuration', () => {
    expect(apiClient.defaults.timeout).toBe(15000);
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('request interceptor attaches Bearer token when available in storage', async () => {
    storage.setAuthToken('bearer_token_xyz');
    const mockConfig: any = { headers: {} };

    // Find the request interceptor handler
    const requestHandler = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const transformedConfig = await requestHandler(mockConfig);

    expect(transformedConfig.headers.Authorization).toBe('Bearer bearer_token_xyz');
  });

  it('response interceptor unwraps success response envelopes', async () => {
    const responseHandler = (apiClient.interceptors.response as any).handlers[0].fulfilled;
    const rawSuccess = {
      status: 200,
      data: {
        success: true,
        data: { activeSosCount: 3, criticalZones: 1 },
      },
    };

    const unwrapped = responseHandler(rawSuccess);
    expect(unwrapped).toEqual({
      success: true,
      data: { activeSosCount: 3, criticalZones: 1 },
    });
  });

  it('response interceptor throws ApiError when envelope has success: false', () => {
    const responseHandler = (apiClient.interceptors.response as any).handlers[0].fulfilled;
    const rawFailure = {
      status: 400,
      data: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid coordinate bounds',
        },
      },
    };

    expect(() => responseHandler(rawFailure)).toThrow(ApiError);
    try {
      responseHandler(rawFailure);
    } catch (err: any) {
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Invalid coordinate bounds');
    }
  });
});

describe('3. Admin Dashboard Auth Service', () => {
  beforeEach(() => {
    storage.clearStorage();
    jest.clearAllMocks();
  });

  it('successfully authenticates an ADMIN and populates storage', async () => {
    const mockAdminUser: AdminUser = {
      id: 'admin_123',
      name: 'Incident Commander',
      email: 'commander@safeyatra.in',
      role: 'ADMIN',
    };

    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        user: mockAdminUser,
        tokens: {
          accessToken: 'admin_access_token_jwt',
          refreshToken: 'admin_refresh_token_jwt',
        },
      },
    } as any);

    const result = await authService.login({
      email: 'commander@safeyatra.in',
      password: 'SecureAdminPassword123!',
    });

    expect(result.user.role).toBe('ADMIN');
    expect(storage.getAuthToken()).toBe('admin_access_token_jwt');
    expect(storage.getStoredUser()).toEqual(mockAdminUser);
  });

  it('rejects authentication with 403 ApiError if non-ADMIN logs in', async () => {
    const mockTouristUser = {
      id: 'tourist_999',
      name: 'Regular Tourist',
      email: 'tourist@example.com',
      role: 'TOURIST',
    };

    jest.spyOn(apiClient, 'post').mockResolvedValueOnce({
      success: true,
      data: {
        user: mockTouristUser,
        tokens: {
          accessToken: 'tourist_token',
          refreshToken: 'tourist_refresh',
        },
      },
    } as any);

    await expect(
      authService.login({
        email: 'tourist@example.com',
        password: 'Password123!',
      })
    ).rejects.toThrow('Access denied. Administrator privileges required.');

    expect(storage.getAuthToken()).toBeNull();
  });

  it('fetches profile with getMe() and validates ADMIN privileges', async () => {
    const mockAdminUser: AdminUser = {
      id: 'admin_456',
      name: 'Safety Inspector',
      email: 'inspector@safeyatra.in',
      role: 'ADMIN',
    };

    jest.spyOn(apiClient, 'get').mockResolvedValueOnce({
      success: true,
      data: { user: mockAdminUser },
    } as any);

    const profile = await authService.getMe();
    expect(profile.id).toBe('admin_456');
    expect(storage.getStoredUser()).toEqual(mockAdminUser);
  });
});

describe('4. Admin Dashboard Socket.IO Gateway', () => {
  beforeEach(() => {
    socketService.disconnect();
    jest.clearAllMocks();
  });

  it('connects to Socket.IO with token authorization', () => {
    const socket = socketService.connect('mock_jwt_token');
    expect(socket).toBeDefined();
  });

  it('allows joining and leaving zone rooms', () => {
    socketService.connect('mock_jwt_token');
    socketService.joinZone('zone_lonavala_01');
    expect(socketService.getSocket()?.emit).toHaveBeenCalledWith('zone:join', {
      zoneId: 'zone_lonavala_01',
    });

    socketService.leaveZone('zone_lonavala_01');
    expect(socketService.getSocket()?.emit).toHaveBeenCalledWith('zone:leave', {
      zoneId: 'zone_lonavala_01',
    });
  });

  it('registers and unregisters typed real-time event listeners', () => {
    const sosCallback = jest.fn();
    const unsub = socketService.onSOSTriggered(sosCallback);

    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:triggered', sosCallback);

    unsub();
    expect(socketService.getSocket()?.off).toHaveBeenCalledWith('sos:triggered', sosCallback);
  });

  it('supports listeners for all primary admin events', () => {
    const callback = jest.fn();

    const unsubAccepted = socketService.onSOSAccepted(callback);
    const unsubLocation = socketService.onMitraLocation(callback);
    const unsubArrived = socketService.onSOSArrived(callback);
    const unsubResolved = socketService.onSOSResolved(callback);
    const unsubCancelled = socketService.onSOSCancelled(callback);
    const unsubDanger = socketService.onDangerScoreUpdate(callback);
    const unsubBroadcast = socketService.onBroadcastAlert(callback);

    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:accepted', callback);
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:mitra_location', callback);
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:arrived', callback);
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:resolved', callback);
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('sos:cancelled', callback);
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('danger:score_update', callback);
    expect(socketService.getSocket()?.on).toHaveBeenCalledWith('admin:broadcast', callback);

    unsubAccepted();
    unsubLocation();
    unsubArrived();
    unsubResolved();
    unsubCancelled();
    unsubDanger();
    unsubBroadcast();
  });
});

describe('5. Admin Dashboard React Providers (Auth & Query)', () => {
  beforeEach(() => {
    storage.clearStorage();
    jest.clearAllMocks();
  });

  function TestConsumer() {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    return (
      <div>
        <span data-testid="auth-loading">{isLoading ? 'loading' : 'ready'}</span>
        <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</span>
        <span data-testid="user-name">{user?.name || 'anonymous'}</span>
        <button onClick={logout} data-testid="logout-btn">
          Logout
        </button>
      </div>
    );
  }

  it('renders QueryProvider and AuthProvider wrapping children successfully', async () => {
    render(
      <QueryProvider>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('anonymous');
  });

  it('auto-hydrates authenticated admin user from storage and backend profile', async () => {
    const mockAdmin: AdminUser = {
      id: 'admin_789',
      name: 'Regional Officer',
      email: 'officer@safeyatra.in',
      role: 'ADMIN',
    };

    storage.setAuthToken('valid_admin_token');
    storage.setStoredUser(mockAdmin);

    jest.spyOn(authService, 'getMe').mockResolvedValueOnce(mockAdmin);

    render(
      <QueryProvider>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    });

    expect(screen.getByTestId('user-name').textContent).toBe('Regional Officer');
  });
});
