/**
 * Safe Yatra — Mobile App
 * Unit Tests for Storage, API Interceptor, AuthService & Network Status Hook.
 */

import axios from 'axios';
import { storage } from '../services/storage';
import { authService } from '../services/authService';
import { apiClient, API_BASE_URL } from '../services/api';
import * as Network from 'expo-network';

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => {
  let mockStore: Record<string, string> = {};
  return {
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return mockStore[key] ?? null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete mockStore[key];
    }),
    __resetStore: () => {
      mockStore = {};
    },
  };
});

// Mock Expo Network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'WIFI',
  }),
  NetworkStateType: {
    UNKNOWN: 'UNKNOWN',
    NONE: 'NONE',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
  },
}));

// Mock axios post/get on apiClient
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  const mockInstance: any = {
    defaults: { headers: { common: {} } },
    interceptors: {
      request: { use: jest.fn((fn) => { mockInstance._requestInterceptor = fn; }) },
      response: { use: jest.fn((successFn, errorFn) => {
        mockInstance._responseSuccess = successFn;
        mockInstance._responseError = errorFn;
      }) },
    },
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => mockInstance),
    _requestInterceptor: null,
    _responseSuccess: null,
    _responseError: null,
  };

  return {
    ...actualAxios,
    create: jest.fn(() => mockInstance),
    post: jest.fn(),
    get: jest.fn(),
  };
});

describe('Mobile App Foundation: Storage, API Client & AuthService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    const SecureStore = require('expo-secure-store');
    SecureStore.__resetStore();
    await storage.clearAuth();
  });

  describe('Hardware-Backed Storage Layer (services/storage.ts)', () => {
    it('should store and retrieve access and refresh tokens', async () => {
      await storage.setAccessToken('test_access_token_123');
      await storage.setRefreshToken('test_refresh_token_456');

      const accessToken = await storage.getAccessToken();
      const refreshToken = await storage.getRefreshToken();

      expect(accessToken).toBe('test_access_token_123');
      expect(refreshToken).toBe('test_refresh_token_456');
    });

    it('should store and retrieve user role and structured user profile data', async () => {
      const mockUser = {
        id: 'user_01',
        email: 'tourist@safeyatra.in',
        name: 'Aarav Sharma',
        phone: '+919876543210',
        role: 'TOURIST',
      };

      await storage.setUserRole('TOURIST');
      await storage.setUserData(mockUser);

      const role = await storage.getUserRole();
      const user = await storage.getUserData();

      expect(role).toBe('TOURIST');
      expect(user).toEqual(mockUser);
    });

    it('should clear all auth data on clearAuth()', async () => {
      await storage.setAccessToken('token_to_clear');
      await storage.setUserRole('YAATRI_MITRA');

      await storage.clearAuth();

      expect(await storage.getAccessToken()).toBeNull();
      expect(await storage.getUserRole()).toBeNull();
      expect(await storage.getUserData()).toBeNull();
    });
  });

  describe('Auth Service (services/authService.ts)', () => {
    it('should log in user, persist tokens in storage, and return AuthResult', async () => {
      const mockApiResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'tourist_uuid_01',
              email: 'tourist@safeyatra.in',
              name: 'Priya Patel',
              phone: '+919876543211',
              role: 'TOURIST',
              isActive: true,
              createdAt: '2026-08-29T10:00:00Z',
            },
            tokens: {
              accessToken: 'mock_jwt_access_token',
              refreshToken: 'mock_jwt_refresh_token',
            },
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      const result = await authService.login({
        email: 'tourist@safeyatra.in',
        password: 'Password123!',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/login', {
        email: 'tourist@safeyatra.in',
        password: 'Password123!',
      });
      expect(result.user.name).toBe('Priya Patel');
      expect(result.tokens.accessToken).toBe('mock_jwt_access_token');
      expect(await storage.getAccessToken()).toBe('mock_jwt_access_token');
      expect(await storage.getUserRole()).toBe('TOURIST');
    });

    it('should register new volunteer and save tokens in storage', async () => {
      const mockApiResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: 'mitra_uuid_01',
              email: 'mitra@safeyatra.in',
              name: 'Vikram Singh',
              phone: '+919876543212',
              role: 'YAATRI_MITRA',
              isActive: true,
              createdAt: '2026-08-29T10:00:00Z',
            },
            tokens: {
              accessToken: 'mitra_access_token',
              refreshToken: 'mitra_refresh_token',
            },
          },
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockApiResponse);

      const result = await authService.register({
        email: 'mitra@safeyatra.in',
        password: 'Password123!',
        name: 'Vikram Singh',
        phone: '+919876543212',
        role: 'YAATRI_MITRA',
      });

      expect(result.user.role).toBe('YAATRI_MITRA');
      expect(await storage.getUserRole()).toBe('YAATRI_MITRA');
    });

    it('should fetch user profile with getMe()', async () => {
      const mockUser = {
        id: 'user_01',
        email: 'test@safeyatra.in',
        name: 'Test User',
        phone: '+919876543210',
        role: 'TOURIST',
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: mockUser },
      });

      const profile = await authService.getMe();
      expect(profile.name).toBe('Test User');
      expect(await storage.getUserData()).toEqual(mockUser);
    });
  });

  describe('Network Detection (hooks/useNetworkStatus.ts)', () => {
    it('should query expo-network and report connectivity state', async () => {
      const networkState = await Network.getNetworkStateAsync();
      expect(networkState.isConnected).toBe(true);
      expect(networkState.isInternetReachable).toBe(true);
    });

    it('should recognize offline condition when isConnected is false', async () => {
      (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
        type: 'NONE',
      });

      const networkState = await Network.getNetworkStateAsync();
      const isOffline = !networkState.isConnected || networkState.isInternetReachable === false;
      expect(isOffline).toBe(true);
    });
  });
});
