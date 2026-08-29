/**
 * Safe Yatra — Admin Dashboard Storage Service
 * SSR-safe storage abstraction with memory fallback.
 */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | string;
  phoneNumber?: string;
}

const AUTH_TOKEN_KEY = 'safeyatra_admin_token';
const AUTH_USER_KEY = 'safeyatra_admin_user';

// In-memory fallback for SSR or environments without localStorage
const memoryStore: Record<string, string> = {};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const storage = {
  getAuthToken(): string | null {
    if (isBrowser) {
      try {
        return window.localStorage.getItem(AUTH_TOKEN_KEY);
      } catch {
        return memoryStore[AUTH_TOKEN_KEY] || null;
      }
    }
    return memoryStore[AUTH_TOKEN_KEY] || null;
  },

  setAuthToken(token: string): void {
    if (isBrowser) {
      try {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      } catch {
        memoryStore[AUTH_TOKEN_KEY] = token;
      }
    } else {
      memoryStore[AUTH_TOKEN_KEY] = token;
    }
  },

  removeAuthToken(): void {
    if (isBrowser) {
      try {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      } catch {
        delete memoryStore[AUTH_TOKEN_KEY];
      }
    } else {
      delete memoryStore[AUTH_TOKEN_KEY];
    }
  },

  getStoredUser(): AdminUser | null {
    let raw: string | null = null;
    if (isBrowser) {
      try {
        raw = window.localStorage.getItem(AUTH_USER_KEY);
      } catch {
        raw = memoryStore[AUTH_USER_KEY] || null;
      }
    } else {
      raw = memoryStore[AUTH_USER_KEY] || null;
    }

    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  },

  setStoredUser(user: AdminUser): void {
    const raw = JSON.stringify(user);
    if (isBrowser) {
      try {
        window.localStorage.setItem(AUTH_USER_KEY, raw);
      } catch {
        memoryStore[AUTH_USER_KEY] = raw;
      }
    } else {
      memoryStore[AUTH_USER_KEY] = raw;
    }
  },

  removeStoredUser(): void {
    if (isBrowser) {
      try {
        window.localStorage.removeItem(AUTH_USER_KEY);
      } catch {
        delete memoryStore[AUTH_USER_KEY];
      }
    } else {
      delete memoryStore[AUTH_USER_KEY];
    }
  },

  clearStorage(): void {
    this.removeAuthToken();
    this.removeStoredUser();
  },
};
