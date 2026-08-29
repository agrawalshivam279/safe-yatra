'use client';

/**
 * Safe Yatra — Admin Dashboard Auth Context
 * Provides global authentication state and role enforcement for Admin portal.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AdminUser, storage } from '../services/storage';
import { authService, LoginCredentials } from '../services/authService';

export interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const storedToken = storage.getAuthToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      setToken(storedToken);
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      storage.clearStorage();
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const storedToken = storage.getAuthToken();
        const storedUser = storage.getStoredUser();

        if (storedToken) {
          if (isMounted) setToken(storedToken);
          if (storedUser && storedUser.role === 'ADMIN') {
            if (isMounted) setUser(storedUser);
          }

          // Hydrate freshly from backend
          const freshUser = await authService.getMe();
          if (isMounted) setUser(freshUser);
        } else {
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } catch {
        if (isMounted) {
          storage.clearStorage();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const data = await authService.login(credentials);
      setUser(data.user);
      setToken(data.tokens.accessToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
  }, []);

  const isAuthenticated = Boolean(token && user && user.role === 'ADMIN');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
