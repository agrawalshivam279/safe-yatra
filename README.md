# 🛡️ Safe Yatra (सुरक्षित यात्रा)

> **Proactive Safety Ecosystem for India's Tourist & Pilgrimage Sites**  
> *Smart India Hackathon (SIH 2026)*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-teal.svg)](https://fastapi.tiangolo.com/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo_51-purple.svg)](https://reactnative.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_PostGIS_3.4-blue.svg)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![CI Status](https://img.shields.io/badge/Tests-538%2F538%20Passed-brightgreen.svg)]()

Safe Yatra is an end-to-end proactive safety ecosystem that **predicts** environmental and crowd hazards, **prevents** accidents through dynamic geofencing, **responds** via instant *Yaatri Mitra* volunteer dispatch with offline SMS fallbacks, and **commands** real-time situational intelligence for disaster response authorities.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SAFE YATRA ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────┐    REST/WS     ┌──────────────────┐    REST     ┌──────────┐ │
│  │  Mobile App   │◄─────────────►│  Backend Spatial  │◄──────────►│ ML Risk  │ │
│  │ (React Native)│               │  (Node.js/Express)│            │  Engine   │ │
│  │               │               │                    │            │ (FastAPI) │ │
│  │ • Tourist UI  │               │ • Auth (JWT)       │            │           │ │
│  │ • Mitra UI    │               │ • SOS Dispatch     │            │ • Danger  │ │
│  │ • Maps/Geo    │               │ • Geofence Engine  │            │   Score   │ │
│  │ • SOS Button  │               │ • User Management  │            │ • Weather │ │
│  │ • Alerts      │               │ • WebSocket Hub    │            │ • Crowd   │ │
│  └──────────────┘               │ • Spatial Queries  │            │ • History │ │
│                                  └────────┬─────────┘            └──────────┘ │
│                                           │                                    │
│                                      WebSocket                                 │
│                                           │                                    │
│                                  ┌────────▼─────────┐                          │
│                                  │  Admin Dashboard   │                          │
│                                  │  (Next.js 14)      │                          │
│                                  │                    │                          │
│                                  │ • Heatmaps         │                          │
│                                  │ • Live SOS Feed    │                          │
│                                  │ • Zone Management  │                          │
│                                  │ • Analytics        │                          │
│                                  └──────────────────┘                          │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ PostgreSQL  │  │   Redis    │  │  Firebase   │  │  Twilio /  │               │
│  │ + PostGIS   │  │  (Cache +  │  │   (FCM +    │  │  MSG91 SMS │               │
│  │             │  │   PubSub)  │  │   Storage)  │  │  Gateway   │               │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 The Four Pillars

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ 1. PREDICT: ML Danger Scoring (0–100) combining Weather, Slope, Crowd, & 10yr History │
│ 2. PREVENT: Real-Time PostGIS Geofencing, 500m Approach Warnings, & Critical Modals  │
│ 3. RESPOND: 3s SOS Panic Trigger, PostGIS 5km Yaatri Mitra Dispatch, & SMS Fallbacks │
│ 4. COMMAND: Operations Command Center, Live SOS Triage, Heatmaps, & Analytical Trends │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Decoupled Monorepo Modules

| Module | Stack | Responsibility | Port |
| :--- | :--- | :--- | :--- |
| **[`backend-spatial/`](./backend-spatial/)** | Node.js 20, Express, Prisma, PostGIS, Socket.IO | Central API gateway, spatial indexing, SOS matcher, WebSocket hub | `3001` |
| **[`ml-risk-engine/`](./ml-risk-engine/)** | Python 3.11+, FastAPI, Scikit-learn, Pydantic | Dynamic Danger Score computation ($0–100$) based on 4-factor risk model | `8000` |
| **[`mobile-app/`](./mobile-app/)** | React Native (Expo 51), TypeScript | Dual-mode interface (Tourists & Yaatri Mitra), offline SMS fallback | `8081` |
| **[`admin-dashboard/`](./admin-dashboard/)** | Next.js 14 (App Router), Tailwind, Mapbox GL | Command center, live distress feed, danger heatmaps, zone overrides | `3000` |

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 20+ & npm
- Python 3.11+

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Spin Up Infrastructure (PostGIS + Redis)
```bash
docker compose up -d
```

### 4. Database Setup & Pre-Seed Golden Data
```bash
cd backend-spatial
npm install
npx prisma db push
npm run seed
```

### 5. Running the Monorepo
Using the root Makefile:
```bash
make up         # Start all Docker services
make test-all   # Run test suites across all modules
make lint       # Run typecheck and linters
```

Or individual services:
```bash
# 1. ML Risk Engine (Python)
cd ml-risk-engine && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# 2. Backend Spatial (Node.js)
cd backend-spatial && npm run dev

# 3. Admin Dashboard (Next.js)
cd admin-dashboard && npm run dev

# 4. Mobile App (Expo)
cd mobile-app && npx expo start
```

---

## 🎬 1-Click SIH Demo Simulation

Safe Yatra includes automated 1-click simulation orchestrators that execute the complete multi-pillar demo sequence:

### Windows (PowerShell)
```powershell
.\scripts\demo-simulation.ps1 -Scenario FullDemo
```

### Linux / macOS (Bash)
```bash
./scripts/demo-simulation.sh full-demo
```

For the official 2-minute judge presentation script and device cues, see **[`docs/SIH_2026_DEMO_SCRIPT.md`](./docs/SIH_2026_DEMO_SCRIPT.md)**.

---

## 🧪 Comprehensive Quality Gate & Test Coverage

Safe Yatra enforces strict quality gates across all 4 modules.

```
Total Test Suites: 59 Passed | 59 Total (100%)
Total Unit & E2E Tests: 538 Passed | 538 Total (100%)
```

| Module | Framework | Test Suites | Tests Passed | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`backend-spatial`** | Jest / Supertest | 29 | 299 / 299 | `✅ 100% Passed` |
| **`ml-risk-engine`** | Pytest / AnyIO | 12 | 81 / 81 | `✅ 100% Passed` |
| **`mobile-app`** | Jest / React Native | 9 | 84 / 84 | `✅ 100% Passed` |
| **`admin-dashboard`** | Vitest / Testing Library | 9 | 74 / 74 | `✅ 100% Passed` |

### Key Invariants Tested:
- **Spatial Coordinate Invariant**: Client `[lat, lng]` $\longleftrightarrow$ PostGIS `[lng, lat]` (`SRID 4326`).
- **PostGIS Geodesic Matcher**: Spherical distance `ST_DWithin` with `::geography` cast ($<50\text{ms}$ latency SLA).
- **Concurrency & Resilience**: 50 simultaneous SOS triggers with zero event drops.
- **Offline SMS Fallback**: Telemetry payload encoding strictly under $60$ characters.

---

## 📖 Master Documentation Directory

- **[`docs/SIH_2026_DEMO_SCRIPT.md`](./docs/SIH_2026_DEMO_SCRIPT.md)** — Official 2-Minute SIH 2026 Presentation Playbook.
- **[`GEMINI.md`](./GEMINI.md)** — Monorepo Architecture Blueprint, Data Models & API Specifications.
- **[`implementation_plan.md`](./implementation_plan.md)** — 7-Phase Development Roadmap & Deliverables Ledger.
- **[`.agents/memory/flashback.md`](./.agents/memory/flashback.md)** — Persistent Project Memory & Architectural Decision Records.
- **[`AGENTS.md`](./AGENTS.md)** — AI Agent Lifecycle Invariants & Anti-Auto-Advance Rules.

---

## 📄 License

MIT License. Designed and engineered for the Smart India Hackathon (SIH 2026).
