# 📄 Technical Specification: Geofence Spatial Engine & Service

> **Step ID**: `4.7a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-7a-geofence-spatial-engine`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.7a establishes the core geospatial geofencing engine and management service for `backend-spatial`. Geofencing is the foundational proactive safety mechanism of Safe Yatra: it continuously computes whether a tourist's real-time coordinate intersects a hazard perimeter (`ST_Contains`) or is dangerously approaching one within a proactive buffer distance (`ST_DWithin`, 500m default).

This step creates the TypeScript type contracts, the raw PostGIS spatial engine (`geofence.engine.ts`), and the database CRUD service (`geofence.service.ts`), providing deterministic, spatial-indexed boundary checks with microsecond query latency.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/prisma/schema.prisma` (`Geofence` model with PostGIS `geometry(Polygon, 4326)` and GiST spatial index).
  - `backend-spatial/src/config/database.ts` (`prisma` client singleton).
  - `backend-spatial/src/utils/response.ts` (`AppError` error model).
- **Blocked by**: None (Prisma schema and database connection already in place).
- **New Packages / Libraries**: None (`uuid` and `@prisma/client` are already installed).

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, spatial edge cases, and algorithmic invariants to validate during implementation.*

- **Core Reasoning Hypotheses**:
  - **Coordinate Ordering Standard**: PostGIS and GeoJSON strictly require `[longitude, latitude]` (`[lng, lat]`) storage ordering, while external GPS clients and mobile devices send `[latitude, longitude]` (`[lat, lng]`). `ST_MakePoint(lng, lat)` must be strictly adhered to across all raw SQL statements.
  - **Metric Distance Projection**: Planar `ST_DWithin(geometry, geometry, distance)` operates in degrees (where $1^\circ \approx 111\text{km}$ and varies by latitude). All proximity queries must cast geometries to `::geography` to compute spherical geodesic distance in true meters.
  - **Active and Expiry Filtering**: Expired geofences (`expiresAt <= NOW()`) or inactive geofences (`isActive = false`) must be automatically excluded from real-time containment and proximity evaluations.
- **Spatial / Algorithmic Edge Cases**:
  - **Zero-distance / Boundary Intersect**: A point exactly on the boundary polygon edge or vertex must resolve to containment (`inside: true`) or proximity distance `0m`.
  - **Overlapping Geofences**: A single coordinate may reside within multiple geofences simultaneously (e.g. a localized `CRITICAL` flash flood zone nested inside a regional `SEVERE` weather zone). The engine must return all breached geofences sorted by severity.
  - **Self-Intersections & Closed Rings**: GeoJSON polygons provided by admin input must have identical first and last coordinates (`ring[0] == ring[last]`).
- **State & Invariant Proofs**:
  - **GiST Index Utilization**: Spatial predicates `ST_Contains` and `ST_DWithin` must leverage the PostGIS GiST index defined on `Geofence.boundary` (`@@index([boundary], type: Gist)`).

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **GiST Spatial Index**: `Geofence.boundary` has `@@index([boundary], type: Gist)` defined in `schema.prisma`.
- [x] **Coordinate SRID 4326**: PostGIS polygon geometry uses `geometry(Polygon, 4326)`.
- [x] **Zero-Downtime Safe**: No schema migrations needed; uses existing Prisma model.
- [x] **Rollback Feasibility**: Pure application code addition; rollback involves deleting module files.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Data Models & Types (`src/modules/geofence/geofence.types.ts`)

```typescript
import { DangerTier } from '@prisma/client';
import { GeoJSONPolygon } from '../zones/zone.types';

export type GeofenceType = 'AUTO_DANGER' | 'MANUAL_NOENTRY' | 'ADMIN_OVERRIDE';

export interface GeofenceEntity {
  id: string;
  zoneId: string | null;
  name: string;
  type: string;
  boundary: GeoJSONPolygon | null;
  isActive: boolean;
  severity: DangerTier;
  message: string | null;
  createdBy: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  centerLat?: number;
  centerLng?: number;
}

export interface CreateGeofenceInput {
  name: string;
  type: string;
  severity: DangerTier;
  zoneId?: string | null;
  boundary?: GeoJSONPolygon;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  message?: string | null;
  createdBy?: string | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface UpdateGeofenceInput {
  name?: string;
  type?: string;
  severity?: DangerTier;
  zoneId?: string | null;
  boundary?: GeoJSONPolygon;
  message?: string | null;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export interface ProximityGeofence {
  geofence: GeofenceEntity;
  distanceMeters: number;
}

export interface GeofenceCheckResult {
  inside: boolean;
  breachedGeofences: GeofenceEntity[];
  approachingGeofences: ProximityGeofence[];
}
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Types & Contracts (`src/modules/geofence/geofence.types.ts`)**
   - [ ] Define `GeofenceEntity`, `CreateGeofenceInput`, `UpdateGeofenceInput`, `ProximityGeofence`, and `GeofenceCheckResult`.

2. **Phase B: Spatial Engine (`src/modules/geofence/geofence.engine.ts`)**
   - [ ] Implement `checkPointInGeofences(lat, lng)` executing parameterized PostGIS query with `ST_Contains`.
   - [ ] Implement `findGeofencesNearPoint(lat, lng, bufferMeters)` executing `ST_DWithin` and `ST_Distance` on `::geography`.
   - [ ] Implement composite `evaluateLocation(lat, lng, bufferMeters)` combining containment and proximity checks into `GeofenceCheckResult`.

3. **Phase C: Geofence Service (`src/modules/geofence/geofence.service.ts`)**
   - [ ] Implement `createGeofence` supporting both explicit GeoJSON Polygon (`ST_GeomFromGeoJSON`) and point+radius circular buffer (`ST_Buffer(::geography)`).
   - [ ] Implement `getAllGeofences`, `getGeofenceById`, `updateGeofence`, `deleteGeofence`.
   - [ ] Implement `checkPoint` orchestrator delegating to `geofenceEngine`.

4. **Phase D: Unit & Spatial Tests (`tests/geofence.service.test.ts`)**
   - [ ] Author hermetic unit and mock spatial query tests validating:
     - Containment detection (`inside: true`).
     - Proximity buffer detection (e.g., 200m away approaching `CRITICAL` geofence).
     - Geofence creation via Polygon vs circular buffer.
     - Entity serialization and error handling for missing geofences.

---

## 7. Edge Cases & Failure Recovery

- **Invalid Coordinate Bounds**: `lat` must be $\in [-90, 90]$ and `lng` $\in [-180, 180]$.
- **Degenerate Polygons**: Validates polygon coordinate arrays contain $\ge 4$ points with closed ring coordinates.
- **Empty Proximity Matches**: Returns `{ inside: false, breachedGeofences: [], approachingGeofences: [] }` gracefully without DB exceptions.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/geofence.service.test.ts
```

### Acceptance Checklist
- [ ] Containment queries correctly identify points inside polygons using `ST_Contains`.
- [ ] Proximity queries compute geodesic distance in meters using `ST_DWithin` and `ST_Distance` on `::geography`.
- [ ] Circular buffer and polygon geofences are created and updated cleanly.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
