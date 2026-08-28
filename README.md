# 🛡️ Safe Yatra (सुरक्षित यात्रा)

> **Proactive Safety Ecosystem for India's Tourist & Pilgrimage Sites**  
> *Smart India Hackathon (SIH 2026)*

Safe Yatra is an end-to-end proactive safety platform that predicts environmental and crowd hazards, prevents accidents through dynamic PostGIS geofencing, dispatches nearby *Yaatri Mitra* volunteers during SOS distress calls, and provides command center intelligence to tourism and disaster management authorities.

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

## 📦 Decoupled Monorepo Modules

| Module | Stack | Responsibility | Port |
| :--- | :--- | :--- | :--- |
| **[`backend-spatial/`](./backend-spatial/)** | Node.js 20, Express, Prisma, PostGIS, Socket.IO | Central API gateway, spatial indexing, SOS matcher, WebSocket hub | `3001` |
| **[`ml-risk-engine/`](./ml-risk-engine/)** | Python 3.11+, FastAPI, Scikit-learn, Pydantic | Dynamic Danger Score computation ($0–100$) based on 4-factor risk model | `8000` |
| **[`mobile-app/`](./mobile-app/)** | React Native (Expo 51), TypeScript | Dual-mode interface (Tourists & Yaatri Mitra), offline SMS fallback | `8081` |
| **[`admin-dashboard/`](./admin-dashboard/)** | Next.js 14 (App Router), Tailwind, Mapbox GL | Command center, live distress feed, danger heatmaps, zone overrides | `3000` |

---

## 🚀 Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js 20+ & npm
- Python 3.11+

### 2. Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```

### 3. Spin Up Infrastructure (PostGIS + Redis)
```bash
docker compose up -d
```

### 4. Database Setup & Seed Data
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
# ML Risk Engine (Python)
cd ml-risk-engine && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Backend Spatial (Node.js)
cd backend-spatial && npm run dev

# Admin Dashboard (Next.js)
cd admin-dashboard && npm run dev

# Mobile App (Expo)
cd mobile-app && npx expo start
```

---

## 🧪 Testing Pipeline & Invariants

Safe Yatra enforces automated testing via a **Two-Stage Quality Pipeline**:
1. **Stage 1A (`test_writer`)**: Synthesizes spec-driven tests covering happy paths, edge cases, and spatial coordinate invariants.
2. **Stage 1B (`test_runner`)**: Executes targeted test commands (`pytest` / `npm test`) with $\ge 80\%$ line coverage threshold.
3. **Stage 2 (`code_reviewer`)**: Reviews PostGIS spatial math, atomic SOS concurrency, deep security (SQLi, JWT, rate limits), and performance.

### Spatial Coordinate Invariant:
- **Client & Mobile UI**: `[latitude, longitude]`
- **PostGIS & GeoJSON WKT**: `[longitude, latitude]` (`SRID 4326`)

---

## 📖 Key Documentation

- **[`GEMINI.md`](./GEMINI.md)** — Master implementation plan, architecture, API contracts, and data models.
- **[`implementation_plan.md`](./implementation_plan.md)** — Phased development roadmap and task tracker.
- **[`.agents/memory/flashback.md`](./.agents/memory/flashback.md)** — Project memory ledger and Architecture Decision Records (ADRs).
- **[`AGENTS.md`](./AGENTS.md)** — AI agent workflow invariants and anti-auto-advance stop gates.

---

## 📄 License

MIT License. Designed and developed for the Smart India Hackathon (SIH 2026).
