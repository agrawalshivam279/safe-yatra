# 🕰️ FLASHBACK — Project Memory & Decision Ledger

> **Project**: Safe Yatra (सुरक्षित यात्रा)  
> **Competition**: Smart India Hackathon (SIH 2026)  
> **Status**: 📋 Phase 0 / Inception & Scaffolding  
> **Last Synchronized**: 2026-08-27  

---

## 1. Executive Status Snapshot

Safe Yatra is a proactive safety ecosystem for India's tourist and pilgrimage sites built across four decoupled modules:

| Module | Stack | Responsibility | Status |
| :--- | :--- | :--- | :--- |
| **`ml-risk-engine`** | Python 3.11 / FastAPI / Scikit-learn | Dynamic danger score engine (0–100) based on weather, terrain, crowd, history | 🏗️ Scaffolding |
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
| **Phase 0** | Developer Tooling & Monorepo Setup | Docker compose, module scaffolding, linting, git hooks | 🟡 In Progress |
| **Phase 1** | Infrastructure Layer | PostGIS + Redis containers verified, environment configs | ⚪ Pending |
| **Phase 2** | Database & Data Models | Prisma schema, PostGIS migrations, seed zones & mock data | ⚪ Pending |
| **Phase 3** | ML Risk Engine | FastAPI scoring service, weather/terrain/crowd models, simulation mode | ⚪ Pending |
| **Phase 4** | Backend Spatial Core | Auth (JWT), PostGIS geofencing engine, SOS matcher, WebSocket hub | ⚪ Pending |
| **Phase 5** | Mobile App (Expo) | Dual-mode navigation, danger zone map overlays, one-touch SOS | ⚪ Pending |
| **Phase 6** | Admin Dashboard (Next.js) | Command center, live SOS dispatch queue, danger heatmaps | ⚪ Pending |
| **Phase 7** | Polish, End-to-End Simulation & Demo | Full SOS loop test, mock trajectory simulator, final SIH pitch deck | ⚪ Pending |

---

## 4. Chronological Activity & Change Log

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
- **Key Files Created / Updated**:
  - [`.agents/skills/flashback/SKILL.md`](file:///d:/SIH%202026/.agents/skills/flashback/SKILL.md)
  - [`.agents/skills/update-github/SKILL.md`](file:///d:/SIH%202026/.agents/skills/update-github/SKILL.md)
  - [`.agents/skills/next_step/SKILL.md`](file:///d:/SIH%202026/.agents/skills/next_step/SKILL.md)
  - [`.agents/skills/create_specs/SKILL.md`](file:///d:/SIH%202026/.agents/skills/create_specs/SKILL.md)
  - [`.agents/skills/code_reviewer/SKILL.md`](file:///d:/SIH%202026/.agents/skills/code_reviewer/SKILL.md)
  - [`.agents/skills/test_runner/SKILL.md`](file:///d:/SIH%202026/.agents/skills/test_runner/SKILL.md)
  - [`.agents/memory/flashback.md`](file:///d:/SIH%202026/.agents/memory/flashback.md)

---

## 5. Technical Constraints & Conventions

- **File Naming**: Strict kebab-case for files and directory names (e.g. `danger-score.ts`, `geo-utils.py`).
- **Coordinate Standard**: Always `[latitude, longitude]` for standard APIs, and `[longitude, latitude]` for GeoJSON specs.
- **Privacy Compliance**: No perpetual storage of user GPS tracking trails; coordinates are streamed ephemerally and purged upon session conclusion.

---

## 6. Deferred Actions & End-of-Project Checklist

- [ ] **Competitive Landscape & Competitor Benchmark Docs (Phase 7 / Final Wrap-up)**:
  - Add explicit competitive analysis matrix to `GEMINI.md` and `implementation_plan.md` comparing Safe Yatra against:
    1. **Commercial Group Safety Apps** (*Life360, Alerto*) — contrast basic circle/geofencing with dynamic ML risk scoring, terrain slope awareness, and volunteer dispatch.
    2. **CCTV & Computer Vision Crowd Analytics** (*CrowdShield*) — contrast central infrastructure vs. tourist-facing mobile app.
    3. **Standard Hackathon Prototypes** — contrast static boundaries with multi-variable hazard fusion (slope + rain + river proximity + crowd).
    4. **Government Helplines** (*112 / 1363*) — contrast reactive voice calls with predictive maps, proactive geofence alerts, and instant GPS locking.
  - Formally document the **Ministry of Tourism 1363 Helpline** alongside 112 in emergency directory references.

