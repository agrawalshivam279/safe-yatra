/**
 * Safe Yatra — Mobile App
 * Location Service (Foreground & Background Tracking and Telemetry Streaming).
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import socketService, { LocationPayload } from './socketService';

export const BACKGROUND_LOCATION_TASK = 'SAFE_YATRA_BACKGROUND_LOCATION_TASK';

// Define the background location task if TaskManager is available in the runtime
try {
  if (TaskManager && typeof TaskManager.defineTask === 'function') {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
      if (error || !data) {
        return;
      }
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations && locations.length > 0) {
        const latest = locations[locations.length - 1];
        const payload: LocationPayload = {
          lat: latest.coords.latitude,
          lng: latest.coords.longitude,
          accuracy: latest.coords.accuracy || undefined,
          speed: latest.coords.speed || undefined,
          heading: latest.coords.heading || undefined,
        };
        socketService.emitLocationUpdate(payload);
      }
    });
  }
} catch {
  // Non-native / test environment fallback
}

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
   * Enables foreground streaming and registers background location task if permitted.
   */
  public async startStreaming(
    onLocationUpdate?: (location: LocationPayload) => void
  ): Promise<boolean> {
    if (this.isTracking) {
      return true;
    }

    const { foregroundGranted, backgroundGranted } = await this.requestPermissions();
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

      // Register background location tracking if permitted
      if (backgroundGranted && TaskManager && typeof TaskManager.isTaskDefined === 'function') {
        try {
          const isDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
          if (isDefined && typeof Location.startLocationUpdatesAsync === 'function') {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 15000,
              distanceInterval: 10,
              foregroundService: {
                notificationTitle: 'Safe Yatra Safety Shield',
                notificationBody: 'Active monitoring of geofence safety and danger zones.',
                notificationColor: '#1a5276',
              },
            });
          }
        } catch {
          // Graceful fallback to foreground-only streaming
        }
      }

      this.isTracking = true;
      return true;
    } catch {
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop location tracking subscription and unregister background tasks.
   */
  public stopStreaming(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    try {
      if (Location && typeof Location.hasStartedLocationUpdatesAsync === 'function') {
        Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).then((started) => {
          if (started && typeof Location.stopLocationUpdatesAsync === 'function') {
            Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          }
        }).catch(() => {});
      }
    } catch {
      // Ignored
    }

    this.isTracking = false;
  }

  public isTrackingActive(): boolean {
    return this.isTracking;
  }
}

export const locationService = new LocationService();
export default locationService;

