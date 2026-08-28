/**
 * Safe Yatra — Backend Spatial Server
 * Authentication Data Types & JWT Payload Interfaces.
 */

import { UserRole, VolunteerProfile } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  profileImageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  volunteerProfile?: VolunteerProfile | null;
}

export interface AuthResponseData {
  user: UserPublicProfile;
  tokens: AuthTokens;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}
