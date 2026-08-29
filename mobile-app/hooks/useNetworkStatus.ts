/**
 * Safe Yatra — Mobile App
 * Real-Time Network Status & Offline Detection Hook.
 * Enables automatic offline SMS fallback when cell data is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  networkType: Network.NetworkStateType | string;
  isOffline: boolean;
  checkStatus: () => Promise<void>;
}

export const useNetworkStatus = (pollIntervalMs = 15000): NetworkStatus => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [networkType, setNetworkType] = useState<Network.NetworkStateType | string>(
    Network.NetworkStateType.UNKNOWN
  );

  const checkStatus = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = state.isConnected ?? true;
      const reachable = state.isInternetReachable ?? true;

      setIsConnected(connected);
      setIsInternetReachable(reachable);
      setNetworkType(state.type ?? Network.NetworkStateType.UNKNOWN);
    } catch {
      // In web or restricted environments, default to online
      setIsConnected(true);
      setIsInternetReachable(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      if (isMounted) {
        await checkStatus();
      }
    };

    runCheck();

    const interval = setInterval(runCheck, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkStatus, pollIntervalMs]);

  const isOffline = !isConnected || isInternetReachable === false;

  return {
    isConnected,
    isInternetReachable,
    networkType,
    isOffline,
    checkStatus,
  };
};

export default useNetworkStatus;
