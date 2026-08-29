# 📄 Technical Specification: Simulation Middleware, Location Injection & Trajectory Replay

> **Step ID**: `4.12a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-12a-sim-location`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.12a implements the Developer Simulation environment and telemetry injection endpoints for `backend-spatial`. All simulation capabilities are strictly gated behind an environment guard (`env.SIMULATION_MODE === 'true'`), returning standard 404 Not Found responses when disabled in production.

This step delivers endpoints to programmatically inject arrays of GPS coordinate pings (`POST /api/v1/sim/location`) and simulate moving user trajectories with geofence evaluation (`POST /api/v1/sim/trajectory`).

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/config/env.ts` (`SIMULATION_MODE`).
  - `backend-spatial/src/config/database.ts` (`prisma`).
  - `backend-spatial/src/modules/volunteer/volunteer.service.ts`.
  - `backend-spatial/src/modules/geofence/geofence.service.ts`.
- **Blocked by**: Step 4.11b (Completed & merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, security isolation, and trajectory synthesis.*

- **Core Reasoning Hypotheses**:
  - **Zero Production Leakage**: A dedicated simulation middleware evaluates `env.SIMULATION_MODE === 'true'`. If false or undefined, all `/api/v1/sim/*` requests immediately reject with a 404 `NOT_FOUND` envelope, preventing accidental test harness exposure.
  - **Batch PostGIS Insertion**: Coordinate arrays are inserted with valid PostGIS point geometries `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` into `UserLocation`.
  - **Hermetic Coordinate Bounds**: Latitudes $\in [-90, 90]$ and longitudes $\in [-180, 180]$ are enforced via Zod schemas.

---

## 4. API & Route Specifications

### 4.1 Route Table
| Method | Path | Auth / Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sim/location` | `simulationGuard` | Injects batch of GPS pings for a specific user |
| `POST` | `/api/v1/sim/trajectory` | `simulationGuard` | Injects sequential trajectory path with geofence checks |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Types & Validation (`src/modules/simulation/sim.types.ts`, `sim.validation.ts`)**
   - [ ] Define `InjectLocationInput`, `ReplayTrajectoryInput`, `SimulationResult`.
   - [ ] Implement `injectLocationSchema` and `replayTrajectorySchema`.

2. **Phase B: Simulation Service (`src/modules/simulation/sim.service.ts`)**
   - [ ] Implement `injectLocations` and `replayTrajectory`.

3. **Phase C: Simulation Controller & Routes (`src/modules/simulation/sim.controller.ts`, `sim.routes.ts`)**
   - [ ] Implement `simulationGuard` middleware.
   - [ ] Implement controller handlers and mount routes in `src/index.ts`.

4. **Phase D: Test Suite (`tests/simulation.location.test.ts`)**
   - [ ] Test 404 response when `SIMULATION_MODE !== 'true'`.
   - [ ] Test successful location array injection.
   - [ ] Test trajectory replay execution.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/simulation.location.test.ts
```

### Acceptance Checklist
- [ ] Simulation endpoints return 404 when `SIMULATION_MODE !== 'true'`.
- [ ] Valid location batches are inserted with PostGIS geometries.
- [ ] Trajectory replay executes and returns point sequence metadata.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
