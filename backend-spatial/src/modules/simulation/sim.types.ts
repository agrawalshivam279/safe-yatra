/**
 * Safe Yatra — Backend Spatial Server
 * Simulation Module Data Contracts & Types.
 */

import { GeofenceCheckResult } from '../geofence/geofence.types';
import { SOSDetailEntity } from '../sos/sos.types';

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

export interface MockTouristInput {
  userId?: string;
  location: {
    lat: number;
    lng: number;
  };
  battery?: number;
  audioUrl?: string;
}

export interface MockVolunteerInput {
  userId?: string;
  location: {
    lat: number;
    lng: number;
  };
  responseDelaySeconds?: number;
}

export interface SimulateSOSInput {
  scenario?: 'full_loop' | 'volunteer_timeout' | 'cancel';
  tourist: MockTouristInput;
  volunteers?: MockVolunteerInput[];
  autoResolve?: boolean;
  resolveAfterSeconds?: number;
}

export interface SimulateSOSResult {
  sosId: string;
  scenario: 'full_loop' | 'volunteer_timeout' | 'cancel';
  status: string;
  touristId: string;
  respondingVolunteerId?: string;
  sosDetail: SOSDetailEntity;
}

export interface WeatherOverrideFactors {
  precipitation_mm?: number;
  wind_speed_kmh?: number;
  visibility_meters?: number;
  temperature_c?: number;
}

export interface WeatherOverrideInput {
  precipitation_mm?: number;
  wind_speed_kmh?: number;
  visibility_meters?: number;
  temperature_c?: number;
  ttlSeconds?: number;
  clear?: boolean;
}

export interface WeatherOverrideResult {
  active: boolean;
  overrides?: WeatherOverrideFactors;
  ttlSeconds?: number;
  message: string;
}
