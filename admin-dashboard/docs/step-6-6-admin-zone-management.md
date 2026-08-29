# 📋 Technical Specification — Step 6.6: Zone Management & Hazard Score Override

> **Step ID**: `6.6`  
> **Feature**: Zone Management & Hazard Score Override  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-6-admin-zone-management`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10, 11), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.6)

---

## 1. Architectural Overview & Context

Step 6.6 delivers the **Geographic Zone & Hazard Management Suite** in the Safe Yatra Admin Command Center. This gives safety officials the authority to inspect ML hazard scores, execute manual score overrides during field emergencies (such as unpredicted landslides or cloudbursts), and provision new monitored geofence sectors.

This step introduces:
1. **Zone Admin Data Services (`src/services/zoneAdminService.ts`, `src/hooks/useAdminZones.ts`)**:
   - `getZones()`: Consumes `GET /api/v1/zones`.
   - `getZoneById(id)`: Consumes `GET /api/v1/zones/:id`.
   - `overrideZoneScore(id, payload)`: Consumes `PATCH /api/v1/admin/zones/:id/override`.
   - `createZone(payload)`: Consumes `POST /api/v1/geofences`.
2. **Zone Registry Table Screen (`src/app/zones/page.tsx`)**:
   - Filterable data table displaying Sector Name, Risk Tier, Danger Score (0-100), AI vs Manual Override status, and Last Updated.
   - Quick action link to `/zones/create`.
3. **Zone Inspector & Manual Override Screen (`src/app/zones/[id]/page.tsx`)**:
   - Sub-risk factor breakdown gauges (Weather 35%, Terrain 20%, Crowd 25%, Historical 20%).
   - Interactive slider control (0–100) with justification text area and "Apply Score Override" submission.
4. **Geofenced Sector Provisioning Screen (`src/app/zones/create/page.tsx`)**:
   - Metadata form with coordinate bounds, name, description, and initial severity tier.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ZONE MANAGEMENT & OVERRIDE FLOW                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   GET /zones ──────────► [Zone Registry Table (/zones)]               │
│                                  │                                     │
│                                  ▼ (Select Sector)                     │
│                        [Zone Detail & Inspector]                       │
│                        (/zones/[id])                                   │
│                                  │                                     │
│                        [Manual Override Form]                          │
│                        Slider (0-100) + Reason                         │
│                                  │                                     │
│                                  ▼                                     │
│                        PATCH /admin/zones/:id/override                 │
│                                  │                                     │
│                                  ▼                                     │
│                        Socket.IO Broadcast (danger:score_update)       │
│                                  │                                     │
│                                  ▼                                     │
│                        Updates Mobile Apps & Heatmaps Live             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 380$ LOC total across service, reactive hook, 3 page views, and unit tests. |
| **Gate 2: File Limit** | $\le 5$ target source files (+ tests) | 2 service/hook files + 3 pages (`page.tsx`, `[id]/page.tsx`, `create/page.tsx`) + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Hazard zone administration, manual override controls, and geofence provisioning. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 50\%$ context budget for verify/ship cycles. |

---

## 3. Data Contracts & Interfaces

### 3.1 Override & Creation Payload Models
```typescript
export interface ZoneScoreOverridePayload {
  dangerScore: number;
  reason: string;
  expiresAt?: string;
}

export interface CreateZonePayload {
  name: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  boundary?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  severity?: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
}
```

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/zone-management.test.tsx`
1. **Service Tests**: Validates `getZones()`, `getZoneById()`, `overrideZoneScore()`, and `createZone()`.
2. **Zone Registry Table Tests**: Renders zone rows, filters by tier, and links to detail view.
3. **Zone Override Tests**: Interacts with slider and submits override payload with justification.
4. **Zone Creation Tests**: Validates form inputs and dispatches creation request.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: Server-side executed; client provides slider override.
> - **PostGIS Spatial Queries**: Server-side executed.
> - **SOS Multi-State Transitions**: N/A.
> 
> **Verdict**: Standard CRUD and slider form UI; Sequential Thinking MCP is **skipped** for this step.
