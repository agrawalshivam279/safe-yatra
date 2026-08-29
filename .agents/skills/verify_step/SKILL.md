---
name: verify_step
version: '2.0'
description: >-
  Automated Quality Gate & Verification Pipeline. Sequentially chains compiler & Prisma checks (Stage 0),
  conditional API contract validation (Stage 0.5), test_writer (Stage 1A), test_runner (Stage 1B),
  and code_reviewer (Stage 2) to provide total quality verification before code is merged.
  Enforces strict failure halts, incremental test execution, and precision fix prompts.
  Use whenever code implementation is finished, before shipping, or calling /verify_step.
---

# 🧪 Verify Step — Dynamic & Static Quality Gate Pipeline

`verify_step` is the automated quality gate for Safe Yatra. It guarantees that newly written code **actually works dynamically** (automated unit/integration tests pass with $\ge 80\%$ coverage), **conforms to API contracts** (Zod/Pydantic & standard envelopes), AND **is architecturally sound statically** (reviewed for types, spatial invariants, security, and performance) before any code is committed or merged into `main`.

---

## 🔄 End-to-End Pipeline Workflow

```mermaid
flowchart TD
    A["Trigger /verify_step (Feature / Active Files)"] --> S0["⚡ Stage 0: Pre-flight Compiler, Lint & Prisma Gate<br/>(tsc --noEmit, ruff check ., prisma validate) [Max 30s]"]
    S0 --> S0Check{"Syntax / Types / DB Valid?"}
    S0Check -- "❌ Errors" --> S0Fail["🛑 FAST FAIL: Return Diagnostics + Instant Fix Prompt"]
    S0Check -- "✅ Clean" --> S05{"Feature Touches API Routes?"}

    S05 -- "Yes" --> S05Val["🔍 Stage 0.5: API Contract Validator<br/>(Zod/Pydantic schemas, ok/fail envelopes) [Max 15s]"]
    S05Val --> S05Check{"Contracts Valid?"}
    S05Check -- "❌ Contract Drift" --> S05Fail["🛑 STOP: Return Schema Drift Details + Fix Prompt"]
    S05Check -- "✅ Valid" --> B["✍️ Stage 1A: test_writer (Spec-driven test authoring) [Max 120s]"]
    S05 -- "No" --> B

    B --> C["🏃 Stage 1B: test_runner (Execute pytest / npm test) [Max 60s]"]
    C --> D{"🧪 All Tests Pass & Coverage Met?"}

    D -- "❌ Tests Failed" --> E["🛑 HARD STOP: Output Failure Trace + Curated Auto-Fix Prompt"]
    D -- "✅ All Passed" --> F["🕵️ Stage 2: code_reviewer (Static Architecture, Security, DB & Performance) [Max 90s]"]

    F --> G{"💡 Code Polish / Invariants Check?"}
    G -- "Issues Found" --> H["Present Detailed Snippets + Single-Turn Fix Prompt"]
    G -- "Clean / Approved" --> I["✅ 100% Quality Gate Passed -> Ready for /ship_step"]
```

---

## 🛑 MANDATORY STOP GATE: Anti-Auto-Advance Rule

> **CRITICAL RULE**: After `/verify_step` completes compiler checks, contract validation, dynamic tests, and static code review, the agent **MUST IMMEDIATELY STOP** and present the Quality Gate Report.
> **DO NOT** commit changes to git.
> **DO NOT** push to GitHub.
> **DO NOT** open a PR or merge into main.
> **DO NOT** trigger `/ship_step` automatically.
> Wait for the user to review and explicitly trigger `/ship_step`. The only exception is `/auto_cycle`.

---

## ⏱️ Timeout & Budget Guardrails

To prevent hangs or infinite loops during verification:

| Stage         | Operation                     | Max Wall-Clock Time   | Failure Action                                     |
| :------------ | :---------------------------- | :-------------------- | :------------------------------------------------- |
| **Stage 0**   | Compiler, Lint & Prisma Check | **30s**               | Kill process, output type/schema errors            |
| **Stage 0.5** | API Contract Validation       | **15s**               | Halt on schema drift or missing response envelopes |
| **Stage 1A**  | `test_writer` Authoring       | **120s**              | Check syntax, verify test file exists              |
| **Stage 1B**  | `test_runner` Execution       | **60s** per test file | Terminate hung test, diagnose async lock           |
| **Stage 2**   | `code_reviewer` Review        | **90s**               | Generate actionable fix prompt                     |

---

## 🔒 Automated Execution Stages

### 🔥 Optional Quick Smoke Test (Makefile Shortcuts)

Before running the full verification pipeline, you may optionally execute quick monorepo smoke checks via the root [`Makefile`](file:///d:/SIH%202026/Makefile):

- `make lint` — Runs `ruff check .` on Python and npm lint across TypeScript modules.
- `make test-all` — Runs pytest and Jest suites across all modules in parallel.
- `make check-deploy` — Verifies Docker PostgreSQL (PostGIS) and Redis containers are healthy.
- `make format-check` — Verifies monorepo code formatting compliance.

---

### Stage 0: Pre-flight Compiler, Lint & Prisma Gate

Before invoking testing subagents, execute a fast static compilation sweep matching CI ([`.github/workflows/ci.yml`](file:///d:/SIH%202026/.github/workflows/ci.yml)):

1. **TypeScript Modules (`backend-spatial`, `mobile-app`, `admin-dashboard`)**:
   - Run `npx tsc --noEmit` within the target module directory.
   - For `admin-dashboard`, run `npm run lint` if UI/pages are modified.
2. **Prisma Schema Validation (`backend-spatial`)**:
   - If `backend-spatial` files or Prisma schema are touched, run:
     ```bash
     cd backend-spatial && npx prisma validate && npx prisma generate
     ```
3. **Python Module (`ml-risk-engine`)**:
   - Run `ruff check .` from `ml-risk-engine/` (matching CI config).
4. **Fast-Fail Gate**:
   - If syntax, import, lint, or type errors are discovered, **HALT IMMEDIATELY**.
   - Output the exact compiler errors and provide an instant fix prompt without wasting token cycles on dynamic tests.

---

### Stage 0.5: API Contract Validator (`api_contract_validator`)

_(Triggered conditionally when the feature touches REST routes, controllers, or schemas)_

1. **Target Files**: `*.routes.ts`, `*.controller.ts`, `app/main.py`, `app/schemas/*.py`, `mobile-app/services/*.ts`, `admin-dashboard/src/services/*.ts`.
2. **Contract Invariants Verified**:
   - **Response Envelope Compliance**:
     - Success returns `ok(res, data)` $\rightarrow$ `{ success: true, data: {...}, error: null }`.
     - Error returns `fail(res, code, message)` $\rightarrow$ `{ success: false, data: null, error: { code: '...', message: '...' } }`.
   - **Cross-Module Type & Schema Synchronization**:
     - When frontend services or components are touched, verify that mobile/admin TypeScript interfaces mirror backend Zod response schemas and payloads without property name mismatch.
   - **Schema Validation**:
     - All incoming request bodies and query parameters are parsed with Zod schemas (`backend-spatial`) or Pydantic models (`ml-risk-engine`).
   - **HTTP Status Code Conformity**:
     - `200 OK` (retrieval/update), `201 Created` (resource creation), `400 Bad Request` (Zod validation error), `401 Unauthorized` (missing/invalid JWT), `403 Forbidden` (role unauthorized), `404 Not Found`, `409 Conflict`.
   - **Coordinate Payload Standard**:
     - Client request and response bodies use `{ lat, lng }` or `{ latitude, longitude }` ordering.
3. If contract drift is detected, **HALT IMMEDIATELY** and report the exact schema discrepancy before authoring tests.

---

### Stage 1: Dynamic Behavioral Verification (`test_writer` ➔ `test_runner`)

_(Triggered only after Stage 0 and Stage 0.5 pass cleanly)_

#### Stage 1A — Test Authoring ([`test_writer`](file:///d:/SIH%202026/.agents/skills/test_writer/SKILL.md)):

1. Reads target feature specification (`backend-spatial/docs/...`, `docs/specs/...`) and [`GEMINI.md`](file:///d:/SIH%202026/GEMINI.md) contracts.
2. Employs standardized module fixtures from the **Codebase Mock Catalog** (Prisma client mock, Redis mock, Socket.IO test client, React Native TurboModule mocks, TanStack Query wrapper).
3. Enforces **Spatial Coordinate Invariant Testing** (`[lat, lng]` client vs `[lng, lat]` PostGIS GeoJSON).
4. Writes tests targeting:
   - Line coverage: $\ge 80\%$
   - Branch coverage: $\ge 70\%$
   - API endpoints: $100\%$ route coverage (including 200/201 happy paths and 400/401/403 failure envelopes)
5. Saves tests to `backend-spatial/tests/`, `ml-risk-engine/tests/`, `mobile-app/__tests__/`, or `admin-dashboard/__tests__/`.

#### Stage 1B — Test Execution (`test_runner`):

1. Runs strictly **AFTER** `test_writer` completes and validates test syntax.
2. Executes targeted test command:
   - Targeted file: `npm test -- tests/<feature>.test.ts` or `pytest tests/test_<feature>.py -v`
   - Module pattern (incremental): `npx jest --testPathPattern="<module-slug>" --verbose`
3. Parses assertion results and coverage.
4. **Hard Failure Gate**:
   - If any test fails or coverage is unmet, **HALT IMMEDIATELY**.
   - Do NOT run `code_reviewer` on broken code.
   - Output exact file & line number, expected vs actual behavior, failure classification, and an executable auto-fix prompt.

---

### Stage 2: Static Architecture, Security & Performance Review ([`code_reviewer`](file:///d:/SIH%202026/.agents/skills/code_reviewer/SKILL.md))

_(Triggered only after all tests pass 100%)_

1. Inspects `git diff` against **Safe Yatra Invariants**:
   - **Response Helpers & Errors**: Mandatory `ok()`/`fail()` response envelopes and `AppError` exception throws.
   - **Prisma Conventions**: Exact camelCase accessors (`prisma.sOSEvent`, `prisma.volunteerProfile`).
   - **Spatial & PostGIS**: `ST_DWithin` with `::geography` cast (meters), SRID 4326 `[lng, lat]` order, GiST indexes.
   - **Distributed Concurrency**: Atomic SQL transitions (`WHERE status = 'TRIGGERED'`) or Redis locks for SOS assignment.
   - **Security Checklist**: PostGIS parameterized queries, JWT validation, rate limiting on SOS, upload sanitization, Socket.IO room isolation (`zone:{id}`, `sos:{id}`, `role:ADMIN`).
   - **Performance Checklist**: Prisma N+1 query detection, spatial bounding limits, `asyncio.to_thread` for CPU scoring.
   - **Database Migration Safety**: GiST spatial index preservation, zero-downtime column nullability.
2. Formats all suggestions with concrete line numbers, drop-in replacement snippets, and a single-turn copy-pasteable fix prompt.

---

## 📤 Standard Output Format

````markdown
# 🛡️ /verify_step Quality Gate Report — [Feature Name]

### ⚡ Stage 0 — Pre-flight Compilation, Lint & Prisma

- **Commands**: `tsc --noEmit`, `prisma validate`, `ruff check .`
- **Status**: `✅ 0 type errors, 0 lint errors, Prisma schema valid`

---

### 🔍 Stage 0.5 — API Contract Validation

_(Included if feature touches API routes)_

- **Status**: `✅ API contracts compliant with GEMINI.md Section 9 (Zod validated, ok/fail envelopes confirmed)`

---

### 🧪 Stage 1 — Dynamic Test Execution

- **Stage 1A (Authoring)**: `test_writer` generated `[tests/test_feature.ts](file:///d:/SIH%202026/backend-spatial/tests/test_feature.ts)`
- **Stage 1B (Execution)**: `npm test -- tests/test_feature.test.ts` (or `pytest tests/test_feature.py -v`)
- **Status**: `✅ 6 passed, 0 failed`
- **Coverage**: `Line: 88%, Branch: 76%, Routes: 100%`

---

### 🚨 Test Failure Diagnosis _(Only if tests fail)_

- **Failed Assertion**: `test_service_fallback`
- **Classification**: `REDIS_MOCK_MISSING` / `ASSERTION_FAIL`
- **Location**: `[src/modules/danger/danger.service.ts:48](file:///d:/SIH%202026/backend-spatial/src/modules/danger/danger.service.ts#L48)`
- **Root Cause**: `fetch` was unhandled on timeout instead of returning cached score.
- **⚡ Curated Auto-Fix Prompt**:

> ```text
> Wrap external ML API call in try/catch block for timeout exceptions and return cached danger score.
> ```

---

### 🕵️ Stage 2 — Static Code Quality, Security & Performance Review

_(Only displayed if tests pass)_

#### 🛡️ Security, Database & Invariants Audit

- [x] PostGIS SQL Injection Check: `PASSED` (All queries parameterized)
- [x] Coordinate Invariant Check: `PASSED` (`[lng, lat]` used for PostGIS SRID 4326)
- [x] Response Helper Check: `PASSED` (`ok()` and `fail()` used in all controllers)
- [x] Prisma Model Casing: `PASSED` (`prisma.sOSEvent`, `prisma.volunteerProfile`)
- [x] Atomic SOS transitions guarded against race conditions
- [x] Database Migration Safety: `PASSED` (GiST index declared, zero-downtime nullable fields)

#### 💡 Worth Improving

- **[Finding Title]**: `[file.ts:42](file:///d:/SIH%202026/path/to/file.ts#L42)`
- **Observation**: Missing `::geography` cast in `ST_DWithin` query causing radius calculation in degrees.
- **Recommended Fix**:

```typescript
// Proposed snippet
```
````

#### ✅ What Was Done Well

- [Highlight clean patterns, solid typing, or proper PostGIS spatial query indexing].

---

### 🚦 Final Quality Gate Verdict

- [ ] ❌ **BLOCKED**: Compilation, contracts, or tests failed. Run the curated fix prompt above.
- [ ] 🟡 **PASSED WITH POLISH**: Tests pass, but review suggestions are recommended.
- [ ] 🟢 **100% READY TO SHIP**: All tests passed, contracts verified, security checked, and code is architecturally clean. Ready for `/ship_step`.

```

---

## 🚀 Triggers

- `/verify_step`
- `/verify_step [feature-name]`
- `"Verify implementation and run tests"`
- `"Run full quality gate on recent changes"`
```
