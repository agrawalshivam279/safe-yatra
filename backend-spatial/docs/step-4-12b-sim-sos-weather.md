# 📄 Technical Specification: Full SOS Simulation Loop & Weather Override

> **Step ID**: `4.12b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-12b-sim-sos-weather`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.12b completes the Developer Simulation suite for `backend-spatial` by implementing end-to-end simulated emergency response loops (`POST /api/v1/sim/sos`) and dynamic environmental overrides in Redis (`POST /api/v1/sim/weather-override`).

All simulation endpoints are strictly guarded behind `simulationGuard` (`env.SIMULATION_MODE === 'true'`), returning standard 404 Not Found responses when disabled.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/config/env.ts` (`SIMULATION_MODE`).
  - `backend-spatial/src/config/redis.ts` (`redis`).
  - `backend-spatial/src/modules/sos/sos.service.ts`.
  - `backend-spatial/src/modules/danger/danger.service.ts`.
- **Blocked by**: Step 4.12a (Merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking & Architectural Invariants

- **Multi-State Emergency Simulation**:
  - `scenario === 'full_loop'`: Triggers real SOS $\rightarrow$ identifies responding volunteer $\rightarrow$ accepts $\rightarrow$ arrives $\rightarrow$ resolves with timeline audit trails.
  - `scenario === 'volunteer_timeout'`: Triggers SOS and keeps status in `VOLUNTEER_ALERTED`.
  - `scenario === 'cancel'`: Triggers SOS and executes cancellation with audit trail.
- **Environmental Overrides in Redis**:
  - Writes simulation payload to `sim:weather:override` with a 300-second default TTL (`EX`).
  - Supports clearing active overrides via `clear: true`.

---

## 4. API & Route Specifications

### 4.1 Route Table
| Method | Path | Guard | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sim/sos` | `simulationGuard` | Simulates complete automated SOS emergency response lifecycle |
| `POST` | `/api/v1/sim/weather-override` | `simulationGuard` | Injects environmental overrides into Redis with configurable TTL |

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Types & Validation (`sim.types.ts`, `sim.validation.ts`)**
   - [ ] Add `SimulateSOSInput`, `SimulateSOSResult`, `WeatherOverrideInput`, `WeatherOverrideResult`.
   - [ ] Add `simulateSOSSchema` and `weatherOverrideSchema`.

2. **Phase B: Simulation Service (`sim.service.ts`)**
   - [ ] Implement `simulateSOS(input: SimulateSOSInput)` orchestrating multi-state emergency transitions.
   - [ ] Implement `overrideWeather(input: WeatherOverrideInput)` storing/clearing Redis overrides.

3. **Phase C: Simulation Controller & Routes (`sim.controller.ts`, `sim.routes.ts`)**
   - [ ] Add `simulateSOS` and `overrideWeather` controller handlers.
   - [ ] Mount endpoints in `sim.routes.ts`.

4. **Phase D: Integration Test Suite (`tests/simulation.sos-weather.test.ts`)**
   - [ ] Test 404 response when `SIMULATION_MODE !== 'true'`.
   - [ ] Test full SOS loop scenario with complete timeline transitions.
   - [ ] Test cancel and timeout scenarios.
   - [ ] Test Redis weather override injection, TTL, and clearing.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/simulation.sos-weather.test.ts
```

### Acceptance Checklist
- [ ] Simulation endpoints return 404 when `SIMULATION_MODE` is disabled.
- [ ] Full SOS simulation executes all lifecycle states (`TRIGGERED` $\rightarrow$ `VOLUNTEER_ACCEPTED` $\rightarrow$ `VOLUNTEER_ARRIVED` $\rightarrow$ `RESOLVED`).
- [ ] Weather overrides persist to Redis key `sim:weather:override` with TTL.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
