# 📋 Technical Specification — Step 6.2: Admin Authentication Screen & Route Protection Guard

> **Step ID**: `6.2`  
> **Feature**: Admin Authentication Screen & Route Protection Guard  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-2-admin-login-auth-guard`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.2)

---

## 1. Architectural Overview & Context

Step 6.2 delivers the official authentication portal and route protection boundary for the **Safe Yatra Admin Command Center** (`admin-dashboard`). Because the command center grants access to critical emergency operations (triggering mass sector evacuation alerts, overriding danger scores, tracking live tourist SOS positions, and dispatching volunteers), unauthorized access must be blocked at both the API and client routing levels.

This step introduces:
1. **Command Portal Login Screen (`src/app/login/page.tsx`)**: High-contrast, accessible authentication interface with real-time input validation, error alert banner, password visibility toggle, and a 1-tap **Demo Credential Auto-Fill Pill** designed for SIH judges.
2. **Client-Side Route Protection Guard (`src/components/auth/AuthGuard.tsx`)**: Intercepts navigation transitions across Next.js 14 App Router routes:
   - Redirects unauthenticated visitors or expired sessions attempting to access protected dashboards to `/login`.
   - Redirects already-authenticated administrators visiting `/login` directly to `/` (Dashboard Overview).
   - Renders a clean full-screen pulse state during session initialization without layout flicker.
3. **Adaptive Root Shell Layout (`src/app/layout.tsx`)**: Conditionally renders the Command Center `Sidebar` only on protected internal screens, allowing `/login` to render a clean full-bleed login layout.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ADMIN ROUTE PROTECTION LIFECYCLE                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                        Visitor Navigates to Route                      │
│                                   │                                    │
│                                   ▼                                    │
│                        ┌────────────────────┐                          │
│                        │     AuthGuard      │                          │
│                        │ (Loading Check)    │                          │
│                        └─────────┬──────────┘                          │
│                                  │                                     │
│            ┌─────────────────────┴─────────────────────┐               │
│            ▼                                           ▼               │
│     Path is `/login`                           Protected Path          │
│            │                                   (/, /sos, /zones, ...)  │
│      ┌─────┴─────┐                                     │               │
│      ▼           ▼                               ┌─────┴─────┐         │
│  Is Admin?    Not Admin?                         ▼           ▼         │
│      │           │                           Is Admin?    Not Admin?   │
│   Redirect    Render                             │           │         │
│    to `/`    Login UI                        Render View  Redirect     │
│                                              + Sidebar   to `/login`   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 260$ LOC total across login page, auth guard, and layout adaptation. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 2 source files (`login/page.tsx`, `AuthGuard.tsx`) + 1 layout update + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Admin authentication interface, credential validation & route access enforcement. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 65\%$ context budget for verify/ship cycles. |

---

## 3. Component Contract & Interface Details

### 3.1 Login Page (`src/app/login/page.tsx`)
- State:
  - `email: string` (default: `''`)
  - `password: string` (default: `''`)
  - `showPassword: boolean` (toggle visibility)
  - `validationErrors: { email?: string; password?: string }`
  - `apiError: string | null`
  - `isSubmitting: boolean`
- Validation Rules:
  - Email: Non-empty, valid email format regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
  - Password: Minimum 6 characters.
- Judge Quick-Fill Button:
  - Injects `admin@safeyatra.in` and default password to allow instant testing during hackathon presentations.
- On Submit:
  - Calls `auth.login({ email, password })`.
  - On success, Next.js `router.push('/')`.
  - On failure, captures error message and displays high-visibility alert banner.

### 3.2 Route AuthGuard (`src/components/auth/AuthGuard.tsx`)
- Props: `{ children: ReactNode }`
- Logic:
  - Reads `pathname` via `usePathname()`.
  - Reads `isAuthenticated`, `isLoading`, `user` from `useAuth()`.
  - If `isLoading`: renders centered spinner skeleton.
  - If `pathname === '/login'`:
    - If `isAuthenticated`: `router.replace('/')` and return null.
    - Otherwise render `children` without sidebar.
  - If protected route:
    - If `!isAuthenticated`: `router.replace('/login')` and return null.
    - Otherwise render `<Sidebar />` + `<main>{children}</main>`.

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/login-auth-guard.test.tsx`
1. **Form Validation Tests**:
   - Rejects invalid email syntax.
   - Rejects empty password.
   - Clears field error upon user correction.
2. **Demo Quick-Fill Test**:
   - Clicking "Quick Fill" button populates email and password fields immediately.
3. **Login Execution Tests**:
   - Submits credentials, invokes `authService.login`, and redirects to `/`.
   - Displays error banner when `authService.login` rejects with 401 or 403.
4. **AuthGuard Route Protection Tests**:
   - Renders loading spinner while session initializes.
   - Redirects unauthenticated users on protected paths to `/login`.
   - Renders protected content and sidebar when authenticated as `ADMIN`.
   - Redirects authenticated admins away from `/login` to `/`.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: N/A.
> - **PostGIS Spatial Queries**: N/A.
> - **SOS Multi-State Transitions**: N/A.
> 
> **Verdict**: Standard UI authentication and routing; Sequential Thinking MCP is **skipped** for this step.
