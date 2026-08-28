# 📐 Technical Specification — Step 3.2: ML Risk Engine Pydantic Schemas

> **Step ID**: `step-3-2-pydantic-schemas`  
> **Module**: `ml-risk-engine`  
> **Target Branch**: `feat/step-3-2-pydantic-schemas`  
> **Status**: 📋 Planned  
> **Author**: Antigravity  
> **Last Updated**: 2026-08-29  

---

## 1. Overview & Objective

The **ML Risk Engine** is a high-performance Python microservice responsible for evaluating dynamic danger levels ($0–100$) across geographical coordinates and predefined tourist zones. 

Before implementing the scoring algorithms, weather integrations, and simulation engines, this step establishes the **Pydantic v2 API Contract**. All incoming HTTP request payloads and outgoing response structures must be strictly validated against these schemas.

---

## 2. Architectural Context & Invariants

```
┌─────────────────────────────────────────────────────────────┐
│                    API CONTRACT LAYER                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Request Ingestion]                                        │
│  • Coordinates (lat: [-90, 90], lng: [-180, 180])           │
│  • Zone Identifier (Optional string)                        │
│  • Simulation Overrides (Precip, wind, slope, crowd, etc.)  │
│                                                             │
│  [Core Schemas]                                             │
│  • ScoreRequest, BatchScoreRequest, ZoneScoreRequest        │
│  • SimulationOverrides, CoordinateModel                     │
│                                                             │
│  [Response Envelope]                                        │
│  • DangerScore (Integer: 0–100)                             │
│  • DangerTier (LOW | MODERATE | SEVERE | CRITICAL)          │
│  • Justification (Human-readable string)                    │
│  • Factors (Weather: 0.35, Crowd: 0.25, Terrain: 0.20,      │
│             History: 0.20 breakdown)                       │
│  • ComputedAt (ISO 8601 UTC Timestamp)                      │
│  • TTL Seconds (Default: 300s)                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Invariants
1. **Coordinate Format**: Latitude (`[-90.0, 90.0]`) and Longitude (`[-180.0, 180.0]`) must be validated with explicit bounds.
2. **Danger Tier Boundaries**:
   - `LOW`: $0 \le \text{Score} \le 25$
   - `MODERATE`: $26 \le \text{Score} \le 50$
   - `SEVERE`: $51 \le \text{Score} \le 75$
   - `CRITICAL`: $76 \le \text{Score} \le 100$
3. **Weight Summation**: Factor weights must default to $0.35 + 0.25 + 0.20 + 0.20 = 1.00$.
4. **Time & TTL**: Every response includes `computed_at` timestamp in UTC and a `ttl_seconds` cache lifetime (default: 300 seconds).

---

## 3. Schema Specifications

### 3.1 Request Schemas (`app/schemas/request.py`)

```python
class SimulationOverrides(BaseModel):
    precipitation_mm: Optional[float] = Field(None, ge=0.0, le=1000.0)
    wind_speed_kmh: Optional[float] = Field(None, ge=0.0, le=300.0)
    visibility_meters: Optional[float] = Field(None, ge=0.0, le=50000.0)
    slope_degrees: Optional[float] = Field(None, ge=0.0, le=90.0)
    water_proximity_meters: Optional[float] = Field(None, ge=0.0, le=50000.0)
    crowd_count: Optional[int] = Field(None, ge=0)
    elevation_meters: Optional[float] = Field(None, ge=-500.0, le=9000.0)
    historical_incident_count: Optional[int] = Field(None, ge=0)

class ScoreRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in WGS 84 format")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude in WGS 84 format")
    zone_id: Optional[str] = Field(None, description="Optional predefined zone ID")
    simulation_overrides: Optional[SimulationOverrides] = None

class BatchScoreRequest(BaseModel):
    points: List[ScoreRequest] = Field(..., min_length=1, max_length=100)
    simulation_overrides: Optional[SimulationOverrides] = None

class ZoneScoreRequest(BaseModel):
    zone_id: str = Field(..., min_length=1)
    simulation_overrides: Optional[SimulationOverrides] = None
```

### 3.2 Response Schemas (`app/schemas/response.py`)

```python
class DangerTier(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"

class FactorDetail(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Normalized risk sub-score (0-100)")
    weight: float = Field(..., ge=0.0, le=1.0, description="Factor weight (e.g. 0.35)")
    details: str = Field(..., description="Human-readable sub-factor telemetry explanation")

class DangerFactors(BaseModel):
    weather: FactorDetail
    terrain: FactorDetail
    crowd: FactorDetail
    history: FactorDetail

class CoordinatesModel(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)

class ScoreResponse(BaseModel):
    zone_id: Optional[str] = None
    coordinates: CoordinatesModel
    danger_score: int = Field(..., ge=0, le=100, description="Aggregated integer danger score")
    tier: DangerTier
    justification: str
    factors: DangerFactors
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ttl_seconds: int = Field(default=300, ge=0)

class BatchScoreResponse(BaseModel):
    results: List[ScoreResponse]
    total_computed: int
    computed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExplanationResponse(BaseModel):
    zone_id: Optional[str] = None
    coordinates: CoordinatesModel
    danger_score: int
    tier: DangerTier
    summary: str
    recommendations: List[str]
    factors: DangerFactors
```

---

## 4. Edge Cases & Boundary Handling

| Edge Case | Expected Behavior | Validation Layer |
| :--- | :--- | :--- |
| Latitude $> 90$ or $< -90$ | HTTP 422 Unprocessable Entity | Pydantic `Field(ge=-90.0, le=90.0)` |
| Longitude $> 180$ or $< -180$ | HTTP 422 Unprocessable Entity | Pydantic `Field(ge=-180.0, le=180.0)` |
| Empty Batch Request | HTTP 422 Unprocessable Entity | Pydantic `Field(min_length=1)` |
| Negative Weather / Crowd Overrides | HTTP 422 Unprocessable Entity | Pydantic `Field(ge=0.0)` |
| Extreme Slope $> 90^\circ$ | HTTP 422 Unprocessable Entity | Pydantic `Field(le=90.0)` |
| Score $> 100$ or $< 0$ | Internal Validation Failure | Pydantic `Field(ge=0, le=100)` |

---

## 5. Verification & Test Plan

1. **Unit Testing (`tests/test_schemas.py`)**:
   - `test_valid_score_request`: Validates serialization of standard GPS coordinates and zone IDs.
   - `test_invalid_coordinates_rejection`: Asserts `ValidationError` when latitude is $95.0$ or longitude is $-190.0$.
   - `test_simulation_overrides`: Asserts override values and bounds validation.
   - `test_score_response_structure`: Asserts exact JSON envelope compliance matching `GEMINI.md` Section 4.
   - `test_danger_tier_enumeration`: Asserts all 4 tiers (`LOW`, `MODERATE`, `SEVERE`, `CRITICAL`).
   - `test_batch_score_schemas`: Asserts batch requests with minimum 1 item and maximum 100 items.

---

## 6. Implementation Checklist

- [ ] Create `ml-risk-engine/app/schemas/request.py`
- [ ] Create `ml-risk-engine/app/schemas/response.py`
- [ ] Export all schemas in `ml-risk-engine/app/schemas/__init__.py`
- [ ] Author unit tests in `ml-risk-engine/tests/test_schemas.py`
- [ ] Run verification tests via `pytest`
