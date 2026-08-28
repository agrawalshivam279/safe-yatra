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

export interface TriggerSOSInput {
  userId: string;
  lat: number;
  lng: number;
  altitude?: number;
  battery?: number;
  audioUrl?: string;
}

export interface SOSMatchResult {
  volunteerCount: number;
  volunteers: NearbyVolunteerResult[];
  nearestVolunteer?: NearbyVolunteerResult;
  nearestEtaSeconds?: number;
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
