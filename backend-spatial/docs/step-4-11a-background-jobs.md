# 📄 Technical Specification: Background Jobs Infrastructure, Danger Score Refresh & Expired SOS Cleanup

> **Step ID**: `4.11a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-11a-background-jobs`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.11a establishes the background scheduled jobs infrastructure in `backend-spatial`. It implements automated recurring tasks to periodically recalculate dynamic danger scores for all registered tourist zones via the ML Risk Engine (`dangerScoreRefresh.ts`), archive unaddressed or abandoned SOS emergencies older than 24 hours into the `EXPIRED` state (`cleanupExpiredSOS.ts`), and manage job lifecycle control (`jobScheduler.ts`).

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/zones/zone.service.ts` (`getAllZones`).
  - `backend-spatial/src/modules/danger/danger.service.ts` (`getScoreForZone`).
  - `backend-spatial/src/websocket/socketServer.ts` (`getIO`).
  - `backend-spatial/src/websocket/handlers/dangerAlerts.ts` (`broadcastDangerScoreUpdate`).
  - `backend-spatial/src/config/database.ts` (`prisma`).
- **Blocked by**: Step 4.10b (Completed & merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, batching mechanics, and transactional safety.*

- **Core Reasoning Hypotheses**:
  - **Batch Danger Score Recalculation**: Every 5 minutes, all active zones must be refreshed. If an individual zone score computation fails (e.g. ML timeout), the job must catch and log the individual error, continuing to refresh the remaining zones without aborting the batch.
  - **Terminal State Idempotency**: Expired SOS cleanup queries `status NOT IN ('RESOLVED', 'CANCELLED', 'EXPIRED')` and `createdAt < NOW() - 24h`, setting `status = EXPIRED` and appending an immutable `SOSTimeline` audit entry.
  - **Controlled Lifecycle**: `startBackgroundJobs()` and `stopBackgroundJobs()` provide clean start/stop hooks for integration testing and graceful server shutdown.

---

## 4. Job Specifications

### 4.1 Danger Score Refresh Job (`src/jobs/dangerScoreRefresh.ts`)
- **Interval**: Every 5 minutes (`300,000 ms`).
- **Action**:
  1. Fetch all zones.
  2. For each zone, fetch fresh score from `dangerService.getScoreForZone(zone.id)`.
  3. Broadcast score update via WebSocket `broadcastDangerScoreUpdate(getIO(), zone.id, score)`.

### 4.2 Cleanup Expired SOS Job (`src/jobs/cleanupExpiredSOS.ts`)
- **Interval**: Every 1 hour (`3,600,000 ms`).
- **Action**:
  1. Query active SOS records older than 24 hours.
  2. Update status to `EXPIRED`.
  3. Append `SOSTimeline` audit records.

### 4.3 Job Scheduler (`src/jobs/jobScheduler.ts`)
- Exports `startBackgroundJobs()`, `stopBackgroundJobs()`.

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Danger Score Refresh Job (`src/jobs/dangerScoreRefresh.ts`)**
   - [ ] Implement `runDangerScoreRefreshJob()` with robust error isolation per zone.

2. **Phase B: Expired SOS Cleanup Job (`src/jobs/cleanupExpiredSOS.ts`)**
   - [ ] Implement `runCleanupExpiredSOSJob(maxAgeHours = 24)` with transactional batch updates and timeline logging.

3. **Phase C: Scheduler Coordinator (`src/jobs/jobScheduler.ts`)**
   - [ ] Implement `startBackgroundJobs()` and `stopBackgroundJobs()`.

4. **Phase D: Unit & Integration Tests (`tests/jobs.test.ts`)**
   - [ ] Test danger score refresh batch loop, error tolerance, and socket emission.
   - [ ] Test expired SOS query filter, state update, and timeline logging.
   - [ ] Test scheduler start and stop hooks.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/jobs.test.ts
```

### Acceptance Checklist
- [ ] `runDangerScoreRefreshJob` refreshes all zones and tolerates single-zone failures.
- [ ] `runCleanupExpiredSOSJob` transitions >24h unresolved SOS events to `EXPIRED`.
- [ ] `startBackgroundJobs` and `stopBackgroundJobs` cleanly manage intervals.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
