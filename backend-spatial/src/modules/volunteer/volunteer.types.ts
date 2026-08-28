/**
 * Safe Yatra — Backend Spatial Server
 * Volunteer & User Location Data Types.
 */

import { UserRole, VerificationStatus } from '@prisma/client';

export interface LocationPingInput {
  userId: string;
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  battery?: number;
}

export interface NearbyVolunteerResult {
  userId: string;
  name: string;
  phone: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  isOnDuty: boolean;
  rating: number | null;
  totalResponses: number;
  location: {
    lat: number;
    lng: number;
    altitude: number | null;
    battery: number | null;
    lastPing: Date;
  };
  distanceMeters: number;
  estimatedEtaSeconds: number;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  profileImageUrl?: string;
  languagePreference?: string;
}
