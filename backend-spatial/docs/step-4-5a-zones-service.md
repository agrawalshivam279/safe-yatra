# 📄 Technical Specification: Zones Service & PostGIS Polygon Management

> **Step ID**: `4.5a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-5a-zones-service`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.5a implements the core **Zones Management Service** (`ZoneService`) in `backend-spatial`. It handles PostGIS 2D polygon boundary ingestion (`ST_GeomFromGeoJSON` and `ST_Buffer`), GeoJSON extraction (`ST_AsGeoJSON`), centroid computation, risk tier mapping (0–25: `LOW`, 26–50: `MODERATE`, 51–75: `SEVERE`, 76–100: `CRITICAL`), and administrative manual danger score overrides with justification reasons and expiration timestamps.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Database singletons (`src/config/database.ts` with PostGIS Prisma client).
  - Step 4.2: Standard response helpers & `AppError` (`src/utils/response.ts`).
  - Phase 2: PostGIS database schema (`Zone`, `RiskTier`, `ZoneType` with GiST spatial indexes).
- **Blocked by**: None.
- **New Packages / Libraries**: None (`uuid` is already present).

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *GeoJSON Polygon Coordinates Invariant*: Standard GeoJSON format mandates `[longitude, latitude]` order within linear rings (`coordinates: [[[lng, lat], [lng, lat], ...]]`). PostGIS `ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)` preserves this projection.
  2. *Circular Buffer Fallback*: For circular zones defined by `{ centerLat, centerLng, radius }`, the boundary polygon is generated via `ST_Buffer(ST_SetSRID(ST_MakePoint(centerLng, centerLat), 4326)::geography, radius)::geometry`.
  3. *Client GeoJSON Deserialization*: Prisma raw spatial results return geometry as binary/WKB. Queries execute `ST_AsGeoJSON(boundaries) AS geojson` so clients receive native GeoJSON JSON objects.
  4. *Risk Tier Normalization*: Numeric danger scores ($[0, 100]$) map deterministically to `RiskTier` enums:
     - $[0, 25] \rightarrow \text{LOW}$
     - $[26, 50] \rightarrow \text{MODERATE}$
     - $[51, 75] \rightarrow \text{SEVERE}$
     - $[76, 100] \rightarrow \text{CRITICAL}$

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **GiST Spatial Index Preservation**: Queries utilize the existing GiST spatial index on `Zone.boundaries` (`@@index([boundaries], type: Gist)`).
- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Zone Types (`src/modules/zones/zone.types.ts`)

```typescript
import { RiskTier, ZoneType } from '@prisma/client';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

export interface ZoneEntity {
  id: string;
  name: string;
  description?: string | null;
  zoneType: ZoneType;
  boundaries: GeoJSONPolygon | null;
  centerLat: number;
  centerLng: number;
  radius?: number | null;
  dangerScore: number;
  riskTier: RiskTier;
  isManualOverride: boolean;
  overrideReason?: string | null;
  overrideExpiresAt?: Date | null;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateZoneInput {
  name: string;
  description?: string;
  zoneType: ZoneType;
  boundaries?: GeoJSONPolygon;
  centerLat?: number;
  centerLng?: number;
  radius?: number;
  metadata?: Record<string, any>;
}

export interface OverrideScoreInput {
  score: number;
  reason: string;
  expiresAt?: Date;
}
```

### 5.2 Zone Service Interface (`src/modules/zones/zone.service.ts`)

```typescript
export class ZoneService {
  async createZone(input: CreateZoneInput): Promise<ZoneEntity>;
  async getAllZones(includeInactive?: boolean): Promise<ZoneEntity[]>;
  async getZoneById(id: string): Promise<ZoneEntity>;
  async overrideScore(id: string, input: OverrideScoreInput): Promise<ZoneEntity>;
  async deleteZone(id: string): Promise<void>;
  scoreToRiskTier(score: number): RiskTier;
}
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Types & Data Interfaces**
   - [ ] Implement `src/modules/zones/zone.types.ts`.
2. **Phase B: Core Zone Domain Service**
   - [ ] Implement `src/modules/zones/zone.service.ts` with GeoJSON ingestion, centroid extraction, risk tier evaluation, and score override logic.
3. **Phase C: Comprehensive Unit Testing**
   - [ ] Author `tests/zone.service.test.ts` testing zone creation, GeoJSON boundary serialization, score tier mapping, and manual overrides with Prisma mocks.

---

## 7. Edge Cases & Failure Recovery

- **Missing Coordinates & Boundaries**: If neither `boundaries` nor `centerLat/centerLng` are provided, throws 400 `INVALID_ZONE_GEOMETRY`.
- **Score Out of Range**: Validates score $\in [0, 100]$.
- **Inactive Zones**: Filtered by default in `getAllZones()` unless explicitly requested.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/zone.service.test.ts
```

### Acceptance Checklist
- [ ] `ZoneService.createZone` creates PostGIS polygon with SRID 4326 and computes center coords.
- [ ] `ZoneService.getAllZones` returns list of zones with deserialized GeoJSON polygons.
- [ ] `ZoneService.overrideScore` updates dangerScore, recalculates riskTier, and sets `isManualOverride: true`.
- [ ] All unit tests in `tests/zone.service.test.ts` pass with 100% assertion coverage.
