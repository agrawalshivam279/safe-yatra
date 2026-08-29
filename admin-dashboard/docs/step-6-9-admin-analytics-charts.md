# 📋 Technical Specification — Step 6.9: Analytics & Telemetry Charts (Phase 6 Finale)

> **Step ID**: `6.9`  
> **Feature**: Analytics & Telemetry Charts  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-9-admin-analytics-charts`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.9)

---

## 1. Architectural Overview & Context

Step 6.9 delivers the **Command Center Analytics Suite** (`src/app/analytics/page.tsx`), completing Phase 6 of the Safe Yatra ecosystem. This page equips disaster management authorities and pilgrimage temple trusts with comprehensive historical telemetry, predictive risk trajectories, and emergency response performance benchmarks.

This step introduces:
1. **Analytics Data Service & Reactive Query (`src/services/analyticsService.ts`, `src/hooks/useAdminAnalyticsCharts.ts`)**:
   - `getAnalyticsOverview(days)`: Aggregates danger score trajectories, daily SOS incident histograms, incident category distributions, and Yaatri Mitra dispatch SLA metrics.
2. **Interactive Multi-Chart Dashboard (`src/app/analytics/page.tsx`)**:
   - **Line Chart**: 7-day risk trajectories for top 5 key pilgrimage sectors.
   - **Bar Chart**: Daily SOS distress incident volume (Triggered vs Resolved).
   - **Donut / Pie Chart**: Incident category distribution (Medical, Flash Flood, Stranded/Lost, Landslide, General).
   - **SLA Velocity Gauge**: Average first responder arrival time (3.4 min) against target standard (5.0 min).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ANALYTICS & TELEMETRY SUITE                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   GET /admin/analytics ──► [Analytics Telemetry Service]              │
│                                  │                                     │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│   [7-Day Danger Line]    [Daily SOS Bar]       [Incident Donut]        │
│   Top 5 Hazard Zones     Triggered vs Resolved Category Distribution   │
│         │                        │                        │            │
│         └────────────────────────┼────────────────────────┘            │
│                                  ▼                                     │
│                     [Responder SLA Velocity Meter]                     │
│                     3.4 min avg vs 5.0 min target                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 350$ LOC total across service, reactive hook, page view, and unit test suite. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 2 service/hook files + 1 page view (`src/app/analytics/page.tsx`) + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Macro analytics, risk time-series charts, and emergency response SLA benchmarks. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 40\%$ context budget for verify/ship cycles. |

---

## 3. Data Contracts & Interfaces

### 3.1 Analytics Overview Model
```typescript
export interface DangerTrendPoint {
  date: string;
  [zoneName: string]: number | string;
}

export interface DailySOSPoint {
  date: string;
  triggered: number;
  resolved: number;
}

export interface IncidentTypeDistribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SLAStats {
  avgResponseTimeMinutes: number;
  targetMinutes: number;
  withinTargetPercentage: number;
  totalRescues: number;
}

export interface AnalyticsOverviewData {
  timeframe: string;
  dangerTrends: DangerTrendPoint[];
  dailySOS: DailySOSPoint[];
  incidentTypes: IncidentTypeDistribution[];
  sla: SLAStats;
  summary: {
    totalIncidents: number;
    activeZonesCount: number;
    resolutionRatePercentage: number;
    protectedTouristsCount: number;
  };
}
```

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/analytics-page.test.tsx`
1. **Service Tests**: Validates `analyticsService.getAnalyticsOverview()` structure and defaults.
2. **Chart Rendering Tests**: Renders all 4 visual components (Danger Line, SOS Bar, Category Donut, SLA Gauge).
3. **Timeframe Filter Tests**: Toggles timeframe pills (7D / 30D).
4. **SLA Calculation Tests**: Validates response time calculation and target compliance indicator.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: Rendered from historical aggregates.
> - **PostGIS Spatial Queries**: N/A.
> - **SOS Multi-State Transitions**: N/A.
> 
> **Verdict**: Standard data visualization and chart dashboard; Sequential Thinking MCP is **skipped** for this step.
