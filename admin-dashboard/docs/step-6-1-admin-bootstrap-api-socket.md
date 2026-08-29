# 📋 Technical Specification — Step 6.1: Admin Dashboard Bootstrap, API Client, TanStack Query & Socket.IO Gateway

> **Step ID**: `6.1`  
> **Feature**: Admin Dashboard Bootstrap, API Client, TanStack Query & Socket.IO Gateway  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-1-admin-bootstrap-api-socket`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.1, 6.2)

---

## 1. Architectural Overview & Context

Step 6.1 establishes the foundational infrastructure for the **Safe Yatra Admin Command Center** (`admin-dashboard`). The Admin Dashboard is a Next.js 14 App Router portal designed for incident commanders, safety officers, and tourism administrators to monitor real-time distress signals, manage danger zones, execute sector broadcasts, and inspect live macro heatmaps.

To ensure high-throughput real-time responsiveness and zero-latency incident tracking, this step constructs:
1. **Typed SSR-Safe Storage & API Client**: Token persistence and Axios instance configured with Bearer JWT auto-injection and standard `{ success, data, error }` response unwrapping.
2. **Admin Auth Service & Context (`AuthContext`)**: Role-guarded session management enforcing `ADMIN` privilege tier and profile auto-hydration from `GET /api/v1/auth/me`.
3. **TanStack React Query Provider (`QueryProvider`)**: Configured with hydration-safe `QueryClient`, optimal `staleTime` (30s), automatic window refocus policies, and background polling.
4. **Resilient Socket.IO Gateway (`socketService`)**: Singleton real-time client authenticating with admin JWT, handling reconnection, and exposing typed subscription dispatchers for `sos:triggered`, `sos:mitra_location`, `danger:score_update`, and `admin:broadcast`.
5. **Next.js 14 App Router Layout Integration**: Wrapping the component tree with `QueryProvider` and `AuthProvider` alongside an accessible, responsive sidebar navigation shell.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD CLIENT ARCHITECTURE                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Root Layout & Providers                   │   │
│   │   QueryProvider (@tanstack/react-query)                        │   │
│   │   AuthProvider (AuthContext + storage token hydration)         │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                 ┌─────────────────┴─────────────────┐                  │
│                 ▼                                   ▼                  │
│   ┌───────────────────────────┐       ┌────────────────────────────┐   │
│   │    REST API Client        │       │   Socket.IO Gateway        │   │
│   │    (services/api.ts)      │       │   (services/socketService) │   │
│   │                           │       │                            │   │
│   │ • Bearer JWT Interceptor  │       │ • JWT Handshake Auth       │   │
│   │ • Error Envelope Handling │       │ • Admin Room Auto-Join     │   │
│   │ • Auth & User Endpoints   │       │ • Typed Event Listeners    │   │
│   └─────────────┬─────────────┘       └──────────────┬─────────────┘   │
│                 │                                    │                 │
└─────────────────┼────────────────────────────────────┼─────────────────┘
                  │ REST (/api/v1/*)                   │ WebSocket
                  ▼                                    ▼
       ┌─────────────────────────────────────────────────────────────────┐
       │             Backend Spatial Server (Node.js/Express)            │
       └─────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 380$ LOC total across clean TypeScript modules. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests & config) | 5 focused service/provider files + 1 layout update + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Admin client bootstrapping, API client, auth context, query provider & socket gateway. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 60\%$ context budget for verify/ship cycles. |

---

## 3. Detailed Component Specifications

### 3.1 Storage Client (`src/services/storage.ts`)
- Implements SSR-safe accessors for browser `localStorage` (with cookie/in-memory fallback during server rendering).
- Methods:
  - `getAuthToken(): string | null`
  - `setAuthToken(token: string): void`
  - `removeAuthToken(): void`
  - `getStoredUser(): AdminUser | null`
  - `setStoredUser(user: AdminUser): void`
  - `clearStorage(): void`

### 3.2 Axios REST API Client (`src/services/api.ts`)
- Configured with `baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'`.
- Request Interceptor: Injects `Authorization: Bearer <token>` from `storage.getAuthToken()`.
- Response Interceptor: Unwraps standard backend `{ success: true, data: T }` envelope, transforming error payloads into structured `ApiError` instances.

### 3.3 Admin Auth Service & Context (`src/services/authService.ts`, `src/context/AuthContext.tsx`)
- Types:
  ```typescript
  export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN';
    phoneNumber?: string;
  }

  export interface AuthState {
    user: AdminUser | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
  }
  ```
- `AuthContext` behavior:
  - On mount: checks `storage.getAuthToken()`, executes `authService.getMe()`, verifies `user.role === 'ADMIN'`. If role mismatch or invalid token, resets session.
  - Exposes `useAuth()` custom hook with error boundary guard.

### 3.4 TanStack Query Provider (`src/providers/QueryProvider.tsx`)
- Next.js 14 `'use client'` provider wrapper initializing a `QueryClient` singleton:
  ```typescript
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
  ```

### 3.5 Resilient Socket.IO Gateway (`src/services/socketService.ts`)
- Singleton pattern managing active Socket.IO connection to `process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'`.
- Methods:
  - `connect(token?: string): Socket`
  - `disconnect(): void`
  - `isConnected(): boolean`
  - `onSOSTriggered(cb: (data: SOSTriggeredEvent) => void): () => void`
  - `onSOSAccepted(cb: (data: SOSAcceptedEvent) => void): () => void`
  - `onMitraLocation(cb: (data: MitraLocationEvent) => void): () => void`
  - `onSOSResolved(cb: (data: SOSResolvedEvent) => void): () => void`
  - `onDangerScoreUpdate(cb: (data: DangerScoreUpdateEvent) => void): () => void`
  - `onBroadcastAlert(cb: (data: BroadcastAlertEvent) => void): () => void`
  - Cleanup unsubscribe functions returned for React `useEffect` hooks.

### 3.6 Layout & Navigation Modernization (`src/app/layout.tsx`)
- Mounts `QueryProvider` and `AuthProvider`.
- Renders command center sidebar with active route badges, system health pill, and responsive navigation items.

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/bootstrap-auth-socket.test.ts`
1. **Storage Unit Tests**: SSR safety, token set/get/remove, user serialization.
2. **API Client Unit Tests**: Axios baseUrl resolution, Bearer header attachment, error unwrapping.
3. **Auth Service & Context Tests**: Login flow, non-admin role rejection (403), logout teardown.
4. **Socket Gateway Tests**: Connect with auth token, event registration, callback dispatch, cleanup unsubscribe.
5. **Query Provider Tests**: Successful React component tree wrapping and query client initialization.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math ($0.35/\dots$)**: N/A (Consumed as client).
> - **PostGIS Spatial Queries**: N/A (Handled on backend).
> - **SOS Multi-State Transitions**: Client-side event consumption only.
> 
> **Verdict**: Standard architectural implementation; Sequential Thinking MCP is **not strictly required** for Step 6.1.
