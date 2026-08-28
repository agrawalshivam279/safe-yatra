# 🛡️ SAFE YATRA — Master Implementation Plan & Architecture

> **Version**: 1.0.0  
> **Last Updated**: 2026-08-27  
> **Status**: 📋 Planning Phase  
> **Target Competition**: SIH 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Module 1: ML Risk Engine (`ml-risk-engine`)](#4-module-1-ml-risk-engine)
5. [Module 2: Backend Spatial Server (`backend-spatial`)](#5-module-2-backend-spatial-server)
6. [Module 3: Mobile App (`mobile-app`)](#6-module-3-mobile-app)
7. [Module 4: Admin Dashboard (`admin-dashboard`)](#7-module-4-admin-dashboard)
8. [Data Models & Schema Design](#8-data-models--schema-design)
9. [API Contract Specifications](#9-api-contract-specifications)
10. [WebSocket Event Architecture](#10-websocket-event-architecture)
11. [Geofencing & Spatial Algorithm Design](#11-geofencing--spatial-algorithm-design)
12. [SOS Emergency Dispatch Flow](#12-sos-emergency-dispatch-flow)
13. [Developer Simulation & Testing](#13-developer-simulation--testing)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Repository Structure](#15-repository-structure)
16. [Implementation Phases & Timeline](#16-implementation-phases--timeline)
17. [Risk Mitigation & Fallback Strategies](#17-risk-mitigation--fallback-strategies)

---

## 1. Executive Summary

Safe Yatra is a **proactive safety ecosystem** for India's tourist and pilgrimage sites. It comprises **four decoupled, independently deployable modules** that communicate via REST APIs and WebSockets:

| Module | Purpose | Runtime |
|--------|---------|---------|
| `ml-risk-engine` | Predicts danger scores (0–100) from weather, terrain, crowd, and historical data | Python microservice |
| `backend-spatial` | Central API gateway; spatial queries, SOS dispatch, auth, geofencing | Node.js/Express server |
| `mobile-app` | Tourist & Yaatri Mitra interfaces with maps, alerts, SOS | React Native (Expo) |
| `admin-dashboard` | Command center portal with heatmaps, live tracking, zone management | Next.js web app |

### Key Design Principles

- **Predict → Prevent → Respond → Command** (the four pillars)
- **Offline-first**: SMS fallback for SOS, local caching for maps
- **Real-time**: WebSocket-driven live updates across all modules
- **Simulation-ready**: Built-in mock modes for GPS, weather, and multi-role testing
- **Privacy-conscious**: Location data is ephemeral; GPS coordinates are purged after session ends

---

## 2. High-Level Architecture

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
│                                  │  (Next.js)         │                          │
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
│  │ + PostGIS   │  │  (Cache +  │  │   (FCM +    │  │ SMS Gate   │               │
│  │             │  │   PubSub)  │  │   Storage)  │  │            │               │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Communication Patterns

| From → To | Protocol | Purpose |
|-----------|----------|---------|
| Mobile ↔ Backend | REST + WebSocket | Auth, data fetch, real-time alerts, SOS |
| Backend → ML Engine | REST (internal) | Danger score computation requests |
| Backend → Mobile | WebSocket (push) | Geofence alerts, SOS updates, zone changes |
| Backend → Admin | WebSocket (push) | Live SOS feed, heatmap updates |
| Admin → Backend | REST | Zone overrides, broadcast alerts, manual geofences |
| Mobile → SMS Gateway | SMS (fallback) | Offline SOS dispatch |

---

## 3. Tech Stack

### Module-Level Stack

| Module | Language | Framework | Key Libraries |
|--------|----------|-----------|---------------|
| `ml-risk-engine` | Python 3.11+ | FastAPI | scikit-learn, pandas, numpy, httpx, pydantic |
| `backend-spatial` | Node.js 20+ | Express.js | Prisma (ORM), Socket.IO, bull (job queue), jsonwebtoken, turf.js |
| `mobile-app` | TypeScript | React Native (Expo 51) | react-native-maps, expo-location, expo-notifications, socket.io-client |
| `admin-dashboard` | TypeScript | Next.js 14 (App Router) | Leaflet/Mapbox GL JS, Recharts, Socket.IO client, TanStack Query |

### Infrastructure & Services

| Service | Technology | Purpose |
|---------|-----------|---------|
| Primary Database | PostgreSQL 16 + PostGIS 3.4 | Relational data + spatial queries (ST_DWithin, ST_Contains) |
| Cache / PubSub | Redis 7 | Session cache, danger score cache, real-time pub/sub |
| Push Notifications | Firebase Cloud Messaging (FCM) | Mobile push for geofence alerts and SOS |
| File/Audio Storage | Firebase Storage / Cloudinary | SOS audio clips, user profile photos |
| SMS Gateway | Twilio / MSG91 | Offline SOS SMS fallback |
| Weather API | OpenWeatherMap / IMD API | Live meteorological data |
| Maps | Google Maps SDK (mobile), Mapbox GL (admin) | Map rendering and geocoding |
| Containerization | Docker + Docker Compose | Local dev and deployment |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Hosting | Railway / Render / AWS EC2 | Backend + ML Engine hosting |

---

## 4. Module 1: ML Risk Engine

### Directory: `ml-risk-engine/`

### Purpose
A standalone Python microservice that computes a **Dynamic Danger Score (0–100)** for any given geographic coordinate or predefined zone.

### Architecture

```
ml-risk-engine/
├── app/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Environment config, API keys
│   ├── models/
│   │   ├── danger_score.py      # Core scoring algorithm
│   │   ├── weather_model.py     # Weather risk sub-model
│   │   ├── terrain_model.py     # Terrain/topography risk sub-model
│   │   ├── crowd_model.py       # Crowd density risk sub-model
│   │   └── historical_model.py  # Historical incident risk sub-model
│   ├── schemas/
│   │   ├── request.py           # Pydantic request schemas
│   │   └── response.py          # Pydantic response schemas
│   ├── services/
│   │   ├── weather_service.py   # OpenWeatherMap / IMD API integration
│   │   ├── terrain_service.py   # Elevation/slope data (SRTM/OpenTopo)
│   │   ├── crowd_service.py     # Crowd density estimation
│   │   └── incident_service.py  # Historical data queries
│   ├── simulation/
│   │   ├── mock_weather.py      # Mock weather data generator
│   │   ├── mock_terrain.py      # Mock terrain profiles
│   │   └── scenario_loader.py   # Predefined test scenarios (JSON)
│   └── utils/
│       ├── geo_utils.py         # Coordinate helpers
│       └── scoring_utils.py     # Normalization, weighting
├── data/
│   ├── historical_incidents.csv # Seed data: past accidents/floods
│   ├── terrain_profiles.json    # Precomputed terrain data for key sites
│   └── scenarios/               # Test scenario files
│       ├── flash_flood.json
│       ├── stampede_risk.json
│       └── landslide.json
├── tests/
│   ├── test_danger_score.py
│   ├── test_weather_model.py
│   └── test_scenarios.py
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

### Danger Score Algorithm

```
DANGER_SCORE = Σ (Weight_i × NormalizedRisk_i)

Where risk factors and default weights are:

┌─────────────────────┬────────┬──────────────────────────────────────────────┐
│ Factor              │ Weight │ Data Sources                                 │
├─────────────────────┼────────┼──────────────────────────────────────────────┤
│ Weather Risk        │ 0.35   │ Precipitation, wind, visibility, forecasts   │
│ Terrain Risk        │ 0.20   │ Elevation, slope, water proximity             │
│ Crowd Density Risk  │ 0.25   │ Estimated footfall, event calendars           │
│ Historical Risk     │ 0.20   │ Past incidents within 2km radius              │
└─────────────────────┴────────┴──────────────────────────────────────────────┘

Score → Tier Mapping:
  0–25  : 🟢 LOW RISK        — Safe for travel
  26–50 : 🟡 MODERATE CAUTION — Exercise awareness
  51–75 : 🟠 SEVERE HAZARD    — Avoid if possible, proceed with extreme caution
  76–100: 🔴 CRITICAL         — Do Not Enter / Evacuate immediately
```

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/score` | Compute danger score for a single coordinate |
| `POST` | `/api/v1/score/batch` | Compute scores for multiple zones |
| `POST` | `/api/v1/score/zone/{zone_id}` | Compute score for a predefined zone |
| `GET`  | `/api/v1/score/explain/{zone_id}` | Get human-readable justification |
| `POST` | `/api/v1/simulate/override` | **[DEV]** Force mock environmental inputs |
| `GET`  | `/api/v1/simulate/scenarios` | **[DEV]** List available test scenarios |
| `POST` | `/api/v1/simulate/run/{scenario}` | **[DEV]** Execute a test scenario |

### Example Response

```json
{
  "zone_id": "zone_lonavala_waterfall_01",
  "coordinates": { "lat": 18.7546, "lng": 73.4062 },
  "danger_score": 85,
  "tier": "CRITICAL",
  "justification": "Danger Score: 85 — High risk of flash flooding due to heavy upstream rainfall (180mm in last 6hr) and proximity to waterfall edge (12m). Crowd density is moderate (est. 340 persons). Historical: 3 drowning incidents at this location in last 5 years.",
  "factors": {
    "weather": { "score": 92, "weight": 0.35, "details": "Heavy rainfall 180mm/6hr, visibility 200m" },
    "terrain": { "score": 88, "weight": 0.20, "details": "Steep slope 45°, 12m from water body" },
    "crowd":   { "score": 65, "weight": 0.25, "details": "~340 estimated persons, moderate density" },
    "history": { "score": 78, "weight": 0.20, "details": "3 fatal incidents within 2km in 5 years" }
  },
  "computed_at": "2026-08-27T02:00:00Z",
  "ttl_seconds": 300
}
```

---

## 5. Module 2: Backend Spatial Server

### Directory: `backend-spatial/`

### Purpose
Central API gateway and real-time communication hub. Handles authentication, user management, SOS dispatch, geofence management, and WebSocket event broadcasting.

### Architecture

```
backend-spatial/
├── src/
│   ├── index.ts                    # Express app bootstrap
│   ├── config/
│   │   ├── env.ts                  # Environment configuration
│   │   ├── database.ts             # Prisma client singleton
│   │   └── redis.ts                # Redis client
│   ├── middleware/
│   │   ├── auth.ts                 # JWT authentication middleware
│   │   ├── roleGuard.ts            # Role-based access control
│   │   ├── rateLimiter.ts          # API rate limiting
│   │   └── errorHandler.ts         # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.types.ts
│   │   ├── zones/
│   │   │   ├── zone.controller.ts
│   │   │   ├── zone.service.ts     # CRUD + PostGIS spatial queries
│   │   │   ├── zone.routes.ts
│   │   │   └── zone.types.ts
│   │   ├── danger/
│   │   │   ├── danger.controller.ts
│   │   │   ├── danger.service.ts   # Orchestrates calls to ML engine
│   │   │   ├── danger.routes.ts
│   │   │   └── danger.cache.ts     # Redis-backed score caching (TTL 5min)
│   │   ├── sos/
│   │   │   ├── sos.controller.ts
│   │   │   ├── sos.service.ts      # SOS creation + volunteer matching
│   │   │   ├── sos.routes.ts
│   │   │   ├── sos.matcher.ts      # Proximity-based Yaatri Mitra matching
│   │   │   └── sos.sms.ts          # SMS fallback handler
│   │   ├── geofence/
│   │   │   ├── geofence.controller.ts
│   │   │   ├── geofence.service.ts # Geofence CRUD + boundary checks
│   │   │   ├── geofence.routes.ts
│   │   │   └── geofence.engine.ts  # Point-in-polygon + proximity checks
│   │   ├── volunteer/
│   │   │   ├── volunteer.controller.ts
│   │   │   ├── volunteer.service.ts
│   │   │   ├── volunteer.routes.ts
│   │   │   └── volunteer.types.ts
│   │   └── simulation/
│   │       ├── sim.controller.ts   # Mock location, mock SOS endpoints
│   │       ├── sim.service.ts
│   │       └── sim.routes.ts
│   ├── websocket/
│   │   ├── socketServer.ts         # Socket.IO server setup
│   │   ├── handlers/
│   │   │   ├── locationUpdate.ts   # Tourist location streaming
│   │   │   ├── sosEvents.ts        # SOS lifecycle events
│   │   │   ├── dangerAlerts.ts     # Danger score change broadcasts
│   │   │   └── adminEvents.ts      # Admin dashboard events
│   │   └── rooms.ts               # Socket room management (per zone)
│   ├── jobs/
│   │   ├── dangerScoreRefresh.ts   # Cron: refresh danger scores every 5 min
│   │   ├── geofenceCheck.ts        # Check active user positions vs geofences
│   │   └── cleanupExpiredSOS.ts    # Archive resolved SOS events
│   └── utils/
│       ├── spatial.ts              # turf.js wrappers for geo calculations
│       ├── sms.ts                  # Twilio / MSG91 integration
│       └── notifications.ts       # FCM push notification sender
├── prisma/
│   ├── schema.prisma              # Database schema with PostGIS
│   ├── migrations/
│   └── seed.ts                    # Seed data (zones, test users, incidents)
├── tests/
│   ├── auth.test.ts
│   ├── sos.test.ts
│   ├── geofence.test.ts
│   └── simulation.test.ts
├── Dockerfile
├── docker-compose.yml             # Postgres + Redis + Backend
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Key API Routes

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register tourist or volunteer |
| `POST` | `/api/v1/auth/login` | Login (returns JWT) |
| `POST` | `/api/v1/auth/refresh` | Refresh access token |
| `GET`  | `/api/v1/auth/me` | Get current user profile |

#### Danger Scores
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/danger/score?lat=X&lng=Y` | Get danger score for coordinates |
| `GET`  | `/api/v1/danger/zones` | List all zones with current scores |
| `GET`  | `/api/v1/danger/zones/:id` | Get zone detail + score breakdown |
| `GET`  | `/api/v1/danger/briefing/:destination` | Pre-trip safety briefing |

#### SOS
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sos/trigger` | Trigger SOS (body: GPS, battery, audio URL) |
| `PATCH`| `/api/v1/sos/:id/accept` | Volunteer accepts SOS |
| `PATCH`| `/api/v1/sos/:id/resolve` | Mark SOS as resolved |
| `GET`  | `/api/v1/sos/active` | List all active SOS events (admin) |
| `GET`  | `/api/v1/sos/:id` | Get SOS detail + responder info |

#### Geofences
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/geofences` | List all active geofences |
| `POST` | `/api/v1/geofences` | Create geofence polygon (admin) |
| `PUT`  | `/api/v1/geofences/:id` | Update geofence (admin) |
| `DELETE`| `/api/v1/geofences/:id` | Delete geofence (admin) |
| `POST` | `/api/v1/geofences/check` | Check if point is inside any geofence |

#### Volunteers (Yaatri Mitra)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/volunteers/register` | Register as volunteer |
| `PATCH`| `/api/v1/volunteers/status` | Toggle active/inactive |
| `PATCH`| `/api/v1/volunteers/location` | Update current location |
| `GET`  | `/api/v1/volunteers/nearby?lat=X&lng=Y&radius=5000` | Find nearby volunteers |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/admin/broadcast` | Push broadcast alert to sector |
| `PATCH`| `/api/v1/admin/zones/:id/override` | Override danger score manually |
| `GET`  | `/api/v1/admin/analytics` | Aggregated dashboard metrics |
| `GET`  | `/api/v1/admin/heatmap` | Crowd density + danger heatmap data |

#### Simulation (Dev Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sim/location` | Inject mock GPS coordinates |
| `POST` | `/api/v1/sim/trajectory` | Upload GPS trajectory file |
| `POST` | `/api/v1/sim/sos` | Simulate full SOS loop |
| `POST` | `/api/v1/sim/weather-override` | Force weather data override |

---

## 6. Module 3: Mobile App

### Directory: `mobile-app/`

### Purpose
Cross-platform (iOS + Android) mobile application built with React Native (Expo). Provides dual-mode interface for **Tourists** and **Yaatri Mitras**.

### Architecture

```
mobile-app/
├── app/                            # Expo Router (file-based routing)
│   ├── _layout.tsx                 # Root layout with auth context
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── role-select.tsx         # Tourist vs Yaatri Mitra
│   ├── (tourist)/
│   │   ├── _layout.tsx             # Tab navigator
│   │   ├── index.tsx               # Home: Map with danger zones
│   │   ├── alerts.tsx              # Notification history
│   │   ├── briefing.tsx            # Pre-trip safety briefing
│   │   ├── sos.tsx                 # SOS trigger screen
│   │   └── profile.tsx
│   ├── (mitra)/
│   │   ├── _layout.tsx             # Tab navigator
│   │   ├── index.tsx               # Home: Nearby SOS alerts
│   │   ├── active-sos.tsx          # Active rescue navigation
│   │   ├── history.tsx             # Past responses
│   │   └── profile.tsx
│   └── (common)/
│       ├── settings.tsx
│       └── about.tsx
├── components/
│   ├── maps/
│   │   ├── DangerZoneMap.tsx       # Map with color-coded danger polygons
│   │   ├── SOSMarker.tsx           # SOS location marker
│   │   ├── MitraMarker.tsx         # Volunteer location marker
│   │   └── GeofenceOverlay.tsx     # Geofence boundary visualization
│   ├── sos/
│   │   ├── SOSButton.tsx           # Big red panic button component
│   │   ├── SOSConfirmModal.tsx     # Confirmation + audio recording
│   │   ├── SOSStatusTracker.tsx    # Real-time rescue status
│   │   └── SMSFallback.tsx         # Offline SOS via SMS
│   ├── alerts/
│   │   ├── DangerAlert.tsx         # Push notification display
│   │   ├── GeofenceWarning.tsx     # "Turn back" alert modal
│   │   └── BroadcastAlert.tsx      # Admin broadcast display
│   ├── briefing/
│   │   ├── SafetyBriefing.tsx      # Pre-trip safety card
│   │   ├── WeatherCard.tsx
│   │   └── RiskFactorCard.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       └── LoadingSpinner.tsx
├── services/
│   ├── api.ts                      # Axios instance with auth interceptor
│   ├── authService.ts              # Login, register, token refresh
│   ├── dangerService.ts            # Danger score API calls
│   ├── sosService.ts               # SOS trigger and tracking
│   ├── geofenceService.ts          # Geofence data fetching
│   ├── locationService.ts          # Background location tracking
│   ├── notificationService.ts      # FCM setup and handlers
│   └── socketService.ts            # Socket.IO client manager
├── hooks/
│   ├── useLocation.ts              # Location tracking hook
│   ├── useDangerScore.ts           # Real-time danger score updates
│   ├── useSOSStatus.ts             # SOS lifecycle hook
│   ├── useGeofence.ts              # Geofence proximity alerts
│   ├── useSocket.ts                # WebSocket connection hook
│   └── useNetworkStatus.ts         # Online/offline detection
├── context/
│   ├── AuthContext.tsx              # Authentication state
│   ├── LocationContext.tsx          # Location state + permissions
│   └── SocketContext.tsx            # WebSocket connection state
├── utils/
│   ├── smsPayload.ts               # Compress SOS data for SMS
│   ├── audioRecorder.ts            # Short audio clip recording
│   ├── permissions.ts              # Location, notification permissions
│   └── constants.ts                # API URLs, timeout values
├── assets/
│   ├── images/
│   └── sounds/
│       └── sos_alarm.mp3
├── app.json                        # Expo config
├── package.json
├── tsconfig.json
├── .env.example
├── eas.json                        # EAS Build config
└── README.md
```

### Key User Flows

#### Tourist Flow
```
1. Register/Login → Select "Tourist" role
2. Home Screen: Interactive map with color-coded danger zones
3. Background: Location tracked → Geofence checks running
4. IF approaching danger zone → Push notification + in-app modal
5. Pre-Trip: Search destination → View safety briefing
6. Emergency: Tap SOS button → Confirm → GPS locked → Audio option
7. Wait: See real-time tracker showing Yaatri Mitra approaching
```

#### Yaatri Mitra Flow
```
1. Register/Login → Select "Yaatri Mitra" → Verify identity
2. Home Screen: Map showing nearby tourists, toggle active status
3. Receive SOS Alert → See tourist location + distance + route
4. Accept Mission → Navigation opens → Real-time location shared
5. Arrive → Mark as "Reached" → Assist → Mark "Resolved"
```

### Offline / Low-Connectivity Strategy

```
Network Status Detection
        │
        ├── ONLINE: Normal WebSocket + REST operation
        │
        └── OFFLINE or POOR CONNECTIVITY:
            ├── SOS: Construct compressed SMS payload
            │        Format: "SOS|LAT:18.7546|LNG:73.4062|BAT:23%|UID:abc123|T:1693108800"
            │        Send to gateway number via native SMS
            │
            ├── Map: Use cached tile data (last synced zones)
            │
            └── Alerts: Queue locally, sync when reconnected
```

---

## 7. Module 4: Admin Dashboard

### Directory: `admin-dashboard/`

### Purpose
Web-based Command Center portal for government authorities and emergency management agencies.

### Architecture

```
admin-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with sidebar
│   │   ├── page.tsx                  # Dashboard home (overview)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── heatmap/
│   │   │   └── page.tsx             # Full-screen macro heatmap
│   │   ├── sos/
│   │   │   ├── page.tsx             # Live SOS feed
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Individual SOS detail + tracking
│   │   ├── zones/
│   │   │   ├── page.tsx             # Zone list + management
│   │   │   ├── create/
│   │   │   │   └── page.tsx         # Draw new geofence polygon
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Zone detail + score override
│   │   ├── volunteers/
│   │   │   ├── page.tsx             # Volunteer registry
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Volunteer detail + history
│   │   ├── broadcast/
│   │   │   └── page.tsx             # Broadcast alert composer
│   │   └── analytics/
│   │       └── page.tsx             # Historical analytics
│   ├── components/
│   │   ├── maps/
│   │   │   ├── HeatmapLayer.tsx     # Crowd density + danger heatmap
│   │   │   ├── SOSMarkerLive.tsx    # Auto-focusing SOS marker
│   │   │   ├── MitraTracker.tsx     # Volunteer real-time trajectory
│   │   │   ├── ZonePolygon.tsx      # Editable zone polygon
│   │   │   └── GeofenceDrawer.tsx   # Draw geofence on map
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx       # KPI cards (active SOS, tourists, etc.)
│   │   │   ├── SOSFeed.tsx          # Real-time SOS event list
│   │   │   ├── DangerScoreGauge.tsx # Zone danger score visualization
│   │   │   └── VolunteerDeployment.tsx # Volunteer positions map
│   │   ├── charts/
│   │   │   ├── IncidentTimeline.tsx
│   │   │   ├── DangerTrendChart.tsx
│   │   │   └── ResponseTimeChart.tsx
│   │   └── ui/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── DataTable.tsx
│   │       └── AlertBanner.tsx
│   ├── services/
│   │   ├── api.ts                   # Axios instance
│   │   ├── sosService.ts
│   │   ├── zoneService.ts
│   │   ├── analyticsService.ts
│   │   └── socketService.ts
│   ├── hooks/
│   │   ├── useLiveSOSFeed.ts
│   │   ├── useHeatmapData.ts
│   │   ├── useZoneManagement.ts
│   │   └── useSocket.ts
│   └── utils/
│       ├── mapHelpers.ts
│       └── formatters.ts
├── public/
│   └── favicon.ico
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── Dockerfile
└── README.md
```

### Dashboard Features

| Feature | Description | Data Source |
|---------|-------------|------------|
| **Macro Heatmap** | Full-region view with crowd clusters, danger spikes, weather threats | WebSocket (real-time) |
| **Live SOS Feed** | Auto-scrolling list of active emergencies with status badges | WebSocket (real-time) |
| **SOS Auto-Focus** | Map auto-pans to SOS location when triggered; shows tourist + Mitra positions | WebSocket (real-time) |
| **ETA Display** | Shows estimated arrival time of each responding Yaatri Mitra | WebSocket (computed) |
| **Zone Management** | Create, edit, delete geofence polygons; override danger scores | REST API |
| **Broadcast Composer** | Select geographic sector → compose alert → push to all tourists in sector | REST API |
| **Analytics** | Historical incident timeline, avg. response times, volunteer performance | REST API |

---

## 8. Data Models & Schema Design

### PostgreSQL + PostGIS Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

// ─── USER MANAGEMENT ────────────────────────────

enum UserRole {
  TOURIST
  YAATRI_MITRA
  ADMIN
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
}

model User {
  id                String              @id @default(uuid())
  name              String
  email             String              @unique
  phone             String              @unique
  passwordHash      String
  role              UserRole
  profileImageUrl   String?
  isActive          Boolean             @default(true)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relations
  sosTriggered      SOSEvent[]          @relation("SOSTrigger")
  sosResponded      SOSResponse[]
  volunteerProfile  VolunteerProfile?
  locationHistory   UserLocation[]
}

model VolunteerProfile {
  id                 String              @id @default(uuid())
  userId             String              @unique
  user               User                @relation(fields: [userId], references: [id])
  aadharNumber       String?             // ID verification
  verificationStatus VerificationStatus  @default(PENDING)
  isOnDuty           Boolean             @default(false)
  totalResponses     Int                 @default(0)
  avgResponseTime    Int?                // seconds
  rating             Float?              @default(5.0)
  createdAt          DateTime            @default(now())
}

// ─── SPATIAL: USER LOCATION ─────────────────────

model UserLocation {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  // PostGIS POINT geometry stored as: SRID=4326;POINT(lng lat)
  coordinates Unsupported("geometry(Point, 4326)")
  altitude    Float?
  accuracy    Float?
  battery     Int?     // percentage
  timestamp   DateTime @default(now())

  @@index([coordinates], type: Gist)
  @@index([userId, timestamp])
}

// ─── ZONES & GEOFENCES ──────────────────────────

enum DangerTier {
  LOW           // 0-25
  MODERATE      // 26-50
  SEVERE        // 51-75
  CRITICAL      // 76-100
}

model Zone {
  id             String     @id @default(uuid())
  name           String
  description    String?
  // PostGIS POLYGON geometry
  boundary       Unsupported("geometry(Polygon, 4326)")
  dangerScore    Int        @default(0)   // 0-100
  dangerTier     DangerTier @default(LOW)
  justification  String?
  isManualOverride Boolean  @default(false)
  lastScoreUpdate DateTime?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Relations
  incidents      Incident[]
  geofences      Geofence[]

  @@index([boundary], type: Gist)
}

model Geofence {
  id          String   @id @default(uuid())
  zoneId      String?
  zone        Zone?    @relation(fields: [zoneId], references: [id])
  name        String
  type        String   // "AUTO_DANGER" | "MANUAL_NOENTRY" | "ADMIN_OVERRIDE"
  // PostGIS POLYGON geometry
  boundary    Unsupported("geometry(Polygon, 4326)")
  isActive    Boolean  @default(true)
  severity    DangerTier
  message     String?  // Custom alert message
  createdBy   String?  // Admin user ID
  createdAt   DateTime @default(now())
  expiresAt   DateTime?

  @@index([boundary], type: Gist)
}

// ─── SOS EVENTS ─────────────────────────────────

enum SOSStatus {
  TRIGGERED
  MATCHING
  VOLUNTEER_ALERTED
  VOLUNTEER_ACCEPTED
  VOLUNTEER_EN_ROUTE
  VOLUNTEER_ARRIVED
  RESOLVED
  CANCELLED
  EXPIRED
}

model SOSEvent {
  id             String      @id @default(uuid())
  triggeredBy    String
  user           User        @relation("SOSTrigger", fields: [triggeredBy], references: [id])
  // PostGIS POINT
  coordinates    Unsupported("geometry(Point, 4326)")
  altitude       Float?
  battery        Int?
  audioUrl       String?
  status         SOSStatus   @default(TRIGGERED)
  dangerScore    Int?        // Score at time of SOS
  resolvedAt     DateTime?
  cancelledAt    DateTime?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  // Relations
  responses      SOSResponse[]
  timeline       SOSTimeline[]

  @@index([coordinates], type: Gist)
  @@index([status])
}

model SOSResponse {
  id           String   @id @default(uuid())
  sosEventId   String
  sosEvent     SOSEvent @relation(fields: [sosEventId], references: [id])
  volunteerId  String
  volunteer    User     @relation(fields: [volunteerId], references: [id])
  status       String   // "ALERTED" | "ACCEPTED" | "EN_ROUTE" | "ARRIVED" | "DECLINED"
  acceptedAt   DateTime?
  arrivedAt    DateTime?
  // Real-time location during response
  currentLat   Float?
  currentLng   Float?
  etaSeconds   Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SOSTimeline {
  id         String   @id @default(uuid())
  sosEventId String
  sosEvent   SOSEvent @relation(fields: [sosEventId], references: [id])
  event      String   // e.g., "TRIGGERED", "VOLUNTEER_MATCHED", "VOLUNTEER_ACCEPTED"
  details    String?
  timestamp  DateTime @default(now())
}

// ─── HISTORICAL INCIDENTS ───────────────────────

model Incident {
  id          String   @id @default(uuid())
  zoneId      String?
  zone        Zone?    @relation(fields: [zoneId], references: [id])
  type        String   // "DROWNING" | "STAMPEDE" | "LANDSLIDE" | "FLOOD" | "FALL" | "OTHER"
  description String
  // PostGIS POINT
  coordinates Unsupported("geometry(Point, 4326)")
  severity    String   // "MINOR" | "MAJOR" | "FATAL"
  casualties  Int      @default(0)
  occurredAt  DateTime
  source      String?  // "NEWS" | "GOVT_REPORT" | "USER_REPORT"
  createdAt   DateTime @default(now())

  @@index([coordinates], type: Gist)
  @@index([occurredAt])
}

// ─── BROADCAST ALERTS ───────────────────────────

model BroadcastAlert {
  id          String   @id @default(uuid())
  title       String
  message     String
  severity    DangerTier
  // PostGIS POLYGON — target area
  targetArea  Unsupported("geometry(Polygon, 4326)")
  createdBy   String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  expiresAt   DateTime?

  @@index([targetArea], type: Gist)
}
```

---

## 9. API Contract Specifications

### Authentication Headers
All authenticated endpoints require:
```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Standard Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-08-27T02:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "GEOFENCE_VIOLATION",
    "message": "You are attempting to enter a restricted zone",
    "details": { "zone_id": "zone_123", "danger_tier": "CRITICAL" }
  },
  "meta": { ... }
}
```

### Key Payload Examples

#### SOS Trigger Request
```json
POST /api/v1/sos/trigger
{
  "latitude": 18.7546,
  "longitude": 73.4062,
  "altitude": 625.3,
  "battery": 23,
  "audioUrl": "https://storage.example.com/sos-audio/clip_abc.m4a",
  "networkType": "4G",
  "deviceInfo": {
    "model": "Samsung Galaxy A52",
    "os": "Android 14"
  }
}
```

#### SOS Trigger Response
```json
{
  "success": true,
  "data": {
    "sosId": "sos_evt_789",
    "status": "MATCHING",
    "volunteersAlerted": 3,
    "nearestVolunteerETA": 240,
    "dangerScore": 72,
    "message": "SOS received. 3 Yaatri Mitras alerted. Nearest ETA: 4 minutes."
  }
}
```

---

## 10. WebSocket Event Architecture

### Connection & Authentication
```typescript
// Client connects with JWT
const socket = io("wss://api.safeyatra.in", {
  auth: { token: "Bearer <JWT>" },
  query: { role: "TOURIST" | "YAATRI_MITRA" | "ADMIN" }
});
```

### Event Catalog

| Event Name | Direction | Payload | Description |
|-----------|-----------|---------|-------------|
| `location:update` | Client → Server | `{ lat, lng, alt, battery }` | Tourist/Mitra sends location |
| `danger:score_update` | Server → Client | `{ zoneId, score, tier, justification }` | Danger score changed |
| `geofence:alert` | Server → Client | `{ zoneId, tier, message, action }` | User approaching/inside geofence |
| `sos:triggered` | Server → Mitra/Admin | `{ sosId, location, userInfo, distance }` | New SOS event |
| `sos:accepted` | Server → Tourist/Admin | `{ sosId, volunteerId, eta }` | Volunteer accepted |
| `sos:mitra_location` | Server → Tourist/Admin | `{ sosId, volunteerId, lat, lng, eta }` | Mitra real-time position |
| `sos:resolved` | Server → All | `{ sosId, resolvedAt }` | SOS resolved |
| `admin:broadcast` | Server → Tourists | `{ title, message, severity, area }` | Admin broadcast alert |
| `zone:override` | Server → All | `{ zoneId, newScore, newTier }` | Admin score override |

### Socket Room Strategy
```
Rooms:
  zone:{zone_id}      — All users currently in a zone
  sos:{sos_id}         — Participants in an active SOS event
  role:admin           — All admin users
  role:mitra           — All active Yaatri Mitras
  user:{user_id}       — Personal channel for targeted messages
```

---

## 11. Geofencing & Spatial Algorithm Design

### Point-in-Polygon Check (PostGIS)
```sql
-- Check if user is inside any active geofence
SELECT g.id, g.name, g.severity, g.message
FROM "Geofence" g
WHERE g."isActive" = true
  AND ST_Contains(g.boundary, ST_SetSRID(ST_MakePoint($lng, $lat), 4326));
```

### Proximity Alert (Approaching Zone Boundary)
```sql
-- Find geofences within 500m of user
SELECT g.id, g.name, g.severity,
       ST_Distance(
         g.boundary::geography,
         ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
       ) AS distance_meters
FROM "Geofence" g
WHERE g."isActive" = true
  AND ST_DWithin(
    g.boundary::geography,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
    500  -- meters
  )
ORDER BY distance_meters ASC;
```

### Nearest Volunteer Matching (SOS)
```sql
-- Find nearest active, verified volunteers within 5km
SELECT u.id, u.name, u.phone, vp."isOnDuty",
       ST_Distance(
         ul.coordinates::geography,
         ST_SetSRID(ST_MakePoint($sos_lng, $sos_lat), 4326)::geography
       ) AS distance_meters
FROM "User" u
JOIN "VolunteerProfile" vp ON vp."userId" = u.id
JOIN "UserLocation" ul ON ul."userId" = u.id
WHERE u.role = 'YAATRI_MITRA'
  AND vp."isOnDuty" = true
  AND vp."verificationStatus" = 'VERIFIED'
  AND ul.timestamp > NOW() - INTERVAL '10 minutes'
  AND ST_DWithin(
    ul.coordinates::geography,
    ST_SetSRID(ST_MakePoint($sos_lng, $sos_lat), 4326)::geography,
    5000  -- 5km radius
  )
ORDER BY distance_meters ASC
LIMIT 10;
```

---

## 12. SOS Emergency Dispatch Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SOS DISPATCH SEQUENCE                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TOURIST                  BACKEND                YAATRI MITRA    ADMIN       │
│    │                         │                       │             │         │
│    │── Tap SOS Button ──────►│                       │             │         │
│    │   (GPS, battery, audio) │                       │             │         │
│    │                         │                       │             │         │
│    │   ┌─────────────────────┤                       │             │         │
│    │   │ 1. Lock GPS coords  │                       │             │         │
│    │   │ 2. Save SOS event   │                       │             │         │
│    │   │ 3. Upload audio     │                       │             │         │
│    │   │ 4. Get danger score │                       │             │         │
│    │   └─────────────────────┤                       │             │         │
│    │                         │                       │             │         │
│    │                         │── Spatial query ─────►│             │         │
│    │                         │   (find volunteers    │             │         │
│    │                         │    within 5km)        │             │         │
│    │                         │                       │             │         │
│    │                         │── Push SOS alert ────►│             │         │
│    │                         │   (via FCM + WS)      │             │         │
│    │                         │                       │             │         │
│    │                         │── Log to dashboard ──────────────►│           │
│    │                         │   (auto-focus map)    │             │         │
│    │                         │                       │             │         │
│    │                         │── Notify authorities ─────────────────────►   │
│    │                         │   (police + hospital) │             │         │
│    │                         │                       │             │         │
│    │                         │◄─ Accept mission ─────│             │         │
│    │                         │                       │             │         │
│    │◄── "Help is coming" ────│                       │             │         │
│    │    (ETA: 4 min)         │                       │             │         │
│    │                         │                       │             │         │
│    │◄── Live Mitra location ─│◄─ Location stream ───│             │         │
│    │    (real-time updates)  │   (every 5 sec)       │             │         │
│    │                         │                       │             │         │
│    │                         │◄─ "Arrived" ──────────│             │         │
│    │◄── "Rescuer arrived" ───│                       │             │         │
│    │                         │── Update dashboard ──────────────►│           │
│    │                         │                       │             │         │
│    │                         │◄─ "Resolved" ─────────│             │         │
│    │◄── "SOS Resolved" ─────│                       │             │         │
│    │                         │── Close & archive ───────────────►│           │
│    │                         │                       │             │         │
│                                                                              │
│  ┌──── OFFLINE FALLBACK ──────────────────────────────────────────┐          │
│  │  IF network unavailable:                                        │          │
│  │  Tourist → SMS Gateway: "SOS|LAT:18.75|LNG:73.40|BAT:23|U:abc" │          │
│  │  SMS Gateway → Backend: Parse + create SOS event                │          │
│  └────────────────────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Developer Simulation & Testing

### Simulation Modes

#### 1. Mock Location Ingestion
```typescript
// POST /api/v1/sim/location
{
  "userId": "tourist_test_01",
  "coordinates": [
    { "lat": 18.7500, "lng": 73.4000, "timestamp": 0 },
    { "lat": 18.7520, "lng": 73.4030, "timestamp": 30 },  // Moving toward danger zone
    { "lat": 18.7540, "lng": 73.4055, "timestamp": 60 },  // Entering geofence
    { "lat": 18.7546, "lng": 73.4062, "timestamp": 90 }   // Inside critical zone
  ],
  "playbackSpeed": 2  // 2x speed
}
```

#### 2. Environmental Factor Forcing
```typescript
// POST /api/v1/sim/weather-override
{
  "zoneId": "zone_lonavala_01",
  "overrides": {
    "precipitation_mm": 250,
    "wind_speed_kmh": 80,
    "visibility_meters": 100,
    "slope_degrees": 45,
    "water_proximity_meters": 10,
    "crowd_count": 500
  },
  "duration_minutes": 30  // Override expires after 30 min
}
```

#### 3. Multi-Role End-to-End SOS Simulation
```typescript
// POST /api/v1/sim/sos
{
  "scenario": "full_loop",
  "tourist": {
    "userId": "tourist_test_01",
    "location": { "lat": 18.7546, "lng": 73.4062 },
    "battery": 15
  },
  "volunteers": [
    {
      "userId": "mitra_test_01",
      "location": { "lat": 18.7600, "lng": 73.4100 },
      "responseDelay": 10  // seconds to simulate acceptance delay
    },
    {
      "userId": "mitra_test_02",
      "location": { "lat": 18.7700, "lng": 73.4200 },
      "responseDelay": null  // Won't accept
    }
  ],
  "autoResolve": true,
  "resolveAfterSeconds": 120
}
```

### Test Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Unit Tests (ML) | `cd ml-risk-engine && pytest` | Test danger score algorithm |
| Unit Tests (Backend) | `cd backend-spatial && npm test` | Test API routes + services |
| Integration Test | `docker-compose -f docker-compose.test.yml up` | Full ecosystem E2E test |
| SOS Loop Test | `npm run sim:sos-loop` | Simulates Tourist→Backend→Mitra→Admin |
| Geofence Test | `npm run sim:geofence-walk` | Simulates walking into danger zone |
| Load Test | `k6 run tests/load/sos-stress.js` | Concurrent SOS stress test |

---

## 14. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │ ML Engine    │  │ Backend      │  │ Admin        │           │
│  │ (Railway)    │  │ (Railway)    │  │ (Vercel)     │           │
│  │ Python:8000  │  │ Node:3000    │  │ Next.js      │           │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │
│         │                │                  │                   │
│         └────────┬───────┘                  │                   │
│                  │                          │                   │
│         ┌───────▼────────┐                  │                   │
│         │ PostgreSQL     │                  │                   │
│         │ + PostGIS      │◄─────────────────┘                   │
│         │ (Railway/Supabase)                                    │
│         └───────┬────────┘                                      │
│                 │                                                │
│         ┌───────▼────────┐                                      │
│         │ Redis           │                                      │
│         │ (Railway/Upstash)                                     │
│         └────────────────┘                                      │
│                                                                  │
│  EXTERNAL SERVICES:                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Firebase  │ │ Twilio/  │ │OpenWeather│ │ Google   │          │
│  │ FCM +     │ │ MSG91    │ │ Map API   │ │ Maps SDK │          │
│  │ Storage   │ │ (SMS)    │ │           │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### Docker Compose (Local Development)

```yaml
# docker-compose.yml (root)
version: '3.8'

services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: safeyatra
      POSTGRES_USER: safeyatra_user
      POSTGRES_PASSWORD: safeyatra_pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  ml-risk-engine:
    build: ./ml-risk-engine
    ports:
      - "8000:8000"
    environment:
      - OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY}
      - SIMULATION_MODE=true
    depends_on:
      - postgres

  backend-spatial:
    build: ./backend-spatial
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://safeyatra_user:safeyatra_pass@postgres:5432/safeyatra
      - REDIS_URL=redis://redis:6379
      - ML_ENGINE_URL=http://ml-risk-engine:8000
      - JWT_SECRET=${JWT_SECRET}
      - FCM_SERVER_KEY=${FCM_SERVER_KEY}
      - TWILIO_SID=${TWILIO_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - SIMULATION_MODE=true
    depends_on:
      - postgres
      - redis
      - ml-risk-engine

  admin-dashboard:
    build: ./admin-dashboard
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_WS_URL=ws://localhost:3000
    depends_on:
      - backend-spatial

volumes:
  pgdata:
```

---

## 15. Repository Structure

```
safe-yatra/                          # Root repository
├── ml-risk-engine/                  # Module 1: ML Risk Engine (Python/FastAPI)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── simulation/
│   │   └── utils/
│   ├── data/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── backend-spatial/                 # Module 2: Backend Spatial Server (Node/Express)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── user/
│   │   │   ├── zones/
│   │   │   ├── danger/
│   │   │   ├── sos/
│   │   │   ├── geofence/
│   │   │   ├── volunteer/
│   │   │   └── simulation/
│   │   ├── websocket/
│   │   ├── jobs/
│   │   └── utils/
│   ├── prisma/
│   ├── tests/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   └── README.md
│
├── mobile-app/                      # Module 3: Mobile App (React Native/Expo)
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (tourist)/
│   │   ├── (mitra)/
│   │   └── (common)/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   └── README.md
│
├── admin-dashboard/                 # Module 4: Admin Dashboard (Next.js)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   ├── next.config.js
│   └── README.md
│
├── docker-compose.yml               # Full ecosystem orchestration
├── GEMINI.md                        # THIS FILE — Master plan & reference
├── .gitignore
└── README.md                        # Project overview
```

---

## 16. Implementation Phases & Timeline

### Phase 1: Foundation (Week 1–2)
| Task | Module | Priority |
|------|--------|----------|
| Repository init + Docker Compose setup | All | 🔴 Critical |
| PostgreSQL + PostGIS schema + migrations | `backend-spatial` | 🔴 Critical |
| User auth (register, login, JWT) | `backend-spatial` | 🔴 Critical |
| Basic FastAPI server + health check | `ml-risk-engine` | 🔴 Critical |
| Expo project init + navigation setup | `mobile-app` | 🔴 Critical |
| Next.js project init + auth page | `admin-dashboard` | 🟡 Medium |

### Phase 2: Predict & Prevent (Week 3–4)
| Task | Module | Priority |
|------|--------|----------|
| Danger score algorithm (weighted model) | `ml-risk-engine` | 🔴 Critical |
| Weather API integration | `ml-risk-engine` | 🔴 Critical |
| Terrain + historical data models | `ml-risk-engine` | 🟡 Medium |
| Zone CRUD + PostGIS spatial queries | `backend-spatial` | 🔴 Critical |
| Danger score proxy endpoint + Redis cache | `backend-spatial` | 🔴 Critical |
| Geofence engine + boundary checks | `backend-spatial` | 🔴 Critical |
| Interactive danger zone map | `mobile-app` | 🔴 Critical |
| Background location tracking + geofence alerts | `mobile-app` | 🔴 Critical |
| Pre-trip safety briefing screen | `mobile-app` | 🟡 Medium |

### Phase 3: Respond (Week 5–6)
| Task | Module | Priority |
|------|--------|----------|
| SOS event creation + volunteer matching | `backend-spatial` | 🔴 Critical |
| WebSocket server (Socket.IO) | `backend-spatial` | 🔴 Critical |
| FCM push notification integration | `backend-spatial` | 🔴 Critical |
| SMS fallback handler (Twilio) | `backend-spatial` | 🟡 Medium |
| SOS button + confirmation modal | `mobile-app` | 🔴 Critical |
| Audio recording for SOS | `mobile-app` | 🟡 Medium |
| Yaatri Mitra alert screen + navigation | `mobile-app` | 🔴 Critical |
| Real-time SOS tracking (tourist + mitra) | `mobile-app` | 🔴 Critical |
| Offline SMS SOS fallback | `mobile-app` | 🟡 Medium |

### Phase 4: Command (Week 7–8)
| Task | Module | Priority |
|------|--------|----------|
| Heatmap visualization (crowd + danger) | `admin-dashboard` | 🔴 Critical |
| Live SOS feed + auto-focus map | `admin-dashboard` | 🔴 Critical |
| Zone management (create/edit geofences) | `admin-dashboard` | 🔴 Critical |
| Broadcast alert composer | `admin-dashboard` | 🟡 Medium |
| Danger score override controls | `admin-dashboard` | 🟡 Medium |
| Analytics & charts | `admin-dashboard` | 🟢 Low |
| Volunteer registry + management | `admin-dashboard` | 🟢 Low |

### Phase 5: Simulation & Polish (Week 9–10)
| Task | Module | Priority |
|------|--------|----------|
| Mock location ingestion endpoints | `backend-spatial` | 🔴 Critical |
| Weather/terrain override API | `ml-risk-engine` | 🔴 Critical |
| Multi-role SOS simulation | `backend-spatial` | 🔴 Critical |
| End-to-end integration testing | All | 🔴 Critical |
| Performance optimization & load testing | All | 🟡 Medium |
| UI/UX polish + accessibility | `mobile-app` + `admin-dashboard` | 🟡 Medium |
| Documentation + demo preparation | All | 🟡 Medium |

---

## 17. Risk Mitigation & Fallback Strategies

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Weather API rate limits / downtime | Danger scores become stale | Cache last-known data in Redis (TTL 30min); fallback to historical averages |
| GPS inaccuracy indoors/in valleys | False geofence alerts or missed alerts | Use WiFi + cell tower triangulation; widen geofence buffers; allow user to dismiss alerts |
| High concurrent SOS events (mass emergency) | Backend overload | Redis-backed job queue (Bull); horizontal scaling; prioritize by danger score |
| SMS gateway failure | Offline SOS doesn't reach backend | Multi-provider fallback (Twilio → MSG91); retry queue |
| PostGIS spatial query performance | Slow volunteer matching at scale | Spatial index optimization (GiST); limit search radius; Redis geo cache |
| User location tracking battery drain | Users disable location permissions | Use significant location changes; reduce update frequency; educate via in-app tips |
| Volunteer no-show after accepting SOS | Tourist left waiting | Auto-reassign after timeout (3 min no movement); alert next-closest volunteer |
| Admin dashboard WebSocket disconnection | Stale dashboard data | Auto-reconnect with exponential backoff; HTTP polling fallback |

---

## Appendix A: Environment Variables Reference

### `ml-risk-engine/.env`
```env
PORT=8000
OPENWEATHER_API_KEY=your_api_key
DATABASE_URL=postgresql://user:pass@localhost:5432/safeyatra
SIMULATION_MODE=false
LOG_LEVEL=info
```

### `backend-spatial/.env`
```env
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/safeyatra
REDIS_URL=redis://localhost:6379
ML_ENGINE_URL=http://localhost:8000
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FCM_SERVER_KEY=your_fcm_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
SMS_GATEWAY_NUMBER=+919999999999
SIMULATION_MODE=false
```

### `mobile-app/.env`
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3000
EXPO_PUBLIC_MAPS_API_KEY=your_google_maps_key
```

### `admin-dashboard/.env`
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

---

## Appendix B: Key Third-Party API Integrations

| API | Usage | Free Tier |
|-----|-------|-----------|
| [OpenWeatherMap](https://openweathermap.org/api) | Weather data, forecasts, alerts | 1,000 calls/day |
| [Google Maps SDK](https://developers.google.com/maps) | Mobile map rendering, geocoding | $200/month credit |
| [Mapbox GL JS](https://www.mapbox.com/) | Admin dashboard maps, heatmaps | 50,000 loads/month |
| [Firebase (FCM)](https://firebase.google.com/docs/cloud-messaging) | Push notifications | Free (unlimited) |
| [Firebase Storage](https://firebase.google.com/docs/storage) | Audio clip storage | 5GB free |
| [Twilio](https://www.twilio.com/) | SMS gateway for offline SOS | Trial available |
| [OpenTopoData](https://www.opentopodata.org/) | Elevation/terrain data | Free (self-hostable) |

---

> **📌 This document is the single source of truth for the Safe Yatra project.**  
> Update this file as architecture decisions evolve.  
> All module READMEs should reference back to this master plan.

---

*Built with ❤️ for safer tourism in India*
