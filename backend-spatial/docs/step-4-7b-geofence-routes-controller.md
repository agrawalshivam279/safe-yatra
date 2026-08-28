# 📄 Technical Specification: Geofence Validation, Controller & REST Routes

> **Step ID**: `4.7b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-7b-geofence-routes-controller`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.7b exposes the REST API layer for geofence management and real-time point-in-geofence checks in `backend-spatial`. It implements strict Zod request validation schemas, controller handlers with standardized `ok()`/`fail()` response envelopes, and role-guarded Express route endpoints (`/api/v1/geofences`).

This enables tourists and mobile devices to evaluate real-time location safety (`POST /api/v1/geofences/check`) and allows admins to author and manage dynamic warning perimeters and no-entry exclusion zones with role-based access control (`ADMIN` only for mutations).

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/geofence/geofence.service.ts` (Geofence CRUD and spatial check service).
  - `backend-spatial/src/modules/geofence/geofence.types.ts` (Data models and entity types).
  - `backend-spatial/src/middleware/auth.ts` & `roleGuard.ts` (JWT authentication and RBAC guards).
  - `backend-spatial/src/utils/response.ts` (`ok()`, `fail()`, `AppError`).
- **Blocked by**: Step 4.7a (Completed & merged).
- **New Packages / Libraries**: None (`zod` and `express` are already installed).

---

## 3. Data Contracts & API Endpoints

### 3.1 API Endpoints Specification

| Method | Endpoint | Auth Required | Role Guard | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/geofences` | No | Public | List active geofences (`?includeInactive=true` optional) |
| `GET` | `/api/v1/geofences/:id` | No | Public | Get single geofence by ID |
| `POST` | `/api/v1/geofences/check` | No | Public | Check if coordinate is inside or approaching geofences |
| `POST` | `/api/v1/geofences` | Yes (JWT) | `ADMIN` | Create new geofence (GeoJSON polygon or point + radius) |
| `PATCH`| `/api/v1/geofences/:id` | Yes (JWT) | `ADMIN` | Update existing geofence metadata or boundary |
| `DELETE`| `/api/v1/geofences/:id` | Yes (JWT) | `ADMIN` | Delete geofence |

### 3.2 Zod Validation Schemas (`src/modules/geofence/geofence.validation.ts`)

```typescript
import { z } from 'zod';

export const createGeofenceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['AUTO_DANGER', 'MANUAL_NOENTRY', 'ADMIN_OVERRIDE']),
  severity: z.enum(['LOW', 'MODERATE', 'SEVERE', 'CRITICAL']),
  zoneId: z.string().uuid().optional().nullable(),
  message: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : null),
  isActive: z.boolean().optional(),
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
  }).optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().positive().optional(),
}).refine(
  (data) => Boolean(data.boundary) || (data.centerLat !== undefined && data.centerLng !== undefined && data.radiusMeters !== undefined),
  {
    message: 'Geofence must have either a polygon boundary or center (centerLat, centerLng) and radiusMeters',
    path: ['boundary'],
  }
);

export const updateGeofenceSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.enum(['AUTO_DANGER', 'MANUAL_NOENTRY', 'ADMIN_OVERRIDE']).optional(),
  severity: z.enum(['LOW', 'MODERATE', 'SEVERE', 'CRITICAL']).optional(),
  zoneId: z.string().uuid().optional().nullable(),
  message: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable().transform((val) => val ? new Date(val) : null),
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
  }).optional(),
});

export const checkPointSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  bufferMeters: z.coerce.number().min(0).optional().default(500),
});

export const geofenceQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
});
```

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: Validation Layer (`src/modules/geofence/geofence.validation.ts`)**
   - [ ] Implement `createGeofenceSchema`, `updateGeofenceSchema`, `checkPointSchema`, and `geofenceQuerySchema`.

2. **Phase B: Controller Layer (`src/modules/geofence/geofence.controller.ts`)**
   - [ ] Implement `getAllGeofences` (200 `ok()`).
   - [ ] Implement `getGeofenceById` (200 `ok()`).
   - [ ] Implement `checkPoint` (200 `ok()`).
   - [ ] Implement `createGeofence` (201 `ok()`, with `createdBy` set from authenticated user).
   - [ ] Implement `updateGeofence` (200 `ok()`).
   - [ ] Implement `deleteGeofence` (200 `ok()`).

3. **Phase C: Routes & App Mounting (`src/modules/geofence/geofence.routes.ts` & `src/index.ts`)**
   - [ ] Mount routes with `authenticate` and `requireRole('ADMIN')` for mutation operations.
   - [ ] Register `/api/v1/geofences` router in `src/index.ts`.

4. **Phase D: Integration Tests (`tests/geofence.routes.test.ts`)**
   - [ ] Author Supertest integration tests covering all HTTP verbs, auth guards, 400 Zod validations, and 404 errors.

---

## 5. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/geofence.routes.test.ts
```

### Acceptance Checklist
- [ ] `GET /api/v1/geofences` returns list of active geofences in standard `ok()` envelope.
- [ ] `POST /api/v1/geofences/check` returns `{ inside, breachedGeofences, approachingGeofences }`.
- [ ] `POST /api/v1/geofences` rejects non-admin users with 403 Forbidden and unauthenticated requests with 401.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
