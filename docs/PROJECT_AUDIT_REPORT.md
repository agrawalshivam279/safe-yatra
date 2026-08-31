# 🛡️ Safe Yatra — Comprehensive Project Audit Report

> **Date**: 2026-08-31  
> **Audited by**: Automated deep-analysis across all 4 modules  
> **Target Platform**: Android only (iOS configs scanned but not a build target)

---

## Executive Summary

| Module | TypeScript/Lint | Tests | Status |
|--------|:-:|:-:|:-:|
| `backend-spatial` | ✅ `tsc --noEmit` pass | ✅ 29 suites / 299 tests pass | Solid |
| `ml-risk-engine` | ✅ `ruff check` pass | ✅ 12 suites / 81 tests pass | Solid |
| `mobile-app` | — (Expo/Metro) | ✅ 9 suites / 84 tests pass | Needs attention |
| `admin-dashboard` | ✅ `tsc --noEmit` pass | ✅ 9 suites / 74 tests pass | Solid |

**Overall verdict**: The codebase is architecturally well-structured with strong type safety and passing tests. The findings below are *hardening recommendations* — not blocking bugs — ranked by severity and effort.

---

## Table of Contents

1. [CRITICAL — Security & Reliability](#1-critical--security--reliability)
2. [HIGH — Android-Specific & Functional Gaps](#2-high--android-specific--functional-gaps)
3. [MEDIUM — Code Quality & Performance](#3-medium--code-quality--performance)
4. [LOW — Polish & Best Practices](#4-low--polish--best-practices)
5. [INFO — Observations & Notes](#5-info--observations--notes)
6. [Prioritized Fix Checklist](#6-prioritized-fix-checklist)

---

## 1. CRITICAL — Security & Reliability

### C-1. ML Engine: CORS `allow_origins=["*"]` with `allow_credentials=True` is Invalid

**File**: [`main.py`](file:///d:/SIH%202026/ml-risk-engine/app/main.py#L22-L28)

The CORS middleware sets `allow_origins=["*"]` combined with `allow_credentials=True`. Per the CORS specification, browsers **reject** this combination. FastAPI/Starlette will raise an `AssertionError` in production.

**Fix**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### C-2. ML Engine: Simulation Endpoints Available in Production

**Files**: [`main.py`](file:///d:/SIH%202026/ml-risk-engine/app/main.py#L42-L43)

The `/api/v1/simulate/*` routes (override weather data, run scenarios) are mounted unconditionally — they're available even when `SIMULATION_MODE=false`. An attacker hitting `/api/v1/simulate/override` could inject false danger scores.

**Fix**: Guard the router inclusion:
```python
if settings.SIMULATION_MODE:
    app.include_router(simulation_router, prefix="/api/v1/simulate")
```

---

### C-3. ML Engine: Hardcoded Database Credentials in Config Default

**File**: [`config.py`](file:///d:/SIH%202026/ml-risk-engine/app/config.py#L11)

`DATABASE_URL` defaults to `postgresql://safeyatra_user:safeyatra_pass@localhost:5432/safeyatra`. While this is loaded from `.env` in practice, the credentials are baked into source code. If the `.env` file is missing or the env var isn't set in a deployment, these credentials become active.

**Fix**: Default to an empty string and validate at startup:
```python
DATABASE_URL: str = ""

def __init__(self, **kwargs):
    super().__init__(**kwargs)
    if not self.DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required")
```

---

### C-4. Mobile App: No Background Location Tracking (Android)

**File**: [`locationService.ts`](file:///d:/SIH%202026/mobile-app/services/locationService.ts#L85-L108)

`Location.watchPositionAsync()` only works in the **foreground**. When the user switches apps or locks the screen, location updates stop entirely. This means:
- Geofence alerts won't fire in background
- Tourist position tracking goes dark
- Safety monitoring is interrupted

For a safety-critical app, this is a major gap.

**Fix**: Use `expo-task-manager` + `Location.startLocationUpdatesAsync` with a foreground service notification:
```typescript
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  // Queue location update for socket emission
});

// In startStreaming():
await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 15000,
  distanceInterval: 10,
  foregroundService: {
    notificationTitle: "Safe Yatra",
    notificationBody: "Monitoring your safety in the background",
  },
});
```

Also add to `app.json` android permissions:
```json
"FOREGROUND_SERVICE",
"FOREGROUND_SERVICE_LOCATION"
```

---

### C-5. Mobile App: Missing `POST_NOTIFICATIONS` Permission (Android 13+)

**File**: [`app.json`](file:///d:/SIH%202026/mobile-app/app.json#L30-L38)

Android 13 (API 33+) requires `POST_NOTIFICATIONS` runtime permission for push notifications to display. The current permissions list is missing this. On Android 13+ devices, push notifications will silently fail.

**Fix**: Add to `app.json`:
```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "ACCESS_BACKGROUND_LOCATION",
  "RECORD_AUDIO",
  "SEND_SMS",
  "VIBRATE",
  "RECEIVE_BOOT_COMPLETED",
  "POST_NOTIFICATIONS",
  "FOREGROUND_SERVICE",
  "FOREGROUND_SERVICE_LOCATION"
]
```

---

## 2. HIGH — Android-Specific & Functional Gaps

### H-1. Backend: Unrestricted WebSocket Zone Room Joining

**File**: [`socketServer.ts`](file:///d:/SIH%202026/backend-spatial/src/websocket/socketServer.ts#L80-L84)

Any authenticated client can emit `zone:join` with any `zoneId` and join that room. While WebSocket auth is in place (JWT verified on handshake), there's no authorization check — a tourist could join admin zone rooms and receive all SOS events across all zones.

**Fix**: Validate room access based on role:
```typescript
socket.on('zone:join', (data: { zoneId: string }) => {
  if (!data?.zoneId?.trim()) return;
  const user = socket.data.user;
  // ADMIN can join any zone; TOURIST/VOLUNTEER only their nearby zones
  if (user.role === 'ADMIN') {
    socket.join(zoneRoom(data.zoneId.trim()));
  } else {
    // Validate user is within or near the requested zone before joining
    socket.join(zoneRoom(data.zoneId.trim())); // TODO: proximity check
  }
});
```

---

### H-2. Backend: Duplicate WebSocket `connection` Handler

**File**: [`index.ts`](file:///d:/SIH%202026/backend-spatial/src/index.ts#L73-L88)

There's a second `io.on('connection', ...)` block in `index.ts` (lines 73–88) that duplicates the one in `socketServer.ts`. The one in `index.ts` only logs connect/disconnect and has TODO comments for handler registration. This is dead code that fragments the socket lifecycle.

**Fix**: Remove lines 73–88 from `index.ts`. All socket event handling is already properly orchestrated in `socketServer.ts`.

---

### H-3. Backend: `build` Script Doesn't Resolve Path Aliases

**File**: [`package.json`](file:///d:/SIH%202026/backend-spatial/package.json#L8), [`tsconfig.json`](file:///d:/SIH%202026/backend-spatial/tsconfig.json#L17-L19)

`tsconfig.json` defines `"paths": { "@/*": ["src/*"] }`. While no `@/` imports are currently used (all imports are relative), this is a latent time-bomb — if anyone adds an `@/` import, the `tsc` build will emit JS that still contains `@/` paths, crashing at runtime since `tsc` doesn't resolve path aliases.

**Fix** (preemptive): Either:
- Remove the `paths` config since it's unused, OR
- Install `tsc-alias` and update: `"build": "tsc && tsc-alias"`

---

### H-4. Backend: Jest Not Configured for Path Aliases

**File**: [`jest.config.js`](file:///d:/SIH%202026/backend-spatial/jest.config.js)

Same latent issue — Jest doesn't have `moduleNameMapper` for the `@/*` path alias.

**Fix**:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

---

### H-5. Backend: In-Memory Rate Limiter Won't Scale Horizontally

**File**: `src/middleware/rateLimiter.ts`

`express-rate-limit` uses its default `MemoryStore`. If the backend is scaled to multiple instances (e.g., behind a load balancer), each instance tracks rate limits independently, making the limiter ineffective.

**Fix**: Use `rate-limit-redis` since Redis is already a project dependency:
```typescript
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
});
```

---

### H-6. Backend: Open CORS on Express

**File**: [`index.ts`](file:///d:/SIH%202026/backend-spatial/src/index.ts#L34)

`app.use(cors())` with no origin restriction. In production, any domain can make authenticated API calls.

**Fix**:
```typescript
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://admin.safeyatra.app', 'https://safeyatra.app']
    : true,
  credentials: true,
}));
```

---

### H-7. ML Engine: HTTPX Client Re-created Per Request

**Files**: `app/services/weather_service.py`, `app/services/terrain_service.py`

A new `httpx.AsyncClient()` is instantiated and destroyed for every API call. This defeats TCP connection pooling, causes socket exhaustion under load, and adds latency.

**Fix**: Create a shared client in the FastAPI lifespan:
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    app.state.http_client = httpx.AsyncClient(timeout=10)
    yield
    await app.state.http_client.aclose()

app = FastAPI(lifespan=lifespan)
```

---

### H-8. ML Engine: Unbounded Concurrency in Batch Scoring

**File**: `app/routes/score.py`

The `/score/batch` endpoint allows up to 100 coordinates and fires them all simultaneously with `asyncio.gather()`. This will trigger `429 Too Many Requests` on upstream APIs (OpenWeatherMap, OpenTopo).

**Fix**: Add a semaphore to limit concurrency:
```python
sem = asyncio.Semaphore(5)

async def score_with_limit(coord):
    async with sem:
        return await compute_score(coord)

results = await asyncio.gather(*[score_with_limit(c) for c in coords])
```

---

### H-9. Mobile App: SMS Fallback Requires User Interaction on Android

**File**: [`smsPayload.ts`](file:///d:/SIH%202026/mobile-app/utils/smsPayload.ts#L38-L67)

`expo-sms` uses `sendSMSAsync()` which opens the SMS composer UI — it does NOT send SMS automatically in the background. For a true offline emergency fallback, the user must manually press "Send" in the SMS app.

Google Play restricts the `SEND_SMS` permission to apps whose core functionality is SMS. A safety app may qualify, but this requires Play Store review justification.

**Options**:
1. **Accept the composer UX** — document it as "tap Send to complete offline SOS"
2. **Eject to bare workflow** and use native `SmsManager` for direct background sending
3. **Use a cloud SMS gateway** (Twilio) triggered by a last-resort HTTP call with minimal data

---

### H-10. CI/CD: Missing Mobile App Test Job

**File**: [`.github/workflows/ci.yml`](file:///d:/SIH%202026/.github/workflows/ci.yml)

The CI pipeline tests backend-spatial, ml-risk-engine, and admin-dashboard, but **mobile-app is missing**. Its 84 tests are never run in CI.

**Fix**: Add a job:
```yaml
  mobile-app:
    name: Mobile App (React Native/Jest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        working-directory: mobile-app
        run: npm install
      - name: Run Tests
        working-directory: mobile-app
        run: npm test
```

---

## 3. MEDIUM — Code Quality & Performance

### M-1. Backend: Missing Graceful Shutdown

**File**: [`index.ts`](file:///d:/SIH%202026/backend-spatial/src/index.ts)

No `SIGTERM`/`SIGINT` handlers. Docker sends `SIGTERM` on container stop; without handling it, active WebSocket connections and database transactions are abruptly terminated.

**Fix**:
```typescript
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  httpServer.close(async () => {
    await closeSocketServer();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // Force exit after 10s
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

### M-2. ML Engine: Blocking Synchronous File I/O in Async Routes

**File**: `app/routes/simulation.py`

Scenario JSON files are loaded with synchronous `open()` on every request, blocking the asyncio event loop.

**Fix**: Load and cache scenarios at startup:
```python
# At module level
_scenario_cache: dict[str, dict] = {}

def _load_scenarios():
    for f in Path("data/scenarios").glob("*.json"):
        _scenario_cache[f.stem] = json.loads(f.read_text())

# Call during app startup
```

---

### M-3. ML Engine: Health Check Exposes `simulation_mode` Flag

**File**: [`main.py`](file:///d:/SIH%202026/ml-risk-engine/app/main.py#L31-L38)

The public `/health` endpoint includes `simulation_mode: true/false`, leaking deployment context.

**Fix**: Remove `simulation_mode` from the health response or restrict it to authenticated diagnostic endpoints.

---

### M-4. Admin Dashboard: Client-Side Only Auth Guard (No Middleware)

**Files**: [`AuthGuard.tsx`](file:///d:/SIH%202026/admin-dashboard/src/components/auth/AuthGuard.tsx), [`layout.tsx`](file:///d:/SIH%202026/admin-dashboard/src/app/layout.tsx)

Auth enforcement is entirely client-side via `useEffect` + `router.replace('/login')`. This means:
- A brief **flash of protected content** before redirect
- Server-rendered HTML includes dashboard markup for unauthenticated requests

**Fix**: Add Next.js server-side middleware (`src/middleware.ts`):
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = { matcher: ['/((?!login|_next|favicon|api).*)'] };
```

---

### M-5. Backend: WebSocket CORS Hardcoded `*`

**File**: [`socketServer.ts`](file:///d:/SIH%202026/backend-spatial/src/websocket/socketServer.ts#L32-L36)

Socket.IO CORS is set to `origin: '*'`. Should match the Express CORS config for production.

---

### M-6. ML Engine: Dockerfile Runs as Root

**File**: [`Dockerfile`](file:///d:/SIH%202026/ml-risk-engine/Dockerfile)

Container runs as `root` user — a security anti-pattern.

**Fix**:
```dockerfile
RUN useradd -m appuser
USER appuser
```

---

### M-7. Backend: Dockerfile Doesn't Use Multi-Stage Build

**File**: [`Dockerfile`](file:///d:/SIH%202026/backend-spatial/Dockerfile)

Copies everything, installs all deps (including devDependencies), and builds in a single stage. The production image is larger than necessary.

**Fix**: Multi-stage build:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## 4. LOW — Polish & Best Practices

### L-1. Backend: `turf` Duplicated in Dependencies

**File**: [`package.json`](file:///d:/SIH%202026/backend-spatial/package.json#L20-L33)

Both `"@turf/turf": "^7.0.0"` and `"turf": "^3.0.14"` are listed. `turf` v3 is deprecated legacy; `@turf/turf` v7 is the correct scoped package.

**Fix**: Remove `"turf": "^3.0.14"` from dependencies.

---

### L-2. Admin Dashboard: Missing `not-found.tsx`

**File**: `admin-dashboard/src/app/`

No custom 404 page. Invalid routes show the default Next.js 404.

**Fix**: Create `src/app/not-found.tsx` with a branded 404 page.

---

### L-3. Admin Dashboard: Missing Admin Tests in CI

**File**: [`.github/workflows/ci.yml`](file:///d:/SIH%202026/.github/workflows/ci.yml#L65-L79)

The admin-dashboard CI job only runs `tsc --noEmit` but doesn't run `npm test`. The 74 tests are never executed in CI.

**Fix**: Add `npm test` step to the admin-dashboard job.

---

### L-4. No Pre-commit Hooks

No `husky`, `lint-staged`, or `.pre-commit-config.yaml` configured. Developers can commit without lint/format/type checks.

**Fix**: Install `husky` + `lint-staged`:
```bash
npm install -D husky lint-staged
npx husky init
```

---

### L-5. ML Engine: Missing `__init__.py` Files

While Python 3.3+ supports implicit namespace packages, explicit `__init__.py` files are recommended for clarity and tool compatibility (mypy, pytest discovery).

**Fix**: Add empty `__init__.py` to `app/`, `app/models/`, `app/schemas/`, `app/services/`, `app/routes/`, `app/utils/`.

---

### L-6. ML Engine: No `mypy` Type Checking Configured

**File**: [`pyproject.toml`](file:///d:/SIH%202026/ml-risk-engine/pyproject.toml)

No `mypy` or `pyright` configuration. Type hints are present but not validated.

**Fix**: Add to `pyproject.toml`:
```toml
[tool.mypy]
python_version = "3.11"
strict = true
plugins = ["pydantic.mypy"]
```

---

### L-7. README: Missing Windows/Android-Specific Setup Guide

**File**: [`README.md`](file:///d:/SIH%202026/README.md)

No instructions for Windows development setup, Android emulator configuration, or `10.0.2.2` host mapping for emulator ↔ backend connectivity.

---

## 5. INFO — Observations & Notes

### ✅ Things Done Well

| Area | Details |
|------|---------|
| **WebSocket Auth** | JWT authentication middleware on Socket.IO handshake is properly implemented |
| **Error Handling** | Centralized `AppError` + `fail()` response helpers; stack traces hidden in production |
| **Env Validation** | Backend uses Zod schema validation with `.min(32)` on JWT_SECRET |
| **Prisma Schema** | GiST spatial indexes defined; PostGIS functions properly parameterized |
| **Test Coverage** | 538 total tests across all modules, all passing |
| **Docker Compose** | PostGIS image used; health checks on Postgres & Redis; `depends_on` with `condition: service_healthy` |
| **`.gitignore`** | Properly excludes `.env`, `.env.*` with `!.env.example` exception |
| **Mobile SMS Fallback** | Compact SOS payload encoder exists with phone dialer fallback |
| **Admin Auth Guard** | Checks both `isAuthenticated` AND `user.role === 'ADMIN'` |
| **API Client** | Mobile app has single-flight token refresh mutex (no thundering herd) |
| **Notification Channels** | Android notification channel with MAX importance configured |
| **Type Safety** | Backend `tsconfig.json` has `"strict": true` enabled |

### 📝 iOS/Mac Observations (Non-blocking)

- `app.json` contains `ios.infoPlist` with permission descriptions — harmless, can stay for future-proofing
- `ios.bundleIdentifier` and `supportsTablet` are present — no effect on Android builds
- No Xcode project files or Podfiles exist (Expo managed workflow)

---

## 6. Prioritized Fix Checklist

Use this as a task list. Items are ordered by **impact × effort** (high-impact, low-effort first).

### 🔴 Do First (Critical/Quick Wins)

- [ ] **C-1**: Fix ML engine CORS — change `allow_origins` to env var, remove `*` + credentials combo
- [ ] **C-2**: Guard simulation routes behind `SIMULATION_MODE` flag
- [ ] **C-5**: Add `POST_NOTIFICATIONS` permission to `app.json` for Android 13+
- [ ] **H-10**: Add mobile-app test job to CI pipeline
- [ ] **L-3**: Add `npm test` to admin-dashboard CI job
- [ ] **H-2**: Remove duplicate `io.on('connection')` from `index.ts`
- [ ] **L-1**: Remove deprecated `turf` v3 from backend dependencies

### 🟠 Do Next (High Priority)

- [ ] **C-3**: Remove hardcoded DB credentials from ML engine config defaults
- [ ] **C-4**: Implement background location tracking with `expo-task-manager`
- [ ] **H-6**: Configure restrictive CORS origins for Express in production
- [ ] **M-5**: Configure restrictive CORS origins for Socket.IO in production
- [ ] **H-7**: Create shared `httpx.AsyncClient` in ML engine lifespan
- [ ] **H-8**: Add semaphore to batch scoring endpoint

### 🟡 Do When Time Permits (Medium Priority)

- [ ] **M-1**: Add graceful shutdown handlers for SIGTERM/SIGINT
- [ ] **M-4**: Add Next.js server-side auth middleware
- [ ] **M-6**: Add non-root user to ML engine Dockerfile
- [ ] **M-7**: Multi-stage Docker build for backend
- [ ] **H-5**: Switch to Redis-backed rate limiter
- [ ] **M-2**: Cache scenario files at startup in ML engine
- [ ] **H-1**: Add role-based zone room access validation
- [ ] **H-3**: Remove unused path aliases or install `tsc-alias`
- [ ] **H-4**: Add Jest `moduleNameMapper` for path aliases

### 🟢 Nice to Have (Low Priority)

- [ ] **L-2**: Add branded 404 page for admin dashboard
- [ ] **L-4**: Configure pre-commit hooks (husky + lint-staged)
- [ ] **L-5**: Add `__init__.py` files to ML engine packages
- [ ] **L-6**: Configure mypy for ML engine
- [ ] **L-7**: Add Windows/Android dev setup to README
- [ ] **M-3**: Remove `simulation_mode` from public health check
- [ ] **H-9**: Document SMS fallback UX limitation for offline SOS

---

> **Note**: This report was generated by scanning every source file across all 4 modules, running all 538 tests (all pass), executing `tsc --noEmit` type checks (all pass), and running `ruff check` (all pass). Findings were cross-verified against actual source code to eliminate false positives.
