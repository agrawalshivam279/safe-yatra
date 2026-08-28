# 📄 Technical Specification: Crowd Density & Historical Incident Risk Sub-Models

> **Step ID**: `3.3b`  
> **Target Module**: `ml-risk-engine`  
> **Git Feature Branch**: `feat/step-3-3b-crowd-historical-models`  
> **Status**: 📋 Ready for Implementation  
> **Created**: 2026-08-29  

---

## 1. Executive Summary

This specification establishes the **Crowd Density Risk Sub-Model** (`crowd_model.py`) and **Historical Incident Risk Sub-Model** (`historical_model.py`) within the `ml-risk-engine` microservice. 

Along with the previously implemented Weather and Terrain sub-models (Step 3.3a), these two sub-models complete all four core risk vectors ($0.35 \times \text{weather} + 0.20 \times \text{terrain} + 0.25 \times \text{crowd} + 0.20 \times \text{history}$) required by the Dynamic Danger Score algorithm defined in `GEMINI.md` Section 4.

---

## 2. Dependencies & Prerequisites

- **Depends on**:
  - Step 3.2: Pydantic Schemas & Response Envelopes (`app/schemas/request.py`, `app/schemas/response.py`, `FactorDetail`, `DangerFactors`).
  - Step 3.3a: Weather & Terrain Risk Sub-Models (`app/models/weather_model.py`, `app/models/terrain_model.py`).
- **Blocked by**: None.
- **New Packages / Libraries**: None (uses pure Python 3.11 standard library + Pydantic v2).

---

## 3. 🧠 Sequential Thinking Strategy

> *Outlines the core reasoning hypotheses, mathematical boundaries, and edge cases to evaluate during implementation.*

### 3.1 Core Reasoning Hypotheses
1. **Fruin Level of Service (LoS) & Crowd Crush Dynamics**:
   - Crowd hazard does not scale linearly; it accelerates non-linearly once pedestrian density exceeds $1.5\text{ persons/m}^2$, transitioning to critical stampede/crush danger at $\ge 3.0\text{ persons/m}^2$.
   - The model must normalize both raw headcount ($N$) and effective area ($A\text{ m}^2$) or apply calibrated fallback defaults ($A = 1000\text{ m}^2$) when area is unspecified.
2. **Historical Incident Severity & Temporal Proximity Decay**:
   - Past incidents within the standard $2\text{km}$ geographic radius must be weighted by severity: fatal events (drownings, stampedes, fatal landslides) contribute higher base points ($25\text{ pts}$) than non-fatal severe rescues ($12\text{ pts}$) or moderate incidents ($5\text{ pts}$).
   - Radius attenuation must degrade smoothly when evaluated outside the canonical $2\text{km}$ buffer, clamping cleanly to $0.0\text{--}100.0$.
3. **Weight Normalization Guarantee**:
   - Weights across all four sub-models must sum exactly to $1.00$:
     $$\text{WEATHER\_WEIGHT} (0.35) + \text{TERRAIN\_WEIGHT} (0.20) + \text{CROWD\_WEIGHT} (0.25) + \text{HISTORICAL\_WEIGHT} (0.20) = 1.00$$

### 3.2 Spatial & Algorithmic Edge Cases
- **Zero or Negative Inputs**: Zero headcount ($0\text{ persons}$), zero incidents, or negative numbers must be clamped safely without `ZeroDivisionError` or invalid score outputs.
- **Extreme Stampede Saturation**: Headcounts of $10,000+$ in small areas must saturate cleanly at $100.0\text{ pts}$ with clear critical stampede alert justification.
- **Long-tail Recency**: Incidents occurring $> 5\text{ years}$ ago must apply time-decay weighting rather than distorting current real-time risk.

---

## 4. Data Contracts & Model Specifications

### 4.1 Crowd Risk Sub-Model (`app/models/crowd_model.py`)

- **Constant**: `CROWD_WEIGHT: float = 0.25`
- **Function**:
  ```python
  def compute_crowd_risk(
      crowd_count: int = 0,
      area_sqm: float = 1000.0,
      event_multiplier: float = 1.0,
  ) -> FactorDetail:
      """
      Computes normalized crowd density risk (0.0 to 100.0, weight: 0.25).
      
      Density Categories:
        - LoS A/B (0.0 - 0.5 p/m²): Free flow, Low risk (0–20 pts)
        - LoS C/D (0.5 - 1.5 p/m²): Restricted flow, Moderate risk (20–50 pts)
        - LoS E   (1.5 - 3.0 p/m²): High congestion, Severe risk (50–80 pts)
        - LoS F   (> 3.0 p/m²)   : Critical crush / Stampede hazard (80–100 pts)
      """
  ```

### 4.2 Historical Risk Sub-Model (`app/models/historical_model.py`)

- **Constant**: `HISTORICAL_WEIGHT: float = 0.20`
- **Function**:
  ```python
  def compute_historical_risk(
      incident_count: int = 0,
      fatal_count: int = 0,
      severe_count: int = 0,
      radius_km: float = 2.0,
      recency_years: float = 5.0,
  ) -> FactorDetail:
      """
      Computes normalized historical incident risk (0.0 to 100.0, weight: 0.20).
      
      Severity Weighting:
        - Fatal incident: 25 pts each
        - Severe incident: 12 pts each
        - Other/moderate incident: 5 pts each
      """
  ```

### 4.3 Models Package Re-Exports (`app/models/__init__.py`)

```python
from app.models.crowd_model import CROWD_WEIGHT, compute_crowd_risk
from app.models.historical_model import HISTORICAL_WEIGHT, compute_historical_risk
from app.models.terrain_model import TERRAIN_WEIGHT, compute_terrain_risk
from app.models.weather_model import WEATHER_WEIGHT, compute_weather_risk

__all__ = [
    "WEATHER_WEIGHT",
    "compute_weather_risk",
    "TERRAIN_WEIGHT",
    "compute_terrain_risk",
    "CROWD_WEIGHT",
    "compute_crowd_risk",
    "HISTORICAL_WEIGHT",
    "compute_historical_risk",
]
```

---

## 5. Step-by-Step Implementation Sequence

1. **Phase A: Crowd Density Sub-Model (`app/models/crowd_model.py`)**
   - [ ] Implement `compute_crowd_risk` with input clamping and Fruin LoS density scoring.
   - [ ] Implement descriptive telemetry details generator (stampede alert, dense congestion, moderate footfall, free flow).
   - [ ] Return structured `FactorDetail(score=..., weight=0.25, details=...)`.

2. **Phase B: Historical Incident Sub-Model (`app/models/historical_model.py`)**
   - [ ] Implement `compute_historical_risk` with incident categorization, distance attenuation, and recency scaling.
   - [ ] Implement telemetry details generator (`X fatal incidents within 2km in 5 years`, `No historical incidents recorded`, etc.).
   - [ ] Return structured `FactorDetail(score=..., weight=0.20, details=...)`.

3. **Phase C: Package Exports (`app/models/__init__.py`)**
   - [ ] Re-export `CROWD_WEIGHT`, `compute_crowd_risk`, `HISTORICAL_WEIGHT`, `compute_historical_risk`.
   - [ ] Verify `__all__` export list contains all 4 sub-models and weights.

4. **Phase D: Comprehensive Unit Test Suites**
   - [ ] Author `tests/test_crowd_model.py` testing zero/low footfall, moderate density, severe stampede saturation, and edge cases.
   - [ ] Author `tests/test_historical_model.py` testing zero incidents, fatal weighting, multi-incident decay, distance attenuation, and justification text.

---

## 6. Verification & Acceptance Criteria

### Automated Test Command
```bash
cd ml-risk-engine
pytest tests/test_crowd_model.py tests/test_historical_model.py -v
```

### Acceptance Checklist
- [ ] All crowd density score ranges ($0.0\text{--}100.0$) strictly conform to `FactorDetail` schema.
- [ ] All historical incident score ranges ($0.0\text{--}100.0$) strictly conform to `FactorDetail` schema.
- [ ] Weight constants are strictly `CROWD_WEIGHT = 0.25` and `HISTORICAL_WEIGHT = 0.20`.
- [ ] Existing test suites (`test_schemas.py`, `test_weather_model.py`, `test_terrain_model.py`) continue to pass ($100\%$ pass rate).
- [ ] Code is formatted with zero `ruff` linter errors.
