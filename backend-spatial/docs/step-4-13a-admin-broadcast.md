# 📄 Technical Specification: Admin Broadcast Alerts & Sector Messaging

> **Step ID**: `4.13a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-13a-admin-broadcast`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.13a delivers the Admin Broadcast & Sector Safety Messaging service for the Safe Yatra command center. It enables emergency operators and administrators to author high-priority safety bulletins, specify custom geospatial target sectors (via GeoJSON Polygon or point-radius circular buffer), persist alerts with PostGIS spatial indexing in `BroadcastAlert`, identify active users currently situated within the target area via `ST_Contains`, and push real-time `admin:broadcast` WebSocket events.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/prisma/schema.prisma` (`BroadcastAlert` model).
  - `backend-spatial/src/middleware/auth.ts` (`authenticate`).
  - `backend-spatial/src/middleware/roleGuard.ts` (`requireRole(UserRole.ADMIN)`).
  - `backend-spatial/src/websocket/socketServer.ts` (`getIO`).
  - `backend-spatial/src/websocket/rooms.ts` (`emitToRole`, `emitToUser`).
- **Blocked by**: Step 4.12b (Merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking & PostGIS Spatial Invariants

- **Spatial Ingestion**:
  - Direct Polygon: `ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(targetArea)}), 4326)`.
  - Circular Buffer: `ST_SetSRID(ST_Buffer(ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radiusMeters)::geometry, 4326)`.
- **Targeted Sector Recipient Query**:
  - Identifies tourists currently inside the alert boundary:
    ```sql
    SELECT DISTINCT ON (ul."userId") ul."userId"
    FROM "UserLocation" ul
    JOIN "User" u ON u."id" = ul."userId"
    WHERE ST_Contains(
      (SELECT "targetArea" FROM "BroadcastAlert" WHERE "id" = ${alertId}),
      ul."coordinates"::geometry
    )
    AND ul."timestamp" >= NOW() - INTERVAL '30 minutes'
    AND u."isActive" = true;
    ```
- **Real-Time Push Protocol**:
  - Emits `admin:broadcast` to `role:TOURIST` and `role:YAATRI_MITRA` rooms, as well as targeted user notifications.

---

## 4. API & Route Specifications

### 4.1 Route Table
| Method | Path | Auth / RBAC | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/broadcast` | `ADMIN` | Creates and broadcasts safety alert to targeted sector |
| `GET` | `/api/v1/admin/broadcasts` | `Authenticated` | Lists active and past safety broadcast bulletins |
| `GET` | `/api/v1/admin/broadcasts/:id` | `Authenticated` | Retrieves broadcast alert detail with GeoJSON geometry |
| `PATCH` | `/api/v1/admin/broadcasts/:id/deactivate` | `ADMIN` | Deactivates an active broadcast alert |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Types & Validation (`admin.types.ts`, `admin.validation.ts`)**
   - [ ] Define `CreateBroadcastInput`, `BroadcastAlertEntity`, `BroadcastRecipientResult`.
   - [ ] Implement Zod schemas for `createBroadcastSchema` and `broadcastQuerySchema`.

2. **Phase B: Admin Broadcast Service (`admin.service.ts`)**
   - [ ] Implement `createBroadcastAlert` with PostGIS polygon/buffer insertion.
   - [ ] Implement `findUsersInTargetArea` and targeted WebSocket dispatch.
   - [ ] Implement `getAllBroadcasts`, `getBroadcastById`, and `deactivateBroadcast`.

3. **Phase C: Controller & Routes (`admin.controller.ts`, `admin.routes.ts`)**
   - [ ] Implement controller handlers with `ok()` / `fail()` standard envelopes.
   - [ ] Mount `/api/v1/admin` in `src/index.ts`.

4. **Phase D: Integration Test Suite (`tests/admin.broadcast.test.ts`)**
   - [ ] Test RBAC: 401 without auth, 403 for non-admin on mutations.
   - [ ] Test broadcast creation with Polygon GeoJSON.
   - [ ] Test broadcast creation with circular buffer.
   - [ ] Test listing and retrieval with deserialized GeoJSON.
   - [ ] Test deactivation.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/admin.broadcast.test.ts
```

### Acceptance Checklist
- [ ] Non-admin requests to `POST /broadcast` return 403 Forbidden.
- [ ] Valid alerts are inserted with PostGIS SRID 4326 geometries and spatial indexes.
- [ ] WebSocket event `admin:broadcast` is triggered with correct payload.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
