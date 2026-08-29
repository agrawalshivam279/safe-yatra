/**
 * Safe Yatra — Mobile App
 * Global Authentication Context & Session Management Provider.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, LoginCredentials, RegisterPayload, UserEntity, UserRole } from '../services/authService';
import { storage } from '../services/storage';

export interface AuthContextType {
  user: UserEntity | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVolunteer: boolean;
  isTourist: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserEntity | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on app initialization
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedToken = await storage.getAccessToken();
        const storedRole = (await storage.getUserRole()) as UserRole | null;
        const storedUser = await storage.getUserData<UserEntity>();

        if (storedToken && isMounted) {
          setToken(storedToken);
          setRoleState(storedRole);
          if (storedUser) setUser(storedUser);

          // Verify token validity and refresh profile in background
          try {
            const freshUser = await authService.getMe();
            if (isMounted) {
              setUser(freshUser);
              if (freshUser.role) setRoleState(freshUser.role);
            }
          } catch {
            // Token might be expired or server unreachable
            // If offline, keep cached user data; if 401 interceptor already cleared auth, reset state
            const currentToken = await storage.getAccessToken();
            if (!currentToken && isMounted) {
              setUser(null);
              setToken(null);
              setRoleState(null);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      setToken(result.tokens.accessToken);
      setRoleState(result.user.role);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await authService.register(payload);
      setUser(result.user);
      setToken(result.tokens.accessToken);
      setRoleState(result.user.role);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
      setRoleState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setRole = async (newRole: UserRole): Promise<void> => {
    await storage.setUserRole(newRole);
    setRoleState(newRole);
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      await storage.setUserData(updatedUser);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const freshUser = await authService.getMe();
      setUser(freshUser);
      if (freshUser.role) setRoleState(freshUser.role);
    } catch {
      // Ignore background refresh errors
    }
  };

  const isAuthenticated = Boolean(token && user);
  const isVolunteer = role === 'YAATRI_MITRA';
  const isTourist = role === 'TOURIST' || !role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        isAuthenticated,
        isVolunteer,
        isTourist,
        login,
        register,
        logout,
        setRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
