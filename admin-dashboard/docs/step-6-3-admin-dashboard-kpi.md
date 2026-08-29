# 📋 Technical Specification — Step 6.3: Dashboard Home & Live KPI Cards

> **Step ID**: `6.3`  
> **Feature**: Dashboard Home & Live KPI Cards  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-3-admin-dashboard-kpi`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.3)

---

## 1. Architectural Overview & Context

Step 6.3 delivers the **Safe Yatra Command Center Overview** (`src/app/page.tsx`). As the central landing portal for tourism safety commissioners, the dashboard provides immediate situational awareness across pilgrimage corridors and trekking circuits.

This step introduces:
1. **Admin Analytics API & Hook (`src/services/adminService.ts`, `src/hooks/useAdminAnalytics.ts`)**:
   - Consumes Backend Spatial `GET /api/v1/admin/analytics`.
   - Manages automatic background polling via `@tanstack/react-query` (`refetchInterval: 30000`).
   - Hooks into Socket.IO real-time events (`sos:triggered`, `sos:resolved`, `danger:score_update`) for immediate cache invalidation.
2. **Reusable Metric KPI Card (`src/components/analytics/KPICard.tsx`)**:
   - High-contrast telemetry card displaying key counters, trend indicators, danger badges, and loading skeletons.
3. **Command Center Overview Screen (`src/app/page.tsx`)**:
   - Top Operational Readiness Banner.
   - 4 Primary Metric Cards:
     1. 🆘 **Active Emergency SOS**: Real-time distress counter with immediate link to `/sos`.
     2. 👥 **Active Monitored Tourists**: Current footfall telemetry across all pilot sectors.
     3. 🤝 **On-Duty Yaatri Mitras**: Field responder readiness count (`X on duty / Y total`).
     4. 🚨 **Critical Hazard Zones**: Immediate count of `CRITICAL` + `SEVERE` sectors.
   - Sector Hazard Distribution Bar (`LOW`, `MODERATE`, `SEVERE`, `CRITICAL`).
   - 1-Click Command Navigation Tiles.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DASHBOARD KPI DATA & EVENT FLOW                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Backend Spatial (/api/v1/admin/analytics)                            │
│                  │                                                     │
│                  ▼  (30s Polling / Initial Load)                       │
│     ┌───────────────────────────────┐                                  │
│     │     useAdminAnalytics Hook    │◄─────── Socket.IO Invalidation   │
│     │     (@tanstack/react-query)   │        (sos:triggered, etc.)     │
│     └───────────────┬───────────────┘                                  │
│                     │                                                  │
│                     ▼                                                  │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │             Dashboard Home (src/app/page.tsx)                  │   │
│   │                                                                │   │
│   │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────┐ │   │
│   │  │ Active SOS   │  │ Tourists     │  │ Mitras      │  │Zone │ │   │
│   │  │ Count: 2     │  │ Count: 142   │  │ Ready: 8/15 │  │Crit │ │   │
│   │  └──────────────┘  └──────────────┘  └─────────────┘  └─────┘ │   │
│   │                                                                │   │
│   │  ┌──────────────────────────────────────────────────────────┐  │   │
│   │  │ Sector Hazard Tier Breakdown (Progress Distribution)     │  │   │
│   │  └──────────────────────────────────────────────────────────┘  │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 290$ LOC total across service, hook, KPI card, and dashboard page. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 3 source files (`adminService.ts`, `KPICard.tsx`, `useAdminAnalytics.ts`) + 1 page update + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Real-time analytics aggregation, KPI presentation & quick-action navigation. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 65\%$ context budget for verify/ship cycles. |

---

## 3. Component Contract & Interface Details

### 3.1 Admin Analytics Data Contract
```typescript
export interface AdminAnalyticsData {
  totalSosCount: number;
  activeSosCount: number;
  resolvedSosCount: number;
  avgResponseTimeMinutes: number;
  activeTourists: number;
  onDutyMitras: number;
  totalVolunteers: number;
  criticalZones: number;
  severeZones: number;
  moderateZones: number;
  lowZones: number;
  zoneTierDistribution: {
    CRITICAL: number;
    SEVERE: number;
    MODERATE: number;
    LOW: number;
  };
}
```

### 3.2 KPICard Component (`src/components/analytics/KPICard.tsx`)
```typescript
export interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
  };
  trend?: {
    value: string;
    isPositive: boolean;
  };
  isLoading?: boolean;
  onClick?: () => void;
  href?: string;
}
```

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/dashboard-kpi.test.tsx`
1. **Service Tests**: Validates `adminService.getAnalytics()` parsing.
2. **KPICard Unit Tests**: Renders title, value, badge variants, and loading skeletons.
3. **Dashboard Page Integration Tests**: Renders all 4 KPI cards and sector breakdown from mocked analytics query.
4. **Real-Time Invalidation Tests**: Verifies Socket.IO event handler invalidates React Query cache on SOS and danger score broadcasts.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: N/A.
> - **PostGIS Spatial Queries**: N/A.
> - **SOS Multi-State Transitions**: N/A.
> 
> **Verdict**: Standard UI analytics dashboard with React Query caching; Sequential Thinking MCP is **skipped** for this step.
