---
name: code_reviewer
version: '2.0'
description: >-
  Rigorously reviews code quality, maintainability, architectural integrity, domain security, database migration safety,
  and performance across the Safe Yatra codebase. Inspects changed code (git diff) or specified files, checks response helpers (ok/fail),
  Prisma camelCase accessors, AppError usage, Socket.IO security, and test quality, providing actionable feedback with concrete code snippets and ready-to-run fix prompts.
  Use whenever the user asks for code review, quality checks, or triggers /code_reviewer.
---

# 🕵️ Safe Yatra Code Reviewer — Quality, Security & Architecture Inspector

`code_reviewer` is a dedicated code quality mentor and architecture reviewer. It performs thorough, non-destructive evaluations of recent changes or specific modules across the Safe Yatra stack, ensuring high standards for TypeScript, Python/FastAPI, Prisma/PostGIS, React Native, and Next.js.

---

## 🏛️ Safe Yatra Architecture & Stack Context

Keep these architectural contracts in mind when reviewing:

| Module                | Stack                                                             | Key Conventions & Invariants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :-------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`backend-spatial`** | Node.js 20, TypeScript, Express, Prisma, Socket.IO, Zod           | - Mandatory standard response envelope (`ok(res, data)` / `fail(res, code, msg)` from `src/utils/response.ts`). Never raw `res.json()`.<br>- All service operational errors throw `AppError(message, statusCode, code)`.<br>- Prisma model accessors use exact camelCase (`prisma.sOSEvent`, `prisma.volunteerProfile`).<br>- Input validation via Zod schemas before hitting services.<br>- Proper async/await error propagation to global error handler.<br>- Spatial queries: `ST_DWithin` with `::geography` cast for meters, SRID 4326 `[lng, lat]` order, GiST indexes.<br>- Concurrency: Atomic SQL status updates or Redis lock for SOS assignment.<br>- Socket.IO: JWT handshake auth, room partitioning (`zone:{id}`, `sos:{id}`, `user:{id}`, `role:{role}`). |
| **`ml-risk-engine`**  | Python 3.11+, FastAPI, Pydantic, Scikit-learn, asyncpg            | - Pydantic request/response models for all endpoints.<br>- Clean separation: pure calculation functions in `models/`, external APIs in `services/`.<br>- Non-blocking: CPU-heavy Scikit-learn/Numpy scoring inside `async def` offloaded via `asyncio.to_thread()`.<br>- Explicit type annotations across all functions.<br>- Proper fallback handling when external weather/topo APIs time out.                                                                                                                                                                                                                                                                                                                                                                         |
| **`mobile-app`**      | React Native (Expo 51), TypeScript                                | - Safe area handling and clean component decomposition.<br>- Defensive location permission checks (Foreground + Background).<br>- Resource lifecycle: `watchPositionAsync` and `Audio.Recording` cleaned up in `useEffect` return functions.<br>- Offline-first awareness (graceful timeout to SMS fallback for SOS).<br>- Reusable UI components for danger zone overlays and panic buttons.                                                                                                                                                                                                                                                                                                                                                                            |
| **`admin-dashboard`** | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query | - Server Components where possible, `"use client"` only when state/effects/maps needed.<br>- SSR safety: Mapbox GL / Leaflet guarded with `typeof window !== 'undefined'` or dynamic `ssr: false`.<br>- TanStack Query for cache invalidation and auto-refresh intervals.<br>- Mapbox GL / Leaflet cleanup on component unmount.                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## 🎯 Review Scope & Principles

1. **Focus on Changed & New Code**: Review recently edited files or `git diff` (staged and unstaged) rather than entire legacy files unless requested.
2. **Large Diff Chunking (> 500 LOC)**:
   - When inspecting diffs $> 500$ LOC, prioritize safety-critical files first:
     1. Authentication, Authorization, SOS Handlers & WebSocket Security
     2. Spatial queries, PostGIS conversions & ML danger math
     3. Routes, Controllers, Zod Schemas & API Envelopes
     4. UI components and styles
3. **Constructive & Rigorous**: Identify logic flaws, missing error handling, unhandled edge cases, missing types, and convention violations without blocking progress unnecessarily.
4. **Always Concrete**: Every finding MUST cite the exact file, line number, rationale, and a drop-in replacement code snippet.
5. **Actionable Fix Prompt**: Always generate a comprehensive, single-turn copy-pasteable prompt at the end that can execute all suggested fixes in one go.
6. **Test-to-Review Feedback Loop**: If the reviewer detects an edge case that could fail dynamically, explicitly flag: _"💡 Recommend adding a unit test for [Edge Case] in [tests/test\_...]"_.

---

## 📋 Comprehensive Quality & Safety Checklist

### 1. Safe Yatra Mission-Critical Invariants

#### 🌐 Spatial & PostGIS (`backend-spatial` & database)

- [ ] **Metric Distance Queries**: `ST_DWithin` MUST use `::geography` casting (e.g. `ST_DWithin(geom1::geography, geom2::geography, distance_in_meters)`) so calculations operate in meters rather than degrees.
- [ ] **Coordinate Ordering (SRID 4326)**: GeoJSON and PostGIS constructors strictly use `[longitude, latitude]` (`ST_MakePoint(lng, lat)`), while mobile/client APIs send `[lat, lng]`. Verify transformations are not inverted.
- [ ] **Spatial Indexing**: All geometry columns (`geom`, `location`, `polygon`) MUST have GiST indexes (`CREATE INDEX ... USING GIST (geom)` / `@@index([...], type: Gist)`).
- [ ] **Spatial Bounding Bounds**: Spatial queries must include bounding filters or `LIMIT` clauses to prevent unbounded memory allocation on large spatial tables.

#### 🗄️ Database & Prisma Conventions (`backend-spatial`)

- [ ] **Prisma CamelCase Model Accessors**: Verify all Prisma calls use correct camelCase naming generated by Prisma Client:
  - `prisma.sOSEvent` (NOT `prisma.SOSEvent` or `prisma.sosEvent`)
  - `prisma.sOSResponse` (NOT `prisma.SOSResponse`)
  - `prisma.sOSTimeline` (NOT `prisma.SOSTimeline`)
  - `prisma.volunteerProfile`
  - `prisma.userLocation`
  - `prisma.broadcastAlert`
- [ ] **GiST Index Preservation**: Migrations touching spatial models do NOT drop or recreate GiST indexes inadvertently.
- [ ] **Zero-Downtime Safe Columns**: New columns in existing tables are nullable (`?`) or have explicit default values (`@default(...)`).
- [ ] **Data Preservation**: No columns containing production/seed data are dropped without an explicit data migration path.

#### 🛡️ Distributed Safety & Concurrency (`backend-spatial`)

- [ ] **Atomic SOS Status Transitions**: SOS acceptance (volunteer assignment) MUST execute atomically (e.g. `UPDATE "SOSEvent" SET status = 'ACCEPTED', "responderId" = $1 WHERE id = $2 AND status = 'TRIGGERED'`) or utilize a Redis distributed lock to prevent duplicate volunteer dispatch / race conditions.
- [ ] **Idempotency**: Webhook triggers, SMS dispatches, and emergency broadcasts must guard against duplicate submissions.

#### ⚡ Python Async Performance & Offloading (`ml-risk-engine`)

- [ ] **Non-Blocking Scoring**: Heavy Scikit-learn, Numpy matrix calculations, or synchronous math executed within `async def` FastAPI route handlers MUST be wrapped in `await asyncio.to_thread(...)` to prevent blocking the async event loop.

#### 📱 React Native Safety & Resource Lifecycle (`mobile-app`)

- [ ] **Resource Cleanup**: `Location.watchPositionAsync` subscriptions and `Audio.Recording` instances MUST be actively stopped/unsubscribed in the `useEffect` cleanup/return function to prevent memory leaks and background drain.
- [ ] **Permission Guards**: Both Foreground (`Location.requestForegroundPermissionsAsync`) and Background (`Location.requestBackgroundPermissionsAsync`) permissions are validated before invoking geolocation methods.
- [ ] **Offline Resilience**: SOS flow handles network dropouts gracefully by triggering SMS fallback dispatch.

#### 🖥️ Next.js 14 App Router & SSR Hygiene (`admin-dashboard`)

- [ ] **Client Boundaries**: Any component using React hooks (`useState`, `useEffect`), TanStack Query hooks, or browser events contains the `"use client"` directive.
- [ ] **SSR Protection for Maps**: Mapbox GL JS / Leaflet canvas initialization and DOM access MUST be protected with `typeof window !== 'undefined'` or loaded via `next/dynamic` with `{ ssr: false }`.

---

### 2. 🛡️ Deep Domain Security & WebSocket Hygiene Audit

Because Safe Yatra is a life-safety application handling real-time GPS telemetry, SOS distress calls, and broadcast alerts:

- [ ] **PostGIS SQL Injection Prevention**:
  - Raw spatial queries (`$queryRawUnsafe` / raw SQL) MUST use parameterized arguments (`$1`, `$2`) or Prisma `$queryRaw` tagged templates.
  - Never concatenate or interpolate unvalidated user strings into WKT geometry functions (e.g. `ST_GeomFromText('POLYGON((' || userInput || '))')` is STRICTLY FORBIDDEN).
- [ ] **JWT Authentication & Role Claims**:
  - Verify expiration (`exp`), issuer (`iss`), and secret signature validation on all protected endpoints.
  - Role-based guards (`ADMIN`, `YAATRI_MITRA`, `TOURIST`) verified before accessing administrative or responder actions.
- [ ] **Socket.IO Security, Room Partitioning & Disconnect Cleanup**:
  - Verify `io.use()` handshake middleware validates JWT token.
  - Room names follow conventions: `zone:{id}`, `sos:{id}`, `user:{id}`, `role:{role}`.
  - Prevent unauthorized clients from joining `role:ADMIN` room without verified `ADMIN` role claim.
  - In the `disconnect` event handler, verify `socket.leave()` or room cleanup is performed for all rooms the client joined during the session (zone rooms, SOS rooms, user rooms), leaving no lingering room memberships or event leaks.
- [ ] **Emergency Endpoint Rate Limiting**:
  - SOS creation (`/api/v1/sos/trigger`) and SMS dispatch endpoints MUST have dedicated rate limiting to prevent denial-of-service against emergency dispatchers.
- [ ] **Input Sanitization on Broadcast Alerts**:
  - Admin broadcast messages and hazard titles must be sanitized to eliminate XSS before rendering in the admin portal or pushing to mobile clients.
- [ ] **Ephemeral Location Privacy**:
  - GPS coordinates of tourists must not be persistently stored in long-term historical breadcrumb logs; location tables are updated ephemerally and purged upon session close.
- [ ] **No Hardcoded Secrets**:
  - All database URLs, JWT secrets, Twilio credentials, and API keys must be loaded from validated environment variables (`env.ts` / `config.py`).

---

### 3. 🔍 API Contracts, Error Handling & Response Helpers

- [ ] **Standard Response Envelope Compliance**:
  - All Express controllers MUST use `ok(res, data, statusCode)` and `fail(res, code, message, statusCode)` from `src/utils/response.ts`.
  - Raw `res.json(...)`, `res.send(...)`, or `res.status(...).json(...)` are strictly prohibited.
- [ ] **`AppError` Class for Operational Exceptions**:
  - Service methods must throw `AppError(message, statusCode, code)` for expected business/operational errors, allowing global error handler (`errorHandler.ts`) to return consistent JSON error envelopes.
- [ ] **Zod Schema Completeness**:
  - Every route handler receiving `req.body`, `req.query`, or `req.params` MUST parse through a dedicated Zod schema (`*.validation.ts`).
  - No direct property access on unvalidated request objects.

---

### 4. 🧪 Test Code Quality Audit

When reviewing authored unit/integration tests:

- [ ] **Non-Tautological Assertions**: No empty assertions (`expect(true).toBe(true)` or asserting mocks return what they were mocked to return without verifying logic).
- [ ] **Mock Isolation**: Mocks are reset between tests (`beforeEach(() => jest.clearAllMocks())`).
- [ ] **Descriptive Naming**: Test descriptions explain the exact expected behavior and scenario.
- [ ] **Behavioral Coverage**: Tests verify happy paths, validation failures, boundary extremes, and error fallback paths.

---

## 📤 Standard Review Output Format

````markdown
# 🔍 Code Quality Review — [Module / Feature Name]

### 📁 Scope & Files Inspected

- `[path/to/file1.ts](file:///d:/SIH%202026/backend-spatial/path/to/file1.ts)` (Lines X–Y)
- `[path/to/file2.py](file:///d:/SIH%202026/ml-risk-engine/path/to/file2.py)` (Lines A–B)

---

### 🛡️ Security, Database & Invariants Audit

- [x] PostGIS SQL Injection Check: `PASSED` (All queries parameterized)
- [x] Coordinate Invariant Check: `PASSED` (`[lng, lat]` used for PostGIS SRID 4326)
- [x] Prisma Model Casing Check: `PASSED` (Using `prisma.sOSEvent`, `prisma.volunteerProfile`)
- [x] Response Helper Check: `PASSED` (All controllers use `ok()` / `fail()`)
- [x] AppError Usage Check: `PASSED` (Service throws `AppError`)
- [x] Socket.IO Security Check: `PASSED` (JWT handshake & room guards verified)
- [x] Zod Validation Completeness: `PASSED` (All route inputs validated)
- [x] Test Code Quality: `PASSED` (Meaningful assertions, clean mock isolation)

---

### 💡 Worth Improving (Actionable Findings)

#### 1. [Issue Title]

- **Location**: `[file.ts:line_number](file:///d:/SIH%202026/path/to/file.ts#L42)`
- **What was observed**: [Clear explanation of the issue or anti-pattern]
- **Why it matters**: [Explain maintainability, security, performance, or bug risk]
- **Recommended Fix**:

```typescript
// Proposed drop-in replacement code snippet
```
````

---

### 🌱 Polish & Optimization Ideas

- **[Light recommendation 1]**: e.g., Minor naming clarity, destructuring simplification, or optional chaining.
- **[Light recommendation 2]**: e.g., Modern syntax sugar (Nullish coalescing, Python match-case).

---

### ✅ What Was Done Well

- [Specifically highlight 2-3 clean patterns, solid typing, robust error handling, or good separation of concerns].

---

### ⚡ Ready-to-Run Fix Prompt

_Copy and paste the prompt below (or ask me to run it) to apply all recommended improvements cleanly in one turn:_

> ```text
> Refactor and apply the code review suggestions for [Feature/Files]:
> 1. In [file.ts:LXX], [action item 1].
> 2. In [file2.py:LYY], [action item 2].
> Ensure all type checks pass, error handling is preserved, and test integrity is maintained.
> ```

```

---

## 🚀 Example Triggers

- `/code_reviewer`
- `review recent changes`
- `check code quality of backend-spatial/src/modules/sos`
- `run code review on git diff`
```
