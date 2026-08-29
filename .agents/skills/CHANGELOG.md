# 📜 Safe Yatra Skills Changelog & Compatibility Matrix

> **Monorepo**: Safe Yatra (सुरक्षित यात्रा) — SIH 2026  
> **Directory**: `.agents/skills/`  
> **Active Standard**: `version: 2.0`

---

## 🏷️ Skill Version Compatibility Matrix

All 11 skills are maintained in lockstep at **Version 2.0**. Mismatches between skill versions (e.g. running a v1.0 `test_writer` with a v2.0 `verify_step`) are prevented by synchronized frontmatter validation:

| Skill Name          | Version | Role in Lifecycle           | Key Upgrades in v2.0                                                                                                            |
| :------------------ | :-----: | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **`test_writer`**   |  `2.0`  | Stage 1A Test Authoring     | Codebase Mock Catalog (Prisma, Redis, Socket.IO), dual Python templates, WebSocket/Job fixtures, mobile/admin scaffolding rules |
| **`test_runner`**   |  `2.0`  | Stage 1B Test Execution     | CI alignment, expanded failure taxonomy, flaky test diagnostics, coverage script distinctions                                   |
| **`code_reviewer`** |  `2.0`  | Stage 2 Static Architecture | `ok()`/`fail()` response helpers, Prisma camelCase accessors, `AppError` enforcement, Socket.IO room disconnect cleanup         |
| **`verify_step`**   |  `2.0`  | Quality Gate Orchestrator   | Stage 0 Prisma validation, Makefile smoke shortcuts, incremental test path patterns, strict stop gate                           |
| **`create_specs`**  |  `2.0`  | Spec & Branch Provisioner   | Infrastructure Impact section, Git Error Recovery protocol, dual-path spec compatibility (historical vs modular)                |
| **`next_step`**     |  `2.0`  | Atomic Step Planner         | 5-Gate Goldilocks standard with Frontend JSX calibration ($\le 500$ LOC, $\le 4$ files), dynamic roadmap reading                |
| **`plan_step`**     |  `2.0`  | Planning Pipeline           | Seamless chaining of `next_step` + `create_specs`, anti-auto-advance hard stop                                                  |
| **`ship_step`**     |  `2.0`  | Release & Merge Pipeline    | CI status polling (30-60s, 3 retries), PR test metrics embedding, git stash recovery on pull                                    |
| **`update-github`** |  `2.0`  | Git & GitHub Automation     | PR description with test verification summary, CI polling before squash merge, push recovery                                    |
| **`flashback`**     |  `2.0`  | Persistent Memory Ledger    | Self-healing section structure, roadmap sync with root `implementation_plan.md`, `flashback stats` mode                         |
| **`auto_cycle`**    |  `2.0`  | Autonomous Lifecycle Loop   | Calibrated timeouts (12m verify, 8m ship), multi-module detection (backend, ML, mobile, admin), coverage gates                  |

---

## 📅 Version History

### Version 2.0 (2026-08-29) — Monorepo Architecture Alignment

- **Mock Catalog**: Extracted battle-tested mock patterns across 234 Jest tests (`jest.mock('../src/config/database')`, `jest.mock('../src/config/redis')`).
- **Dual Python Pattern**: Split ML engine tests into direct function unit tests (primary) and `httpx.AsyncClient` integration tests.
- **WebSocket & Jobs**: Added dedicated test fixtures for Socket.IO event handlers and background cron schedulers.
- **Response Envelopes**: Enforced strict `ok()` and `fail()` envelope usage from `src/utils/response.ts` across all controllers.
- **Prisma CamelCase**: Enforced runtime accessor casing (`prisma.sOSEvent`, `prisma.volunteerProfile`).
- **CI Synchronization**: Aligned test commands with `.github/workflows/ci.yml` and added CI status check polling before PR merges.
- **Frontend Sizing**: Calibrated 5-Gate Goldilocks limits for React Native and Next.js App Router ($\le 500$ LOC, $\le 4$ files).
- **Self-Healing Ledger**: Enabled automatic header restoration in `.agents/memory/flashback.md`.

### Version 1.0 (2026-08-27) — Initial Scaffolding & Prototype

- Initial custom skills for Safe Yatra hackathon automation.
