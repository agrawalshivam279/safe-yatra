/**
 * Safe Yatra — Backend Spatial Server
 * Danger Score Proxy Service (PostGIS Lookup, Redis Caching, ML Microservice Gateway).
 */

import { DangerTier } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { dangerCache } from './danger.cache';
import {
  DangerScoreResult,
  PreTripBriefing,
} from './danger.types';

const ML_ENGINE_BASE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
const ML_REQUEST_TIMEOUT_MS = 3000;

export class DangerService {
  /**
   * Maps numeric danger score to standard DangerTier.
   */
  public scoreToDangerTier(score: number): DangerTier {
    if (score <= 25) return DangerTier.LOW;
    if (score <= 50) return DangerTier.MODERATE;
    if (score <= 75) return DangerTier.SEVERE;
    return DangerTier.CRITICAL;
  }

  /**
   * Computes or retrieves dynamic danger score for given coordinates.
   * Priority: Manual Admin Override -> Redis Cache -> Python ML Microservice -> Fallback Heuristic.
   */
  public async getScoreForCoordinates(
    lat: number,
    lng: number
  ): Promise<DangerScoreResult> {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new AppError('Invalid coordinate boundaries', 400, 'INVALID_COORDINATES');
    }

    // Step 1: Spatial lookup for containing or nearest zone
    const nearestZones = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      dangerScore: number;
      dangerTier: string;
      isManualOverride: boolean;
      justification: string | null;
      distanceMeters: number;
    }>>`
      SELECT
        "id",
        "name",
        "dangerScore",
        "dangerTier"::text AS "dangerTier",
        "isManualOverride",
        "justification",
        ROUND(ST_Distance("boundary"::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)::numeric, 1) AS "distanceMeters"
      FROM "Zone"
      ORDER BY "boundary" <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      LIMIT 1;
    `;

    const nearestZone = nearestZones && nearestZones.length > 0 ? nearestZones[0] : null;

    // Step 2: Immediate return for Manual Admin Override
    if (nearestZone && nearestZone.isManualOverride && nearestZone.distanceMeters <= 5000) {
      return {
        zoneId: nearestZone.id,
        zoneName: nearestZone.name,
        coordinates: { lat, lng },
        dangerScore: Number(nearestZone.dangerScore),
        tier: nearestZone.dangerTier as DangerTier,
        justification: nearestZone.justification || `Manual administrative override active for ${nearestZone.name}`,
        computedAt: new Date(),
        source: 'OVERRIDE',
        ttlSeconds: 0,
      };
    }

    // Step 3: Check Redis Cache (by Zone ID or Coordinates)
    const cacheKey = nearestZone && nearestZone.distanceMeters <= 5000
      ? dangerCache.zoneKey(nearestZone.id)
      : dangerCache.coordsKey(lat, lng);

    const cachedResult = await dangerCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Step 4: Proxy to Python ML Risk Engine Microservice
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), ML_REQUEST_TIMEOUT_MS);

      const response = await fetch(`${ML_ENGINE_BASE_URL}/api/v1/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: { lat, lng },
          zone_id: nearestZone ? nearestZone.id : undefined,
        }),
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (response && response.ok) {
        const mlData = (await response.json()) as any;
        const score = Math.round(mlData.danger_score ?? mlData.dangerScore ?? 20);
        const tier = this.scoreToDangerTier(score);

        const result: DangerScoreResult = {
          zoneId: nearestZone?.id,
          zoneName: nearestZone?.name,
          coordinates: { lat, lng },
          dangerScore: score,
          tier,
          justification: mlData.justification || `Real-time risk computed from environmental factors.`,
          factors: mlData.factors,
          computedAt: new Date(),
          source: 'ML_ENGINE',
          ttlSeconds: 300,
        };

        // Cache result in Redis
        await dangerCache.set(cacheKey, result, 300);

        // Async update latest zone score in database
        if (nearestZone) {
          prisma.zone.update({
            where: { id: nearestZone.id },
            data: {
              dangerScore: score,
              dangerTier: tier,
              justification: result.justification,
              lastScoreUpdate: new Date(),
            },
          }).catch(() => {});
        }

        return result;
      }
    } catch {
      // ML engine unreachable or timed out -> proceed to fallback
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    // Step 5: Graceful Heuristic Fallback
    const fallbackScore = nearestZone ? Number(nearestZone.dangerScore) : 15;
    const fallbackTier = this.scoreToDangerTier(fallbackScore);

    const fallbackResult: DangerScoreResult = {
      zoneId: nearestZone?.id,
      zoneName: nearestZone?.name,
      coordinates: { lat, lng },
      dangerScore: fallbackScore,
      tier: fallbackTier,
      justification: nearestZone
        ? `Estimated from baseline sector safety data for ${nearestZone.name}.`
        : 'Normal baseline tourist safety parameters apply.',
      computedAt: new Date(),
      source: 'FALLBACK',
      ttlSeconds: 60,
    };

    // Cache fallback with short TTL (60s)
    await dangerCache.set(cacheKey, fallbackResult, 60);

    return fallbackResult;
  }

  /**
   * Retrieves danger scores across all predefined zones.
   */
  public async getAllZoneScores(): Promise<DangerScoreResult[]> {
    const rawZones = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      dangerScore: number;
      dangerTier: string;
      isManualOverride: boolean;
      justification: string | null;
      centerLat: number | null;
      centerLng: number | null;
    }>>`
      SELECT
        "id",
        "name",
        "dangerScore",
        "dangerTier"::text AS "dangerTier",
        "isManualOverride",
        "justification",
        ST_Y(ST_Centroid("boundary")) AS "centerLat",
        ST_X(ST_Centroid("boundary")) AS "centerLng"
      FROM "Zone"
      ORDER BY "dangerScore" DESC;
    `;

    const results: DangerScoreResult[] = [];

    for (const zone of rawZones) {
      const lat = zone.centerLat ? Number(zone.centerLat) : 0;
      const lng = zone.centerLng ? Number(zone.centerLng) : 0;

      const score = Number(zone.dangerScore);
      const tier = zone.dangerTier as DangerTier;

      results.push({
        zoneId: zone.id,
        zoneName: zone.name,
        coordinates: { lat, lng },
        dangerScore: score,
        tier,
        justification: zone.justification || `Safety assessment for ${zone.name}`,
        computedAt: new Date(),
        source: zone.isManualOverride ? 'OVERRIDE' : 'CACHE',
        ttlSeconds: 300,
      });
    }

    return results;
  }

  /**
   * Generates a pre-trip safety briefing for a named destination.
   */
  public async getSafetyBriefing(destination: string): Promise<PreTripBriefing> {
    const zones = await prisma.zone.findMany({
      where: {
        name: {
          contains: destination,
          mode: 'insensitive',
        },
      },
    });

    let avgScore = 20;
    let highestTier: DangerTier = DangerTier.LOW;

    if (zones.length > 0) {
      avgScore = Math.round(
        zones.reduce((acc, z) => acc + z.dangerScore, 0) / zones.length
      );
      highestTier = this.scoreToDangerTier(avgScore);
    }

    const precautions = [
      'Maintain cellular connectivity and ensure phone battery is above 50%.',
      'Follow designated pilgrimage paths and heed posted cautionary signage.',
      'In the event of an emergency, trigger the Safe Yatra SOS panic button.',
    ];

    if (avgScore > 50) {
      precautions.unshift('High water flow or slippery terrain detected. Avoid cliff edges and waterfalls.');
    }

    return {
      destination,
      overallDangerTier: highestTier,
      dangerScore: avgScore,
      summary: `Safety briefing for ${destination}. Overall risk tier is ${highestTier} with an average danger rating of ${avgScore}/100.`,
      precautions,
      emergencyContacts: {
        police: '112',
        ambulance: '108',
        disasterHelpline: '1077',
      },
    };
  }
}

export const dangerService = new DangerService();
export default dangerService;
