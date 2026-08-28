/**
 * Safe Yatra — Backend Spatial Server
 * Redis Cache Layer for Danger Scores (5-minute TTL).
 */

import { redis } from '../../config/redis';
import { DangerScoreResult } from './danger.types';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

export class DangerCache {
  /**
   * Generates Redis key for a predefined zone.
   */
  public zoneKey(zoneId: string): string {
    return `danger:score:${zoneId}`;
  }

  /**
   * Generates Redis key for arbitrary GPS coordinates rounded to 4 decimal places (~11m).
   */
  public coordsKey(lat: number, lng: number): string {
    const rLat = lat.toFixed(4);
    const rLng = lng.toFixed(4);
    return `danger:coords:${rLat}:${rLng}`;
  }

  /**
   * Retrieves cached danger score from Redis.
   */
  public async get(key: string): Promise<DangerScoreResult | null> {
    try {
      const cached = await redis.get(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return {
        ...parsed,
        computedAt: new Date(parsed.computedAt),
        source: 'CACHE' as const,
      };
    } catch {
      // Redis fail-open: return null on connection error so request can proceed
      return null;
    }
  }

  /**
   * Caches a danger score in Redis with a TTL.
   */
  public async set(
    key: string,
    data: DangerScoreResult,
    ttlSeconds = DEFAULT_TTL_SECONDS
  ): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch {
      // Redis fail-open: ignore cache write failure
    }
  }

  /**
   * Invalidates cached danger score for a zone (e.g. on manual override).
   */
  public async invalidateZone(zoneId: string): Promise<void> {
    try {
      await redis.del(this.zoneKey(zoneId));
    } catch {
      // Ignore cache deletion error
    }
  }
}

export const dangerCache = new DangerCache();
export default dangerCache;
