"""
Unit tests for the Crowd Density Risk Sub-Model in ml-risk-engine.
Validates Fruin Level of Service (LoS) calculations, stampede threshold triggers,
event surge multipliers, and FactorDetail schema compliance.
"""

import pytest
from app.models.crowd_model import CROWD_WEIGHT, compute_crowd_risk
from app.models import WEATHER_WEIGHT, TERRAIN_WEIGHT, HISTORICAL_WEIGHT
from app.schemas.response import FactorDetail


def test_crowd_risk_zero_and_clamping():
    """Verify zero and negative headcount clamp cleanly to 0.0 without errors."""
    zero_result = compute_crowd_risk(crowd_count=0, area_sqm=1000.0)
    assert isinstance(zero_result, FactorDetail)
    assert zero_result.score == 0.0
    assert zero_result.weight == CROWD_WEIGHT
    assert "Sparse footfall" in zero_result.details or "no active crowd" in zero_result.details

    negative_result = compute_crowd_risk(crowd_count=-50, area_sqm=-100.0)
    assert negative_result.score == 0.0
    assert negative_result.weight == CROWD_WEIGHT


def test_crowd_risk_low_density_los_ab():
    """LoS A/B (0.0 to 0.5 p/m²): Free flow, safe pedestrian movement (0–20 pts)."""
    # 250 persons in 1000 m² = 0.25 p/m² -> score should be (0.25 / 0.5) * 20 = 10.0
    res = compute_crowd_risk(crowd_count=250, area_sqm=1000.0)
    assert res.score == 10.0
    assert res.weight == 0.25
    assert "free-flowing" in res.details.lower() or "0.25 p/m²" in res.details


def test_crowd_risk_moderate_density_los_cd():
    """LoS C/D (0.5 to 1.5 p/m²): Constrained flow, moderate risk (20–50 pts)."""
    # 1000 persons in 1000 m² = 1.0 p/m² -> score = 20 + ((1.0 - 0.5)/1.0)*30 = 35.0
    res = compute_crowd_risk(crowd_count=1000, area_sqm=1000.0)
    assert res.score == 35.0
    assert "moderate density" in res.details.lower()
    assert "1.00 p/m²" in res.details


def test_crowd_risk_severe_density_los_e():
    """LoS E (1.5 to 3.0 p/m²): Severe congestion, high crush risk (50–80 pts)."""
    # 2250 persons in 1000 m² = 2.25 p/m² -> score = 50 + ((2.25 - 1.5)/1.5)*30 = 65.0
    res = compute_crowd_risk(crowd_count=2250, area_sqm=1000.0)
    assert res.score == 65.0
    assert "severe crowd congestion" in res.details.lower() or "high crush" in res.details.lower()


def test_crowd_risk_critical_stampede_los_f():
    """LoS F (> 3.0 p/m²): Critical crush / stampede hazard (80–100 pts)."""
    # 4000 persons in 1000 m² = 4.0 p/m² -> score = 80 + ((4.0 - 3.0)/2.0)*20 = 90.0
    res = compute_crowd_risk(crowd_count=4000, area_sqm=1000.0)
    assert res.score == 90.0
    assert "critical stampede hazard" in res.details.lower() or "stampede" in res.details.lower()

    # Extreme saturation at 6.0 p/m² -> should clamp at 100.0
    saturated = compute_crowd_risk(crowd_count=6000, area_sqm=1000.0)
    assert saturated.score == 100.0


def test_crowd_risk_event_surge_multiplier():
    """Festival / pilgrimage surge multiplier scales effective density."""
    # 500 persons with 2.0x multiplier = 1000 effective -> 1.0 p/m² -> score 35.0
    res = compute_crowd_risk(crowd_count=500, area_sqm=1000.0, event_multiplier=2.0)
    assert res.score == 35.0
    assert "multiplier 2.0x applied" in res.details.lower()


def test_crowd_weight_and_composite_weight_sum():
    """Validate that CROWD_WEIGHT is 0.25 and all 4 sub-model weights sum exactly to 1.00."""
    assert CROWD_WEIGHT == 0.25
    total_weights = WEATHER_WEIGHT + TERRAIN_WEIGHT + CROWD_WEIGHT + HISTORICAL_WEIGHT
    assert abs(total_weights - 1.00) < 1e-6
