/**
 * Safe Yatra — Mobile App
 * Authentication REST Service communicating with backend-spatial.
 */

import { apiClient } from './api';
import { storage } from './storage';

export type UserRole = 'TOURIST' | 'YAATRI_MITRA' | 'ADMIN';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  emergencyContact?: string;
  bloodGroup?: string;
  medicalConditions?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: UserEntity;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
  role?: UserRole;
  emergencyContact?: string;
  bloodGroup?: string;
  medicalConditions?: string;
}

export class AuthService {
  /**
   * Authenticates user credentials and stores JWT tokens in hardware-backed SecureStore.
   */
  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    const data = response.data?.data || response.data;

    const authResult: AuthResult = {
      user: data.user,
      tokens: data.tokens,
    };

    await storage.setAccessToken(authResult.tokens.accessToken);
    await storage.setRefreshToken(authResult.tokens.refreshToken);
    await storage.setUserRole(authResult.user.role);
    await storage.setUserData(authResult.user);

    return authResult;
  }

  /**
   * Registers a new tourist or Yaatri Mitra volunteer account.
   */
  public async register(payload: RegisterPayload): Promise<AuthResult> {
    const response = await apiClient.post('/api/v1/auth/register', payload);
    const data = response.data?.data || response.data;

    const authResult: AuthResult = {
      user: data.user,
      tokens: data.tokens,
    };

    await storage.setAccessToken(authResult.tokens.accessToken);
    await storage.setRefreshToken(authResult.tokens.refreshToken);
    await storage.setUserRole(authResult.user.role);
    await storage.setUserData(authResult.user);

    return authResult;
  }

  /**
   * Refreshes the active access token using the stored refresh token.
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiClient.post('/api/v1/auth/refresh', { refreshToken });
    const data = response.data?.data || response.data;

    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || refreshToken,
    };

    await storage.setAccessToken(tokens.accessToken);
    await storage.setRefreshToken(tokens.refreshToken);

    return tokens;
  }

  /**
   * Fetches current authenticated user profile.
   */
  public async getMe(): Promise<UserEntity> {
    const response = await apiClient.get('/api/v1/auth/me');
    const user = response.data?.data || response.data;
    await storage.setUserData(user);
    if (user.role) {
      await storage.setUserRole(user.role);
    }
    return user;
  }

  /**
   * Clears all session tokens and user data.
   */
  public async logout(): Promise<void> {
    await storage.clearAuth();
  }
}

export const authService = new AuthService();
export default authService;
