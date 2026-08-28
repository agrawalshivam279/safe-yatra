# 🕰️ FLASHBACK — Project Memory & Decision Ledger

> **Project**: Safe Yatra (सुरक्षित यात्रा)  
> **Competition**: Smart India Hackathon (SIH 2026)  
> **Status**: 📋 Phase 0 / Inception & Scaffolding  
> **Last Synchronized**: 2026-08-28  

---

## 1. Executive Status Snapshot

Safe Yatra is a proactive safety ecosystem for India's tourist and pilgrimage sites built across four decoupled modules:

| Module | Stack | Responsibility | Status |
| :--- | :--- | :--- | :--- |
| **`ml-risk-engine`** | Python 3.11 / FastAPI / Scikit-learn | Dynamic danger score engine (0–100) based on weather, terrain, crowd, history | 🟡 In Progress |
| **`backend-spatial`** | Node.js 20 / Express / Prisma / Socket.IO | Central API gateway, PostGIS spatial queries, SOS dispatch & geofence engine | 🏗️ Scaffolding |
| **`mobile-app`** | React Native / Expo (TypeScript) | Dual-interface for Tourists and Yaatri Mitra volunteers with offline SOS | 🏗️ Scaffolding |
| **`admin-dashboard`** | Next.js 14 (App Router) / Mapbox / Recharts | Command center portal for real-time monitoring, heatmaps, and zone overrides | 🏗️ Scaffolding |

---

## 2. Architecture Decision Records (ADRs)

### ADR-001: 4-Module Decoupled Architecture
- **Date**: 2026-08-27
- **Status**: Accepted
- **Context**: The system requires fast geospatial computations, ML risk inference, real-time mobile tracking, and high-density admin map dashboards.
- **Decision**: Decouple into 4 standalone modules (`ml-risk-engine`, `backend-spatial`, `mobile-app`, `admin-dashboard`) unified by REST APIs and WebSockets.
- **Consequences**: Independent scalability; allows ML Python ecosystem and Node.js real-time event loops to operate without blocking each other.

### ADR-002: Spatial Database & Caching Layer (PostGIS + Redis)
- **Date**: 2026-08-27
- **Status**: Accepted
- **Context**: Efficient point-in-polygon checks for geofences and spatial indexing (`ST_DWithin`, `ST_Contains`) are mission-critical.
- **Decision**: Use PostgreSQL 16 with PostGIS 3.4 for spatial storage and Redis 7 for real-time pub/sub, live session cache, and danger score TTL caching (5 minutes).
- **Consequences**: High throughput spatial filtering; ephemeral user location data purged after session close for privacy.

### ADR-003: Dynamic Danger Scoring Formula
- **Date**: 2026-08-27
- **Status**: Accepted
- **Context**: Danger scores must balance environmental hazards, geographical slope, footfall congestion, and historical safety incident data.
- **Decision**: Formula `DANGER_SCORE = Σ (Weight_i × NormalizedRisk_i)` with weights:
  - Weather Risk: **0.35**
  - Crowd Density Risk: **0.25**
  - Terrain / Slope Risk: **0.20**
  - Historical Incident Risk: **0.20**
  - Tiers: 0–25 (Low 🟢), 26–50 (Moderate 🟡), 51–75 (Severe 🟠), 76–100 (Critical 🔴).
- **Consequences**: Deterministic, explainable scoring with sub-factor breakdown and human-readable justification.

### ADR-004: Dual-Channel Real-Time Pipeline (REST + Socket.IO)
- **Date**: 2026-08-27
- **Status**: Accepted
- **Context**: Mobile alerts, geofence breaches, and volunteer dispatch must occur with sub-second latency.
- **Decision**: Standard REST endpoints for authentication and queries; Socket.IO rooms partitioned by `zone_id` and `sos_id` for live event broadcasts.
- **Consequences**: Lower server overhead via targeted room broadcasting rather than global broadcasting.

### ADR-005: Dual-Mode Tourist & Yaatri Mitra Mobile App
- **Date**: 2026-08-27
- **Status**: Accepted
- **Context**: Creating two separate mobile apps increases development and maintenance overhead for hackathon timelines.
- **Decision**: Build a single Expo application with role-based navigation switching between Tourist Mode and Yaatri Mitra Volunteer Mode.
- **Consequences**: Shared location tracking and mapping components; single codebase to test and deploy.

### ADR-006: Offline-First SOS Dispatch with SMS Fallback
- **Date**: 2026-08-27
- **Status**: Accepted
- **Context**: Pilgrimage and remote trekking routes frequently suffer from poor or zero internet connectivity.
- **Decision**: If WebSocket / REST connection times out (> 5s), automatically format an encoded SMS payload containing GPS coordinates, timestamp, and battery level via Twilio / MSG91 fallback gateway.
- **Consequences**: Ensures life-saving SOS alerts still reach the dispatch server even in dead zones.

### ADR-007: Goldilocks Task Granularity & Context Budget Standard
- **Date**: 2026-08-28
- **Status**: Accepted
- **Context**: Large multi-file or multi-subsystem implementation tasks overwhelm LLM context windows (>80k tokens), causing attention degradation, missed type checks, and truncated code.
- **Decision**: Enforce the **5-Gate Granularity Standard** in `next_step` (max 3 files, $\le 320$ LOC, single architectural concern, 1 test command, $\ge 40\%$ context headroom). Automatically sub-slice oversized tasks into alphabetical sub-steps (`Step X.Ya`, `Step X.Yb`).
- **Consequences**: High-quality, robust code generation with dedicated headroom for iterative debugging loops and automated code reviews.

### ADR-008: Sequential Thinking MCP for High-Complexity Specifications
- **Date**: 2026-08-28
- **Status**: Accepted
- **Context**: Non-trivial algorithms (dynamic danger score math, PostGIS spatial indexing, transactional SOS state machines) require deep multi-step hypothesis evaluation before code synthesis.
- **Decision**: Equip `create_specs` with heuristics to detect algorithmic and spatial complexity, recommend Sequential Thinking MCP to the user, and embed structured reasoning strategies directly into the generated technical specifications.
- **Consequences**: Prevents logic errors in spatial queries and multi-factor mathematical weights by validating hypotheses upfront.

---

## 3. Implementation Phase Tracker

| Phase | Description | Target / Milestone | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Developer Tooling & Monorepo Setup | Docker compose, module scaffolding, linting, git hooks | 🟢 Completed |
| **Phase 1** | Infrastructure Layer | PostGIS + Redis containers verified, environment configs | 🟢 Completed |
| **Phase 2** | Database & Data Models | Prisma schema, PostGIS migrations, seed zones & mock data | 🟡 In Progress |
| **Phase 3** | ML Risk Engine | FastAPI scoring service, weather/terrain/crowd models, simulation mode | 🟡 In Progress |
| **Phase 4** | Backend Spatial Core | Auth (JWT), PostGIS geofencing engine, SOS matcher, WebSocket hub | ⚪ Pending |
| **Phase 5** | Mobile App (Expo) | Dual-mode navigation, danger zone map overlays, one-touch SOS | ⚪ Pending |
| **Phase 6** | Admin Dashboard (Next.js) | Command center, live SOS dispatch queue, danger heatmaps | ⚪ Pending |
| **Phase 7** | Polish, End-to-End Simulation & Demo | Full SOS loop test, mock trajectory simulator, final SIH pitch deck | ⚪ Pending |

---

## 4. Chronological Activity & Change Log

### [2026-08-29] — Step 3.3a: Weather & Terrain Risk Sub-Models
- **Module**: `ml-risk-engine` / `models`
- **Details**:
  - Implemented `app/models/weather_model.py` with meteorological normalization function `compute_weather_risk(precipitation_mm, wind_speed_kmh, visibility_meters)` ($0–100$, weight: $0.35$).
  - Implemented `app/models/terrain_model.py` with topographical hazard normalization function `compute_terrain_risk(slope_degrees, water_proximity_meters, elevation_meters)` ($0–100$, weight: $0.20$).
  - Built automatic human-readable telemetry justification generators for torrential rain, gale winds, low visibility fog, cliff inclines, water edge proximity, and high altitude terrain.
  - Re-exported functions and weight constants in `app/models/__init__.py`.
  - Authored dynamic unit test suites in `tests/test_weather_model.py` (5/5 tests) and `tests/test_terrain_model.py` (5/5 tests), bringing total passing tests to 24/24.
  - Authored technical specification in `ml-risk-engine/docs/step-3-3a-weather-terrain-models.md`.
- **Key Files Created / Updated**:
  - [`ml-risk-engine/app/models/weather_model.py`](file:///d:/SIH%202026/ml-risk-engine/app/models/weather_model.py)
  - [`ml-risk-engine/app/models/terrain_model.py`](file:///d:/SIH%202026/ml-risk-engine/app/models/terrain_model.py)
  - [`ml-risk-engine/app/models/__init__.py`](file:///d:/SIH%202026/ml-risk-engine/app/models/__init__.py)
  - [`ml-risk-engine/tests/test_weather_model.py`](file:///d:/SIH%202026/ml-risk-engine/tests/test_weather_model.py)
  - [`ml-risk-engine/tests/test_terrain_model.py`](file:///d:/SIH%202026/ml-risk-engine/tests/test_terrain_model.py)
  - [`ml-risk-engine/docs/step-3-3a-weather-terrain-models.md`](file:///d:/SIH%202026/ml-risk-engine/docs/step-3-3a-weather-terrain-models.md)
  - [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-29] — Step 3.2: ML Risk Engine Pydantic Schemas & API Contract
- **Module**: `ml-risk-engine` / `api`
- **Details**:
  - Defined Pydantic v2 request models in `app/schemas/request.py`: `Coordinates`, `SimulationOverrides` (precipitation, wind, visibility, slope, crowd, elevation, water proximity), `ScoreRequest`, `BatchScoreRequest`, and `ZoneScoreRequest`.
  - Defined response models in `app/schemas/response.py`: `DangerTier` enum (`LOW`, `MODERATE`, `SEVERE`, `CRITICAL`), `FactorDetail`, `DangerFactors` ($0.35$ weather, $0.20$ terrain, $0.25$ crowd, $0.20$ history), `CoordinatesModel`, `ScoreResponse`, `BatchScoreResponse`, and `ExplanationResponse`.
  - Enforced coordinate bounds validation ($[-90.0, 90.0]$ latitude, $[-180.0, 180.0]$ longitude), slope degrees ($\le 90^\circ$), non-negative parameters, and ISO 8601 UTC timestamps with 300s TTL envelope matching `GEMINI.md` Section 4.
  - Re-exported all schemas in `app/schemas/__init__.py`.
  - Authored comprehensive test suite in `tests/test_schemas.py` (14/14 unit tests passing).
  - Authored technical specification in `ml-risk-engine/docs/step-3-2-pydantic-schemas.md`.
- **Key Files Created / Updated**:
  - [`ml-risk-engine/app/schemas/request.py`](file:///d:/SIH%202026/ml-risk-engine/app/schemas/request.py)
  - [`ml-risk-engine/app/schemas/response.py`](file:///d:/SIH%202026/ml-risk-engine/app/schemas/response.py)
  - [`ml-risk-engine/app/schemas/__init__.py`](file:///d:/SIH%202026/ml-risk-engine/app/schemas/__init__.py)
  - [`ml-risk-engine/tests/test_schemas.py`](file:///d:/SIH%202026/ml-risk-engine/tests/test_schemas.py)
  - [`ml-risk-engine/docs/step-3-2-pydantic-schemas.md`](file:///d:/SIH%202026/ml-risk-engine/docs/step-3-2-pydantic-schemas.md)
  - [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-29] — Audit Resolution: `test_writer` Skill Creation & Quality Pipeline Hardening
- **Module**: `governance` / `qa` / `workspace`
- **Details**:
  - Addressed Project-Wide & Critical Skills Audit findings:
    1. Resolved `flashback.md` path ambiguity by creating root pointer `flashback.md` and standardizing canonical path `.agents/memory/flashback.md` across all skills and `AGENTS.md`.
    2. Created dedicated [`test_writer`](file:///d:/SIH%202026/.agents/skills/test_writer/SKILL.md) skill (Stage 1A) with spec-driven authoring rules, spatial coordinate invariants (`[lat, lng]` client vs `[lng, lat]` PostGIS), API envelope assertions, multi-framework mocking catalog, and coverage thresholds ($\ge 80\%$ line, $\ge 70\%$ branch, $100\%$ route).
    3. Upgraded [`test_runner`](file:///d:/SIH%202026/.agents/skills/test_runner/SKILL.md) (Stage 1B) with strict sequential handoff from `test_writer`, execution timeouts (60s), and cross-module integration test guidelines.
    4. Integrated **`api_contract_validator`** into [`verify_step`](file:///d:/SIH%202026/.agents/skills/verify_step/SKILL.md) as Stage 0.5 (conditional validation on REST routes/schemas for Zod/Pydantic validation and `ok()`/`fail()` response envelopes).
    5. Integrated **`db_migration_safety`** checklist into [`create_specs`](file:///d:/SIH%202026/.agents/skills/create_specs/SKILL.md) and [`code_reviewer`](file:///d:/SIH%202026/.agents/skills/code_reviewer/SKILL.md) (GiST spatial indexes, SRID 4326 compliance, zero-downtime nullable fields, rollback plan).
    6. Enhanced [`code_reviewer`](file:///d:/SIH%202026/.agents/skills/code_reviewer/SKILL.md) with deep domain security audit (PostGIS SQLi parameterization, JWT validation, SOS endpoint rate limiting, broadcast XSS prevention, audio upload validation) and performance checks (Prisma N+1, spatial bounding limits).
    7. Enhanced [`auto_cycle`](file:///d:/SIH%202026/.agents/skills/auto_cycle/SKILL.md) with stage timeout circuit breakers (30s/15s/120s/60s/90s) and full `test_writer` $\rightarrow$ `test_runner` lifecycle support.
    8. Enhanced `Makefile` with `audit` (`npm audit` & `pip check`) and `check-deploy` (`docker compose` healthchecks).
    9. Provisioned missing module subdirectories per `GEMINI.md` Section 15 and established `.github/workflows/ci.yml`.
- **Key Files Created / Updated**:
  - [`.agents/skills/test_writer/SKILL.md`](file:///d:/SIH%202026/.agents/skills/test_writer/SKILL.md)
  - [`.agents/skills/test_runner/SKILL.md`](file:///d:/SIH%202026/.agents/skills/test_runner/SKILL.md)
  - [`.agents/skills/verify_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/verify_step/SKILL.md)
  - [`.agents/skills/code_reviewer/SKILL.md`](file:///d:/SIH%202026/.agents/skills/code_reviewer/SKILL.md)
  - [`.agents/skills/create_specs/SKILL.md`](file:///d:/SIH%202026/.agents/skills/create_specs/SKILL.md)
  - [`.agents/skills/ship_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/ship_step/SKILL.md)
  - [`.agents/skills/auto_cycle/SKILL.md`](file:///d:/SIH%202026/.agents/skills/auto_cycle/SKILL.md)
  - [`AGENTS.md`](file:///d:/SIH%202026/AGENTS.md)
  - [`flashback.md`](file:///d:/SIH%202026/flashback.md)
  - [`Makefile`](file:///d:/SIH%202026/Makefile)
  - [`.github/workflows/ci.yml`](file:///d:/SIH%202026/.github/workflows/ci.yml)
  - [`README.md`](file:///d:/SIH%202026/README.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-28] — Step 2.3: Database Seed Data Script & PostGIS Spatial Fixtures
- **Module**: `backend-spatial` / `data`
- **Details**:
  - Authored `backend-spatial/prisma/seed.ts` seeding 3 test users (`TOURIST`, `YAATRI_MITRA` on-duty verified, `ADMIN`) with bcrypt password hashes.
  - Seeded 5 Lonavala pilgrimage & trekking zones (Bhushi Dam, Tiger Point, Karla Caves, Rajmachi Fort, Khandala Ghat) with SRID 4326 PostGIS polygon boundaries, danger scores (18–85), and justifications.
  - Seeded 3 geofence boundaries (CRITICAL, SEVERE, LOW) and 10 historical incidents (drowning, landslide, fall, flood, stampede) with PostGIS Point coordinates.
  - Seeded 2 broadcast alerts (active monsoon warning polygon and expired wind advisory).
  - Authored comprehensive test suite in `tests/seed.test.ts` (11/11 tests passing) verifying WKT polygon closure, coordinate bounding boxes, and bcrypt password hashing.
  - Authored technical specification in `backend-spatial/docs/step-2-3-database-seed-data.md`.
- **Key Files Created / Updated**:
  - [`backend-spatial/prisma/seed.ts`](file:///d:/SIH%202026/backend-spatial/prisma/seed.ts)
  - [`backend-spatial/tests/seed.test.ts`](file:///d:/SIH%202026/backend-spatial/tests/seed.test.ts)
  - [`backend-spatial/docs/step-2-3-database-seed-data.md`](file:///d:/SIH%202026/backend-spatial/docs/step-2-3-database-seed-data.md)
  - [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-28] — Step 2.2: Prisma PostGIS Spatial Schema & Models
- **Module**: `backend-spatial` / `data`
- **Details**:
  - Installed `backend-spatial` dependencies including `@prisma/client`, `prisma`, `ts-jest`, and `@turf/turf`.
  - Defined all 10 core entity models (`User`, `VolunteerProfile`, `UserLocation`, `Zone`, `Geofence`, `SOSEvent`, `SOSResponse`, `SOSTimeline`, `Incident`, `BroadcastAlert`) with PostGIS geometry fields (`Point` & `Polygon`, SRID 4326).
  - Defined 4 core state machine enums (`UserRole`, `VerificationStatus`, `DangerTier`, `SOSStatus`).
  - Configured GiST spatial indexes on all geometry columns (`@@index([...], type: Gist)`).
  - Configured `jest.config.js` and authored test suite in `tests/schema.test.ts` (5/5 tests passing).
  - Authored technical specification in `backend-spatial/docs/step-2-2-prisma-postgis-schema.md`.
- **Key Files Created / Updated**:
  - [`backend-spatial/prisma/schema.prisma`](file:///d:/SIH%202026/backend-spatial/prisma/schema.prisma)
  - [`backend-spatial/tests/schema.test.ts`](file:///d:/SIH%202026/backend-spatial/tests/schema.test.ts)
  - [`backend-spatial/jest.config.js`](file:///d:/SIH%202026/backend-spatial/jest.config.js)
  - [`backend-spatial/docs/step-2-2-prisma-postgis-schema.md`](file:///d:/SIH%202026/backend-spatial/docs/step-2-2-prisma-postgis-schema.md)
  - [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-28] — Step 1.1: Infrastructure Layer & Environment Configuration
- **Module**: `infra` / `cross-module`
- **Details**:
  - Authored master `.env.example` catalog at root defining all DB, Redis, JWT, ML engine, Mapbox, and messaging keys.
  - Provisioned module-specific `.env.example` templates for `backend-spatial`, `ml-risk-engine`, `admin-dashboard`, and `mobile-app`.
  - Updated `.gitignore` with strict `.env*` exclusion patterns while preserving all `.env.example` templates.
  - Authored technical specification in `docs/specs/step-1-1-infra-env-setup.md`.
- **Key Files Created / Updated**:
  - [`.env.example`](file:///d:/SIH%202026/.env.example)
  - [`backend-spatial/.env.example`](file:///d:/SIH%202026/backend-spatial/.env.example)
  - [`ml-risk-engine/.env.example`](file:///d:/SIH%202026/ml-risk-engine/.env.example)
  - [`admin-dashboard/.env.example`](file:///d:/SIH%202026/admin-dashboard/.env.example)
  - [`mobile-app/.env.example`](file:///d:/SIH%202026/mobile-app/.env.example)
  - [`.gitignore`](file:///d:/SIH%202026/.gitignore)
  - [`docs/specs/step-1-1-infra-env-setup.md`](file:///d:/SIH%202026/docs/specs/step-1-1-infra-env-setup.md)
  - [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-28] — Step 0.3: Monorepo Code Quality & Workspace Tooling
- **Module**: `infra` / `workspace`
- **Details**:
  - Authored `.editorconfig` with cross-editor formatting rules (2-space TS/JS/JSON, 4-space Python, LF endings, trimmed trailing whitespace).
  - Configured `prettier.config.js` and `.prettierignore` for monorepo code consistency.
  - Implemented root `Makefile` with developer shortcuts (`up`, `down`, `logs`, `db-reset`, `test-all`, `lint`, `format-check`, `help`).
  - Authored technical specification in `docs/specs/step-0-3-code-quality-tooling.md`.
  - Phase 0 (Developer Environment and Tooling Setup) complete.
- **Key Files Created / Updated**:
  - [`.editorconfig`](file:///d:/SIH%202026/.editorconfig)
  - [`prettier.config.js`](file:///d:/SIH%202026/prettier.config.js)
  - [`.prettierignore`](file:///d:/SIH%202026/.prettierignore)
  - [`Makefile`](file:///d:/SIH%202026/Makefile)
  - [`docs/specs/step-0-3-code-quality-tooling.md`](file:///d:/SIH%202026/docs/specs/step-0-3-code-quality-tooling.md)
  - [`implementation_plan.md`](file:///d:/SIH%202026/implementation_plan.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

### [2026-08-28] — GitHub Repository Initialization & PR #1 Merge
- **Module**: `infra` / `workspace`
- **Details**:
  - Initialized git repository on `main` and created dedicated remote repository `agrawalshivam279/safe-yatra` on GitHub.
  - Pushed initial project monorepo baseline containing `admin-dashboard`, `backend-spatial`, `ml-risk-engine`, and `mobile-app` scaffolding.
  - Created feature branch `docs/deferred-competitive-landscape` containing `.agents` skills suite and updated `flashback.md`.
  - Opened and squash-merged Pull Request #1 (`docs: log end-of-project reminder for competitive analysis in flashback (#1)`).
  - Maintained remote branch `origin/docs/deferred-competitive-landscape` intact and synced local `main`.
- **Key Files Created / Updated**:
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)
  - [`.gitignore`](file:///d:/SIH%202026/.gitignore)
- **PR & Commit Reference**:
  - Pull Request: [#1 (Merged)](https://github.com/agrawalshivam279/safe-yatra/pull/1)
  - Squash Merge Commit: `874d7d2`

### [2026-08-27] — Architecture Blueprint & Custom Tooling Setup
- **Module**: `infra` / `workspace`
- **Details**:
  - Established master architecture specification in `GEMINI.md`.
  - Authored step-by-step ordered implementation guide in `implementation_plan.md`.
  - Configured Antigravity workspace customization structure (`.agents/skills/` and `.agents/memory/`).
  - Created `flashback` custom command and living memory ledger.
  - Created `update-github` automated Git & PR push workflow with < 100 character commit rules and remote branch retention.
  - Created `next_step` atomic task planner command to break down implementation into high-quality bite-sized steps.
  - Created `code_reviewer` custom quality inspector skill with actionable code suggestions and auto-fix prompt generation.
  - Created `test_runner` sequential testing pipeline with `test_writer` and `test_runner` subagents for dynamic behavioral verification.
  - Upgraded `next_step` to mandatorily consult `GEMINI.md`, `implementation_plan.md`, and `flashback.md` and hand off to `create_specs`.
  - Created `create_specs` custom skill for clean git status checking, branch provisioning (`git checkout -b feat/...`), and production-grade technical specification markdown authoring.
  - Calibrated `next_step` with the **5-Gate Goldilocks Task Granularity Standard** for 40-50% context headroom.
  - Enhanced `create_specs` with **Sequential Thinking MCP Decision Heuristics** and reasoning strategy templates for high-complexity spatial and ML features.
  - Created **`plan_step`** automation skill unifying task discovery, branch provisioning, and specification authoring.
  - Created **`verify_step`** automation skill uniting dynamic test suites (`test_writer` ➔ `test_runner`) with static architecture reviews (`code_reviewer`).
  - Created **`ship_step`** automation skill automating memory ledger sync, GitHub PR creation, squash merge, remote branch preservation, and next-task queuing.
  - Created **`auto_cycle`** master orchestrator skill for end-to-end autonomous feature lifecycles with guarded safety checkpoints and context-window monitoring.
- **Key Files Created / Updated**:
  - [`.agents/skills/flashback/SKILL.md`](file:///d:/SIH%202026/.agents/skills/flashback/SKILL.md)
  - [`.agents/skills/update-github/SKILL.md`](file:///d:/SIH%202026/.agents/skills/update-github/SKILL.md)
  - [`.agents/skills/next_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/next_step/SKILL.md)
  - [`.agents/skills/create_specs/SKILL.md`](file:///d:/SIH%202026/.agents/skills/create_specs/SKILL.md)
  - [`.agents/skills/code_reviewer/SKILL.md`](file:///d:/SIH%202026/.agents/skills/code_reviewer/SKILL.md)
  - [`.agents/skills/test_runner/SKILL.md`](file:///d:/SIH%202026/.agents/skills/test_runner/SKILL.md)
  - [`.agents/skills/plan_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/plan_step/SKILL.md)
  - [`.agents/skills/verify_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/verify_step/SKILL.md)
  - [`.agents/skills/ship_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/ship_step/SKILL.md)
  - [`.agents/skills/auto_cycle/SKILL.md`](file:///d:/SIH%202026/.agents/skills/auto_cycle/SKILL.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

---

## 5. Technical Constraints & Conventions

- **File Naming**: Strict kebab-case for files and directory names (e.g. `danger-score.ts`, `geo-utils.py`).
- **Coordinate Standard**: Always `[latitude, longitude]` for standard APIs, and `[longitude, latitude]` for GeoJSON specs.
- **Privacy Compliance**: No perpetual storage of user GPS tracking trails; coordinates are streamed ephemerally and purged upon session conclusion.

---

## 6. Deferred Actions & End-of-Project Checklist

- [ ] **Mobile Accessibility Audit (Phase 5 — Mobile App)**:
  - Verify `accessible={true}`, accessibility labels on the big red panic button (`SOSButton.tsx`), high-contrast danger zone colors (accessible to colorblind users), and screen reader announcements for emergency geofence breach modals during Phase 5 implementation.

- [ ] **Pre-Demo Dependency & Deployment Audit (Phase 7 — Step 7.6)**:
  - Run `make audit` (`npm audit --audit-level=high` & `pip check`) across all 4 module packages.
  - Run `make check-deploy` to confirm fresh-machine Docker Compose bootstrap (`pg_isready`, Redis `ping`, and database migrations).

- [ ] **Competitive Landscape & Competitor Benchmark Docs (Phase 7 / Final Wrap-up)**:
  - Add explicit competitive analysis matrix to `GEMINI.md` and `implementation_plan.md` comparing Safe Yatra against:
    1. **Commercial Group Safety Apps** (*Life360, Alerto*) — contrast basic circle/geofencing with dynamic ML risk scoring, terrain slope awareness, and volunteer dispatch.
    2. **CCTV & Computer Vision Crowd Analytics** (*CrowdShield*) — contrast central infrastructure vs. tourist-facing mobile app.
    3. **Standard Hackathon Prototypes** — contrast static boundaries with multi-variable hazard fusion (slope + rain + river proximity + crowd).
    4. **Government Helplines** (*112 / 1363*) — contrast reactive voice calls with predictive maps, proactive geofence alerts, and instant GPS locking.
  - Formally document the **Ministry of Tourism 1363 Helpline** alongside 112 in emergency directory references.

