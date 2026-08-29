/**
 * Safe Yatra — Mobile App
 * useGeofence Custom Hook (Real-Time Geofence Alert Subscription & Safety Breach State).
 */

import { useState, useEffect, useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import socketService, { GeofenceAlertPayload } from '../services/socketService';

export function useGeofence() {
  const [activeAlert, setActiveAlert] = useState<GeofenceAlertPayload | null>(null);
  const [alertHistory, setAlertHistory] = useState<GeofenceAlertPayload[]>([]);
  const [acknowledgedZoneIds, setAcknowledgedZoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Ensure socket is initialized and listening
    socketService.connect();

    const unsubscribe = socketService.onGeofenceAlert((alert) => {
      // If user has already acknowledged this zone in this session, skip modal popup
      if (acknowledgedZoneIds.has(alert.zoneId) && alert.breachType !== 'ENTRY') {
        return;
      }

      setActiveAlert(alert);
      setAlertHistory((prev) => [alert, ...prev.slice(0, 20)]);

      // Announce for accessibility screen readers
      AccessibilityInfo.announceForAccessibility(
        `Critical Hazard Alert: You have entered ${alert.zoneName}. Danger score is ${alert.dangerScore}. Please proceed with caution or turn back.`
      );
    });

    return () => {
      unsubscribe();
    };
  }, [acknowledgedZoneIds]);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const acknowledgeRisk = useCallback((zoneId: string) => {
    setAcknowledgedZoneIds((prev) => new Set([...prev, zoneId]));
    setActiveAlert(null);
  }, []);

  return {
    activeAlert,
    alertHistory,
    dismissAlert,
    acknowledgeRisk,
    hasActiveAlert: !!activeAlert,
  };
}

export default useGeofence;
