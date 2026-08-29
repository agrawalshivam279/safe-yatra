# 📄 Technical Specification: Admin Analytics & Privacy-Preserving Heatmap Aggregations

> **Step ID**: `4.13b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-13b-admin-analytics-heatmap`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.13b completes Phase 4 (Backend Spatial Server) by delivering the administrative intelligence layer:
1. **Aggregated System Analytics (`GET /api/v1/admin/analytics`)**: Synthesizes real-time metrics across emergency SOS lifecycles, average responder dispatch times, active tourist footfall, volunteer readiness on duty, danger tier breakdowns, and active geofences/broadcasts.
2. **Privacy-Preserving Spatial Heatmap (`GET /api/v1/admin/heatmap`)**: Uses PostGIS spatial grid clustering (`ST_SnapToGrid`, `ST_Centroid`, `ST_Collect`) to generate crowd density heatmaps without exposing individual user coordinate breadcrumbs.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/prisma/schema.prisma` (`SOSEvent`, `SOSResponse`, `UserLocation`, `Zone`, `Geofence`, `BroadcastAlert`, `VolunteerProfile`).
  - `backend-spatial/src/middleware/auth.ts` (`authenticate`).
  - `backend-spatial/src/middleware/roleGuard.ts` (`requireRole(UserRole.ADMIN)`).
- **Blocked by**: Step 4.13a (Merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 PostGIS Spatial & Analytics Invariants

- **Privacy-Preserving Spatial Aggregation**:
  ```sql
  SELECT
    ROUND(ST_Y(ST_Centroid(ST_Collect(coordinates::geometry)))::numeric, 6)::float as "lat",
    ROUND(ST_X(ST_Centroid(ST_Collect(coordinates::geometry)))::numeric, 6)::float as "lng",
    COUNT(DISTINCT "userId")::int as "intensity",
    COUNT(*)::int as "pointCount"
  FROM "UserLocation"
  WHERE "timestamp" >= NOW() - (${lookbackMinutes} * INTERVAL '1 minute')
  GROUP BY ST_SnapToGrid(coordinates::geometry, ${gridSizeDegrees});
  ```
- **SOS Lifecycle Performance Metric**:
  - Aggregates average elapsed duration between SOS creation and volunteer acceptance/arrival using SQL `AVG(EXTRACT(EPOCH FROM (r."acceptedAt" - e."createdAt")))`.

---

## 4. API & Route Specifications

### 4.1 Route Table
| Method | Path | Auth / RBAC | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/analytics` | `ADMIN` | Returns aggregated metrics across SOS, users, zones, and alerts |
| `GET` | `/api/v1/admin/heatmap` | `ADMIN` | Returns privacy-preserving crowd density clusters |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Types & Validation (`admin.types.ts`, `admin.validation.ts`)**
   - [ ] Define `AdminAnalyticsResult`, `HeatmapCluster`, `HeatmapResult`, and `HeatmapQueryInput`.
   - [ ] Implement Zod schemas `heatmapQuerySchema`.

2. **Phase B: Service Aggregations (`admin.service.ts`)**
   - [ ] Implement `getSystemAnalytics()` running parallel Prisma & PostGIS aggregation queries.
   - [ ] Implement `getHeatmapData(query)` running PostGIS grid snapping.

3. **Phase C: Controller & Routes (`admin.controller.ts`, `admin.routes.ts`)**
   - [ ] Mount `GET /admin/analytics` and `GET /admin/heatmap` behind `authenticate` and `requireRole(ADMIN)`.

4. **Phase D: Integration Test Suite (`tests/admin.analytics-heatmap.test.ts`)**
   - [ ] Test RBAC: 401 Unauthorized without token, 403 Forbidden for non-admin roles.
   - [ ] Test analytics metric calculations and tier distribution.
   - [ ] Test heatmap grid clustering with custom lookback and grid size.
   - [ ] Test query validation bounds.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/admin.analytics-heatmap.test.ts
```

### Acceptance Checklist
- [ ] Non-admin requests receive 403 Forbidden.
- [ ] Analytics returns complete metrics with zero missing fields.
- [ ] Heatmap output returns clustered coordinates and intensity weights with zero raw tracking leaks.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
