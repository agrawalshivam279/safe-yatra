# 📄 Technical Specification: Danger Score Proxy & Redis Cache Layer

> **Step ID**: `4.6a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-6a-danger-proxy-cache`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.6a implements the **Danger Score Proxy Engine** and **Redis Cache Layer** (`DangerCache` and `DangerService`) in `backend-spatial`. It orchestrates dynamic safety risk calculation across India's tourist pilgrimage sites by linking incoming GPS coordinates with PostGIS zone spatial indexes, caching computed danger scores in Redis with a 300-second TTL, querying the external Python FastAPI ML Risk Engine (`POST /api/v1/score`), and providing resilience via graceful fallback heuristics if the microservice is unreachable.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Redis client singleton (`src/config/redis.ts`) & database client (`src/config/database.ts`).
  - Step 4.2: Standard error classes (`src/utils/response.ts`).
  - Step 4.5a: Zones domain service & PostGIS spatial boundaries (`src/modules/zones/zone.service.ts`).
- **Blocked by**: None.
- **New Packages / Libraries**: None (uses native `fetch` / `ioredis`).

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Manual Override Precedence*: If a PostGIS zone has `isManualOverride === true`, `DangerService` immediately returns the manual override score and justification without hitting Redis or invoking the ML microservice.
  2. *Redis Cache-First Strategy*: For standard queries, `DangerCache` checks key `danger:score:{zoneId}` or `danger:coords:{lat}:{lng}`. Cache hits return immediately with `source: 'CACHE'`, reducing ML engine load by $>95\%$.
  3. *Hermetic Microservice Communication*: On a cache miss, an HTTP POST request is dispatched to the Python ML Risk Engine microservice with a 3.0-second abort timeout.
  4. *Graceful Offline Fallback*: If the ML engine is offline or times out, the service falls back to the zone's default stored score or baseline safety heuristics with `source: 'FALLBACK'`.
  5. *Cache Expiration*: Successful ML scores are stored in Redis with a 300-second (5 min) TTL and persisted asynchronously to the `DangerScore` database table.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Non-Blocking Analytics Persistence**: Asynchronous writes to `DangerScore` table execute in background without blocking API response times.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Danger Score Types (`src/modules/danger/danger.types.ts`)

```typescript
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
```

### 5.2 Danger Cache Interface (`src/modules/danger/danger.cache.ts`)

```typescript
export class DangerCache {
  async get(key: string): Promise<DangerScoreResult | null>;
  async set(key: string, data: DangerScoreResult, ttlSeconds?: number): Promise<void>;
  async invalidateZone(zoneId: string): Promise<void>;
}
```

### 5.3 Danger Service Interface (`src/modules/danger/danger.service.ts`)

```typescript
export class DangerService {
  async getScoreForCoordinates(lat: number, lng: number): Promise<DangerScoreResult>;
  async getAllZoneScores(): Promise<DangerScoreResult[]>;
  async getSafetyBriefing(destination: string): Promise<PreTripBriefing>;
}
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Data Types & Interfaces**
   - [ ] Implement `src/modules/danger/danger.types.ts`.
2. **Phase B: Redis Cache Wrapper**
   - [ ] Implement `src/modules/danger/danger.cache.ts` with 300s TTL and error-safe Redis fallbacks.
3. **Phase C: Core Danger Proxy Service**
   - [ ] Implement `src/modules/danger/danger.service.ts` linking PostGIS nearest zone lookup, manual override interception, Redis caching, ML microservice proxying, and fallback logic.
4. **Phase D: Comprehensive Unit Testing**
   - [ ] Author `tests/danger.service.test.ts` testing cache hits, ML engine invocations, manual overrides, and offline resilience with Redis/Prisma/Fetch mocks.

---

## 7. Edge Cases & Failure Recovery

- **Redis Unavailability**: If Redis is offline or disconnected, `DangerCache` catches the error and transparently bypasses the cache without failing the request.
- **ML Engine Timeout**: If the ML engine does not respond within 3000ms, fallback heuristics compute a valid safe score envelope.
- **Coordinates Far from Any Zone**: Returns coordinate-level safety analysis using default terrain/weather baselines.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/danger.service.test.ts
```

### Acceptance Checklist
- [ ] `DangerCache` caches and retrieves danger scores with TTL.
- [ ] `DangerService.getScoreForCoordinates` respects manual overrides immediately.
- [ ] `DangerService.getScoreForCoordinates` retrieves score from Redis on cache hit without calling ML engine.
- [ ] `DangerService.getScoreForCoordinates` proxies to ML engine on cache miss and caches result.
- [ ] `DangerService.getScoreForCoordinates` provides fallback score when ML engine is unreachable.
- [ ] All unit tests pass in `tests/danger.service.test.ts`.
