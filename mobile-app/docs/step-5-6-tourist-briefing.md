# 📄 Technical Specification: Tourist Pre-Trip Safety Briefing Screen

> **Step ID**: `5.6`  
> **Target Module**: `mobile-app`  
> **Git Feature Branch**: `feat/step-5-6-tourist-briefing`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

Step 5.6 implements the proactive preparation pillar of Safe Yatra:
1. **Safety Briefing Card Component (`components/briefing/SafetyBriefingCard.tsx`)**: Visual breakdown component rendering danger score gauge ($0-100$), tier badge, 4-factor risk breakdown (Weather, Terrain, Crowd, History), and AI travel advisory.
2. **Pre-Trip Safety Briefing Screen (`app/(tourist)/briefing.tsx`)**: Interactive search interface with instant destination quick-pills (Kedarnath, Badrinath, Lonavala, Haridwar) fetching data from `GET /api/v1/danger/briefing/:destination`.

---

## 2. API Contract with Backend Spatial

- **Endpoint**: `GET /api/v1/danger/briefing/:destination`
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "destination": "Kedarnath",
      "overallScore": 82,
      "tier": "CRITICAL",
      "factors": {
        "weather": { "score": 88, "weight": 0.35, "details": "Heavy rainfall 180mm/6hr" },
        "terrain": { "score": 85, "weight": 0.20, "details": "Steep 45° slope, proximity to glacier" },
        "crowd": { "score": 75, "weight": 0.25, "details": "Estimated 1,400 tourists" },
        "history": { "score": 80, "weight": 0.20, "details": "Past flash flood occurrences" }
      },
      "advisory": "Avoid trekking past 4 PM. Exercise caution near stream crossings.",
      "generatedAt": "2026-08-29T14:30:00Z"
    }
  }
  ```

---

## 3. ♿ Mobile Accessibility & UI Invariants

- **Minimum Touch Targets**: Quick hotspot pills and search action buttons have minimum dimensions of $48\times 48\text{dp}$.
- **Accessibility Attributes**:
  - `accessible={true}`, `accessibilityRole="button"` on quick pills and search buttons.
  - Search input has descriptive `accessibilityLabel` and `accessibilityHint`.

---

## 4. Step-by-Step Implementation Sequence

1. **Phase A: SafetyBriefingCard Component (`components/briefing/SafetyBriefingCard.tsx`)**
   - [ ] Implement score gauge, factor grid, and AI advisory display.
2. **Phase B: Briefing Screen (`app/(tourist)/briefing.tsx`)**
   - [ ] Implement search bar, hotspot pills, loading state, and error handling.
3. **Phase C: Integration Tests (`__tests__/briefing-screen.test.tsx`)**
   - [ ] Test quick pill selection, search submission, factor rendering, and 404/500 error resilience.

---

## 5. Verification & Acceptance Criteria

```bash
cd mobile-app && npm test -- __tests__/briefing-screen.test.tsx
```

- [ ] Searching destination correctly calls `GET /api/v1/danger/briefing/:destination`.
- [ ] Briefing card renders all 4 risk factors with weights and descriptions.
- [ ] 100% test pass rate with zero TypeScript compilation errors.
