/**
 * Safe Yatra — Admin Dashboard Auth Service
 * Typed auth methods communicating with backend-spatial /api/v1/auth.
 */

import { apiClient, ApiError } from './api';
import { AdminUser, storage } from './storage';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: AdminUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: string;
  };
}

export const authService = {
  /**
   * Log in as an Admin user. Rejects non-ADMIN credentials.
   */
  async login(credentials: LoginCredentials): Promise<AuthResponseData> {
    const response = (await apiClient.post('/auth/login', credentials)) as any;
    const data: AuthResponseData = response.data || response;

    if (!data.user || !data.tokens?.accessToken) {
      throw new ApiError('Malformed authentication response from server', 500, 'INVALID_AUTH_PAYLOAD');
    }

    if (data.user.role !== 'ADMIN') {
      storage.clearStorage();
      throw new ApiError('Access denied. Administrator privileges required.', 403, 'FORBIDDEN');
    }

    storage.setAuthToken(data.tokens.accessToken);
    storage.setStoredUser(data.user);

    return data;
  },

  /**
   * Fetch currently authenticated profile from GET /auth/me.
   */
  async getMe(): Promise<AdminUser> {
    const response = (await apiClient.get('/auth/me')) as any;
    const user: AdminUser = response.data?.user || response.data || response.user || response;

    if (!user || !user.id) {
      throw new ApiError('Failed to fetch user profile', 500, 'INVALID_USER_PROFILE');
    }

    if (user.role !== 'ADMIN') {
      storage.clearStorage();
      throw new ApiError('Access denied. User does not possess Administrator role.', 403, 'FORBIDDEN');
    }

    storage.setStoredUser(user);
    return user;
  },

  /**
   * Clear storage session.
   */
  logout(): void {
    storage.clearStorage();
  },
};
