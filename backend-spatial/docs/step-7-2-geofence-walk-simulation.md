# 📄 Technical Specification: Geofence Walk Simulation & Dynamic Proximity Alerts E2E Suite

> **Step ID**: `7.2`  
> **Target Module**: `backend-spatial` / Cross-Module  
> **Git Feature Branch**: `feat/step-7-2-geofence-walk-simulation`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-30  

---

## 1. Executive Summary

Step 7.2 validates the **PREVENT** pillar of Safe Yatra by implementing an End-to-End integration test suite for simulated tourist movements across geofenced hazard boundaries.

During a simulated walk along a GPS trajectory (`POST /api/v1/sim/trajectory`), the engine:
1. **Waypoints Outside Hazards**: Tracks and persists real-time location pings to `UserLocation` without triggering safety advisories.
2. **Waypoints Approaching Hazard Sectors ($500\text{m}$ Buffer)**: PostGIS spherical evaluation (`ST_DWithin` on `::geography`) identifies impending hazards and emits proactive warning alerts.
3. **Waypoints Inside Hazard Sectors**: PostGIS point-in-polygon check (`ST_Contains`) flags immediate boundary breach, triggering the high-priority `CRITICAL` geofence warning modal.
4. **Heatmap & Macro Monitoring**: Dynamic trajectory ingestion instantly updates Admin Command Center footfall density clusters (`GET /api/v1/admin/heatmap`).

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/simulation/sim.service.ts` (`replayTrajectory`, `injectLocations`).
  - `backend-spatial/src/modules/geofence/geofence.service.ts` (`checkPoint`).
  - `backend-spatial/src/modules/geofence/geofence.engine.ts` (`evaluateLocation`).
  - `backend-spatial/src/modules/admin/admin.service.ts` (`getHeatmapData`).
- **Blocked by**: Step 7.1 (Merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking & Architectural Invariants

- **Multi-Waypoint Geodetic Trajectory Invariant**:
  - Waypoint 1 ($18.7500^\circ\text{ N}, 73.4000^\circ\text{ E}$): Outside all zones $\rightarrow$ `inside: false`, `approachingGeofences: []`.
  - Waypoint 2 ($18.7530^\circ\text{ N}, 73.4040^\circ\text{ E}$): Approaching hazard sector within $500\text{m}$ geodetic buffer $\rightarrow$ `inside: false`, `approachingGeofences: [ZoneEntity]`.
  - Waypoint 3 ($18.7546^\circ\text{ N}, 73.4062^\circ\text{ E}$): Centered inside `CRITICAL` hazard polygon $\rightarrow$ `inside: true`, `breachedGeofence: ZoneEntity`.
- **PostGIS Coordinate Ordering**:
  - SRID 4326 PostGIS geometry expects `ST_MakePoint(lng, lat)`.
- **Location Ingestion with Snap-to-Grid Heatmaps**:
  - User waypoints inserted into `UserLocation` are aggregated via `ST_SnapToGrid` for density cluster computation.

---

## 4. API & Simulation Route Specifications

| Method | Endpoint | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sim/trajectory` | `simulationGuard` | Replays sequential trajectory waypoints and computes real-time geofence breaches |
| `POST` | `/api/v1/sim/location` | `simulationGuard` | Injects batch GPS location records for high-density testing |
| `POST` | `/api/v1/geofences/check` | `authMiddleware` | Real-time geofence check for a given point and proximity buffer |
| `GET` | `/api/v1/admin/heatmap` | `authMiddleware` + `requireRole('ADMIN')` | Returns aggregated footfall density clusters from recent location pings |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Geofence Walk E2E Test Suite (`backend-spatial/tests/e2e.geofence-walk.test.ts`)**
   - [ ] Test multi-waypoint walk trajectory replay via `POST /api/v1/sim/trajectory`.
   - [ ] Verify waypoint 1 (safe distance), waypoint 2 (approaching 500m buffer), and waypoint 3 (critical geofence breach).
   - [ ] Test batch coordinate injection via `POST /api/v1/sim/location`.
   - [ ] Test point-in-polygon evaluation endpoint `POST /api/v1/geofences/check`.
   - [ ] Test Admin Heatmap aggregation `GET /api/v1/admin/heatmap` reflecting injected trajectory positions.
   - [ ] Test validation guards (invalid lat/lng, negative intervals, missing user).

2. **Phase B: Verification & Full Suite Sanity Check**
   - [ ] Execute `backend-spatial/tests/e2e.geofence-walk.test.ts`.
   - [ ] Run full monorepo regression sweep across all modules.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/e2e.geofence-walk.test.ts
```

### Acceptance Checklist
- [ ] Trajectory replay accurately flags approaching vs breached geofence waypoints.
- [ ] Batch location injection writes valid PostGIS Point records.
- [ ] Admin heatmap density aggregation includes replayed trajectory coordinates.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
