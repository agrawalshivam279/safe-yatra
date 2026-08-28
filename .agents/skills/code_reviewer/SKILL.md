---
name: code_reviewer
description: >-
  Rigorously reviews code quality, maintainability, architectural integrity, and framework conventions
  across the Safe Yatra codebase. Inspects changed code (git diff) or specified files, provides actionable
  feedback with concrete code snippets, highlights positive patterns, and generates a ready-to-use fix prompt.
  Use whenever the user asks for code review, quality checks, or triggers /code_reviewer.
---

# 🕵️ Safe Yatra Code Reviewer — Quality & Architecture Inspector

`code_reviewer` is a dedicated code quality mentor and architecture reviewer. It performs thorough, non-destructive evaluations of recent changes or specific modules across the Safe Yatra stack, ensuring high standards for TypeScript, Python/FastAPI, Prisma/PostGIS, React Native, and Next.js.

---

## 🏛️ Safe Yatra Architecture & Stack Context

Keep these architectural contracts in mind when reviewing:

| Module | Stack | Key Conventions & Invariants |
| :--- | :--- | :--- |
| **`backend-spatial`** | Node.js 20, TypeScript, Express, Prisma, Socket.IO, Zod | - Always use standard response envelope (`ok(res, data)` / `fail(res, code, msg)`).<br>- Input validation via Zod schemas before hitting services.<br>- Proper async/await error propagation to global error handler.<br>- Spatial queries: `ST_DWithin` with `::geography` cast for meters, SRID 4326 `[lng, lat]` order, GiST indexes.<br>- Concurrency: Atomic SQL status updates (`WHERE status = 'MATCHING'`) or Redis lock for SOS assignment.<br>- Targeted Socket.IO room broadcasts (`zone:{id}`, `sos:{id}`). |
| **`ml-risk-engine`** | Python 3.11+, FastAPI, Pydantic, Scikit-learn, asyncpg | - Pydantic request/response models for all endpoints.<br>- Clean separation: pure calculation functions in `models/`, external APIs in `services/`.<br>- Non-blocking: CPU-heavy Scikit-learn/Numpy scoring inside `async def` offloaded via `asyncio.to_thread()`.<br>- Explicit type annotations across all functions.<br>- Proper fallback handling when external weather/topo APIs time out. |
| **`mobile-app`** | React Native (Expo 51), TypeScript | - Safe area handling and clean component decomposition.<br>- Defensive location permission checks (Foreground + Background).<br>- Resource lifecycle: `watchPositionAsync` and `Audio.Recording` cleaned up in `useEffect` return functions.<br>- Offline-first awareness (graceful timeout to SMS fallback for SOS).<br>- Reusable UI components for danger zone overlays and panic buttons. |
| **`admin-dashboard`** | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query | - Server Components where possible, `"use client"` only when state/effects/maps needed.<br>- SSR safety: Mapbox GL / Leaflet guarded with `typeof window !== 'undefined'` or dynamic `ssr: false`.<br>- TanStack Query for cache invalidation and auto-refresh intervals.<br>- Mapbox GL / Leaflet cleanup on component unmount. |

---

## 🎯 Review Scope & Principles

1. **Focus on Changed & New Code**: Review recently edited files or `git diff` (staged and unstaged) rather than entire legacy files unless requested.
2. **Constructive & Rigorous**: Identify logic flaws, missing error handling, unhandled edge cases, missing types, and convention violations without blocking progress unnecessarily.
3. **Always Concrete**: Every finding MUST cite the exact file, line number, rationale, and a drop-in replacement code snippet.
4. **Actionable Fix Prompt**: Always generate a comprehensive, single-turn copy-pasteable prompt at the end that can execute all suggested fixes in one go.

---

## 📋 Core Quality Checklist

### 1. Safe Yatra Mission-Critical Invariants

#### 🌐 Spatial & PostGIS (`backend-spatial` & database)
- [ ] **Metric Distance Queries**: `ST_DWithin` MUST use `::geography` casting (e.g. `ST_DWithin(geom1::geography, geom2::geography, distance_in_meters)`) so calculations operate in meters rather than degrees.
- [ ] **Coordinate Ordering (SRID 4326)**: GeoJSON and PostGIS constructors strictly use `[longitude, latitude]` (`ST_MakePoint(lng, lat)`), while mobile/client APIs send `[lat, lng]`. Verify transformations are not inverted.
- [ ] **Spatial Indexing**: All geometry columns (`geom`, `location`, `polygon`) MUST have GiST indexes (`CREATE INDEX ... USING GIST (geom)`).

#### 🛡️ Distributed Safety & Concurrency (`backend-spatial`)
- [ ] **Atomic SOS Status Transitions**: SOS acceptance (volunteer assignment) MUST execute atomically (e.g. `UPDATE sos_events SET status = 'ACCEPTED', responder_id = $1 WHERE id = $2 AND status = 'MATCHING'`) or utilize a Redis distributed lock to prevent duplicate volunteer dispatch / race conditions.
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

### 2. Separation of Concerns & Architecture
- [ ] Code lives in the right layer (routes/controllers stay thin; business logic resides in services; DB queries use ORM/Prisma/models).
- [ ] No direct external API calls scattered inside controllers or UI components.

### 3. Typing, Validation & Contracts
- [ ] No `any` types in TypeScript unless strictly justified; explicit Pydantic types in Python.
- [ ] All external input (HTTP body, query params, WebSocket payloads) is validated with Zod / Pydantic.
- [ ] Response shapes strictly match the defined API contracts in [`GEMINI.md`](file:///d:/SIH%202026/GEMINI.md) and [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md).

### 4. Error Handling & Resilience
- [ ] Proper `try/catch` with informative error logging.
- [ ] Fallbacks for external services (e.g. weather API timeout falling back to cached risk data).
- [ ] No unhandled Promise rejections or silent exception swallowing (`catch (e) {}`).

### 5. Readability & Maintainability
- [ ] Clear, self-documenting naming (verbs for functions like `calculateDangerScore`, nouns for data/variables like `volunteerList`).
- [ ] Functions are short, focused, and single-purpose (< 40–50 lines ideal).
- [ ] No duplicate code blocks that should be extracted into shared utilities.
- [ ] No leftover debug logs (`console.log`), unused imports, or dead commented-out code.

### 6. Security & Safety (Quick Scan)
- [ ] No hardcoded secrets, API keys, or database credentials (all read from typed `env`).
- [ ] Proper role-based access checks on sensitive endpoints (`admin` / `volunteer`).
- [ ] Ephemeral location privacy (no persistent logging of continuous GPS trails).

---

## 📤 Standard Review Output Format

When executing a review, format the output as follows:

```markdown
# 🔍 Code Quality Review — [Module / Feature Name]

### 📁 Scope & Files Inspected
- `[path/to/file1.ts](file:///d:/SIH%202026/path/to/file1.ts)` (Lines X–Y)
- `[path/to/file2.py](file:///d:/SIH%202026/path/to/file2.py)` (Lines A–B)

---

### 💡 Worth Improving (Actionable Findings)

#### 1. [Issue Title]
- **Location**: `[file.ts:line_number](file:///d:/SIH%202026/path/to/file.ts#L42)`
- **What was observed**: [Clear explanation of the issue or anti-pattern]
- **Why it matters**: [Explain maintainability, performance, or bug risk]
- **Recommended Fix**:
```typescript
// Proposed drop-in replacement code snippet
```

---

### 🌱 Polish & Optimization Ideas
- **[Light recommendation 1]**: e.g., Minor naming clarity, destructuring simplification, or optional chaining.
- **[Light recommendation 2]**: e.g., Modern syntax sugar (Nullish coalescing, Python match-case).

---

### ✅ What Was Done Well
- [Specifically highlight 2-3 clean patterns, solid typing, robust error handling, or good separation of concerns].

---

### ⚡ Ready-to-Run Fix Prompt
*Copy and paste the prompt below (or ask me to run it) to apply all recommended improvements cleanly in one turn:*

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
