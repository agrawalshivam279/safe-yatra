# 📋 Technical Specification — Step 6.4: Macro Heatmap & Hazard Zone Layers

> **Step ID**: `6.4`  
> **Feature**: Macro Heatmap & Hazard Zone Layers  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-4-admin-macro-heatmap`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10, 11), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.4)

---

## 1. Architectural Overview & Context

Step 6.4 introduces the **Macro Heatmap & Hazard Visualization Engine** (`src/app/heatmap/page.tsx`) in the Safe Yatra Admin Command Center. This page visualizes nationwide tourist footfall density and geographic danger polygons on an interactive map, enabling safety officials to instantly identify congestion bottlenecks, flash-flood hazard sectors, and high-risk trekking circuits.

This step delivers:
1. **Map Data Service & Reactive Query Hook (`src/services/mapService.ts`, `src/hooks/useHeatmapData.ts`)**:
   - Queries `GET /api/v1/admin/heatmap` for privacy-preserving GPS density clusters (`ST_SnapToGrid` aggregations).
   - Queries `GET /api/v1/zones` for spatial polygons and real-time hazard tiers.
   - Subscribes to Socket.IO `danger:score_update` for real-time polygon score refreshes.
2. **Interactive Map Component (`src/components/maps/HeatmapMap.tsx`)**:
   - Renders GeoJSON hazard polygons calibrated to GEMINI.md color specifications (`LOW` 🟢, `MODERATE` 🟡, `SEVERE` 🟠, `CRITICAL` 🔴).
   - Renders tourist footfall density markers and cluster halos.
   - Interactive zone selection displaying AI risk justification and 4-factor risk breakdowns.
3. **Macro Heatmap Page (`src/app/heatmap/page.tsx`)**:
   - Layer visibility controls (Toggle Heatmap / Toggle Hazard Polygons).
   - Sector severity filter pills (`ALL`, `CRITICAL`, `SEVERE`, `MODERATE`, `LOW`).
   - Selected zone inspector card with direct navigation link to Zone Management (`/zones/[id]`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MACRO HEATMAP ARCHITECTURE                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Backend Spatial                                                      │
│   GET /admin/heatmap (Density Clusters)                                │
│   GET /zones (PostGIS GeoJSON Polygons)                                │
│                  │                                                     │
│                  ▼  (React Query + Socket.IO)                          │
│     ┌────────────────────────────────┐                                 │
│     │       useHeatmapData Hook      │◄─────── Socket.IO Invalidation  │
│     └────────────────┬───────────────┘        (danger:score_update)    │
│                      │                                                 │
│                      ▼                                                 │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Macro Heatmap Page (/heatmap)                  │   │
│   │                                                                │   │
│   │  [Controls]: [✓ Heatmap] [✓ Danger Polygons]  [Filters: ALL]   │   │
│   │  ┌────────────────────────────────────────┐ ┌────────────────┐ │   │
│   │  │                                        │ │ Zone Inspector │ │   │
│   │  │   Interactive Map View                 │ │ - Tiger Point  │ │   │
│   │  │   • Footfall Density Clusters          │ │ - Score: 82 🔴 │ │   │
│   │  │   • Color-Coded Hazard Polygons        │ │ - 4 Factors    │ │   │
│   │  │                                        │ │ - Justify Memo │ │   │
│   │  └────────────────────────────────────────┘ └────────────────┘ │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 330$ LOC total across map service, query hook, map component, and page. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 3 source files (`mapService.ts`, `HeatmapMap.tsx`, `useHeatmapData.ts`) + 1 page + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Macro density heatmap rendering, hazard polygon overlays, and layer controls. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 60\%$ context budget for verify/ship cycles. |

---

## 3. Data Contracts & Interfaces

### 3.1 Heatmap & Zone Models
```typescript
export interface HeatmapCluster {
  lat: number;
  lng: number;
  count: number;
  intensity: number;
}

export interface HeatmapData {
  clusters: HeatmapCluster[];
  totalPoints: number;
  generatedAt: string;
}

export interface ZoneData {
  id: string;
  name: string;
  dangerScore: number;
  tier: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  coordinates: {
    lat: number;
    lng: number;
  };
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  factors?: {
    weather: { score: number; weight: number };
    terrain: { score: number; weight: number };
    crowd: { score: number; weight: number };
    history: { score: number; weight: number };
  };
  justification?: string;
  updatedAt?: string;
}
```

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/macro-heatmap.test.tsx`
1. **Service Tests**: Validates `mapService.getHeatmapData()` and `mapService.getZones()`.
2. **Hook Invalidation Tests**: Verifies `useHeatmapData` refreshes on `danger:score_update`.
3. **Map Rendering Tests**: Verifies polygon layers render with appropriate danger tier colors.
4. **Layer Toggle & Filter Tests**: Toggles heatmap layer, danger polygon layer, and tests severity filter buttons (`ALL`, `CRITICAL`, `SEVERE`).
5. **Zone Selection Test**: Clicking a zone renders the inspection drawer with score gauge and AI explanation.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: N/A.
> - **PostGIS Spatial Queries**: Server-side executed; client renders GeoJSON.
> - **SOS Multi-State Transitions**: N/A.
> 
> **Verdict**: Standard interactive map UI and GeoJSON layers; Sequential Thinking MCP is **skipped** for this step.
