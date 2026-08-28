# 📄 Technical Specification: Global Middleware Stack & Standard Response Envelopes

> **Step ID**: `4.2`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-2-middleware-response-envelopes`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.2 implements the core HTTP request pipeline and standard response envelopes for `backend-spatial`. Standardizing the JSON response envelope (`ok()` and `fail()`) and centralizing error handling, rate limiting, and 404 catches guarantees strict contract compliance across all frontend consumers (React Native `mobile-app` and Next.js `admin-dashboard`) per `GEMINI.md` Section 9.

This establishes predictable, resilient error recovery for Zod schema validation failures, database constraint exceptions, rate limit exhaustion, and unhandled runtime exceptions.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Configuration singletons (`src/config/env.ts`, `src/config/database.ts`, `src/config/redis.ts`).
  - Packages: `express`, `zod`, `helmet`, `cors`, `morgan`, `express-rate-limit`, `supertest`.
- **Blocked by**: None.
- **New Packages / Libraries**: `express-rate-limit`, `supertest` (installed in `backend-spatial/package.json`).

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Uniform Envelope Invariant*: Every HTTP response returned from `backend-spatial` must conform to `{ success: boolean, data: T | null, error: { code: string, message: string, details?: unknown } | null, meta?: Record<string, unknown> }`.
  2. *Predictable Status Code Mapping*:
     - `200 OK` / `201 Created` for successful business actions.
     - `400 Bad Request` with code `'VALIDATION_ERROR'` for malformed request bodies or Zod schema mismatches.
     - `401 Unauthorized` with code `'UNAUTHORIZED'` for missing/invalid JWT tokens.
     - `403 Forbidden` with code `'FORBIDDEN'` for insufficient role privileges.
     - `404 Not Found` with code `'NOT_FOUND'` for undefined routes and missing records.
     - `429 Too Many Requests` with code `'RATE_LIMIT_EXCEEDED'` when request thresholds are crossed.
     - `500 Internal Server Error` with code `'INTERNAL_SERVER_ERROR'` for unhandled runtime failures.
  3. *Error Masking in Production*: Internal error stack traces and sensitive database error details must never leak in `NODE_ENV === 'production'`.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered.
- [x] **Prisma Error Translation**: Prisma `PrismaClientKnownRequestError` codes (e.g. `P2002` unique constraint violation, `P2025` record not found) are cleanly mapped to standard HTTP 400/404 responses rather than crashing the Express process.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Response Envelope & AppError (`src/utils/response.ts`)

```typescript
import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const ok = <T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
  statusCode = 200
): Response => {
  const responsePayload: ApiSuccessResponse<T> = {
    success: true,
    data,
    error: null,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};

export const fail = (
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
  meta?: Record<string, unknown>
): Response => {
  const responsePayload: ApiErrorResponse = {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(responsePayload);
};
```

### 5.2 Global Error Handler (`src/middleware/errorHandler.ts`)

```typescript
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, fail } from '../utils/response';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Known Operational AppError
  if (err instanceof AppError) {
    fail(res, err.code, err.message, err.statusCode, err.details);
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    fail(res, 'VALIDATION_ERROR', 'Request validation failed', 400, formattedErrors);
    return;
  }

  // 3. Syntax / JSON Parse Error
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    fail(res, 'INVALID_JSON', 'Malformed JSON in request body', 400);
    return;
  }

  // 4. Unhandled Internal Server Errors (500)
  if (env.NODE_ENV !== 'test') {
    console.error('💥 [Unhandled Error]:', err);
  }

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  fail(
    res,
    'INTERNAL_SERVER_ERROR',
    message,
    500,
    env.NODE_ENV !== 'production' ? { stack: err.stack } : undefined
  );
};
```

### 5.3 Rate Limiter Middleware (`src/middleware/rateLimiter.ts`)

```typescript
import rateLimit from 'express-rate-limit';
import { fail } from '../utils/response';
import { env } from '../config/env';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 100, // Limit per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'true',
  handler: (_req, res) => {
    fail(
      res,
      'RATE_LIMIT_EXCEEDED',
      'Too many requests from this IP, please try again after 15 minutes.',
      429
    );
  },
});
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Response Helpers & AppError Class**
   - [ ] Implement `src/utils/response.ts` with `ok()`, `fail()`, and `AppError`.
2. **Phase B: Global Middleware Components**
   - [ ] Implement `src/middleware/errorHandler.ts` supporting `AppError`, `ZodError`, syntax errors, and 500 fallbacks.
   - [ ] Implement `src/middleware/rateLimiter.ts` with standard 429 response formatting.
3. **Phase C: Application Pipeline Integration**
   - [ ] Update `src/index.ts` to mount `rateLimiter`, standard `/health` endpoint using `ok()`, 404 handler, and `errorHandler`.
4. **Phase D: Comprehensive Test Suite**
   - [ ] Author `tests/middleware.test.ts` testing `ok()`, `fail()`, `AppError`, Zod validation errors, 404 catches, 429 rate limit triggers, and 500 error sanitization.

---

## 7. Edge Cases & Failure Recovery

- **Malformed JSON Payloads**: Caught cleanly by `SyntaxError` check, returning 400 `INVALID_JSON` rather than unhandled 500 HTML.
- **Nested Zod Validation Failures**: Formats nested array/object path fields (e.g. `coordinates.0.lat`) into clear diagnostic objects.
- **Undefined Routes (404)**: Caught by dedicated catch-all middleware before falling through, returning standard `NOT_FOUND` envelope.
- **Production Information Leakage**: Error stacks are stripped in `NODE_ENV === 'production'`.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/middleware.test.ts
```

### Acceptance Checklist
- [ ] `ok()` returns `{ success: true, data, error: null }` with 200/201 status.
- [ ] `fail()` returns `{ success: false, data: null, error: { code, message } }` with appropriate status.
- [ ] `errorHandler` intercepts thrown `AppError` and `ZodError` without crashing the server.
- [ ] Unknown 404 routes return standard `NOT_FOUND` envelope.
- [ ] `GET /health` returns standard `ok()` envelope.
- [ ] All unit and integration tests in `backend-spatial/tests/middleware.test.ts` pass with 100% assertion coverage.
