# 📄 Technical Specification: Auth Validation Schemas & Authentication Service

> **Step ID**: `4.3a`  
> **Target Module**: `backend-spatial`  
> **Git Feature Branch**: `feat/step-4-3a-auth-validation-service`  
> **Status**: 📋 Draft / Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 4.3a establishes the authentication core for `backend-spatial`. It implements runtime input validation schemas using Zod, secure password hashing using `bcryptjs` (salt rounds: 10), symmetric JWT access and refresh token lifecycle management (`jsonwebtoken`), and the core `AuthService` handling user registration, credential verification, token refresh, and profile retrieval per `GEMINI.md` Section 9.

This service serves as the foundation for Role-Based Access Control (RBAC) protecting Tourist, Yaatri Mitra Volunteer, and Admin capabilities across both mobile and web clients.

---

## 2. Dependencies & Prerequisites

- **Depends on**: 
  - Step 4.1: Runtime configuration (`src/config/env.ts`, `src/config/database.ts`).
  - Step 4.2: Standard response helpers and `AppError` operational error class (`src/utils/response.ts`).
  - Packages: `@prisma/client`, `bcryptjs`, `jsonwebtoken`, `zod`, `jest`, `ts-jest`.
- **Blocked by**: None.
- **New Packages / Libraries**: None (`bcryptjs`, `jsonwebtoken`, `zod` are already present in `backend-spatial/package.json`).

---

## 3. 🧠 Sequential Thinking Strategy

- **Core Reasoning Hypotheses**:
  1. *Password Security Invariant*: Passwords must never be stored in plain text. Salt rounds must be fixed to 10 for deterministic, performant hashing without event-loop starvation. Passwords must never be returned in API response objects (`passwordHash` stripped at service boundary).
  2. *JWT Token Segregation Invariant*: Access tokens (`7d` default) and Refresh tokens (`30d`) must contain explicit `type` claims (`'access'` vs `'refresh'`) to prevent using refresh tokens as bearer access tokens on protected routes.
  3. *Unique Identity Invariant*: Duplicate registration attempts with existing email or phone numbers must fail with explicit operational error codes (`EMAIL_EXISTS`, `PHONE_EXISTS`, HTTP 409 Conflict).
  4. *Role Initialization Invariant*: If a user registers with role `YAATRI_MITRA`, their verification status defaults to `PENDING` until vetted by an administrator.

---

## 4. 🗄️ Database & Migration Safety Checklist

- [x] **Zero-Downtime Safe**: No direct database schema modifications or migrations triggered. Interacts with existing `User` and `VolunteerProfile` models defined in `prisma/schema.prisma`.
- [x] **Field Sanitization**: Service methods return sanitized `UserPublicProfile` objects that omit `passwordHash`.
- [x] **Idempotency & Race Handling**: Database unique constraints on `email` and `phone` are caught cleanly and translated to `AppError` instances.

---

## 5. Data Contracts & Schema Specifications

### 5.1 Auth Types (`src/modules/auth/auth.types.ts`)

```typescript
import { UserRole, VerificationStatus } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserPublicProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  languagePreference: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseData {
  user: UserPublicProfile;
  tokens: AuthTokens;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}
```

### 5.2 Zod Validation Schemas (`src/modules/auth/auth.validation.ts`)

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone must be at most 15 digits')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .trim(),
  role: z.enum(['TOURIST', 'YAATRI_MITRA', 'ADMIN']).default('TOURIST'),
  languagePreference: z.string().default('en'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
```

### 5.3 Authentication Service Interface (`src/modules/auth/auth.service.ts`)

```typescript
export class AuthService {
  async hashPassword(password: string): Promise<string>;
  async comparePassword(password: string, hash: string): Promise<boolean>;
  generateTokens(user: { id: string; email: string; role: UserRole }): AuthTokens;
  verifyToken(token: string, expectedType: 'access' | 'refresh'): JwtPayload;
  async register(input: RegisterInput): Promise<AuthResponseData>;
  async login(input: LoginInput): Promise<AuthResponseData>;
  async refreshToken(refreshTokenStr: string): Promise<{ accessToken: string; expiresIn: string }>;
  async getUserProfile(userId: string): Promise<UserPublicProfile>;
}
```

---

## 6. Step-by-Step Implementation Sequence

1. **Phase A: Auth Types & Data Contracts**
   - [ ] Implement `src/modules/auth/auth.types.ts` defining tokens, public user shapes, and JWT payload interfaces.
2. **Phase B: Zod Input Validation Schemas**
   - [ ] Implement `src/modules/auth/auth.validation.ts` with `registerSchema`, `loginSchema`, and `refreshTokenSchema`.
3. **Phase C: Core Authentication Service**
   - [ ] Implement `src/modules/auth/auth.service.ts` with bcrypt hashing, JWT issuance/verification, user registration, authentication, token refresh, and profile fetching.
4. **Phase D: Comprehensive Unit Testing**
   - [ ] Author `tests/auth.service.test.ts` testing password hashing, token validation, registration success, duplicate email/phone handling, invalid login rejection, token refresh, and user profile sanitation.

---

## 7. Edge Cases & Failure Recovery

- **Duplicate Email / Phone**: Caught and thrown as `AppError('Email already registered', 409, 'EMAIL_EXISTS')` or `AppError('Phone already registered', 409, 'PHONE_EXISTS')`.
- **Invalid / Expired JWT**: Caught and thrown as `AppError('Invalid or expired token', 401, 'INVALID_TOKEN')`.
- **Wrong Token Type Used**: Refresh token passed as access token (or vice-versa) is rejected with `AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE')`.
- **Wrong Password**: Constant-time bcrypt comparison prevents timing attacks; throws 401 `INVALID_CREDENTIALS`.

---

## 8. Verification & Acceptance Criteria

### Automated Tests
```bash
cd backend-spatial
npm test -- tests/auth.service.test.ts
```

### Acceptance Checklist
- [ ] Password hashing produces valid bcrypt hashes with salt rounds 10.
- [ ] JWT tokens contain `userId`, `email`, `role`, and `type`.
- [ ] `register()` rejects duplicate email/phone and initializes user records.
- [ ] `login()` verifies passwords and returns sanitized `UserPublicProfile` (no `passwordHash`).
- [ ] `refreshToken()` verifies refresh tokens and issues fresh access tokens.
- [ ] All unit tests in `backend-spatial/tests/auth.service.test.ts` pass with 100% assertion coverage.
