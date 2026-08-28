# SAFE YATRA - Step-by-Step Implementation Guide

Purpose: A developer-facing, ordered guide for building Safe Yatra with minimal refactoring.
Philosophy: Build from the inside out — infrastructure then data then API contracts then backend logic then frontend consumers.
Cross-reference the full architecture in GEMINI.md at any point.

---

## HOW TO USE THIS GUIDE

Each Phase is a self-contained milestone. Each Step within a phase has:
- A clear goal (what you're building)
- Why now (why this order avoids future refactoring)
- A checklist of concrete tasks

IMPORTANT: Do NOT skip ahead to frontend work before the backend API contracts are finalized (Steps in Phase 4). Doing so will cause heavy mobile/dashboard refactoring when APIs stabilize.

TIP: After completing each Phase, run all tests before moving on. Bugs caught early cost 10x less to fix.

---

## OVERVIEW: THE BUILD ORDER

Phase 0 -- Phase 1 -- Phase 2 -- Phase 3 -- Phase 4 -- Phase 5 -- Phase 6 -- Phase 7
  Dev       Infra    Data      ML        Backend   Mobile    Admin     Polish and
  Setup     Layer    Layer     Engine    Core      App       Dashboard  Demo

The frontend modules (Mobile App, Admin Dashboard) are built LAST, after the API and WebSocket contracts are locked in. This is the single most important decision to avoid rework.

---

## PHASE 0 - Developer Environment and Tooling Setup
Duration: Half a day
Goal: Every dev can run the project from scratch in 10 minutes.

### Why Now?
Getting tooling right before writing a single line of business logic prevents 'works on my machine' issues and ensures consistent code style across the project.

### 0.1 - Install Prerequisites

- [ ] Install Node.js 20+ (use nvm or fnm for version management)
- [ ] Install Python 3.11+ (use pyenv for version management)
- [ ] Install Docker Desktop (for PostgreSQL + Redis)
- [ ] Install Git and configure with your GitHub account
- [ ] Install VS Code with extensions: ESLint, Prettier, Prisma, Python, Tailwind CSS IntelliSense, REST Client
- [ ] Install global CLI tools:
      npm install -g expo-cli eas-cli tsx
      pip install uv

### 0.2 - Repository Initialization

- [ ] Initialize Git in your workspace:
      git init
      git add .
      git commit -m "chore: initialize Safe Yatra monorepo structure"
- [ ] Create a GitHub repository safe-yatra and push:
      git remote add origin https://github.com/your-username/safe-yatra.git
      git push -u origin main
- [ ] Create branch protection on main -- require PRs for all changes.
- [ ] Create a dev branch for active development:
      git checkout -b dev

### 0.3 - Code Quality Tooling

- [x] Create a root .editorconfig for consistent indentation across all editors.
- [x] Add Prettier config at root (prettier.config.js) and .prettierignore.
- [x] For the backend and dashboard: set up ESLint with @typescript-eslint.
- [x] For the ML engine: set up Ruff (fast Python linter): cd ml-risk-engine and pip install ruff
- [x] Add a root Makefile with shortcuts for: up, down, logs, db-reset, test-all, lint, format-check

### Phase 0 Exit Criteria
- docker-compose up -d runs without errors.
- All four module directories exist with their scaffold files.
- Git is initialized and pushed to GitHub.

---

## PHASE 1 - Infrastructure Layer
Duration: 1 day
Goal: The database, cache, and messaging backbone is running and verified.

### Why Now?
Every single module depends on PostgreSQL and Redis. Setting these up first with the correct PostGIS extensions means you never have to re-run migrations to add a missed spatial extension later.

### 1.1 - Launch Local Infrastructure via Docker

- [ ] Start services: docker-compose up -d postgres redis
- [ ] Verify PostGIS:
      docker exec -it safeyatra-db psql -U safeyatra_user -d safeyatra -c "CREATE EXTENSION IF NOT EXISTS postgis; SELECT PostGIS_Version();"
- [ ] Verify Redis:
      docker exec -it safeyatra-redis redis-cli ping
      (Should return PONG)

### 1.2 - Configure Environment Files

- [x] Copy all .env.example files to .env in each module:
      cp ml-risk-engine/.env.example ml-risk-engine/.env
      cp backend-spatial/.env.example backend-spatial/.env
      cp mobile-app/.env.example mobile-app/.env
      cp admin-dashboard/.env.example admin-dashboard/.env
- [x] Verify all four .env files are in .gitignore.
- [x] Add a root .env.example documenting every required secret across all modules.

### 1.3 - Set Up External Accounts (Free Tiers)

Do this now so API keys are available when you start coding integrations.

  Service               | What to Create                        | Where Used
  ----------------------|---------------------------------------|----------------------
  OpenWeatherMap        | Free API key                          | ml-risk-engine
  Firebase              | Project + FCM key + Storage bucket    | backend-spatial, mobile-app
  Twilio                | Trial account + phone number          | backend-spatial
  Google Maps Platform  | Maps SDK key (Android + iOS)          | mobile-app
  Mapbox                | Public access token                   | admin-dashboard

- [ ] Paste all obtained keys into the respective .env files.
- [ ] Store a backup of all keys in a password manager (NOT in the repo!).

### Phase 1 Exit Criteria
- PostgreSQL with PostGIS is running; can connect and create tables.
- Redis is running and responding to PING.
- All .env files are populated with real or placeholder keys.

---

## PHASE 2 - Data Layer (Database Schema)
Duration: 1 day
Goal: The complete, final database schema is migrated and seeded.

### Why Now?
Schema comes before backend logic. If you write service code before finalizing the schema, every model change forces you to rewrite type definitions, queries, and tests. Lock the schema first.

### 2.1 - Install Backend Dependencies

- [x] Install backend dependencies in backend-spatial (Prisma, Express, TypeScript, Turf, Zod, Jest, ts-jest).

### 2.2 - Finalize and Migrate the Prisma Schema

- [x] Open backend-spatial/prisma/schema.prisma
- [x] Verify it contains ALL models from GEMINI.md section 8:
      User, VolunteerProfile, UserLocation
      Zone, Geofence, BroadcastAlert
      SOSEvent, SOSResponse, SOSTimeline
      Incident
- [x] Confirm PostGIS geometry fields use Unsupported("geometry(Point, 4326)") syntax and GiST indexes.
- [ ] Run the first migration:
      npx prisma migrate dev --name "init_schema"
- [ ] Verify tables exist:
      npx prisma studio

### 2.3 - Write and Run the Seed Script

- [x] Create backend-spatial/prisma/seed.ts with:
      - 3 test users: one Tourist, one Yaatri Mitra (verified, on-duty), one Admin
      - 5 zones covering Lonavala (lat: 18.75, lng: 73.40) with varying danger scores
      - 3 geofences: one LOW, one SEVERE, one CRITICAL
      - 10 historical incidents: drowning, stampede, landslide types
      - 2 broadcast alerts: one active, one expired
- [x] Author seed test suite in tests/seed.test.ts validating WKT polygons, closed rings, coordinate bounds, and bcrypt password hashing (11/11 tests passing).


### 2.4 - Generate Spatial Indexes

- [ ] Verify GiST indexes exist on geometry columns:
      SELECT indexname FROM pg_indexes WHERE tablename IN ('UserLocation','Zone','Geofence','SOSEvent');
- [ ] If missing, add them via a new migration.

### Phase 2 Exit Criteria
- All 10 models exist in the database with correct columns.
- Seed data is inserted and viewable in Prisma Studio.
- Spatial indexes are confirmed on geometry columns.

---

## PHASE 3 - ML Risk Engine (Core Scoring Logic)
Duration: 2-3 days
Goal: A working /api/v1/score endpoint that returns a real danger score.

### Why Now?
The backend's danger module calls the ML engine via HTTP. You need the ML engine's API contract locked before writing the backend's orchestration layer.

### 3.1 - Set Up Python Environment

  cd ml-risk-engine
  python -m venv venv
  venv\Scripts\activate
  pip install -r requirements.txt

### 3.2 - Define Pydantic Schemas FIRST (API Contract)

IMPORTANT: Define schemas BEFORE writing model logic. Schemas are your API contract.

- [x] Create app/schemas/request.py:
      class ScoreRequest(BaseModel):
          lat: float
          lng: float
          zone_id: Optional[str] = None
          simulation_overrides: Optional[SimulationOverrides] = None

      class SimulationOverrides(BaseModel):
          precipitation_mm: Optional[float] = None
          wind_speed_kmh: Optional[float] = None
          visibility_meters: Optional[float] = None
          slope_degrees: Optional[float] = None
          water_proximity_meters: Optional[float] = None
          crowd_count: Optional[int] = None

- [x] Create app/schemas/response.py with ScoreResponse matching GEMINI.md section 4:
      Fields: danger_score, tier, justification, factors (with weather/terrain/crowd/history breakdowns)
- [x] Author unit tests in tests/test_schemas.py (14/14 tests passing).

### 3.3 - Implement the Four Sub-Models

Build each as a pure Python function in app/models/ (no external HTTP calls yet):

- [x] weather_model.py -- Input: precipitation_mm, wind_kmh, visibility_m. Output: normalized score 0-100.
      Formula: score = min(100, (precip/200)*60 + (wind/150)*25 + (1 - visibility/10000)*15)
- [x] terrain_model.py -- Input: slope_degrees, water_proximity_m, altitude_m. Output: score 0-100.
      Logic: Higher slope + closer to water = higher score.
- [x] crowd_model.py -- Input: crowd_count, area_sqm. Output: score 0-100.
      Logic: Derive density figure, map to score tiers.
- [x] historical_model.py -- Input: lat, lng, radius. Query DB for Incident records, weigh by recency and severity.

### 3.4 - Implement the Aggregator in danger_score.py

- [x] Implement linear convex combination: `DANGER_SCORE = 0.35*weather + 0.20*terrain + 0.25*crowd + 0.20*history`.
- [x] Implement `score_to_tier(score)` mapping:
      0-25:   LOW
      26-50:  MODERATE
      51-75:  SEVERE
      76-100: CRITICAL
- [x] Implement `build_justification(danger_score, tier, factors, custom_summary)` generating plain-English briefings.
- [x] Implement `generate_recommendations(tier, factors)` generating context-aware safety advisory items.
- [x] Author comprehensive test suite in `tests/test_danger_score.py` (6/6 tests passing).

### 3.5 - Implement External Data Services

- [x] weather_service.py: Call OpenWeatherMap API with coordinate quantization, in-memory TTL caching (300s), and fallback defaults (100% line coverage).
- [x] terrain_service.py: Precomputed offline terrain profiles in data/terrain_profiles.json with Haversine nearest-neighbor matching, OpenTopoData API integration, and fallback defaults (100% line coverage).
- [x] crowd_service.py: Diurnal tourist footfall curve (hour-of-day IST peak curves + weekend multipliers) and pilot site baseline capacity profiles (100% line coverage).
- [x] incident_service.py: Query historical incidents from data/historical_incidents.csv with Haversine spatial proximity filtering (2.0km) and recency decay (100% line coverage).

### 3.6a - Wire Up Core FastAPI Scoring Routers

- [x] Create app/routes/score.py:
      POST /api/v1/score -- calls all services, aggregator, returns ScoreResponse
      POST /api/v1/score/batch -- loops over list of coordinates concurrently
      POST /api/v1/score/zone/{zone_id} -- resolves precomputed zone and computes score
      GET  /api/v1/score/explain/{zone_id} -- returns detailed breakdown & recommendations
- [x] Mount score_router in app/main.py under /api/v1 prefix.
- [x] Author comprehensive unit & integration tests in tests/test_score_router.py (9/9 tests passing).

### 3.6b - Implement Simulation & Scenario Execution Routers

- [x] Create app/routes/simulation.py:
      POST /api/v1/simulate/override -- accepts SimulationOverrides, bypasses real API calls
      GET  /api/v1/simulate/scenarios -- lists available test scenarios
      POST /api/v1/simulate/run/{scenario} -- loads JSON from data/scenarios/ and returns simulated scores
- [x] Mount simulation_router in app/main.py under /api/v1/simulate prefix.
- [x] Author comprehensive unit & integration tests in tests/test_simulation_router.py (8/8 tests passing).

### 3.7 - Write Scenario Test Files

- [x] data/scenarios/flash_flood.json: precipitation_mm=250, water_proximity_meters=5 -- CRITICAL tier
- [x] data/scenarios/stampede_risk.json: crowd_count=12000, slope=45° -- SEVERE/CRITICAL tier
- [x] data/scenarios/landslide.json: precipitation_mm=220, slope=75° -- SEVERE/CRITICAL tier
- [x] data/scenarios/all_clear.json: all low baseline values -- LOW tier

### 3.8 - Test the ML Engine

  uvicorn app.main:app --reload --port 8000

- [ ] POST http://localhost:8000/api/v1/score with {"lat": 18.75, "lng": 73.40}
- [ ] POST http://localhost:8000/api/v1/simulate/override with flash flood overrides
- [ ] Verify response JSON matches schema in GEMINI.md section 4
- [ ] Write tests/test_danger_score.py with pytest unit tests for each sub-model

### Phase 3 Exit Criteria
- POST /api/v1/score returns valid ScoreResponse with all four factor breakdowns.
- Simulation override endpoint forces CRITICAL tier when expected.
- All pytest tests pass.

---

## PHASE 4 - Backend Spatial: Core API (Auth, Zones, Danger, SOS)
Duration: 4-5 days
Goal: A fully tested REST + WebSocket API covering all four pillars.

### Why Now?
Build backend before frontend. Every mobile screen and dashboard component maps to at least one backend endpoint. Lock the API here -- mobile and admin just consume it.

### 4.1 - Project Bootstrap and Config

  cd backend-spatial && npm install

- [x] Create src/config/env.ts -- typed env variable parser using zod:
      const envSchema = z.object({
        PORT: z.coerce.number().default(3000),
        DATABASE_URL: z.string(),
        REDIS_URL: z.string(),
        ML_ENGINE_URL: z.string(),
        JWT_SECRET: z.string().min(32),
      });
      export const env = envSchema.parse(process.env);

- [x] Create src/config/database.ts -- Prisma client singleton (instantiate once, reuse everywhere).
- [x] Create src/config/redis.ts -- ioredis client singleton.
- [x] Author comprehensive unit test suite in tests/config.test.ts (9/9 tests passing).

### 4.2 - Global Middleware Stack & Response Envelopes

Set these up BEFORE mounting any routes in src/index.ts (order matters):

- [x] helmet() -- security headers
- [x] cors() -- restrict origins in production
- [x] morgan('dev') -- request logging
- [x] express.json() -- body parsing
- [x] rateLimiter.ts -- express-rate-limit, 100 req/15min default
- [x] errorHandler.ts -- catches all thrown errors, returns standard error envelope
- [x] Create src/utils/response.ts with ok(), fail(), and AppError class
- [x] Author comprehensive unit & integration test suite in tests/middleware.test.ts (11/11 tests passing)

### 4.3a - Auth Validation Schemas & Authentication Service

- [x] auth.types.ts: AuthTokens, UserPublicProfile, AuthResponseData, JwtPayload
- [x] auth.validation.ts: Zod schemas for RegisterInput, LoginInput, RefreshTokenInput
- [x] auth.service.ts: hashPassword, comparePassword, generateTokens, verifyToken, register, login, refreshToken, getUserProfile
- [x] Author comprehensive unit test suite in tests/auth.service.test.ts (18/18 tests passing)

### 4.3b - Auth Controller, Middleware Guards & Routes

- [x] auth.middleware.ts: Extract Authorization: Bearer token header, verify JWT, attach req.user = { id, role } to the request
- [x] roleGuard.ts: Middleware factory requireRole('ADMIN', 'YAATRI_MITRA') -- returns 403 if role does not match
- [x] auth.controller.ts: register, login, refresh, getMe controller handlers with standard ok()/fail() response envelopes
- [x] auth.routes.ts: POST /register, POST /login, POST /refresh, GET /me mounted under /api/v1/auth
- [x] Author comprehensive integration test suite in tests/auth.routes.test.ts (12/12 tests passing)

### 4.4a - User Profile Service & Volunteer Duty/Location Management

- [x] volunteer.types.ts: LocationPingInput, NearbyVolunteerResult, UpdateProfileInput
- [x] user.service.ts: getUserById, updateProfile, deleteAccount
- [x] volunteer.service.ts: registerVolunteer, toggleDutyStatus, recordLocation (ST_SetSRID Point), findNearbyVolunteers (ST_DWithin with ::geography cast)
- [x] Author comprehensive unit test suite in tests/user-volunteer.service.test.ts (12/12 tests passing)

### 4.4b - User & Volunteer Routes & Proximity Controllers

- [x] user.controller.ts & user.routes.ts: GET /users/me, PATCH /users/profile, DELETE /users/account
- [x] volunteer.controller.ts & volunteer.routes.ts: POST /volunteers/register, PATCH /volunteers/duty, POST /volunteers/location, GET /volunteers/nearby
- [x] Mount /api/v1/users and /api/v1/volunteers in index.ts
- [x] Author comprehensive integration test suite in tests/user-volunteer.routes.test.ts (9/9 tests passing)

### 4.5a - Zones Service & PostGIS Polygon Management

- [x] zone.types.ts: GeoJSONPolygon, ZoneEntity, CreateZoneInput, UpdateZoneInput, OverrideScoreInput
- [x] zone.service.ts: createZone (ST_GeomFromGeoJSON / ST_Buffer), getAllZones (ST_AsGeoJSON), getZoneById, overrideScore (DangerTier calculation), updateZone, deleteZone
- [x] Author comprehensive unit test suite in tests/zone.service.test.ts (10/10 tests passing)

### 4.5b - Zones Validation, Controller & REST Routes

- [ ] zone.validation.ts: createZoneSchema, updateZoneSchema, overrideScoreSchema
- [ ] zone.controller.ts & zone.routes.ts: GET /zones, GET /zones/:id, POST /zones (admin), PATCH /zones/:id, PATCH /zones/:id/override (admin), DELETE /zones/:id (admin)
- [ ] Mount /api/v1/zones in index.ts
- [ ] Author comprehensive integration test suite in tests/zone.routes.test.ts

### 4.7 - Danger Score Proxy Module

- [ ] danger.cache.ts: Redis wrapper with key danger:score:{zone_id}, TTL 300 seconds (5 min).
- [ ] danger.service.ts -- getScoreForCoords(lat, lng):
      Step 1: Find nearest zone using ST_DWithin
      Step 2: Check Redis cache for danger:score:{zone_id}
      Step 3: Cache miss -> HTTP call to ML engine POST /api/v1/score
      Step 4: Store result in Redis with TTL
      Step 5: Return score
- [ ] danger.routes.ts: GET /danger/score?lat=&lng=, GET /danger/zones, GET /danger/briefing/:destination
- [ ] TEST: Call twice within 5 min. Verify second call hits Redis, NOT the ML engine.

### 4.8 - Geofence Module

- [ ] geofence.engine.ts:
      checkPointInGeofences(lat, lng) -- ST_Contains query, returns all matching geofences
      findGeofencesNearPoint(lat, lng, bufferMeters) -- ST_DWithin with 500m buffer for approaching alerts
- [ ] geofence.service.ts: CRUD for geofences + wrap engine functions
- [ ] geofence.routes.ts: Standard REST + POST /geofences/check
- [ ] TEST: Create a CRITICAL geofence polygon. Insert a point 300m outside -- verify approaching alert fires.

### 4.9 - SOS Module (Most Critical)

Build and test each layer individually before connecting them.

- [ ] sos.matcher.ts -- matchVolunteers(sosLat, sosLng):
      Calls findNearbyVolunteers() with 5km radius
      Returns sorted list with distance + ETA estimate
- [ ] sos.sms.ts -- sendSOSviaSMS(phone, sosId, lat, lng):
      Uses Twilio SMS. Toggle via env var for dev.
- [ ] sos.service.ts -- triggerSOS(userId, lat, lng, battery, audioUrl):
      1. Create SOSEvent record in DB
      2. Log SOSTimeline entry: TRIGGERED
      3. Call matchVolunteers -> get nearest volunteers
      4. Emit WebSocket event sos:triggered to each volunteer
      5. Send FCM push to each volunteer
      6. Log SOSTimeline entry: VOLUNTEERS_ALERTED
      7. Return { sosId, volunteersAlerted, nearestETA }
- [ ] acceptSOS(sosId, volunteerId) -- update SOSResponse, emit sos:accepted to tourist
- [ ] resolveSOS(sosId) -- mark resolved, emit sos:resolved to all parties
- [ ] sos.routes.ts: POST /sos/trigger, PATCH /sos/:id/accept, PATCH /sos/:id/resolve, GET /sos/active, GET /sos/:id
- [ ] TEST: Call POST /sos/trigger. Verify DB record created, volunteer matched, WS event emitted.

### 4.10 - WebSocket Server

- [ ] src/websocket/socketServer.ts:
      Socket.IO with JWT auth middleware (verify token on connection event)
      On connect: join rooms user:{userId}, role:{role}, zone:{zoneId}
- [ ] handlers/locationUpdate.ts: Handle location:update -> update UserLocation -> run geofence check -> emit geofence:alert if triggered
- [ ] handlers/sosEvents.ts: Handle SOS lifecycle events
- [ ] handlers/dangerAlerts.ts: Broadcast danger:score_update when score changes

### 4.11 - Background Jobs

- [ ] jobs/dangerScoreRefresh.ts: Cron every 5 min -> fetch all zones -> call ML engine -> update DB + Redis -> emit danger:score_update
- [ ] jobs/geofenceCheck.ts: Every 30 sec -> check all active user locations vs geofences -> emit alerts for violations
- [ ] jobs/cleanupExpiredSOS.ts: Every hour -> mark unresolved SOS events older than 24h as EXPIRED

### 4.12 - Simulation Endpoints (Dev Only)

All routes behind guard: if (env.SIMULATION_MODE !== 'true') return 404

- [ ] POST /sim/location -- inject UserLocation records for userId + coordinates array
- [ ] POST /sim/trajectory -- replay coordinates with time delays
- [ ] POST /sim/sos -- trigger full SOS loop with mock tourist and volunteer
- [ ] POST /sim/weather-override -- set Redis key read by ML engine

### 4.13 - Admin Endpoints

- [ ] POST /admin/broadcast -- create BroadcastAlert, emit admin:broadcast to all tourists in target area
- [ ] GET /admin/analytics -- aggregated stats (SOS count, avg response time, danger tier distribution)
- [ ] GET /admin/heatmap -- return UserLocation density data (aggregated, not raw coordinates)

### Phase 4 Exit Criteria
- All REST endpoints from GEMINI.md section 9 are implemented and manually tested.
- SOS loop works end-to-end: trigger -> volunteer matched -> accepted -> resolved.
- Geofence check correctly emits alerts for violations.
- Background cron jobs running without errors.
- All backend-spatial/tests/ pass.

---

## PHASE 5 - Mobile App
Duration: 5-7 days
Goal: A working app covering both Tourist and Yaatri Mitra flows.

### Why Now?
The backend API and WebSocket events are locked. You can now build screens as pure consumers of the API -- no guessing at payload shapes.

### 5.1 - Project Bootstrap

  cd mobile-app && npm install
  npx expo start  (Verify it opens in Expo Go)

Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WS_URL to your local backend.

### 5.2 - State Management and API Layer (Do These BEFORE Writing Any Screen)

- [ ] services/api.ts: Axios instance with:
      baseURL from env
      Request interceptor: attach Authorization: Bearer token from Secure Store
      Response interceptor: on 401 -> attempt token refresh -> retry -> else logout
- [ ] context/AuthContext.tsx: Zustand or React Context for { user, token, login, logout, isLoading }
- [ ] services/authService.ts: login(), register(), refreshToken(), getMe()
- [ ] hooks/useNetworkStatus.ts: Detect online/offline status.

### 5.3 - Auth Screens

- [ ] app/(auth)/login.tsx -- email/password form, calls authService.login(), stores JWT in Expo SecureStore
- [ ] app/(auth)/register.tsx -- name, phone, email, password
- [ ] app/(auth)/role-select.tsx -- "I am a Tourist" vs "I am a Yaatri Mitra" with visual cards
- [ ] Root _layout.tsx: Check token on app start -> redirect to (auth), (tourist), or (mitra)

### 5.4 - Tourist: Home Map Screen (Build in Layers)

- [ ] Layer 1: react-native-maps MapView centered on user's current location.
- [ ] Layer 2: Fetch all zones from GET /danger/zones. Render each as a Polygon:
      LOW:      rgba(39, 174, 96, 0.3)  -- green
      MODERATE: rgba(243, 156, 18, 0.3) -- amber
      SEVERE:   rgba(230, 126, 34, 0.4) -- orange
      CRITICAL: rgba(231, 76, 60, 0.5)  -- red
- [ ] Layer 3: User location marker (pulsing blue dot).
- [ ] Layer 4: Floating SOSButton component (bottom-right, always visible).

### 5.5 - Background Location and Geofence Alerts

- [ ] services/locationService.ts:
      Request FOREGROUND then BACKGROUND location permission.
      Use expo-location startLocationUpdatesAsync -- sends location every 30 seconds.
      Each update -> emit location:update via WebSocket.
- [ ] hooks/useGeofence.ts: Listen on geofence:alert WebSocket event -> show GeofenceWarning modal.
- [ ] components/alerts/GeofenceWarning.tsx: Full-screen red warning modal with:
      Danger tier badge + justification text from backend
      "Turn Back" button (primary)
      "I Understand the Risk" (secondary, requires 3-second hold to prevent accidents)

### 5.6 - Tourist: Pre-Trip Briefing Screen

- [ ] app/(tourist)/briefing.tsx:
      Search input for destination name.
      On search: call GET /danger/briefing/{destination}.
      Render SafetyBriefing card with weather forecast, terrain risk, crowd estimate, danger score gauge.

### 5.7 - Tourist: SOS Screen (Highest Stakes -- Test Thoroughly)

- [ ] components/sos/SOSButton.tsx:
      Large red button. Requires 2-second press-and-hold to trigger.
      Shows countdown ring during hold (prevents accidental activation).

- [ ] components/sos/SOSConfirmModal.tsx: After hold:
      "SOS will be triggered in 5 seconds" countdown with cancel button.
      Option to record a 10-second audio clip (expo-av).
      On confirm: call POST /sos/trigger with GPS + battery + audio URL.

- [ ] components/sos/SOSStatusTracker.tsx: After trigger:
      "Searching for rescuers..." spinner.
      On sos:accepted WebSocket event: shows volunteer name, distance, ETA.
      On sos:mitra_location event: updates mini-map showing Mitra's real-time approach.

- [ ] Offline Fallback (utils/smsPayload.ts):
      If offline: construct "SOS|LAT:X|LNG:Y|BAT:Z|UID:abc" and send via expo-sms.
      Show instructions to call 112 as backup.

### 5.8 - Tourist: Alerts Screen

- [ ] app/(tourist)/alerts.tsx -- list of past geofence alerts + push notifications.
- [ ] services/notificationService.ts:
      Register FCM token with backend on login.
      Handle incoming push notifications (foreground + background).

### 5.9 - Yaatri Mitra Screens

- [ ] app/(mitra)/index.tsx:
      Duty toggle button (on/off).
      List of nearby active SOS events.
      Listen on sos:triggered WebSocket event -> render SOSAlertCard with tourist info, distance, audio clip.
      "Accept" button -> calls PATCH /sos/:id/accept.

- [ ] app/(mitra)/active-sos.tsx:
      After accepting: opens navigation (Google Maps deep link).
      Streams own location via WebSocket every 5 seconds.
      "I've Arrived" button -> PATCH /sos/:id/arrive.
      "Mark Resolved" button -> PATCH /sos/:id/resolve.

### 5.10 - Push Notifications Setup

- [ ] Create Firebase project -> download google-services.json (Android) and GoogleService-Info.plist (iOS).
- [ ] Add to Expo config in app.json.
- [ ] In backend: on SOS trigger -> use firebase-admin to send FCM push to all alerted volunteers.
- [ ] TEST: Trigger SOS in sim mode -> verify push appears on physical device within 30 seconds.

### Phase 5 Exit Criteria
- Tourist sees danger zones on map with correct colors.
- Geofence warning modal appears when simulating approach to a CRITICAL zone.
- SOS button (2-sec hold) -> confirm -> triggers SOS -> sees Mitra ETA tracker.
- Yaatri Mitra receives SOS alert -> accepts -> their location streams back.
- SMS fallback constructs correct payload and opens native SMS app.

---

## PHASE 6 - Admin Dashboard
Duration: 3-4 days
Goal: A functional command center for the SIH demo.

### Why Now?
Built last because it purely consumes what the backend and WebSocket server broadcast. No new backend work needed.

### 6.1 - Project Bootstrap

  cd admin-dashboard && npm install
  npm run dev  (opens on http://localhost:3001)

- [ ] Set up TanStack Query provider in layout.tsx.
- [ ] Set up services/socketService.ts -- Socket.IO client connecting with admin JWT on mount.

### 6.2 - Authentication

- [ ] src/app/login/page.tsx -- email/password form.
- [ ] Store admin JWT in httpOnly cookie (more secure than localStorage for web).
- [ ] Next.js middleware to redirect unauthenticated users to /login.

### 6.3 - Dashboard Home (KPI Cards)

- [ ] Fetch from GET /admin/analytics -> populate four KPI cards:
      Active SOS Count, Active Tourists, On-Duty Mitras, Critical Zones
- [ ] Auto-refresh every 30 seconds with TanStack Query refetchInterval.

### 6.4 - Macro Heatmap Page

- [ ] src/app/heatmap/page.tsx:
      Initialize Mapbox GL JS map centered on India (zoom level 5).
      Fetch GET /admin/heatmap -> render density data as HeatmapLayer.
      Fetch all zones -> render as colored FillLayer polygons (same colors as mobile).
      Auto-update on danger:score_update WebSocket events.

### 6.5 - Live SOS Feed Page (Key Demo Screen -- Make It Visually Impactful)

- [ ] src/app/sos/page.tsx:
      Left panel: scrolling list of active SOS events (newest first).
      Right panel: Mapbox map auto-focused on most recent SOS.

- [ ] On sos:triggered WebSocket event:
      Prepend new SOS to list with "NEW" badge + alert sound.
      Map flies to SOS coordinates (map.flyTo).
      Plot tourist marker (red) + responding Mitra markers (blue).

- [ ] On sos:mitra_location: update Mitra marker position in real-time.
- [ ] Show ETA countdown: "X minutes away".

### 6.6 - Zone Management Page

- [ ] src/app/zones/page.tsx: Data table with columns: Name, Tier (color badge), Score, Last Updated, Override Active.
- [ ] src/app/zones/[id]/page.tsx:
      Zone map with polygon highlighted.
      Danger score breakdown bar chart (4 factors from ML engine explain endpoint).
      Score Override: slider input (0-100) + "Apply Override" button -> PATCH /admin/zones/:id/override.
      Manual overrides show a "MANUAL" badge.
- [ ] src/app/zones/create/page.tsx:
      Mapbox with polygon draw tool.
      On polygon complete: call POST /geofences with the GeoJSON.

### 6.7 - Broadcast Alert Composer

- [ ] src/app/broadcast/page.tsx:
      Step 1: Draw target area on Mapbox map (polygon tool).
      Step 2: Fill title + message + severity dropdown.
      Step 3: Preview + send -> POST /admin/broadcast.

### 6.8 - Volunteer Registry

- [ ] src/app/volunteers/page.tsx: Table with Name, Phone, Verification Status, On Duty toggle, Total Responses, Rating.
- [ ] Verification workflow: Admin clicks "Verify" -> backend sets verificationStatus = VERIFIED.

### 6.9 - Analytics Page

- [ ] src/app/analytics/page.tsx using Recharts:
      Line chart: Danger scores over time for top 5 zones (7-day view).
      Bar chart: SOS events per day.
      Pie chart: Incident types distribution.
      Gauge: Average volunteer response time vs target (5 min target).

### Phase 6 Exit Criteria
- Admin can log in and see dashboard with live data.
- Heatmap renders danger zones with correct colors.
- SOS auto-focus: trigger a simulated SOS -> map flies to location in real-time.
- Zone override applies and propagates back to mobile app within 5 minutes.
- Broadcast alert reaches the mobile app simulation.

---

## PHASE 7 - End-to-End Integration Testing and Demo Polish
Duration: 3-4 days
Goal: Demonstrate all four pillars flawlessly in a live SIH demo.

### 7.1 - Full SOS Loop Simulation Test

  # 1. Start all services
  docker-compose up -d

  # 2. Seed demo data
  cd backend-spatial && npx prisma db seed

  # 3. Trigger full SOS simulation
  POST /api/v1/sim/sos
  {
    "scenario": "full_loop",
    "tourist": { "userId": "tourist_test_01", "location": { "lat": 18.7546, "lng": 73.4062 }, "battery": 15 },
    "volunteers": [{ "userId": "mitra_test_01", "location": { "lat": 18.76, "lng": 73.41 }, "responseDelay": 10 }],
    "autoResolve": true, "resolveAfterSeconds": 60
  }

Verify across all four modules simultaneously:
- [ ] Mobile (Tourist): Sees SOS confirmation -> Mitra ETA tracker updates.
- [ ] Mobile (Mitra): Receives SOS push + in-app alert -> accepts -> navigates.
- [ ] Admin Dashboard: SOS appears in feed -> map auto-focuses -> Mitra position updates.
- [ ] ML Engine: Danger score reflects the simulation overrides.

### 7.2 - Geofence Walk Simulation Test

  POST /api/v1/sim/trajectory
  {
    "userId": "tourist_test_01",
    "coordinates": [
      { "lat": 18.7500, "lng": 73.4000 },  <- Outside all zones
      { "lat": 18.7530, "lng": 73.4040 },  <- Approaching SEVERE zone (500m buffer)
      { "lat": 18.7546, "lng": 73.4062 }   <- Inside CRITICAL zone
    ],
    "intervalSeconds": 10
  }

- [ ] Verify mobile receives "approaching" alert at coordinate 2.
- [ ] Verify mobile receives "inside danger zone" alert at coordinate 3 with full CRITICAL modal.
- [ ] Verify admin heatmap updates to show user position moving.

### 7.3 - Offline SMS Fallback Test

- [ ] Disable network on test device (airplane mode).
- [ ] Trigger SOS -> verify app automatically switches to SMS fallback path.
- [ ] Verify SMS payload format: "SOS|LAT:X|LNG:Y|BAT:Z|UID:abc"

### 7.4 - Performance and Load Testing

- [ ] Use Postman Collection Runner or k6 to send 50 concurrent SOS triggers.
- [ ] Verify backend does not drop events and all 50 get logged in DB.
- [ ] Check Redis TTL behavior -- score should be cached, not hammer ML engine.
- [ ] Profile findNearbyVolunteers PostGIS query -- should be under 50ms with indexes.

### 7.5 - Demo Preparation

IMPORTANT: Prepare a scripted demo scenario for SIH judges. Spontaneous demos often fail.

- [ ] Create a demo script covering exactly 2 minutes:
      1. Show admin dashboard -- heatmap with danger zones colored
      2. Walk tourist into a SEVERE zone on mobile -> geofence alert fires live
      3. Trigger SOS -> Mitra receives push -> admin dashboard auto-focuses on location
      4. Mitra accepts -> ETA shown to tourist + trajectory shown on admin map
      5. Mitra resolves -> all parties notified -> dashboard updates in real-time

- [ ] Pre-seed demo data: 5 zones, 3 verified Mitras, 10 historical incidents.
- [ ] Record a backup video of the full demo in case of network issues on demo day.
- [ ] Prepare a one-click "simulation mode" setup so judges can try it themselves.

### 7.6 - Final Submission Checklist

- [ ] All environment variables documented in .env.example files.
- [ ] GEMINI.md is up-to-date with final tech decisions and any deviations.
- [ ] This implementation_plan.md updated with notes on anything that changed.
- [ ] All TODO comments in code are either resolved or filed as GitHub Issues.
- [ ] README.md at root explains how to run the complete project from scratch.
- [ ] Docker Compose up works on a clean machine (test on a teammate's laptop).
- [ ] Push all code to GitHub and create a release tag v1.0.0-sih.

### Phase 7 Exit Criteria
- Full end-to-end demo scenario completes without manual intervention.
- All four pillars (Predict, Prevent, Respond, Command) demonstrable in under 2 minutes.
- Project runs from docker-compose up -d on a fresh machine with no manual steps.

---

## SUMMARY TIMELINE

  Week 1          Week 2          Week 3          Week 4          Week 5          Week 6
  Phase 0 (0.5d)
  Phase 1 (1d)
    Phase 2 (1d)
      Phase 3 (ML Engine) --------- (2-3d)
                Phase 4 (Backend) ------------------ (4-5d)
                                  Phase 5 (Mobile) ------------- (5-7d)
                                         Phase 6 (Admin) -------- (3-4d)
                                                          Phase 7 -- (3-4d)

Total estimated time: 5-6 weeks of focused development.

---

## CRITICAL RULES TO AVOID REFACTORING

  Rule                                            | What Happens If You Break It
  ------------------------------------------------|-----------------------------------------------
  Define Pydantic schemas before ML logic         | Rewrite output formats when backend integration starts
  Lock DB schema before writing any service       | Every model change = new migration + updated types
  Use standard response envelope from Day 1       | Frontend error handling breaks across every screen
  Build mobile ONLY after backend is tested       | Mobile screens break when API payloads change
  Use SIMULATION_MODE env var from the start      | Manual code edits to switch real vs mock data
  Set up Redis caching before demo                | ML calls on every request time out under demo load
  Use Socket.IO rooms from the start              | Broadcasting to all clients causes chaos at scale
  Write seed data before writing any UI           | Manually inserting test data repeatedly wastes time

---

## REFERENCE LINKS

  Resource                    | URL
  ----------------------------|------------------------------------------
  Master Architecture         | GEMINI.md in this repo
  Prisma Docs                 | https://www.prisma.io/docs
  PostGIS Function Reference  | https://postgis.net/docs/reference.html
  Expo Location Background    | https://docs.expo.dev/versions/latest/sdk/location/
  React Native Maps           | https://github.com/react-native-maps/react-native-maps
  Mapbox GL JS Draw Plugin    | https://github.com/mapbox/mapbox-gl-draw
  Socket.IO Rooms             | https://socket.io/docs/v4/rooms/
  OpenWeatherMap One Call API | https://openweathermap.org/api/one-call-3
  OpenTopoData (elevation)    | https://www.opentopodata.org/
  GeoJSON.io (draw polygons)  | https://geojson.io
  Turf.js Spatial Helpers     | https://turfjs.org

---

Safe Yatra -- Build it right the first time.
