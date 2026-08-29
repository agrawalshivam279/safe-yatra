# 📋 Technical Specification — Step 6.8: Volunteer Registry & Yaatri Mitra Verification Workflow

> **Step ID**: `6.8`  
> **Feature**: Volunteer Registry & Yaatri Mitra Verification Workflow  
> **Module**: `admin-dashboard`  
> **Status**: 📋 Planning / Spec Authored  
> **Target Branch**: `feat/step-6-8-admin-volunteer-registry`  
> **References**: [GEMINI.md](file:///d:/SIH%202026/GEMINI.md) (Section 5, 7, 9, 10, 12), [implementation_plan.md](file:///d:/SIH%202026/implementation_plan.md) (Step 6.8)

---

## 1. Architectural Overview & Context

Step 6.8 delivers the **Yaatri Mitra Volunteer Registry & Verification Hub** (`src/app/volunteers/page.tsx`) in the Safe Yatra Admin Portal. Yaatri Mitras are vetted local volunteers, temple trust staff, and emergency first responders stationed along pilgrimage corridors.

This step introduces:
1. **Volunteer Admin Services (`src/services/volunteerAdminService.ts`, `src/hooks/useAdminVolunteers.ts`)**:
   - `getVolunteers()`: Consumes `GET /api/v1/volunteers`.
   - `verifyVolunteer(id)`: Consumes `PATCH /api/v1/volunteers/:id/verify`.
   - `toggleDutyStatus(id, isOnDuty)`: Consumes `PATCH /api/v1/volunteers/:id/status`.
2. **Volunteer Registry Command Interface (`src/app/volunteers/page.tsx`)**:
   - 4 Live KPI metric cards (Total Mitras, Active On-Duty, Verified Responders, Average Rating).
   - Filterable data table with Verification Status badges (`VERIFIED` 🟢, `PENDING_VERIFICATION` 🟡, `REJECTED` 🔴).
   - Real-time On-Duty toggle switch and 1-click "Verify Responder" dispatch action.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VOLUNTEER VERIFICATION & DISPATCH FLOW               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   GET /volunteers ────────► [Yaatri Mitra Registry Table]              │
│                                  │                                     │
│                                  ├───► [Filter by PENDING / ON DUTY]   │
│                                  │                                     │
│                                  ├───► [Toggle On-Duty Status]         │
│                                  │     PATCH /volunteers/:id/status    │
│                                  │                                     │
│                                  └───► [1-Click Admin Verification]    │
│                                        PATCH /volunteers/:id/verify    │
│                                                  │                     │
│                                                  ▼                     │
│                                        Upgrades to VERIFIED            │
│                                        Enables SOS Proximity Dispatch  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granularity Sizing & 5-Gate Goldilocks Standard

| Gate | Criterion | Compliance Assessment |
| :--- | :--- | :--- |
| **Gate 1: LOC Limit** | $\le 500$ LOC UI / Client Core | $\approx 310$ LOC total across service, reactive hook, page view, and unit test suite. |
| **Gate 2: File Limit** | $\le 4$ target source files (+ tests) | 2 service/hook files + 1 page view (`src/app/volunteers/page.tsx`) + test suite. |
| **Gate 3: Single Concern**| 1 architectural domain | Yaatri Mitra directory, duty toggles, and admin verification workflow. |
| **Gate 4: Verification** | 1 targeted test command | `npm test` in `admin-dashboard`. |
| **Gate 5: Context Headroom**| $\ge 40\%$ context window remaining | Reserved $\approx 40\%$ context budget for verify/ship cycles. |

---

## 3. Data Contracts & Interfaces

### 3.1 Yaatri Mitra Model
```typescript
export interface VolunteerRecord {
  id: string;
  userId: string;
  name: string;
  phone: string;
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  isOnDuty: boolean;
  totalResponses: number;
  rating: number;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  joinedAt: string;
}
```

---

## 4. Test Strategy & Verification Plan

### Test Suite: `__tests__/volunteer-registry.test.tsx`
1. **Service Tests**: Validates `getVolunteers()`, `verifyVolunteer()`, and `toggleDutyStatus()`.
2. **Registry Table Tests**: Renders volunteer rows, duty toggles, and rating gauges.
3. **Filter Tab Tests**: Filters by `PENDING_VERIFICATION` and `ON_DUTY`.
4. **Verification Workflow Tests**: Triggers 1-click verify and updates status badge to `VERIFIED`.

---

## 5. Sequential Thinking MCP Evaluation

> 🧠 **Sequential Thinking Heuristics Evaluation**:
> - **ML Danger Math**: N/A.
> - **PostGIS Spatial Queries**: Server-side proximity dispatcher.
> - **SOS Multi-State Transitions**: Controlled by verification state.
> 
> **Verdict**: Standard CRUD table and mutation buttons; Sequential Thinking MCP is **skipped** for this step.
