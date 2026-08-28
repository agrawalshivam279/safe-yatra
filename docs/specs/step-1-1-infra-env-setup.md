# 📄 Technical Specification: Infrastructure Layer & Environment Configuration

> **Step ID**: `1.1`  
> **Target Module**: `infra` / `cross-module`  
> **Git Feature Branch**: `feat/step-1-1-infra-env-setup`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-28  

---

## 1. Executive Summary

Step 1.1 establishes the operational infrastructure and standardized environment variable templates for the Safe Yatra ecosystem. It verifies the Docker Compose orchestration for PostgreSQL 16 (with PostGIS 3.4 spatial extension enabled) and Redis 7 (caching and pub/sub backbone), and provisions comprehensive, self-documenting `.env.example` templates for all system modules (`root`, `backend-spatial`, `ml-risk-engine`, `mobile-app`, `admin-dashboard`) along with `.gitignore` protections to ensure no sensitive credentials can ever be leaked.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - Root `docker-compose.yml` defining `safeyatra-db` (`postgis/postgis:16-3.4`) and `safeyatra-redis` (`redis:7-alpine`).
  - Monorepo folder layout initialized in Phase 0.
- **Blocked by**: None.
- **New Packages / Tools**: None (Docker / Docker Compose).

---

## 3. 🧠 Sequential Thinking Strategy
> *Algorithmic & Complexity Evaluation*

- **Complexity Tier**: Infrastructure & Environment Configuration (No complex spatial math or multi-stage state transitions).
- **Sequential Thinking MCP**: `Skipped` (Task consists of container health verification, PostGIS extension validation, and environment secret templates).

---

## 4. Configuration Specifications & Contracts

### 4.1 Root `.env.example`
Unified secret catalog mapping all parameters across the 4 modules:

```bash
# ==============================================================================
# SAFE YATRA — MASTER ENVIRONMENT CONFIGURATION TEMPLATE
# ==============================================================================

# --- GLOBAL SETTINGS ---
NODE_ENV=development
SIMULATION_MODE=true

# --- DATABASE (PostgreSQL 16 + PostGIS 3.4) ---
POSTGRES_DB=safeyatra
POSTGRES_USER=safeyatra_user
POSTGRES_PASSWORD=safeyatra_pass
POSTGRES_PORT=5432
DATABASE_URL=postgresql://safeyatra_user:safeyatra_pass@localhost:5432/safeyatra

# --- CACHING & REALTIME (Redis 7) ---
REDIS_URL=redis://localhost:6379

# --- BACKEND SPATIAL SERVER ---
PORT=3000
JWT_SECRET=safeyatra_jwt_super_secret_dev_key_min_32_chars_2026
JWT_EXPIRES_IN=7d
ML_ENGINE_URL=http://localhost:8000

# --- ML RISK ENGINE (FastAPI) ---
ML_PORT=8000
OPENWEATHER_API_KEY=your_openweather_api_key_here

# --- NOTIFICATION & DISPATCH SERVICES (Optional for Dev / Dev Mock Available) ---
FCM_SERVER_KEY=your_firebase_cloud_messaging_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# --- ADMIN DASHBOARD (Next.js 14) ---
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token

# --- MOBILE APP (React Native / Expo) ---
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_WS_URL=ws://localhost:3000
```

### 4.2 Module-Specific `.env.example` Files

1. **`backend-spatial/.env.example`**:
   - `PORT`, `DATABASE_URL`, `REDIS_URL`, `ML_ENGINE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FCM_SERVER_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `SIMULATION_MODE`.

2. **`ml-risk-engine/.env.example`**:
   - `PORT`, `DATABASE_URL`, `OPENWEATHER_API_KEY`, `SIMULATION_MODE`.

3. **`admin-dashboard/.env.example`**:
   - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`.

4. **`mobile-app/.env.example`**:
   - `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL`.

### 4.3 Git Ignore Validation (`.gitignore`)
Verifies all `.env` files and `.env.local` variants across root and modules are explicitly ignored.

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Environment Template Authoring**
   - [ ] Create master `.env.example` at monorepo root.
   - [ ] Create `backend-spatial/.env.example` and `ml-risk-engine/.env.example`.
   - [ ] Create `admin-dashboard/.env.example` and `mobile-app/.env.example`.
   - [ ] Verify `.gitignore` contains `*.env` and `.env` rules.

2. **Phase B: Infrastructure Verification Validation**
   - [ ] Validate Docker Compose configuration and container port mappings (`5432` for PostGIS, `6379` for Redis).
   - [ ] Validate PostGIS extension initialization syntax in docker-compose.

3. **Phase C: Automated Syntax & Environment Integrity Checks**
   - [ ] Verify all required keys match schema definitions in `GEMINI.md` section 3 and `docker-compose.yml`.

---

## 6. Edge Cases & Failure Recovery

- **Credential Leakage**: By ensuring `.gitignore` ignores all `.env*` except `.env.example`, developers cannot accidentally commit API keys.
- **Port Conflicts**: Standard development ports (`5432`, `6379`, `3000`, `8000`, `3001`) are explicitly documented with configuration overrides for CI environments.

---

## 7. Verification & Acceptance Criteria

### Automated Tests
```bash
# Verify all .env.example files exist and contain required keys
node -e "
const fs = require('fs');
const files = ['.env.example', 'backend-spatial/.env.example', 'ml-risk-engine/.env.example', 'admin-dashboard/.env.example', 'mobile-app/.env.example'];
for (const f of files) {
  if (!fs.existsSync(f)) throw new Error('Missing: ' + f);
  console.log('✓ Found ' + f);
}
"
```

### Acceptance Checklist
- [ ] Master `.env.example` created at root documenting all secrets.
- [ ] Module `.env.example` files created for all 4 sub-projects.
- [ ] `.gitignore` verified for `.env` exclusion.
- [ ] Docker Compose postgres and redis definitions verified.
