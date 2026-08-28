# 📄 Technical Specification: SOS Emergency Service & State Transitions

> **Step ID**: `4.9b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-9b-sos-service-transitions`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.9b implements the core business logic and transactional state machine for SOS emergencies in `backend-spatial` (`sos.service.ts`). It coordinates the full lifecycle of an emergency event from initial trigger (`TRIGGERED`), automatic danger scoring, proximity volunteer assignment (`VOLUNTEER_ALERTED`), acceptance (`VOLUNTEER_ACCEPTED`), on-scene arrival (`VOLUNTEER_ARRIVED`), through to final resolution (`RESOLVED`) or cancellation (`CANCELLED`).

Every state transition is defensively validated, persisted atomically with PostGIS point geometry (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`), and audited in `SOSTimeline` for full post-incident investigation and performance analytics.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/sos/sos.types.ts` (Data contracts).
  - `backend-spatial/src/modules/sos/sos.matcher.ts` (`matchVolunteers` proximity query).
  - `backend-spatial/src/modules/danger/danger.service.ts` (`getScoreForCoordinates` for real-time danger score capture).
  - `backend-spatial/src/config/database.ts` (`prisma` client singleton).
  - `backend-spatial/src/utils/response.ts` (`AppError`).
- **Blocked by**: Step 4.9a (Completed & merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, spatial edge cases, and algorithmic invariants to validate during implementation.*

- **Core Reasoning Hypotheses**:
  - **State Machine Legality**: An SOS event in a terminal state (`RESOLVED`, `CANCELLED`, `EXPIRED`) cannot be transitioned back to an active state (`ACCEPTED`, `ARRIVED`). Transition attempts on terminal states must fail with `400 INVALID_SOS_STATE`.
  - **Single Active Acceptance Invariant**: When a volunteer accepts an SOS, `SOSEvent.status` transitions to `VOLUNTEER_ACCEPTED`. Subsequent acceptance attempts by other volunteers must be rejected with `409 SOS_ALREADY_ACCEPTED`.
  - **Audit Timeline Atomicity**: Every status change must record an immutable entry in `SOSTimeline` with timestamp and actor details.
- **Spatial / Algorithmic Edge Cases**:
  - **Danger Score Capture**: The danger score at the moment of the trigger is stored directly on `SOSEvent.dangerScore` to preserve the environmental snapshot even if weather/danger scores change later.
  - **Coordinate Standard**: PostGIS Point uses `[lng, lat]` order: `ST_MakePoint(lng, lat)`.

---

## 4. State Transition Matrix

```
[TRIGGERED]
   │
   ▼ (Volunteers found in 5km)
[VOLUNTEER_ALERTED] ── (No volunteers) ──► [ESCALATED_TO_ADMIN / DISPATCH]
   │
   ▼ (Volunteer calls acceptSOS)
[VOLUNTEER_ACCEPTED]
   │
   ▼ (Volunteer calls arriveSOS)
[VOLUNTEER_ARRIVED]
   │
   ▼ (Volunteer or Tourist calls resolveSOS)
[RESOLVED] (Terminal)

* Any non-terminal state can transition to [CANCELLED] (by tourist or admin)
```

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Types Enrichment (`src/modules/sos/sos.types.ts`)**
   - [ ] Add `SOSDetailEntity`, `SOSResponseDetail`, `SOSTimelineEntity`, `AcceptSOSInput`, and `ResolveSOSInput`.

2. **Phase B: SOS Service Implementation (`src/modules/sos/sos.service.ts`)**
   - [ ] Implement `triggerSOS(input)`: PostGIS Point insertion, danger score lookup, `SOSTimeline` logging, `sosMatcher.matchVolunteers` dispatch, and `SOSResponse` batch creation.
   - [ ] Implement `acceptSOS(sosId, volunteerId)`: Guard against double-acceptance, update `SOSResponse` to `ACCEPTED`, update `SOSEvent` status to `VOLUNTEER_ACCEPTED`, increment volunteer response counter, and log timeline.
   - [ ] Implement `arriveSOS(sosId, volunteerId)`: Update response to `ARRIVED` and SOSEvent status to `VOLUNTEER_ARRIVED`.
   - [ ] Implement `resolveSOS(sosId, resolvedByUserId, resolutionNotes)`: Mark `RESOLVED` with timestamp.
   - [ ] Implement `cancelSOS(sosId, userId, reason)`: Mark `CANCELLED`.
   - [ ] Implement `getSOSById(sosId)` & `getActiveSOSEvents(limit)`.

3. **Phase C: Unit & State Machine Tests (`tests/sos.service.test.ts`)**
   - [ ] Test full happy-path lifecycle: Trigger ➔ Alerted ➔ Accepted ➔ Arrived ➔ Resolved.
   - [ ] Test illegal transition guards (e.g. accepting already resolved SOS).
   - [ ] Test double-acceptance conflict handling (409).
   - [ ] Test cancellation by authorized tourist.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/sos.service.test.ts
```

### Acceptance Checklist
- [ ] `triggerSOS` stores PostGIS Point geometry and captures current danger score snapshot.
- [ ] State transitions update `SOSEvent.status` and generate `SOSTimeline` entries.
- [ ] Illegal transitions on terminal states are rejected with `AppError`.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
