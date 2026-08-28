# 📄 Technical Specification: Backend Spatial Config & Client Singletons

> **Step ID**: `4.1`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-1-backend-config-singletons`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.1 initiates **Phase 4 (Backend Spatial Core)** of Safe Yatra by establishing the centralized, type-safe runtime configuration system and client singletons for PostgreSQL/PostGIS (via Prisma ORM) and Redis 7 (via `ioredis`). 

Establishing strict environment schema validation using Zod at process startup ensures the backend fails fast if essential secrets, database URLs, or microservice endpoints are missing or malformed. Providing singleton instances for `prisma` and `redis` prevents connection pool exhaustion, manages graceful process shutdowns (`SIGINT`/`SIGTERM`), and establishes a foundation for all subsequent services (Auth, Zones, Danger, SOS, and Geofencing).

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Phase 1: Infrastructure layer (`docker-compose.yml` PostGIS + Redis definitions, `.env.example`).
  - Phase 2: Database schema (`backend-spatial/prisma/schema.prisma` with PostGIS extensions and Prisma Client generation).
- **Blocked by**: None.
- **New Packages / Libraries**: None (`zod`, `@prisma/client`, `ioredis`, `dotenv`, `jest`, `ts-jest` are already installed in `backend-spatial/package.json`).

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Fail-Fast Runtime Invariant*: Environment parsing must execute synchronously on module load before database or HTTP servers bind. Missing required variables (e.g. `DATABASE_URL`, `JWT_SECRET`) must throw descriptive validation errors rather than silently falling back to insecure defaults in non-dev environments.
  2. *Connection Pool Invariant*: Creating multiple `PrismaClient` or `Redis` instances across route controllers causes connection churn and exceeds PostgreSQL `max_connections` limits. Singletons must be exported as global shared instances.
  3. *Test Isolation Invariant*: In automated test environments (`NODE_ENV === 'test'`), mock configurations or disconnected clients should be easily instantiated or stubbed without attempting physical socket connections to un-spawned Redis instances.

- **Spatial / Algorithmic Edge Cases**:
  - `PORT` string parsing must be coerced safely to integer with a default of `3000`.
  - `SIMULATION_MODE` boolean string (`"true"` / `"false"`) must parse safely into a native boolean.
  - Redis reconnection strategy must implement exponential backoff with a cap ($2000\text{ms}$) to prevent event-loop blocking during transient network blips.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Prisma Client Singleton**: Global namespace caching pattern (`globalThis.prisma`) prevents multiple client instances during hot-reload development (`tsx watch`).
- [x] **Connection Pool Configuration**: Log levels mapped dynamically (`['query', 'info', 'warn', 'error']` in development, `['error', 'warn']` in production).
- [x] **Graceful Teardown**: Handlers registered for `beforeExit`, `SIGINT`, and `SIGTERM` to safely disconnect `prisma.$disconnect()` and `redis.quit()`.
- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered in this step.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Environment Schema (`src/config/env.ts`)

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SIMULATION_MODE: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),

  // Database & Cache
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Internal Microservices
  ML_ENGINE_URL: z.string().url().default('http://localhost:8000'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Notification & SMS Gateway (Optional in development / mock mode)
  FCM_SERVER_KEY: z.string().optional().default(''),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_PHONE_NUMBER: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (customEnv?: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(customEnv || process.env);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment configuration:\n${errorDetails}`);
  }
  return result.data;
};

export const env: Env = validateEnv();
```

### 5.2 Prisma Client Singleton (`src/config/database.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error', 'warn'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### 5.3 Redis Client Singleton (`src/config/redis.ts`)

```typescript
import Redis from 'ioredis';
import { env } from './env';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const createRedisClient = (redisUrl: string = env.REDIS_URL): Redis => {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: env.NODE_ENV === 'test',
    retryStrategy(times) {
      const delay = Math.min(times * 100, 2000);
      return delay;
    },
  });

  client.on('error', (err) => {
    if (env.NODE_ENV !== 'test') {
      console.error('⚠️ [Redis] Connection error:', err.message);
    }
  });

  client.on('connect', () => {
    if (env.NODE_ENV === 'development') {
      console.log('✅ [Redis] Connected successfully');
    }
  });

  return client;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Typed Environment Validation**
   - [ ] Implement `src/config/env.ts` with Zod schema parsing, type inference, and `validateEnv` helper function.
2. **Phase B: Prisma Database Client Singleton**
   - [ ] Implement `src/config/database.ts` with `globalThis` caching and environment-aware logging.
3. **Phase C: Redis Caching & PubSub Client Singleton**
   - [ ] Implement `src/config/redis.ts` with exponential backoff, error event handlers, and `lazyConnect` in test environments.
4. **Phase D: Comprehensive Unit Testing**
   - [ ] Author `tests/config.test.ts` verifying Zod schema validation, default fallbacks, error handling on invalid inputs, and client exports.

---

## 7. Edge Cases & Failure Recovery

- **Missing Critical Env Variables**: `validateEnv` throws an informative error detailing every violating key before the application boots.
- **Port String Coercion**: Handles string `"3000"` or numerical `3000` via `z.coerce.number()`.
- **Redis Offline in Dev/Test**: `lazyConnect: true` in test mode prevents blocking test suites when a local Redis daemon is not running.
- **Hot-Reload Memory Leaks**: `globalThis` assignment prevents duplicate pool allocations during `tsx watch` reloads.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/config.test.ts
```

### Acceptance Checklist
- [ ] `env.ts` correctly parses valid `.env` and rejects missing/short `JWT_SECRET`.
- [ ] `SIMULATION_MODE` parses `"true"` to `true` and `"false"` to `false`.
- [ ] `database.ts` exports singleton instance of `PrismaClient`.
- [ ] `redis.ts` exports singleton instance of `ioredis` with configured retry strategy.
- [ ] All unit tests in `backend-spatial/tests/config.test.ts` pass with 100% assertion coverage.
