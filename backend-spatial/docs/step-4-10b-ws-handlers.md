# 📄 Technical Specification: WebSocket Event Handlers (Location, SOS & Danger Score Broadcasting)

> **Step ID**: `4.10b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-10b-ws-handlers`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.10b implements the domain-specific real-time event handlers and broadcast mechanisms for `backend-spatial`. It enables mobile clients to stream GPS telemetry (`location:update`), automatically checks against active PostGIS geofences on every ping, and pushes immediate danger alerts (`geofence:alert`).

Additionally, it provides centralized event dispatchers for SOS lifecycle transitions (`sosEvents.ts`: `sos:triggered`, `sos:accepted`, `sos:arrived`, `sos:resolved`, `sos:cancelled`) and real-time environmental danger score changes (`dangerAlerts.ts`: `danger:score_update`) across multi-tenant socket rooms.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/websocket/socketServer.ts` & `rooms.ts` (Step 4.10a).
  - `backend-spatial/src/modules/volunteer/volunteer.service.ts` (`recordLocation`).
  - `backend-spatial/src/modules/geofence/geofence.service.ts` (`checkPoint`).
  - `backend-spatial/src/modules/sos/sos.types.ts`.
- **Blocked by**: Step 4.10a (Completed & merged).
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy
> *Outlines the core reasoning hypotheses, spatial edge cases, and algorithmic invariants to validate during implementation.*

- **Core Reasoning Hypotheses**:
  - **Non-Blocking Telemetry Ingestion**: A GPS ping from a client should be recorded asynchronously. Failure of database recording or geofence lookup should not disconnect or crash the socket.
  - **Immediate Geofence Breach Alerting**: If a user's location ping falls inside a geofence polygon (`checkPoint.isInside === true`), an alert with severity and danger message is instantly pushed back to the user's socket.
  - **Multi-Tenant Fan-Out**: When an SOS is triggered, `sos:triggered` is emitted to all Yaatri Mitras (`role:YAATRI_MITRA`) and command center admins (`role:ADMIN`), while specific matched responders receive targeted assignment notifications (`user:{userId}`).
- **Spatial / Algorithmic Edge Cases**:
  - **GPS Bounds**: Coordinates outside $[-90, 90]$ latitude and $[-180, 180]$ longitude are safely discarded with an error acknowledgment.
  - **Room Isolation**: Only users subscribed to `zone:{zoneId}` and `role:ADMIN` receive `danger:score_update` events.

---

## 4. Event Schema Specifications

### 4.1 `location:update` Inbound & Outbound

```typescript
// Inbound payload from Client
interface LocationUpdatePayload {
  lat: number;
  lng: number;
  altitude?: number;
  battery?: number;
  accuracy?: number;
}

// Outbound alert to Client if inside geofence
interface GeofenceAlertEvent {
  type: 'INSIDE_GEOFENCE' | 'NEAR_GEOFENCE';
  geofences: Array<{
    id: string;
    name: string;
    type: string;
    severity: string;
    message?: string | null;
  }>;
  timestamp: string;
}
```

### 4.2 SOS Broadcast Events

- `sos:triggered` ➔ `role:YAATRI_MITRA`, `role:ADMIN`
- `sos:accepted` ➔ `user:{touristId}`, `role:ADMIN`, `role:YAATRI_MITRA`
- `sos:arrived` ➔ `user:{touristId}`, `role:ADMIN`
- `sos:resolved` ➔ `user:{touristId}`, `role:YAATRI_MITRA`, `role:ADMIN`
- `sos:cancelled` ➔ `role:YAATRI_MITRA`, `role:ADMIN`

### 4.3 Danger Score Broadcast

- `danger:score_update` ➔ `zone:{zoneId}`, `role:ADMIN`

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Location Update Handler (`src/websocket/handlers/locationUpdate.ts`)**
   - [ ] Implement `registerLocationHandler(io, socket)`: Validate coordinates, call `volunteerService.recordLocation`, run `geofenceService.checkPoint`, emit `geofence:alert` if breached, and return `location:ack`.

2. **Phase B: SOS Event Broadcasters (`src/websocket/handlers/sosEvents.ts`)**
   - [ ] Implement `broadcastSOSTriggered`, `broadcastSOSAccepted`, `broadcastSOSArrived`, `broadcastSOSResolved`, and `broadcastSOSCancelled`.

3. **Phase C: Danger Score Broadcaster (`src/websocket/handlers/dangerAlerts.ts`)**
   - [ ] Implement `broadcastDangerScoreUpdate(io, zoneId, payload)`.

4. **Phase D: Server Wiring (`src/websocket/socketServer.ts`)**
   - [ ] Register `registerLocationHandler` on socket connection.
   - [ ] Re-export broadcast helpers.

5. **Phase E: Integration Tests (`tests/socket.handlers.test.ts`)**
   - [ ] Test `location:update` telemetry persistence and geofence breach alerting.
   - [ ] Test SOS broadcast routing across user, role, and admin rooms.
   - [ ] Test danger score broadcast routing to zones.

---

## 6. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/socket.handlers.test.ts
```

### Acceptance Checklist
- [ ] `location:update` records GPS pings and sends `geofence:alert` when inside geofence perimeter.
- [ ] SOS events are properly fanned out to tourists, volunteers, and admin rooms.
- [ ] Danger score updates reach the specific zone and command center.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
