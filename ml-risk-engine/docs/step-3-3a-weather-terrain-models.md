# 📐 Technical Specification — Step 3.3a: Weather & Terrain Risk Sub-Models

> **Step ID**: `step-3-3a-weather-terrain-models`  
> **Module**: `ml-risk-engine`  
> **Target Branch**: `feat/step-3-3a-weather-terrain-models`  
> **Status**: 📋 Planned  
> **Author**: Antigravity  
> **Last Updated**: 2026-08-29  

---

## 1. Overview & Objective

The Safe Yatra dynamic danger score fuses four distinct risk vectors. This step implements the first two pure mathematical sub-models:
1. **Weather Model (`weather_model.py`)**: Computes meteorological hazard ($0–100$, weight: $0.35$) from precipitation, sustained wind speed, and optical visibility.
2. **Terrain Model (`terrain_model.py`)**: Computes topographical hazard ($0–100$, weight: $0.20$) from slope incline, proximity to water bodies, and elevation.

Both models must operate as **deterministic, pure Python functions** returning validated `FactorDetail` instances from `app.schemas.response`.

---

## 2. Mathematical Formulations & Invariants

```
┌────────────────────────────────────────────────────────────────────────┐
│                   WEATHER RISK SUB-MODEL (Weight: 0.35)                │
├────────────────────────────────────────────────────────────────────────┤
│  Precipitation Term (Max 60 pts): (precip_mm / 200) * 60               │
│  Wind Speed Term   (Max 25 pts): (wind_kmh / 150) * 25                 │
│  Visibility Term   (Max 15 pts): (1 - (visibility_m / 10000)) * 15     │
│  Score = Clamp(Precip + Wind + Vis, 0.0, 100.0)                        │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                   TERRAIN RISK SUB-MODEL (Weight: 0.20)                │
├────────────────────────────────────────────────────────────────────────┤
│  Slope Incline Term     (Max 50 pts): (slope_deg / 60) * 50            │
│  Water Proximity Term   (Max 35 pts): Inverse linear decay (10m - 500m) │
│  Elevation/Altitude Term (Max 15 pts): Altitude > 1000m scale           │
│  Score = Clamp(Slope + Water + Elevation, 0.0, 100.0)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Invariants:
1. **Output Range**: Scores must strictly fall in $[0.0, 100.0]$ with 1 decimal precision.
2. **Weight Integrity**: Weather weight is strictly $0.35$; Terrain weight is strictly $0.20$.
3. **Descriptive Telemetry**: Every computed result includes a formatted English explanation string detailing the dominant triggers.
4. **Hermetic Execution**: Functions are standalone without network I/O or external side-effects.

---

## 3. Function Signatures & Interfaces

### 3.1 Weather Sub-Model (`app/models/weather_model.py`)

```python
def compute_weather_risk(
    precipitation_mm: float = 0.0,
    wind_speed_kmh: float = 0.0,
    visibility_meters: float = 10000.0,
) -> FactorDetail:
    """
    Computes normalized meteorological danger score (0–100) and details.
    """
```

### 3.2 Terrain Sub-Model (`app/models/terrain_model.py`)

```python
def compute_terrain_risk(
    slope_degrees: float = 0.0,
    water_proximity_meters: float = 1000.0,
    elevation_meters: float = 0.0,
) -> FactorDetail:
    """
    Computes normalized topographical danger score (0–100) and details.
    """
```

---

## 4. Edge Cases & Boundary Scenarios

| Scenario | Input Parameters | Expected Score & Behavior |
| :--- | :--- | :--- |
| **Clear / Ideal Weather** | Precip: 0mm, Wind: 5km/h, Vis: 10000m | Score: $\le 2.0$, Tier contribution: LOW |
| **Extreme Monsoon Deluge** | Precip: 250mm, Wind: 90km/h, Vis: 150m | Score: $\ge 90.0$, Details highlight flash flood & torrential rain |
| **Flat Plains / Far from Water** | Slope: $2^\circ$, Water: $2000\text{m}$, Elev: $150\text{m}$ | Score: $\le 3.0$, Flat terrain baseline |
| **Waterfall Edge / Steep Cliff** | Slope: $55^\circ$, Water: $8\text{m}$, Elev: $650\text{m}$ | Score: $\ge 80.0$, Details highlight extreme cliff slope and water proximity |
| **High Altitude Trek** | Slope: $30^\circ$, Water: $500\text{m}$, Elev: $3200\text{m}$ | Score: $\approx 40–55$, Elevation risk added |

---

## 5. Verification Plan

1. **Unit Testing (`tests/test_weather_model.py`)**:
   - Baseline zero hazard validation (sunny conditions).
   - Extreme storm and hurricane parameter saturation tests.
   - Visibility inverse scaling tests.
   - Pydantic `FactorDetail` schema validation.
2. **Unit Testing (`tests/test_terrain_model.py`)**:
   - Flat terrain baseline tests.
   - Water proximity distance decay curve ($<10\text{m}, 50\text{m}, 250\text{m}, >500\text{m}$).
   - Cliff edge slope threshold tests ($>45^\circ, >60^\circ$).
   - High altitude elevation scaling tests.

---

## 6. Implementation Checklist

- [ ] Implement `ml-risk-engine/app/models/weather_model.py`
- [ ] Implement `ml-risk-engine/app/models/terrain_model.py`
- [ ] Update `ml-risk-engine/app/models/__init__.py` with re-exports
- [ ] Author unit tests in `ml-risk-engine/tests/test_weather_model.py`
- [ ] Author unit tests in `ml-risk-engine/tests/test_terrain_model.py`
