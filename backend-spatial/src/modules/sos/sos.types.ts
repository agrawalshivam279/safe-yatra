/**
 * Safe Yatra — Backend Spatial Server
 * SOS Emergency Dispatch Module Types & Interfaces.
 */

import { SOSStatus } from '@prisma/client';
import { NearbyVolunteerResult } from '../volunteer/volunteer.types';

export type SOSResponseStatus =
  | 'ALERTED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DECLINED';

export interface SOSEntity {
  id: string;
  triggeredBy: string;
  lat: number;
  lng: number;
  altitude?: number | null;
  battery?: number | null;
  audioUrl?: string | null;
  status: SOSStatus;
  dangerScore?: number | null;
  resolvedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SOSTimelineEntity {
  id: string;
  sosEventId: string;
  event: string;
  details?: string | null;
  timestamp: Date;
}

export interface SOSResponseEntity {
  id: string;
  sosEventId: string;
  volunteerId: string;
  status: string;
  acceptedAt?: Date | null;
  arrivedAt?: Date | null;
  currentLat?: number | null;
  currentLng?: number | null;
  etaSeconds?: number | null;
  createdAt: Date;
  updatedAt: Date;
  volunteer?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface SOSDetailEntity extends SOSEntity {
  user?: {
    id: string;
    name: string;
    phone: string;
  };
  responses: SOSResponseEntity[];
  timeline: SOSTimelineEntity[];
}

export interface TriggerSOSInput {
  userId: string;
  lat: number;
  lng: number;
  altitude?: number;
  battery?: number;
  audioUrl?: string;
}

export interface TriggerSOSResult {
  sosEvent: SOSEntity;
  matchResult: SOSMatchResult;
}

export interface SOSMatchResult {
  volunteerCount: number;
  volunteers: NearbyVolunteerResult[];
  nearestVolunteer?: NearbyVolunteerResult;
  nearestEtaSeconds?: number;
}

export interface AcceptSOSInput {
  sosId: string;
  volunteerId: string;
}

export interface ResolveSOSInput {
  sosId: string;
  resolvedByUserId?: string;
  resolutionNotes?: string;
}

export interface CancelSOSInput {
  sosId: string;
  userId: string;
  reason?: string;
}

export interface ParsedSMSPayload {
  type: 'SOS';
  lat: number;
  lng: number;
  battery?: number;
  userId?: string;
}

export interface SMSDispatchResult {
  success: boolean;
  messageId: string;
  recipientPhone: string;
  mode: 'SIMULATED' | 'TWILIO';
}
