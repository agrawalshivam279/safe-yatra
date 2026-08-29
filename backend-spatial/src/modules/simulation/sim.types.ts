/**
 * Safe Yatra — Backend Spatial Server
 * Simulation Module Data Contracts & Types.
 */

import { GeofenceCheckResult } from '../geofence/geofence.types';

export interface CoordinatePoint {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  battery?: number;
  timestamp?: string | Date;
}

export interface InjectLocationInput {
  userId: string;
  coordinates: CoordinatePoint[];
}

export interface InjectedLocationRecord {
  id: string;
  userId: string;
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  battery: number | null;
  timestamp: Date;
}

export interface InjectLocationResult {
  userId: string;
  injectedCount: number;
  records: InjectedLocationRecord[];
}

export interface ReplayTrajectoryInput {
  userId: string;
  coordinates: CoordinatePoint[];
  intervalSeconds?: number;
}

export interface TrajectoryWaypoint {
  index: number;
  coordinate: CoordinatePoint;
  timestamp: Date;
  geofenceStatus: GeofenceCheckResult;
}

export interface TrajectoryReplayResult {
  userId: string;
  totalWaypoints: number;
  intervalSeconds: number;
  waypoints: TrajectoryWaypoint[];
  violationsDetected: number;
  completedAt: Date;
}
