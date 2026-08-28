# 📄 Technical Specification: User & Volunteer Routes & Proximity Controllers

> **Step ID**: `4.4b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-4b-user-volunteer-routes`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.4b completes the HTTP interface for **User Management** and the **Yaatri Mitra Volunteer Network** in `backend-spatial`. It implements validation schemas, controllers, and Express routes mounted under `/api/v1/users` and `/api/v1/volunteers`, exposing real-time GPS location streaming, duty toggling, profile modification, and spatial proximity discovery.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Configuration singletons (`src/config/env.ts`).
  - Step 4.2: Standard response envelopes (`src/utils/response.ts`).
  - Step 4.3b: Auth & Role guard middlewares (`src/middleware/auth.ts`, `src/middleware/roleGuard.ts`).
  - Step 4.4a: User & Volunteer domain services (`src/modules/user/user.service.ts`, `src/modules/volunteer/volunteer.service.ts`).
- **Blocked by**: None.
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Authentication Enforcement*: User profile editing (`PATCH /users/profile`) and volunteer duty changes (`PATCH /volunteers/duty`) require verified JWT Bearer tokens. Duty changes additionally enforce `requireRole('YAATRI_MITRA', 'ADMIN')`.
  2. *Query Parameter Coercion for Spatial Endpoints*: The `GET /volunteers/nearby` endpoint receives query parameters as strings (`?lat=18.7546&lng=73.4062&radius=5000`). Zod schemas must safely coerce strings to numbers with bounds validation ($[-90, 90]$ for latitude, $[-180, 180]$ for longitude).
  3. *Location Streaming Efficiency*: `POST /volunteers/location` accepts frequent client pings, validates battery/altitude/accuracy metadata, and returns a lightweight 201 acknowledgment.
  4. *API Envelope Uniformity*: All controller responses use `ok()` and `fail()`.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Parameterized Queries**: All spatial and relational operations delegate to the secure `UserService` and `VolunteerService`.

---

## 5. Data Contracts & Schema Specifications

### 5.1 User Endpoints (`/api/v1/users`)

| Method | Endpoint | Auth | Request Body | Response (200) |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/users/me` | `Bearer JWT` | None | `{ user }` |
| `PATCH` | `/api/v1/users/profile` | `Bearer JWT` | `{ name?, phone?, profileImageUrl? }` | `{ user }` |
| `DELETE` | `/api/v1/users/account` | `Bearer JWT` | None | `{ message: 'Account deactivated' }` |

### 5.2 Volunteer Endpoints (`/api/v1/volunteers`)

| Method | Endpoint | Auth / Role | Request / Query | Response (200/201) |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/volunteers/register` | `Bearer JWT` | `{ aadharNumber? }` | `{ volunteerProfile }` (201) |
| `PATCH` | `/api/v1/volunteers/duty` | `Bearer JWT` / `YAATRI_MITRA, ADMIN` | `{ isOnDuty? }` | `{ volunteerProfile }` (200) |
| `POST` | `/api/v1/volunteers/location` | `Bearer JWT` | `{ lat, lng, altitude?, accuracy?, battery? }` | `{ locationId, timestamp }` (201) |
| `GET` | `/api/v1/volunteers/nearby` | Public / Optional Auth | Query: `lat`, `lng`, `radius?`, `limit?` | `{ volunteers: [...] }` (200) |

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Validation Schemas**
   - [ ] Implement `src/modules/user/user.validation.ts`.
   - [ ] Implement `src/modules/volunteer/volunteer.validation.ts`.
2. **Phase B: Controllers & Routers**
   - [ ] Implement `src/modules/user/user.controller.ts` & `src/modules/user/user.routes.ts`.
   - [ ] Implement `src/modules/volunteer/volunteer.controller.ts` & `src/modules/volunteer/volunteer.routes.ts`.
3. **Phase C: Application Pipeline Integration**
   - [ ] Mount `/api/v1/users` and `/api/v1/volunteers` in `src/index.ts`.
4. **Phase D: Comprehensive Integration Testing**
   - [ ] Author `tests/user-volunteer.routes.test.ts` verifying all user and volunteer routes via `supertest`.

---

## 7. Edge Cases & Failure Recovery

- **Non-Numeric Query Params**: Returns 400 `VALIDATION_ERROR` with specific invalid field description.
- **Unauthorized Role on Duty Toggle**: Tourist calling `PATCH /volunteers/duty` receives 403 `FORBIDDEN`.
- **Duplicate Phone Number**: Updating phone to an existing user's phone returns 409 `PHONE_EXISTS`.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/user-volunteer.routes.test.ts
```

### Acceptance Checklist
- [ ] `GET /api/v1/users/me` returns current authenticated user.
- [ ] `PATCH /api/v1/users/profile` updates fields and rejects duplicate phone with 409.
- [ ] `PATCH /api/v1/volunteers/duty` toggles status for volunteers and rejects tourists with 403.
- [ ] `POST /api/v1/volunteers/location` records GPS point with 201.
- [ ] `GET /api/v1/volunteers/nearby` coerces query params and returns spatial match results.
- [ ] All integration tests pass in `tests/user-volunteer.routes.test.ts`.
