# 📄 Technical Specification: SIH 2026 2-Minute Demo Playbook, Pre-Seed Data & Simulation Scripts

> **Step ID**: `7.5`  
> **Target Scope**: Monorepo-wide  
> **Git Feature Branch**: `feat/step-7-5-demo-preparation-script`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-30  

---

## 1. Executive Summary

Step 7.5 equips the Safe Yatra project with a bulletproof, time-calibrated **2-Minute SIH 2026 Judge Presentation Playbook**, automated 1-click multi-pillar demo orchestrator scripts (`scripts/demo-simulation.ps1` & `scripts/demo-simulation.sh`), verified golden seed datasets (5 hazard zones, 3 verified Yaatri Mitras, 10 historical incidents), and offline backup contingency protocols.

---

## 2. The 2-Minute SIH Presentation Blueprint

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     SAFE YATRA — 2-MINUTE DEMO CHRONOLOGY                       │
├───────────────────┬───────────────────┬───────────────────┬─────────────────────┤
│ 0:00 – 0:25       │ 0:25 – 0:50       │ 0:50 – 1:20       │ 1:20 – 2:00         │
│ PREDICT & COMMAND │ PREVENT           │ RESPOND           │ RESOLVE & AUDIT     │
├───────────────────┼───────────────────┼───────────────────┼─────────────────────┤
│ • Admin Dashboard │ • Tourist walks   │ • SOS triggered   │ • Mitra arrives &   │
│ • Live Heatmap    │   into hazard     │ • ML score (82)   │   resolves incident │
│ • 5 Golden Zones  │ • 500m proximity  │ • PostGIS matcher │ • Live ETA & trail  │
│ • Weather/Crowd   │ • Critical Modal  │ • Mitra receives  │ • Immutable audit   │
│   telemetry       │   fires live      │   push alert      │   timeline in DB    │
└───────────────────┴───────────────────┴───────────────────┴─────────────────────┘
```

---

## 3. Golden Pre-Seed Data Matrix

| Entity Type | Count | Key Identifiers / Locations |
| :--- | :--- | :--- |
| **Danger Zones** | 5 | Bhushi Dam Waterfall, Tiger Point Cliff, Lion's Point Gorge, Karla Caves Trail, Rajmachi Fort Track |
| **Yaatri Mitras** | 3 | Suresh Patil (`+919876543211`), Amit Deshmukh (`+919876543212`), Pooja Shinde (`+919876543213`) |
| **Historical Incidents** | 10 | Past flash flood, slip/fall, landslide, and crowd congestion incident records across Lonavala sector |
| **Test Tourists** | 2 | Priya Patel (`tourist_01`), Rahul Verma (`tourist_02`) |

---

## 4. Deliverables & Implementation Checklist

1. **`docs/SIH_2026_DEMO_SCRIPT.md`**:
   - Turn-by-turn presentation script with precise timing cues, judge talking points, and device coordination instructions.
2. **`scripts/demo-simulation.ps1`** (Windows PowerShell):
   - Automated 1-click orchestrator that sets simulation mode, injects weather overrides, triggers tourist movement trajectory, and executes full emergency loop with progress logs.
3. **`scripts/demo-simulation.sh`** (Bash for Linux/macOS):
   - Shell equivalent for cross-platform demo execution.
4. **Seed Integrity Verification**:
   - Verify `backend-spatial/prisma/seed.ts` loads the 5 golden zones and 3 verified Mitras.

---

## 5. Verification & Acceptance Criteria

- [ ] Demo script completely covers the 4 pillars (Predict $\rightarrow$ Prevent $\rightarrow$ Respond $\rightarrow$ Command) in under 2 minutes.
- [ ] Simulation scripts execute seamlessly against the local backend server (`http://localhost:3001`).
- [ ] All 4 modules remain 100% test-passing and buildable.
