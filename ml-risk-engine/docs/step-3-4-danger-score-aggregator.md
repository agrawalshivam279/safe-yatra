# 📄 Technical Specification: Dynamic Danger Score Aggregator & Tier Classification Engine

> **Step ID**: `3.4`  
> **Target Module**: `ml-risk-engine`  
> **Git Feature Branch**: `feat/step-3-4-danger-score-aggregator`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

This specification establishes the central **Danger Score Aggregator & Tier Classifier** (`app/models/danger_score.py`) in `ml-risk-engine`.

The aggregator fuses all four normalized sub-models (`weather_model`, `terrain_model`, `crowd_model`, `historical_model`) into a single deterministic **Dynamic Danger Score ($0\text{--}100$)**, maps the continuous score to standard categorical **Risk Tiers** (`LOW`, `MODERATE`, `SEVERE`, `CRITICAL`), and generates unified, human-readable safety justifications and actionable advisory recommendations adhering to `GEMINI.md` Section 4.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - Step 3.2: Pydantic Schemas (`FactorDetail`, `DangerFactors`, `DangerTier`, `CoordinatesModel`, `ScoreResponse`, `ExplanationResponse`).
  - Step 3.3a: Weather (`compute_weather_risk`, `WEATHER_WEIGHT: 0.35`) & Terrain (`compute_terrain_risk`, `TERRAIN_WEIGHT: 0.20`).
  - Step 3.3b: Crowd (`compute_crowd_risk`, `CROWD_WEIGHT: 0.25`) & Historical (`compute_historical_risk`, `HISTORICAL_WEIGHT: 0.20`).
- **Blocked by**: None.
- **New Packages / Libraries**: None (Standard Library + Pydantic v2).

---

## 3. 🧠 Sequential Thinking Strategy

> *Outlines the core reasoning hypotheses, mathematical boundaries, and tier classification invariants.*

### 3.1 Mathematical Fusion & Invariants
1. **Linear Convex Combination**:
   $$\text{Raw Score} = \sum_{i=1}^{4} w_i \cdot s_i = 0.35 \cdot s_{\text{weather}} + 0.20 \cdot s_{\text{terrain}} + 0.25 \cdot s_{\text{crowd}} + 0.20 \cdot s_{\text{history}}$$
   Since $\sum w_i = 1.00$ and $s_i \in [0.0, 100.0]$, the resulting raw score is guaranteed to strictly lie within $[0.0, 100.0]$.
2. **Rounding & Clamping Rule**:
   - The aggregated integer danger score is calculated via standard mathematical rounding: `danger_score = round(min(100.0, max(0.0, raw_score)))`.
3. **Exact Tier Boundary Mapping**:
   - $0 \le \text{score} \le 25 \implies \text{LOW}$ (🟢 Safe for travel)
   - $26 \le \text{score} \le 50 \implies \text{MODERATE}$ (🟡 Exercise awareness)
   - $51 \le \text{score} \le 75 \implies \text{SEVERE}$ (🟠 Avoid if possible, proceed with extreme caution)
   - $76 \le \text{score} \le 100 \implies \text{CRITICAL}$ (🔴 Do Not Enter / Evacuate immediately)

### 3.2 Dynamic Justification & Recommendation Engine
- **Telemetry Synthesis**: Synthesizes prominent risk factors (sub-scores $\ge 50.0$ or dominant contributor) into plain-English briefing text matching `GEMINI.md` Section 4 format:
  `"Danger Score: {score} — {Summary}. {FactorDetails}."`
- **Actionable Recommendations**: Generates tailored guidance based on active hazard types (e.g. flash flood warning, cliff edge precautions, stampede dispersal guidance).

---

## 4. Data Contracts & Function Signatures

### 4.1 Tier Mapping Function
```python
def score_to_tier(score: float | int) -> DangerTier:
    """Maps continuous or integer score (0–100) to standard DangerTier enum."""
```

### 4.2 Justification Synthesis Function
```python
def build_justification(
    danger_score: int,
    tier: DangerTier,
    factors: DangerFactors,
    custom_summary: Optional[str] = None,
) -> str:
    """Builds a human-readable plain English safety explanation."""
```

### 4.3 Recommendations Engine
```python
def generate_recommendations(
    tier: DangerTier,
    factors: DangerFactors,
) -> list[str]:
    """Generates context-aware safety recommendations based on hazard severity and active factors."""
```

### 4.4 Composite Score Computation
```python
def compute_danger_score(
    weather: FactorDetail,
    terrain: FactorDetail,
    crowd: FactorDetail,
    history: FactorDetail,
    custom_summary: Optional[str] = None,
) -> tuple[int, DangerTier, str, DangerFactors]:
    """
    Computes rounded integer danger score, categorical tier, justification string,
    and DangerFactors container.
    """
```

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Aggregator Logic (`app/models/danger_score.py`)**
   - [ ] Implement `score_to_tier` mapping function.
   - [ ] Implement `build_justification` telemetry synthesizer.
   - [ ] Implement `generate_recommendations` advisory generator.
   - [ ] Implement `compute_danger_score` core aggregator.

2. **Phase B: Package Re-Exports (`app/models/__init__.py`)**
   - [ ] Re-export `score_to_tier`, `build_justification`, `generate_recommendations`, `compute_danger_score`.
   - [ ] Update `__all__` export list.

3. **Phase C: Comprehensive Unit Test Suite (`tests/test_danger_score.py`)**
   - [ ] Test exact tier boundaries (0, 25, 26, 50, 51, 75, 76, 100).
   - [ ] Test multi-factor weighted aggregation calculations.
   - [ ] Test justification synthesis for flood, landslide, stampede scenarios.
   - [ ] Test recommendation generation across tiers.

---

## 6. Verification & Acceptance Criteria

### Automated Test Command
```bash
cd ml-risk-engine
pytest tests/test_danger_score.py -v
```

### Acceptance Checklist
- [ ] Tier transitions exactly match GEMINI.md: 25 (LOW), 26 (MODERATE), 50 (MODERATE), 51 (SEVERE), 75 (SEVERE), 76 (CRITICAL).
- [ ] Aggregator correctly weighs factors ($0.35, 0.20, 0.25, 0.20$).
- [ ] Justification strings adhere to standard format.
- [ ] All 38 existing tests + new aggregator tests pass 100%.
