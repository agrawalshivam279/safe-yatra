"""
Safe Yatra — ML Risk Engine
Pydantic Response Schemas & Risk Envelopes.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DangerTier(str, Enum):
    """
    Standard Danger Tier mapping:
      0–25  : LOW        — Safe for travel
      26–50 : MODERATE   — Exercise awareness
      51–75 : SEVERE     — Avoid if possible, proceed with extreme caution
      76–100: CRITICAL   — Do Not Enter / Evacuate immediately
    """

    LOW = "LOW"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"


class FactorDetail(BaseModel):
    """Normalized score and breakdown for a single danger sub-factor."""

    score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Normalized risk sub-score (0.0 to 100.0)",
    )
    weight: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Weight multiplier assigned to this risk factor",
    )
    details: str = Field(
        ...,
        description="Human-readable sub-factor telemetry explanation and metrics",
    )

    model_config = ConfigDict(populate_by_name=True)


class DangerFactors(BaseModel):
    """Multi-variable danger breakdown across all four sub-models."""

    weather: FactorDetail = Field(
        ...,
        description="Meteorological risk factor (precipitation, wind, visibility)",
    )
    terrain: FactorDetail = Field(
        ...,
        description="Topographical risk factor (slope angle, elevation, water proximity)",
    )
    crowd: FactorDetail = Field(
        ...,
        description="Crowd density and footfall congestion risk factor",
    )
    history: FactorDetail = Field(
        ...,
        description="Historical incident risk factor within 2km radius",
    )

    model_config = ConfigDict(populate_by_name=True)


class CoordinatesModel(BaseModel):
    """Geographic coordinates container in response envelopes."""

    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")

    model_config = ConfigDict(populate_by_name=True)


class ScoreResponse(BaseModel):
    """Full danger score computation response envelope matching GEMINI.md Section 4."""

    zone_id: Optional[str] = Field(
        None,
        description="Predefined zone ID if score was requested for a zone",
    )
    coordinates: CoordinatesModel = Field(
        ...,
        description="Geographic coordinates of the evaluated point",
    )
    danger_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Aggregated danger score (0–100)",
    )
    tier: DangerTier = Field(
        ...,
        description="Categorical risk tier (LOW | MODERATE | SEVERE | CRITICAL)",
    )
    justification: str = Field(
        ...,
        description="Human-readable plain English safety explanation",
    )
    factors: DangerFactors = Field(
        ...,
        description="Sub-model scores, weights, and detailed justifications",
    )
    computed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 UTC timestamp of computation",
    )
    ttl_seconds: int = Field(
        default=300,
        ge=0,
        description="Cache time-to-live in seconds (default: 300s)",
    )

    model_config = ConfigDict(populate_by_name=True)


class BatchScoreResponse(BaseModel):
    """Batch danger score computation response envelope."""

    results: List[ScoreResponse] = Field(
        ...,
        description="List of computed score responses",
    )
    total_computed: int = Field(
        ...,
        ge=0,
        description="Total number of points successfully computed",
    )
    computed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 UTC timestamp of batch completion",
    )

    model_config = ConfigDict(populate_by_name=True)


class ExplanationResponse(BaseModel):
    """Human-readable safety briefing and actionable recommendations response."""

    zone_id: Optional[str] = Field(None, description="Predefined zone ID")
    coordinates: CoordinatesModel = Field(..., description="Geographic coordinates")
    danger_score: int = Field(..., ge=0, le=100, description="Danger score (0–100)")
    tier: DangerTier = Field(..., description="Categorical risk tier")
    summary: str = Field(..., description="Concise safety summary")
    recommendations: List[str] = Field(
        default_factory=list,
        description="Actionable safety guidance for tourists and dispatchers",
    )
    factors: DangerFactors = Field(..., description="Underlying factor telemetry")

    model_config = ConfigDict(populate_by_name=True)
