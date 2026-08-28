# 📄 Technical Specification: WebSocket Server Bootstrap, JWT Auth & Room Management

> **Step ID**: `4.10a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-10a-ws-server-rooms`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.10a implements the real-time WebSocket foundation in `backend-spatial`. It bootstraps the `Socket.IO` server with strict JWT handshake authentication, establishes the multi-tenant room topology (`user:{userId}`, `role:{role}`, `zone:{zoneId}`), and provides type-safe broadcasting utilities (`emitToUser`, `emitToRole`, `emitToZone`, `emitToAll`).

This real-time transport enables bidirectional streaming of tourist GPS locations, instant SOS panic dispatch to nearby Yaatri Mitras, and live danger score updates to the admin command center.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - `backend-spatial/src/modules/auth/auth.service.ts` (`verifyToken`).
  - `backend-spatial/src/config/env.ts`.
  - `socket.io` (Installed).
- **Blocked by**: Step 4.9c (Completed & merged).
- **New Packages / Libraries**: None (`socket.io` and `socket.io-client` for tests are ready).

---

## 3. WebSocket Room Topology & Events

### 3.1 Room Conventions

```
┌─────────────────────────────────────────────────────────────┐
│                      SOCKET.IO SERVER                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [user:usr_123]       ──► Targeted tourist alerts & SOS     │
│  [role:YAATRI_MITRA]  ──► Volunteer emergency dispatch feed │
│  [role:ADMIN]         ──► Command center live incidents     │
│  [zone:zone_lonavala] ──► Localized danger & crowd updates  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Handshake Authentication

1. Client provides JWT token via `socket.handshake.auth.token`, `headers.authorization`, or `query.token`.
2. Middleware validates token via `authService.verifyToken(token, 'access')`.
3. If valid, attaches user session to `socket.data.user = { id, email, role }`.
4. If invalid or absent, rejects connection with `Authentication error: Token required`.

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: Room Topologies & Helpers (`src/websocket/rooms.ts`)**
   - [ ] Implement room formatters: `userRoom`, `roleRoom`, `zoneRoom`.
   - [ ] Implement broadcasting helpers: `emitToUser`, `emitToRole`, `emitToZone`, `emitToAll`.

2. **Phase B: Socket Server Bootstrap (`src/websocket/socketServer.ts`)**
   - [ ] Implement `initSocketServer(httpServer)`: JWT middleware, connection handling, automatic room subscriptions, and dynamic zone join/leave handlers.
   - [ ] Implement `getIO()` singleton accessor.

3. **Phase C: Integration Tests (`tests/socket.server.test.ts`)**
   - [ ] Test handshake authentication rejection and acceptance.
   - [ ] Test automatic room assignments on connection.
   - [ ] Test dynamic zone joining and leaving.
   - [ ] Test targeted event emissions.

---

## 5. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial && npm test -- tests/socket.server.test.ts
```

### Acceptance Checklist
- [ ] Handshake middleware rejects unauthenticated connections.
- [ ] Valid connections automatically join `user:{userId}` and `role:{role}` rooms.
- [ ] Clients can dynamically join and leave `zone:{zoneId}` rooms.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
