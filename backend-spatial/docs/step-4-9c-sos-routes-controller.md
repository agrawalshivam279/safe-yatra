# 📄 Technical Specification: SOS Validation, Controller & REST Routes

> **Step ID**: `4.9c`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-9c-sos-routes-controller`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.9c exposes the complete REST API interface for emergency SOS dispatch and responder coordination in `backend-spatial`. It implements strict Zod request validation schemas, controller handlers with standard `ok()`/`fail()` response envelopes, and role-guarded Express route endpoints (`/api/v1/sos`).

This step connects mobile clients (Tourist SOS panic triggers, Yaatri Mitra mission acceptance/navigation) and external SMS gateways (`POST /api/v1/sos/sms-webhook`) to the core backend emergency state machine.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/sos/sos.service.ts` (Emergency lifecycle service).
  - `backend-spatial/src/modules/sos/sos.sms.ts` (SMS parsing service).
  - `backend-spatial/src/modules/sos/sos.types.ts` (Data models and entity types).
  - `backend-spatial/src/middleware/auth.ts` & `roleGuard.ts` (JWT authentication and RBAC guards).
  - `backend-spatial/src/utils/response.ts` (`ok()`, `fail()`, `AppError`).
- **Blocked by**: Step 4.9a & 4.9b (Completed & merged).
- **New Packages / Libraries**: None (`zod` and `express` are already installed).

---

## 3. Data Contracts & API Endpoints

### 3.1 API Endpoints Specification

| Method | Endpoint | Auth Required | Role Guard | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sos/trigger` | Yes (JWT) | `TOURIST`, `YAATRI_MITRA`, `ADMIN` | Trigger panic SOS with GPS, battery, audio URL |
| `PATCH`| `/api/v1/sos/:id/accept` | Yes (JWT) | `YAATRI_MITRA`, `ADMIN` | Volunteer accepts rescue mission |
| `PATCH`| `/api/v1/sos/:id/arrive` | Yes (JWT) | `YAATRI_MITRA`, `ADMIN` | Volunteer marks arrival on-scene |
| `PATCH`| `/api/v1/sos/:id/resolve`| Yes (JWT) | `YAATRI_MITRA`, `ADMIN` | Mark SOS as resolved |
| `PATCH`| `/api/v1/sos/:id/cancel` | Yes (JWT) | Authenticated | Cancel active SOS (tourist/admin) |
| `GET`  | `/api/v1/sos/active` | Yes (JWT) | `YAATRI_MITRA`, `ADMIN` | List all active SOS emergencies |
| `GET`  | `/api/v1/sos/:id` | Yes (JWT) | Authenticated | Get full SOS details, timeline, responses |
| `POST` | `/api/v1/sos/sms-webhook`| No | Public / Twilio | Ingest offline SMS emergency dispatch |

### 3.2 Zod Validation Schemas (`src/modules/sos/sos.validation.ts`)

```typescript
import { z } from 'zod';

export const triggerSOSSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  battery: z.number().min(0).max(100).optional(),
  audioUrl: z.string().url().optional(),
});

export const resolveSOSSchema = z.object({
  resolutionNotes: z.string().min(3).optional(),
});

export const cancelSOSSchema = z.object({
  reason: z.string().min(3).optional(),
});

export const smsWebhookSchema = z.object({
  Body: z.string().optional(),
  body: z.string().optional(),
  From: z.string().optional(),
  from: z.string().optional(),
}).refine((data) => Boolean(data.Body || data.body), {
  message: 'SMS webhook must include Body or body field',
});
```

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: Validation Layer (`src/modules/sos/sos.validation.ts`)**
   - [ ] Implement `triggerSOSSchema`, `resolveSOSSchema`, `cancelSOSSchema`, and `smsWebhookSchema`.

2. **Phase B: Controller Layer (`src/modules/sos/sos.controller.ts`)**
   - [ ] Implement `triggerSOS` (201 `ok()`).
   - [ ] Implement `acceptSOS`, `arriveSOS`, `resolveSOS`, `cancelSOS` (200 `ok()`).
   - [ ] Implement `getActiveSOS`, `getSOSById` (200 `ok()`).
   - [ ] Implement `handleSMSWebhook` (200 `ok()`).

3. **Phase C: Routes & App Mounting (`src/modules/sos/sos.routes.ts` & `src/index.ts`)**
   - [ ] Mount routes with appropriate auth and `requireRole` middleware.
   - [ ] Register `/api/v1/sos` in `src/index.ts`.

4. **Phase D: Integration Tests (`tests/sos.routes.test.ts`)**
   - [ ] Author Supertest integration tests for all 8 endpoints covering happy paths, 400 validation, 401 unauth, 403 forbidden, and 409 conflict.

---

## 5. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/sos.routes.test.ts
```

### Acceptance Checklist
- [ ] `POST /api/v1/sos/trigger` creates SOS, matches volunteers, and returns 201 standard envelope.
- [ ] `PATCH /api/v1/sos/:id/accept` allows volunteer acceptance and rejects non-volunteer tokens with 403.
- [ ] `POST /api/v1/sos/sms-webhook` parses SMS payloads and triggers emergency dispatch.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
