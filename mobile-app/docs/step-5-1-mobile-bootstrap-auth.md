# 📄 Technical Specification: Mobile App Bootstrap, Secure API Client, Auth Context & Network Hook

> **Step ID**: `5.1` & `5.2`  
> **Target Module**: `mobile-app`  
> **Git Feature Branch**: `feat/step-5-1-mobile-bootstrap-auth`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 5.1 & 5.2 establishes the core architectural foundation for the Safe Yatra Mobile Application (React Native / Expo 51):
1. **Secure Storage Layer (`services/storage.ts`)**: Hardware-backed token and session persistence via `expo-secure-store` with web localStorage fallback.
2. **Resilient Axios API Client (`services/api.ts`)**: Pre-configured HTTP client with automated Bearer token injection, request timeouts (10s), single-flight 401 token refresh queue, and standardized error parsing.
3. **Authentication Service (`services/authService.ts`)**: Type-safe REST client for `login`, `register`, `refreshToken`, and `getMe` communicating with `backend-spatial`.
4. **Global Authentication Context (`context/AuthContext.tsx`)**: React Context provider exposing user session, active persona (`TOURIST` vs `YAATRI_MITRA`), token management, and auto-restoration on app mount.
5. **Network Connectivity Hook (`hooks/useNetworkStatus.ts`)**: Real-time network state detection using `expo-network` supporting offline SMS fallback activation.

---

## 2. Dependencies & Prerequisites

- **Dependencies**:
  - `expo-secure-store` (~13.0.0)
  - `expo-network` (~6.0.0)
  - `axios` (^1.7.0)
  - `react` (18.2.0), `react-native` (0.74.0)
- **Backend Service**: `backend-spatial` endpoints (`/api/v1/auth/*`).

---

## 3. Key Invariants & Architectural Patterns

### 3.1 Single-Flight Token Refresh Mutex (Axios Interceptor)
```typescript
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

// When a 401 UNAUTHORIZED is received:
// 1. Queue all concurrent failed requests.
// 2. Refresh token once via POST /api/v1/auth/refresh.
// 3. Replay queued requests with new token.
// 4. If refresh fails, clear tokens and emit logout.
```

### 3.2 Dual-Role Persona Architecture
- Tourists and Yaatri Mitras share the same secure session storage but differ in role properties:
  - `role === 'TOURIST'` $\rightarrow$ tourist map, pre-trip briefing, geofence breach modals, panic SOS button.
  - `role === 'YAATRI_MITRA'` $\rightarrow$ on-duty toggle, nearby SOS incident alerts, rescue navigation.

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: Secure Storage (`services/storage.ts`)**
   - [ ] Implement `setItem`, `getItem`, `removeItem`, `clearAuth` with `expo-secure-store`.

2. **Phase B: Axios Client & Interceptors (`services/api.ts`)**
   - [ ] Configure `baseURL` from `EXPO_PUBLIC_API_URL`.
   - [ ] Implement request interceptor attaching `Authorization: Bearer <token>`.
   - [ ] Implement response interceptor handling 401 with automated token refresh mutex.

3. **Phase C: Auth Service (`services/authService.ts`)**
   - [ ] Implement typed methods `login`, `register`, `refreshToken`, `getMe`, `logout`.

4. **Phase D: AuthContext & Provider (`context/AuthContext.tsx`)**
   - [ ] Implement `AuthProvider` restoring stored token on mount.
   - [ ] Implement `useAuth()` custom hook.

5. **Phase E: Network Connectivity Hook (`hooks/useNetworkStatus.ts`)**
   - [ ] Implement `useNetworkStatus()` using `expo-network` with periodic checks and cleanup.

6. **Phase F: Test Suite (`__tests__/auth-api-storage.test.ts`)**
   - [ ] Unit tests for storage, API interceptors, token refresh queue, authService, AuthContext, and useNetworkStatus.

---

## 5. Verification & Acceptance Criteria

### Automated Tests
```bash
cd mobile-app && npm test -- __tests__/auth-api-storage.test.ts
```

### Acceptance Checklist
- [ ] Storing tokens securely persists across app reloads.
- [ ] 401 response triggers automated refresh without user disruption.
- [ ] Expired refresh token correctly wipes session and emits logout.
- [ ] Network status hook accurately reports connection state and cleans up on unmount.
- [ ] 100% test pass rate with zero TypeScript errors.
