# 📄 Technical Specification: Performance, High-Concurrency Load & Spatial Index Benchmarking Suite

> **Step ID**: `7.4`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-7-4-load-performance-tests`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-30  

---

## 1. Executive Summary

Step 7.4 validates the scalability, concurrency resilience, and sub-second response times of Safe Yatra under mass-casualty and peak pilgrimage load conditions.

This benchmarking suite executes:
1. **50 Concurrent SOS Panic Triggers**: Simulates 50 simultaneous emergency distress requests through the API gateway, verifying zero dropped events, unique event ID generation, and thread-safe database persistence.
2. **Redis TTL Caching SLA**: Verifies that burst danger score lookups hit the Redis cache (`danger:coords:{lat}:{lng}` with $300\text{s}$ TTL), preventing external scoring service saturation.
3. **PostGIS Spatial Query Benchmarking ($<50\text{ms}$ SLA)**: Profiles the `findNearbyVolunteers` query (`ST_DWithin` on `coordinates::geography` with GiST spatial indexing), ensuring sub-$50\text{ms}$ response times even with high volunteer density.
4. **Concurrent Geofence Point Ingestion**: Stresses `evaluateLocation` across $>100$ concurrent GPS telemetry pings.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/sos/sos.service.ts`.
  - `backend-spatial/src/modules/danger/danger.service.ts` & `danger.cache.ts`.
  - `backend-spatial/src/modules/volunteer/volunteer.service.ts`.
  - `backend-spatial/src/modules/geofence/geofence.service.ts`.
- **Blocked by**: Step 7.3 (Merged).
- **New Packages / Libraries**: None (uses Jest performance timer APIs and Supertest concurrency pools).

---

## 3. 🧠 Sequential Thinking & Architectural Invariants

- **Zero Dropped Events Invariant**:
  - For $N=50$ concurrent requests, $N$ distinct `SOSEvent` and `SOSTimeline` records must be persisted without deadlock, foreign key contention, or unhandled promise rejections.
- **Cache Hit Rate & Protection**:
  - Under burst conditions ($N=50$ requests within the same geographical sector), only the initial request should query the underlying ML risk engine; subsequent 49 requests must resolve from Redis in $<5\text{ms}$.
- **PostGIS GiST Latency SLA**:
  - Geodesic spatial queries (`ST_DWithin`, `ST_Contains`) must execute in $<50\text{ms}$ on indexed geometry tables.

---

## 4. Benchmark Scenarios & Test Matrix

| Test Scenario | Concurrency | Target Endpoint / Method | Success Criteria |
| :--- | :--- | :--- | :--- |
| **Mass SOS Distress Surge** | 50 concurrent requests | `POST /api/v1/sos/trigger` | 100% return `201 Created`, 0 dropped events |
| **Danger Cache Throughput** | 50 burst queries | `dangerService.getScoreForCoordinates` | Initial ML call count $= 1$, 49 cache hits ($<5\text{ms}$) |
| **PostGIS Spatial Proximity SLA** | 20 sequential runs | `volunteerService.findNearbyVolunteers` | Average query execution time $< 50\text{ms}$ |
| **Batch Geofence Evaluation** | 100 concurrent points | `geofenceService.checkPoint` | 100% processed without throttling |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Performance & Concurrency Test Suite (`backend-spatial/tests/e2e.performance-load.test.ts`)**
   - [ ] Implement 50-concurrent SOS stress test using `Promise.all`.
   - [ ] Implement Redis cache hit rate and burst deduction test.
   - [ ] Implement high-resolution performance timing benchmark (`performance.now()`) for PostGIS volunteer matching.
   - [ ] Implement 100-concurrent geofence check stress test.

2. **Phase B: Verification & Full Suite Sanity Check**
   - [ ] Execute `backend-spatial/tests/e2e.performance-load.test.ts`.
   - [ ] Run full monorepo regression sweep across all modules.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/e2e.performance-load.test.ts
```

### Acceptance Checklist
- [ ] 50 concurrent SOS triggers succeed with 100% `201 Created` responses.
- [ ] Redis cache reduces external ML calls by $>90\%$ during burst queries.
- [ ] Spatial proximity queries execute well within the $50\text{ms}$ SLA.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
