/**
 * Safe Yatra — Mobile App
 * Location Service (Foreground & Background Tracking and Telemetry Streaming).
 */

import * as Location from 'expo-location';
import socketService, { LocationPayload } from './socketService';

export interface LocationPermissionStatus {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
}

class LocationService {
  private subscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;

  /**
   * Request necessary foreground and background location permissions.
   */
  public async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      let backgroundGranted = false;

      if (foreground.granted) {
        try {
          const background = await Location.requestBackgroundPermissionsAsync();
          backgroundGranted = background.granted;
        } catch {
          // Background location might not be supported in all environments (e.g. simulator/web)
          backgroundGranted = false;
        }
      }

      return {
        foregroundGranted: foreground.granted,
        backgroundGranted,
      };
    } catch {
      return {
        foregroundGranted: false,
        backgroundGranted: false,
      };
    }
  }

  /**
   * Get one-shot current location coordinates.
   */
  public async getCurrentPosition(): Promise<LocationPayload | null> {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy || undefined,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Start continuous location watching and stream updates to Socket.IO.
   */
  public async startStreaming(
    onLocationUpdate?: (location: LocationPayload) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      return true;
    }

    const { foregroundGranted } = await this.requestPermissions();
    if (!foregroundGranted) {
      return false;
    }

    try {
      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000, // Every 15 seconds
          distanceInterval: 10, // Or every 10 meters
        },
        (location) => {
          const payload: LocationPayload = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
          };

          // Emit to backend spatial WebSocket
          socketService.emitLocationUpdate(payload);

          // Invoke local listener callback
          if (onLocationUpdate) {
            onLocationUpdate(payload);
          }
        }
      );

      this.isTracking = true;
      return true;
    } catch {
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop location tracking subscription.
   */
  public stopStreaming(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
  }

  public isTrackingActive(): boolean {
    return this.isTracking;
  }
}

export const locationService = new LocationService();
export default locationService;
