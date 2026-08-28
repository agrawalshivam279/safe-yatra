/**
 * Safe Yatra — Backend Spatial Server
 * Danger Score Proxy & Risk Assessment Types.
 */

import { DangerTier } from '@prisma/client';

export interface FactorScore {
  score: number;
  weight: number;
  details?: string;
}

export interface DangerFactors {
  weather: FactorScore;
  terrain: FactorScore;
  crowd: FactorScore;
  history: FactorScore;
}

export interface DangerScoreResult {
  zoneId?: string;
  zoneName?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  dangerScore: number;
  tier: DangerTier;
  justification: string;
  factors?: DangerFactors;
  computedAt: Date;
  source: 'OVERRIDE' | 'CACHE' | 'ML_ENGINE' | 'FALLBACK';
  ttlSeconds: number;
}

export interface PreTripBriefing {
  destination: string;
  overallDangerTier: DangerTier;
  dangerScore: number;
  summary: string;
  precautions: string[];
  emergencyContacts: {
    police: string;
    ambulance: string;
    disasterHelpline: string;
  };
}
