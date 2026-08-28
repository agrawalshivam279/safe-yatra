# 📄 Technical Specification: Danger Score Routes & Controller

> **Step ID**: `4.6b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-6b-danger-routes-controller`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.6b exposes the HTTP interface for **Danger Risk Assessment & Pre-Trip Safety Briefings** in `backend-spatial`. It implements Zod input query/parameter validation schemas, controller handlers, and Express routes mounted under `/api/v1/danger` to deliver real-time risk scores for arbitrary GPS coordinates, comprehensive zone-level risk feeds, and destination safety briefings.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Runtime environment configuration (`src/config/env.ts`).
  - Step 4.2: Standard response envelopes (`src/utils/response.ts`).
  - Step 4.3b: Optional authentication middleware (`src/middleware/auth.ts`).
  - Step 4.6a: Danger proxy service & Redis cache layer (`src/modules/danger/danger.service.ts`).
- **Blocked by**: None.
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Public Accessibility*: Tourists and Yaatri Mitras need low-latency access to danger scores and safety briefings without requiring mandatory authentication. `optionalAuthenticate` attaches user context when available while permitting anonymous requests.
  2. *Query Parameter Type Coercion*: GPS queries (`GET /danger/score?lat=18.75&lng=73.40`) arrive as URL strings. `z.coerce.number()` parses and enforces strict coordinate limits ($-90 \le \text{lat} \le 90$, $-180 \le \text{lng} \le 180$).
  3. *Consistent Response Formatting*: Responses wrap danger entities inside the standard `ok(res, data)` envelope.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Delegated Service Invocations**: HTTP controllers safely delegate all caching, spatial queries, and ML proxying to `DangerService`.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Danger Endpoints (`/api/v1/danger`)

| Method | Endpoint | Auth | Request Query / Params | Response (200 OK) |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/danger/score` | Optional | Query: `lat` (float), `lng` (float) | `{ score: DangerScoreResult }` |
| `GET` | `/api/v1/danger/zones` | Optional | None | `{ zones: DangerScoreResult[], count }` |
| `GET` | `/api/v1/danger/briefing/:destination` | Optional | Param: `destination` (string) | `{ briefing: PreTripBriefing }` |

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Validation Schemas**
   - [ ] Implement `src/modules/danger/danger.validation.ts` with `dangerScoreQuerySchema` and `safetyBriefingParamSchema`.
2. **Phase B: Controller & Router**
   - [ ] Implement `src/modules/danger/danger.controller.ts` handling all danger endpoints.
   - [ ] Implement `src/modules/danger/danger.routes.ts` mounting the endpoints.
3. **Phase C: Application Pipeline Integration**
   - [ ] Mount `/api/v1/danger` in `src/index.ts`.
4. **Phase D: Comprehensive Integration Testing**
   - [ ] Author `tests/danger.routes.test.ts` testing coordinate score queries, zone listings, destination briefings, and validation error cases via `supertest`.

---

## 7. Edge Cases & Failure Recovery

- **Missing/Malformed Coordinates**: Returns 400 `VALIDATION_ERROR`.
- **Out of Range Latitude/Longitude**: Returns 400 `VALIDATION_ERROR`.
- **Empty Destination String**: Returns 400 `VALIDATION_ERROR`.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/danger.routes.test.ts
```

### Acceptance Checklist
- [ ] `GET /api/v1/danger/score?lat=X&lng=Y` returns 200 with dynamic danger score.
- [ ] `GET /api/v1/danger/zones` returns 200 with all zone danger scores.
- [ ] `GET /api/v1/danger/briefing/Kedarnath` returns 200 with pre-trip briefing.
- [ ] All integration tests pass in `tests/danger.routes.test.ts`.
