# 📄 Technical Specification: Zones Validation, Controller & REST Routes

> **Step ID**: `4.5b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-5b-zones-controller-routes`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.5b completes the HTTP interface for **Zones Management** in `backend-spatial`. It implements Zod input validation schemas, route controllers, and Express routes mounted under `/api/v1/zones`, providing public zone discovery with serialized GeoJSON boundaries and role-guarded (`ADMIN`) zone creation, geometry modification, and manual danger score overrides with audit justifications.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Runtime configuration singletons (`src/config/env.ts`).
  - Step 4.2: Standard response envelopes (`src/utils/response.ts`).
  - Step 4.3b: Auth & Role guard middlewares (`src/middleware/auth.ts`, `src/middleware/roleGuard.ts`).
  - Step 4.5a: Zone domain service (`src/modules/zones/zone.service.ts`).
- **Blocked by**: None.
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Public vs Admin Route Segregation*: Public clients (tourists, mobile apps, heatmap renderers) can read zones (`GET /zones`, `GET /zones/:id`) without mandatory authentication. All mutating operations (`POST`, `PATCH`, `DELETE`, `PATCH /override`) require verified JWT Bearer tokens with `ADMIN` role (`requireRole('ADMIN')`).
  2. *Refined Geometry Validation*: `createZoneSchema` validates either explicit GeoJSON Polygon linear rings (`coordinates: [[[lng, lat], ...]]`) OR circular specifications (`centerLat`, `centerLng`, `radiusMeters`).
  3. *Audit Justification Enforcement*: Manual danger score overrides (`PATCH /zones/:id/override`) mandate a non-empty `justification` string explaining the operational rationale (e.g. cloudburst, flash flood, stampede alert).
  4. *API Envelope Uniformity*: All controller responses use `ok()` and `fail()`.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Delegated Business Operations**: HTTP handlers safely delegate all spatial database operations to `ZoneService`.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Zones Endpoints (`/api/v1/zones`)

| Method | Endpoint | Auth / Role | Request Body | Response (200/201) |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/zones` | Public | None | `{ zones: [...], count }` (200) |
| `GET` | `/api/v1/zones/:id` | Public | None | `{ zone }` (200) |
| `POST` | `/api/v1/zones` | `Bearer JWT` / `ADMIN` | `CreateZoneInput` | `{ zone }` (201) |
| `PATCH` | `/api/v1/zones/:id` | `Bearer JWT` / `ADMIN` | `UpdateZoneInput` | `{ zone }` (200) |
| `PATCH` | `/api/v1/zones/:id/override` | `Bearer JWT` / `ADMIN` | `{ score, justification }` | `{ zone }` (200) |
| `DELETE` | `/api/v1/zones/:id` | `Bearer JWT` / `ADMIN` | None | `{ message: 'Zone deleted successfully' }` (200) |

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Validation Schemas**
   - [ ] Implement `src/modules/zones/zone.validation.ts` with `createZoneSchema`, `updateZoneSchema`, and `overrideScoreSchema`.
2. **Phase B: Controller & Router**
   - [ ] Implement `src/modules/zones/zone.controller.ts` handling all zone endpoints.
   - [ ] Implement `src/modules/zones/zone.routes.ts` mounting public and role-guarded endpoints.
3. **Phase C: Application Pipeline Integration**
   - [ ] Mount `/api/v1/zones` in `src/index.ts`.
4. **Phase D: Comprehensive Integration Testing**
   - [ ] Author `tests/zone.routes.test.ts` testing public zone reads, admin creation, role protection (403 on Tourist), manual overrides, and 404s via `supertest`.

---

## 7. Edge Cases & Failure Recovery

- **Non-Admin Mutating Zones**: Returns 403 `FORBIDDEN`.
- **Missing Authorization Header on Protected Route**: Returns 401 `UNAUTHORIZED`.
- **Non-Existent Zone ID**: Returns 404 `ZONE_NOT_FOUND`.
- **Invalid Polygon Ring Coordinates**: Returns 400 `VALIDATION_ERROR`.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/zone.routes.test.ts
```

### Acceptance Checklist
- [ ] `GET /api/v1/zones` returns list of all zones with GeoJSON boundaries.
- [ ] `POST /api/v1/zones` creates zone with 201 when authenticated as ADMIN.
- [ ] `POST /api/v1/zones` rejects non-ADMIN callers with 403 `FORBIDDEN`.
- [ ] `PATCH /api/v1/zones/:id/override` updates score and justification.
- [ ] All integration tests pass in `tests/zone.routes.test.ts`.
