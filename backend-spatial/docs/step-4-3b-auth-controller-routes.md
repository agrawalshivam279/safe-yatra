# 📄 Technical Specification: Auth Controller, Middleware Guards & Routes

> **Step ID**: `4.3b`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-3b-auth-controller-routes`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.3b completes the **Auth Module** of `backend-spatial` by exposing REST API routes (`POST /register`, `POST /login`, `POST /refresh`, `GET /me`) mounted under `/api/v1/auth`. It implements the JWT authentication middleware (`authenticate`) and role-based access control guard (`requireRole`), ensuring all subsequent protected routes across Zones, Danger, SOS, and Admin can securely identify users and enforce role permissions per `GEMINI.md` Section 9.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Runtime configuration singletons (`src/config/env.ts`).
  - Step 4.2: Standard response envelopes (`src/utils/response.ts`).
  - Step 4.3a: Authentication service & validation schemas (`src/modules/auth/auth.service.ts`, `src/modules/auth/auth.validation.ts`).
  - Packages: `express`, `jsonwebtoken`, `zod`, `supertest`.
- **Blocked by**: None.
- **New Packages / Libraries**: None.

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Bearer Authorization Extraction Invariant*: The `authenticate` middleware must inspect the `Authorization` header. If missing, malformed, or not matching `Bearer <token>`, it immediately halts the request pipeline with a 401 `UNAUTHORIZED` envelope.
  2. *Request Context Enrichment*: Upon successful token verification, `authenticate` attaches `req.user = { id, email, role }` to the Express `Request` object for downstream controllers and guards.
  3. *Role-Based Access Control (RBAC)*: `requireRole(...roles)` validates `req.user.role` against authorized role enums (`TOURIST`, `YAATRI_MITRA`, `ADMIN`). Unauthorized roles receive 403 `FORBIDDEN` without invoking controller logic.
  4. *API Envelope Compliance*: Every route controller parses request bodies with Zod and responds using the standard `ok()` / `fail()` envelope.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Controller Error Delegation**: Controller asynchronous operations delegate errors to the centralized `errorHandler` via `next(error)` or `express-async-errors`.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Express Request Extension (`src/middleware/auth.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService } from '../modules/auth/auth.service';
import { fail } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, 'UNAUTHORIZED', 'Authorization header with Bearer token is required', 401);
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = authService.verifyToken(token, 'access');
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err: unknown) {
    next(err);
  }
};
```

### 5.2 Role Guard Middleware (`src/middleware/roleGuard.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { fail } from '../utils/response';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      fail(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      fail(
        res,
        'FORBIDDEN',
        `Access denied. Requires one of roles: ${roles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
};
```

### 5.3 Auth Routes Specification (`src/modules/auth/auth.routes.ts`)

| Method | Endpoint | Auth | Request Body | Response (200/201) |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | None | `RegisterInput` | `{ user, tokens }` |
| `POST` | `/api/v1/auth/login` | None | `LoginInput` | `{ user, tokens }` |
| `POST` | `/api/v1/auth/refresh` | None | `{ refreshToken }` | `{ accessToken, expiresIn }` |
| `GET` | `/api/v1/auth/me` | `Bearer JWT` | None | `{ user }` |

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Authentication & Role Guard Middleware**
   - [ ] Implement `src/middleware/auth.ts` with `authenticate` and `optionalAuthenticate`.
   - [ ] Implement `src/middleware/roleGuard.ts` with `requireRole` factory.
2. **Phase B: Controller & Route Handlers**
   - [ ] Implement `src/modules/auth/auth.controller.ts` with `register`, `login`, `refresh`, and `getMe`.
   - [ ] Implement `src/modules/auth/auth.routes.ts` mounting route endpoints.
3. **Phase C: Application Pipeline Integration**
   - [ ] Mount `/api/v1/auth` in `src/index.ts`.
4. **Phase D: Comprehensive Integration Testing**
   - [ ] Author `tests/auth.routes.test.ts` testing registration, login, refresh, protected `/me`, 401 rejection, and 403 role restrictions via `supertest`.

---

## 7. Edge Cases & Failure Recovery

- **Missing Bearer Prefix**: Returns 401 `UNAUTHORIZED`.
- **Expired Access Token**: Returns 401 `TOKEN_EXPIRED`.
- **Refresh Token Passed to Protected Route**: Fails type verification, returns 401 `INVALID_TOKEN_TYPE`.
- **Unauthorized Role**: Returns 403 `FORBIDDEN`.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/auth.routes.test.ts
```

### Acceptance Checklist
- [ ] `POST /api/v1/auth/register` creates user and returns 201 with `ok()` envelope.
- [ ] `POST /api/v1/auth/login` validates credentials and returns 200 with `ok()` envelope.
- [ ] `POST /api/v1/auth/refresh` exchanges refresh token for fresh access token.
- [ ] `GET /api/v1/auth/me` requires Bearer token and returns sanitized profile.
- [ ] `requireRole` blocks unauthorized roles with 403.
- [ ] All integration tests in `backend-spatial/tests/auth.routes.test.ts` pass.
