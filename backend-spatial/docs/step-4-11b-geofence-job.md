# 📄 Technical Specification: Periodic Active User Geofence Monitoring Job

> **Step ID**: `4.11b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-11b-geofence-job`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.11b implements the automated background monitoring job for real-time tourist safety against PostGIS geofences (`src/jobs/geofenceCheck.ts`). Running on a 30-second cadence, this job scans recent GPS telemetry from active users in the system, performs spatial containment evaluation against all active hazard geofences, and pushes targeted WebSocket alerts (`geofence:alert`) to users who have breached a danger perimeter.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/config/database.ts` (`prisma`).
  - `backend-spatial/src/modules/geofence/geofence.service.ts` (`checkPoint`).
  - `backend-spatial/src/websocket/rooms.ts` (`emitToUser`).
  - `backend-spatial/src/websocket/socketServer.ts` (`getIO`).
  - `backend-spatial/src/jobs/jobScheduler.ts` (Step 4.11a).
- **Blocked by**: Step 4.11a (Completed & merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, spatial deduplication mechanics, and alert fan-out.*

- **Core Reasoning Hypotheses**:
  - **Deduplicated Active GPS Pings**: Queries use PostGIS `DISTINCT ON ("userId")` ordered by `timestamp DESC` to evaluate only the most recent coordinate of each active user within the last 5 minutes.
  - **Targeted User Alerting**: Alerts are emitted directly to the specific user's socket room (`user:{userId}`) without spamming unrelated users.
  - **Graceful Execution**: If `getIO()` is not initialized or a single user check fails, the job logs the issue and finishes without unhandled exceptions.

---

## 4. Job Specifications

### 4.1 Periodic Geofence Check Job (`src/jobs/geofenceCheck.ts`)
- **Interval**: Every 30 seconds (`30,000 ms`).
- **Lookback Window**: Past 5 minutes (`300,000 ms`).
- **Action**:
  1. Query distinct active user coordinates from `UserLocation`.
  2. For each active user, evaluate `geofenceService.checkPoint(lat, lng, 500)`.
  3. If `inside === true` or `breachedGeofences.length > 0`, emit `geofence:alert` to `userRoom(userId)`.

### 4.2 Job Scheduler Integration (`src/jobs/jobScheduler.ts`)
- Register 30s interval for `runGeofenceCheckJob`.

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Geofence Check Job (`src/jobs/geofenceCheck.ts`)**
   - [ ] Implement `runGeofenceCheckJob(lookbackMinutes = 5)`.

2. **Phase B: Scheduler Integration (`src/jobs/jobScheduler.ts`)**
   - [ ] Add `geofenceCheckTimer` with 30s interval and stop hook.

3. **Phase C: Test Suite (`tests/jobs.geofence.test.ts`)**
   - [ ] Test active user querying, geofence breach evaluation, and socket dispatch.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/jobs.geofence.test.ts
```

### Acceptance Checklist
- [ ] `runGeofenceCheckJob` queries recent distinct active users.
- [ ] Emits `geofence:alert` when active users are inside hazard geofences.
- [ ] Scheduler manages 30s recurring interval.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
