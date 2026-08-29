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

- [x] zone.validation.ts: createZoneSchema, updateZoneSchema, overrideScoreSchema
- [x] zone.controller.ts & zone.routes.ts: GET /zones, GET /zones/:id, POST /zones (admin), PATCH /zones/:id, PATCH /zones/:id/override (admin), DELETE /zones/:id (admin)
- [x] Mount /api/v1/zones in index.ts
- [x] Author comprehensive integration test suite in tests/zone.routes.test.ts (9/9 tests passing)

### 4.6a - Danger Score Proxy & Redis Cache Layer

- [x] danger.types.ts: FactorScore, DangerFactors, DangerScoreResult, PreTripBriefing
- [x] danger.cache.ts: Redis wrapper with keys danger:score:{zone_id} & danger:coords:{lat}:{lng}, TTL 300 seconds (5 min)
- [x] danger.service.ts: getScoreForCoordinates (PostGIS spatial lookup, Redis cache-first, Python ML Risk Engine proxy POST /api/v1/score, resilient heuristic fallback), getAllZoneScores, getSafetyBriefing
- [x] Author comprehensive unit test suite in tests/danger.service.test.ts (11/11 tests passing)

### 4.6b - Danger Score Routes & Controller

- [x] danger.validation.ts: dangerScoreQuerySchema, safetyBriefingParamSchema
- [x] danger.controller.ts & danger.routes.ts: GET /score?lat=&lng=, GET /zones, GET /briefing/:destination
- [x] Mount /api/v1/danger in index.ts
- [x] Author comprehensive integration test suite in tests/danger.routes.test.ts (6/6 tests passing)

### 4.7a - Geofence Spatial Engine & Service

- [x] geofence.types.ts: GeofenceEntity, CreateGeofenceInput, UpdateGeofenceInput, GeofenceCheckResult, ProximityGeofence
- [x] geofence.engine.ts: checkPointInGeofences (ST_Contains query, returns all matching geofences), findGeofencesNearPoint (ST_DWithin & ST_Distance with 500m buffer on ::geography for approaching alerts), evaluateLocation
- [x] geofence.service.ts: CRUD for geofences (GeoJSON polygon & circular buffer) + wrap spatial engine functions
- [x] Author comprehensive unit test suite in tests/geofence.service.test.ts (22/22 tests passing)

### 4.7b - Geofence Validation, Controller & REST Routes

- [x] geofence.validation.ts: createGeofenceSchema, updateGeofenceSchema, checkPointSchema, geofenceQuerySchema
- [x] geofence.controller.ts & geofence.routes.ts: GET /geofences, GET /geofences/:id, POST /geofences (admin), PATCH /geofences/:id (admin), DELETE /geofences/:id (admin), POST /geofences/check
- [x] Mount /api/v1/geofences in index.ts
- [x] Author comprehensive integration test suite in tests/geofence.routes.test.ts (15/15 tests passing)

### 4.9a - SOS Proximity Matcher & SMS Gateway

- [x] sos.types.ts: SOSEntity, TriggerSOSInput, SOSMatchResult, ParsedSMSPayload, SMSDispatchResult
- [x] sos.matcher.ts: matchVolunteers(sosLat, sosLng, radiusMeters, limit) calling findNearbyVolunteers() with 5km radius and ETA calculations
- [x] sos.sms.ts: encodeSOSPayload, parseSOSPayload, sendSOSviaSMS (supporting simulated and Twilio dispatch)
- [x] Author comprehensive unit test suite in tests/sos.matcher-sms.test.ts (15/15 tests passing)

### 4.9b - SOS Emergency Service & State Transitions

- [x] sos.service.ts: triggerSOS (creates SOSEvent, logs TRIGGERED, matches volunteers, alerts responders), acceptSOS (updates SOSResponse to ACCEPTED, logs VOLUNTEER_ACCEPTED), arriveSOS, resolveSOS (marks RESOLVED, updates timestamps), cancelSOS, getSOSById, getActiveSOSEvents
- [x] Author comprehensive unit test suite in tests/sos.service.test.ts (13/13 tests passing)

### 4.9c - SOS Validation, Controller & REST Routes

- [x] sos.validation.ts: triggerSOSSchema, resolveSOSSchema, cancelSOSSchema, smsWebhookSchema
- [x] sos.controller.ts & sos.routes.ts: POST /sos/trigger, PATCH /sos/:id/accept, PATCH /sos/:id/arrive, PATCH /sos/:id/resolve, PATCH /sos/:id/cancel, GET /sos/active, GET /sos/:id, POST /sos/sms-webhook
- [x] Mount /api/v1/sos in index.ts
- [x] Author comprehensive integration test suite in tests/sos.routes.test.ts (19/19 tests passing)

### 4.10a - WebSocket Server Bootstrap, JWT Auth & Room Management

- [x] src/websocket/rooms.ts: Room formatters (userRoom, roleRoom, zoneRoom) and type-safe emitters (emitToUser, emitToRole, emitToZone, emitToAll)
- [x] src/websocket/socketServer.ts: Socket.IO server with JWT handshake authentication, auto-joining user & role rooms, dynamic zone subscription listeners
- [x] Author comprehensive unit and integration test suite in tests/socket.server.test.ts (9/9 tests passing)

### 4.10b - WebSocket Event Handlers (Location, SOS & Danger Score Broadcasting)

- [x] handlers/locationUpdate.ts: Handle location:update -> update UserLocation -> run geofence check -> emit geofence:alert if inside geofence
- [x] handlers/sosEvents.ts: Handle SOS lifecycle events (broadcast to volunteers & command center)
- [x] handlers/dangerAlerts.ts: Broadcast danger:score_update when zone scores change
- [x] Author comprehensive test suite in tests/socket.handlers.test.ts (8/8 tests passing)

### 4.11a - Background Jobs Infrastructure, Danger Score Refresh & Expired SOS Cleanup

- [x] jobs/dangerScoreRefresh.ts: Cron every 5 min -> fetch all zones -> compute danger scores -> broadcast danger:score_update
- [x] jobs/cleanupExpiredSOS.ts: Cron every hour -> mark unresolved SOS events older than 24h as EXPIRED with timeline audit
- [x] jobs/jobScheduler.ts: Job scheduler for timer lifecycle management
- [x] Author comprehensive unit test suite in tests/jobs.test.ts (6/6 tests passing)

### 4.11b - Periodic Active User Geofence Monitoring Job

- [x] jobs/geofenceCheck.ts: Recurring job checking recent active user locations vs geofences -> emit alerts for violations
- [x] Author comprehensive test suite in tests/jobs.geofence.test.ts (4/4 tests passing)

### 4.12a - Simulation Location Injection & Trajectory Replay

- [x] sim.types.ts: CoordinatePoint, InjectLocationInput, InjectedLocationRecord, ReplayTrajectoryInput, TrajectoryWaypoint, TrajectoryReplayResult
- [x] sim.validation.ts: Coordinate bounds and array validation schemas
- [x] sim.service.ts: injectLocations (PostGIS ST_SetSRID Point insertion), replayTrajectory (progressive waypoints + geofence evaluation)
- [x] sim.controller.ts & sim.routes.ts: POST /sim/location (201 ok()), POST /sim/trajectory (200 ok()), strictly guarded behind SIMULATION_MODE
- [x] Author comprehensive unit & integration test suite in tests/simulation.location.test.ts (11/11 tests passing)

### 4.12b - Full SOS Simulation Loop & Weather Override

- [x] POST /sim/sos -- trigger full SOS loop with mock tourist and volunteer (201 ok())
- [x] POST /sim/weather-override -- set and clear Redis environmental override keys (200 ok())
- [x] Author comprehensive unit & integration test suite in tests/simulation.sos-weather.test.ts (10/10 tests passing)

### 4.13a - Admin Broadcast Alerts & Sector Messaging

- [x] POST /admin/broadcast -- create BroadcastAlert with PostGIS geometry, emit admin:broadcast to tourists in target area
- [x] GET /admin/broadcasts & GET /admin/broadcasts/:id -- list and detail retrieval with GeoJSON geometries
- [x] PATCH /admin/broadcasts/:id/deactivate -- deactivate active broadcast alert
- [x] Author comprehensive test suite in tests/admin.broadcast.test.ts (12/12 tests passing)

### 4.13b - Admin Analytics & Heatmap Aggregations

- [x] GET /admin/analytics -- aggregated stats (SOS count, avg response time, danger tier distribution, active users) (200 ok())
- [x] GET /admin/heatmap -- return UserLocation density clusters using PostGIS ST_SnapToGrid (200 ok())
- [x] Author comprehensive test suite in tests/admin.analytics-heatmap.test.ts (8/8 tests passing)

### Phase 4 Exit Criteria
- [x] All REST endpoints from GEMINI.md section 9 are implemented and manually tested.
- [x] SOS loop works end-to-end: trigger -> volunteer matched -> accepted -> resolved.
- [x] Geofence check correctly emits alerts for violations.
- [x] Background cron jobs running without errors.
- [x] All backend-spatial/tests/ pass (25/25 test suites, 275/275 tests passing).

---

## PHASE 5 - Mobile App
Duration: 5-7 days
Goal: A working app covering both Tourist and Yaatri Mitra flows.

### Why Now?
The backend API and WebSocket events are locked. You can now build screens as pure consumers of the API -- no guessing at payload shapes.

### 5.1 - Project Bootstrap

- [x] cd mobile-app && npm install (Verified dependencies: Expo 51, expo-secure-store, expo-network, axios, react-native-maps)
- [x] Configure tsconfig.json, babel.config.js, jest.config.js for Expo SDK 51

### 5.2 - State Management and API Layer

- [x] services/storage.ts: Hardware-backed SecureStore with typed accessors (accessToken, refreshToken, userRole, userData, clearAuth)
- [x] services/api.ts: Axios instance with Bearer request interceptor and single-flight 401 refresh mutex queue
- [x] context/AuthContext.tsx: Global React Context & useAuth() for { user, token, role, isLoading, isAuthenticated, isVolunteer, isTourist, login, register, logout, setRole }
- [x] services/authService.ts: Typed API methods login(), register(), refreshToken(), getMe(), logout()
- [x] hooks/useNetworkStatus.ts: Real-time network detection hook using expo-network with offline SMS fallback support
- [x] Author comprehensive test suite in __tests__/auth-api-storage.test.ts (8/8 tests passing)

### 5.3 - Auth Screens

- [x] app/(auth)/login.tsx -- email/password form with validation, calls authService.login(), stores JWT in Expo SecureStore
- [x] app/(auth)/register.tsx -- name, phone, email, password, role, emergency contact
- [x] app/(auth)/role-select.tsx -- "I am a Tourist" vs "I am a Yaatri Mitra" with visual persona cards
- [x] Root _layout.tsx: NavigationGuard checking token on start -> redirecting to (auth), (tourist), or (mitra)
- [x] Author comprehensive test suite in __tests__/auth-screens.test.tsx (10/10 tests passing)

### 5.4 - Tourist: Home Map Screen (Build in Layers)

- [x] Layer 1: react-native-maps MapView centered on user's current location (components/maps/DangerZoneMap.tsx).
- [x] Layer 2: Fetch all zones from GET /danger/zones and render each as a Polygon with tier colors (LOW green, MODERATE amber, SEVERE orange, CRITICAL red).
- [x] Layer 3: User location marker with pulsing blue accuracy halo.
- [x] Layer 4: Floating SOSButton component (bottom-right, always visible, pulsing halo, accessible).
- [x] Layer 5: Tourist tab navigation in app/(tourist)/_layout.tsx and Home screen in app/(tourist)/index.tsx with status pill and zone detail modal sheet.
- [x] Author comprehensive test suite in __tests__/tourist-map.test.tsx (6/6 tests passing)

### 5.5 - Background Location and Geofence Alerts

- [x] services/socketService.ts: Resilient Socket.IO client with Bearer auth token injection and typed event emitters/listeners
- [x] services/locationService.ts: Foreground/Background location permission requests and periodic GPS updates streaming to WebSocket (location:update)
- [x] hooks/useGeofence.ts: Real-time hook listening to geofence:alert WebSocket events with screen reader announcements
- [x] components/alerts/GeofenceWarning.tsx: Full-screen red warning modal with danger tier badge, justification text, "Turn Back" primary action, and 3-second hold confirmation for "I Understand the Risk"
- [x] Author comprehensive test suite in __tests__/geofence-alerts.test.tsx (5/5 tests passing)

### 5.6 - Tourist: Pre-Trip Briefing Screen

- [x] app/(tourist)/briefing.tsx: Search input for destination name with 1-tap popular pilgrimage hotspot pills (Kedarnath, Badrinath, Lonavala, Haridwar, Vaishno Devi)
- [x] On search: call GET /api/v1/danger/briefing/{destination}
- [x] components/briefing/SafetyBriefingCard.tsx: Render SafetyBriefing card with overall danger index gauge, 4-factor risk breakdown (Weather, Terrain, Crowd, History), and actionable travel advisory
- [x] Author comprehensive test suite in __tests__/briefing-screen.test.tsx (6/6 tests passing)

### 5.7 - Tourist: SOS Screen (Highest Stakes -- Test Thoroughly)

- [x] components/sos/SOSButton.tsx:
      Large red button. Requires 2-second press-and-hold to trigger.
      Shows countdown ring during hold (prevents accidental activation).

- [x] components/sos/SOSConfirmModal.tsx: After hold:
      "SOS will be triggered in 5 seconds" countdown with cancel button.
      Option to record a 10-second audio clip (expo-av).
      On confirm: call POST /sos/trigger with GPS + battery + audio URL.

- [x] components/sos/SOSStatusTracker.tsx: After trigger:
      "Searching for rescuers..." spinner.
      On sos:accepted WebSocket event: shows volunteer name, distance, ETA.
      On sos:mitra_location event: updates mini-map showing Mitra's real-time approach.

- [x] Offline Fallback (utils/smsPayload.ts):
      If offline: construct "SOS|LAT:X|LNG:Y|BAT:Z|UID:abc" and send via expo-sms.
      Show instructions to call 112 as backup.
- [x] Author comprehensive test suite in __tests__/sos-flow.test.tsx (13/13 tests passing)

### 5.8 - Tourist: Alerts Screen

- [x] app/(tourist)/alerts.tsx -- list of past geofence alerts + push notifications.
- [x] services/notificationService.ts:
      Register FCM token with backend on login.
      Handle incoming push notifications (foreground + background).
- [x] Author comprehensive test suite in __tests__/alerts-screen.test.tsx (13/13 tests passing)

### 5.9 - Yaatri Mitra Screens

- [x] app/(mitra)/_layout.tsx -- Yaatri Mitra tab navigator layout.
- [x] app/(mitra)/index.tsx:
      Duty toggle button (on/off).
      List of nearby active SOS events.
      Listen on sos:triggered WebSocket event -> render SOSAlertCard with tourist info, distance, audio clip.
      "Accept" button -> calls PATCH /sos/:id/accept.
- [x] app/(mitra)/active-sos.tsx:
      After accepting: opens navigation (Google Maps deep link).
      Streams own location via WebSocket every 5 seconds.
      "I've Arrived" button -> PATCH /sos/:id/arrive.
      "Mark Resolved" button -> PATCH /sos/:id/resolve.
- [x] Author comprehensive test suite in __tests__/mitra-rescue.test.tsx (12/12 tests passing)

### 5.10 - Push Notifications Setup & Phase 5 Exit Criteria Verification

- [x] Configure Expo push notification setup and channel parameters in app.json.
- [x] In backend: on SOS trigger -> dispatch push notifications to all alerted Yaatri Mitra volunteers via notificationDispatcher.
- [x] Author and verify Phase 5 Master Exit Criteria test suite in __tests__/phase5-exit-criteria.test.tsx (10/10 tests passing, 84/84 in mobile-app).

### Phase 5 Exit Criteria [ALL PASSED ✅]
- [x] Tourist sees danger zones on map with correct colors.
- [x] Geofence warning modal appears when simulating approach to a CRITICAL zone (with 3-sec hold override).
- [x] SOS button (2-sec hold) -> confirm modal -> triggers SOS -> sees Mitra ETA tracker.
- [x] Yaatri Mitra receives SOS alert -> accepts -> their location streams back on 5s GPS interval.
- [x] SMS fallback constructs compact <60-char payload and opens native SMS/dialer app.

---

## PHASE 6 - Admin Dashboard
Duration: 3-4 days
Goal: A functional command center for the SIH demo.

### Why Now?
Built last because it purely consumes what the backend and WebSocket server broadcast. No new backend work needed.

### 6.1 - Project Bootstrap, API Client, TanStack Query & Socket.IO Gateway

- [x] Set up SSR-safe storage abstraction (`src/services/storage.ts`) and Axios REST client with Bearer JWT interceptor (`src/services/api.ts`).
- [x] Set up TanStack Query provider in `src/providers/QueryProvider.tsx` with hydration safety and mount in `src/app/layout.tsx`.
- [x] Set up `src/services/socketService.ts` -- singleton Socket.IO client connecting with admin JWT and typed event listeners.
- [x] Set up Admin Auth Service (`src/services/authService.ts`) & global context (`src/context/AuthContext.tsx`) with strict `ADMIN` role verification.
- [x] Set up command center Sidebar component (`src/components/common/Sidebar.tsx`) with live socket connectivity indicator.
- [x] Author comprehensive unit test suite in `__tests__/bootstrap-auth-socket.test.tsx` (16/16 tests passing).

### 6.2 - Authentication & Route Protection Guard

- [x] Implemented `src/app/login/page.tsx` with email/password validation, show/hide password toggle, error alert banner, loading state, and 1-tap "Quick Fill Admin" button for SIH judges.
- [x] Implemented `src/components/auth/AuthGuard.tsx` redirecting unauthenticated visitors to `/login`, authenticated admins to `/`, and conditionally rendering the Command Center `Sidebar`.
- [x] Mounted `AuthGuard` in `src/app/layout.tsx`.
- [x] Author comprehensive unit and integration test suite in `__tests__/login-auth-guard.test.tsx` (10/10 tests passing, bringing module total to 26/26 tests passing).

### 6.3 - Dashboard Home (KPI Cards & Live Telemetry)

- [x] Implemented `src/services/adminService.ts` fetching aggregated metrics from `GET /api/v1/admin/analytics`.
- [x] Implemented `src/hooks/useAdminAnalytics.ts` with 30s TanStack Query auto-refresh and real-time Socket.IO cache invalidation (`sos:triggered`, `sos:accepted`, `sos:resolved`, `sos:cancelled`, `danger:score_update`).
- [x] Implemented `src/components/analytics/KPICard.tsx` with danger badges, trends, loading skeletons, and link wrappers.
- [x] Implemented `src/app/page.tsx` with dynamic Operational Readiness Banner, 4 Primary KPI Cards, Sector Hazard Distribution Bar, and Command Center quick operations grid.
- [x] Author comprehensive unit and integration test suite in `__tests__/dashboard-kpi.test.tsx` (7/7 tests passing, bringing module total to 33/33 tests passing).

### 6.4 - Macro Heatmap Page

- [x] Implemented `src/services/mapService.ts` fetching density clusters from `GET /api/v1/admin/heatmap` and danger zones from `GET /api/v1/zones`.
- [x] Implemented `src/hooks/useHeatmapData.ts` with 30s polling and real-time Socket.IO cache invalidation on `danger:score_update`.
- [x] Implemented `src/components/maps/HeatmapMap.tsx` rendering tourist density cluster circles and color-coded PostGIS danger hazard polygons (`CRITICAL` 🔴, `SEVERE` 🟠, `MODERATE` 🟡, `LOW` 🟢).
- [x] Implemented `src/app/heatmap/page.tsx` with layer visibility switches (Heatmap / Hazard Polygons), severity filters (`ALL`, `CRITICAL`, `SEVERE`, `MODERATE`, `LOW`), and Sector Risk Inspector drawer with 4-factor risk score gauges.
- [x] Author comprehensive unit and integration test suite in `__tests__/macro-heatmap.test.tsx` (7/7 tests passing, bringing module total to 40/40 tests passing).

### 6.5 - Live SOS Feed Page (Key Demo Screen)

- [x] Implemented `src/services/sosService.ts` fetching active SOS records (`GET /api/v1/sos/active`) and resolving distress events (`PATCH /api/v1/sos/:id/resolve`).
- [x] Implemented `src/hooks/useLiveSOS.ts` managing real-time in-place mutation across all 6 Socket.IO distress events (`sos:triggered`, `sos:accepted`, `sos:mitra_location`, `sos:arrived`, `sos:resolved`, `sos:cancelled`).
- [x] Implemented `src/components/sos/SOSListPanel.tsx` with caller contact phone links, battery health indicators, multi-state status badges, embedded audio voice note player, search filter, and status tabs.
- [x] Implemented `src/components/sos/SOSMapPanel.tsx` with tourist beacon (pulsing red), dispatched Yaatri Mitra beacon (blue), trajectory vectors, Haversine distance and walking ETA calculations ($4.5\text{ km/h}$), and 1-click resolve button.
- [x] Implemented `src/app/sos/page.tsx` split-view emergency command operations layout with active emergency count indicator and auto-selection.
- [x] Author comprehensive unit and integration test suite in `__tests__/live-sos-feed.test.tsx` (8/8 tests passing, bringing module total to 48/48 tests passing).

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
