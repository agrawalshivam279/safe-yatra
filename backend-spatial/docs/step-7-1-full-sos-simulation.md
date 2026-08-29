# 📄 Technical Specification: Full SOS Loop Simulation & Cross-Module End-to-End Test Suite

> **Step ID**: `7.1`  
> **Target Module**: `backend-spatial` / Cross-Module  
> **Git Feature Branch**: `feat/step-7-1-full-sos-simulation`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-30  

---

## 1. Executive Summary

Step 7.1 initiates **Phase 7: End-to-End Integration Testing and Demo Polish**. It provides a comprehensive End-to-End (E2E) integration test suite and simulation execution verification for the full SOS emergency dispatch lifecycle across all Safe Yatra subsystems.

This test harness simulates the complete multi-actor emergency response loop simultaneously across:
1. **Tourist Mobile Client**: Distress trigger with GPS coordinates, battery level, voice note telemetry, and real-time responder ETA tracking.
2. **Yaatri Mitra Volunteer Client**: Spatial proximity matching (PostGIS 5km radius), push alert dispatch, 1-tap rescue acceptance, real-time 5s GPS location streaming, on-scene arrival confirmation, and final resolution.
3. **Admin Command Center**: Real-time Socket.IO distress telemetry feed, auto-focus live map, responder route tracking, and incident resolution auditing.
4. **Backend Spatial Core & ML Risk Engine**: State transitions, timeline event persistence, and environmental hazard scoring.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/sos/sos.service.ts` (Full SOS state machine).
  - `backend-spatial/src/modules/sos/sos.matcher.ts` (PostGIS 5km proximity query).
  - `backend-spatial/src/modules/simulation/sim.service.ts` (`simulateSOS`).
  - `backend-spatial/src/websocket/socketServer.ts` (Socket.IO room broadcasts).
  - `backend-spatial/src/utils/notifications.ts` (Expo/FCM push notification dispatcher).
- **Blocked by**: Step 6.9 (Merged).
- **New Packages / Libraries**: None (re-uses existing Supertest, Jest, Prisma, and Socket.IO client testing patterns).

---

## 3. 🧠 Sequential Thinking & Architectural Invariants

- **Multi-State Emergency Transition Sequence**:
  $$\text{TRIGGERED} \longrightarrow \text{VOLUNTEER\_ALERTED} \longrightarrow \text{VOLUNTEER\_ACCEPTED} \longrightarrow \text{VOLUNTEER\_ARRIVED} \longrightarrow \text{RESOLVED}$$
- **PostGIS Spatial Matching Invariant**:
  - Responding Yaatri Mitras must be on-duty (`isOnDuty: true`), verified (`verificationStatus: 'VERIFIED'`), and within the 5,000-meter radius evaluated via `ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint(lng, lat), 4326), 5000)`.
- **WebSocket Room Partitioning & Event Contract**:
  - `sos:triggered` $\longrightarrow$ Broadcast to matching Yaatri Mitras and `role:ADMIN` room.
  - `sos:accepted` $\longrightarrow$ Broadcast to tourist's private room (`user:<touristId>`) and `role:ADMIN` room with volunteer details and initial ETA.
  - `sos:mitra_location` $\longrightarrow$ Periodic GPS location updates streamed to tourist and admin command center.
  - `sos:arrived` $\longrightarrow$ Notifies tourist that responder has reached the scene.
  - `sos:resolved` $\longrightarrow$ Final resolution state broadcast to all stakeholders.
- **Audit Timeline Invariant**:
  - Every transition creates an immutable `SOSTimeline` record with sequential timestamps and actor IDs.

---

## 4. API & Simulation Endpoint Contracts

| Method | Endpoint | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sim/sos` | `simulationGuard` | Executes automated end-to-end multi-state emergency simulation loop |
| `POST` | `/api/v1/sos/trigger` | `authMiddleware` | Tourist triggers panic SOS with GPS, battery, and optional audio note |
| `PATCH` | `/api/v1/sos/:id/accept` | `authMiddleware` + `requireRole('YAATRI_MITRA')` | Volunteer accepts emergency dispatch |
| `PATCH` | `/api/v1/sos/:id/arrive` | `authMiddleware` + `requireRole('YAATRI_MITRA')` | Volunteer marks on-scene arrival |
| `PATCH` | `/api/v1/sos/:id/resolve` | `authMiddleware` | Responder or admin marks incident resolved |
| `GET` | `/api/v1/sos/active` | `authMiddleware` + `requireRole('ADMIN', 'YAATRI_MITRA')` | Command center queries active distress events |
| `GET` | `/api/v1/sos/:id` | `authMiddleware` | Queries detailed SOS event and responder trajectory |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: End-to-End SOS Loop Integration Test Suite (`backend-spatial/tests/e2e.sos-loop.test.ts`)**
   - [ ] Author test suite validating full emergency loop via REST endpoints (`/api/v1/sos/trigger` $\rightarrow$ accept $\rightarrow$ arrive $\rightarrow$ resolve).
   - [ ] Verify PostGIS 5km spatial volunteer proximity matching with real coordinate geometries.
   - [ ] Verify `SOSTimeline` event audit trail generation across all 5 discrete stages.
   - [ ] Verify automated simulation endpoint `POST /api/v1/sim/sos` with `scenario: 'full_loop'` and `scenario: 'cancel'`.
   - [ ] Verify push notification dispatch to nearby Yaatri Mitras on SOS trigger.
   - [ ] Verify active emergency query (`GET /api/v1/sos/active`) reflects real-time status transitions.

2. **Phase B: Verification & Full Suite Sanity Check**
   - [ ] Execute `backend-spatial/tests/e2e.sos-loop.test.ts`.
   - [ ] Run full monorepo regression suite to ensure zero regressions across all modules.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/e2e.sos-loop.test.ts
```

### Monorepo Full Regression Check
```bash
# Backend Spatial
cd backend-spatial && npm test

# ML Risk Engine
cd ml-risk-engine && pytest

# Mobile App
cd mobile-app && npm test

# Admin Dashboard
cd admin-dashboard && npm test
```

### Acceptance Checklist
- [ ] Complete SOS emergency response loop passes all multi-state assertions.
- [ ] PostGIS proximity queries correctly filter out volunteers outside the 5km radius.
- [ ] Timeline audit trail contains accurate timestamps and actor metadata.
- [ ] Simulation endpoint `POST /api/v1/sim/sos` executes reliably without errors.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
