/**
 * Safe Yatra — Mobile App
 * Hardware-Backed Secure Storage Service (Expo SecureStore with Web/Memory Fallback).
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'safe_yatra_access_token',
  REFRESH_TOKEN: 'safe_yatra_refresh_token',
  USER_ROLE: 'safe_yatra_user_role',
  USER_DATA: 'safe_yatra_user_data',
} as const;

// In-memory fallback for headless test runners or web environments without SecureStore
const memoryStore: Record<string, string> = {};

class StorageService {
  private isSecureStoreAvailable = true;

  private async isAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  public async setItem(key: string, value: string): Promise<void> {
    try {
      const available = await this.isAvailable();
      if (available) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch {
      // Fall through to memory store
    }
    memoryStore[key] = value;
  }

  public async getItem(key: string): Promise<string | null> {
    try {
      const available = await this.isAvailable();
      if (available) {
        return await SecureStore.getItemAsync(key);
      }
    } catch {
      // Fall through to memory store
    }
    return memoryStore[key] ?? null;
  }

  public async removeItem(key: string): Promise<void> {
    try {
      const available = await this.isAvailable();
      if (available) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch {
      // Fall through to memory store
    }
    delete memoryStore[key];
  }

  // ─── TYPED AUTH ACCESSORS ─────────────────────────

  public async setAccessToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  public async getAccessToken(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  public async setRefreshToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  public async getRefreshToken(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  public async setUserRole(role: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_ROLE, role);
  }

  public async getUserRole(): Promise<string | null> {
    return this.getItem(STORAGE_KEYS.USER_ROLE);
  }

  public async setUserData(userData: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }

  public async getUserData<T = any>(): Promise<T | null> {
    const raw = await this.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
      this.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      this.removeItem(STORAGE_KEYS.USER_ROLE),
      this.removeItem(STORAGE_KEYS.USER_DATA),
    ]);
  }
}

export const storage = new StorageService();
export default storage;
