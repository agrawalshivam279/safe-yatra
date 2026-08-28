"""
Unit tests for the Historical Incident Risk Sub-Model in ml-risk-engine.
Validates incident severity weighting, distance attenuation, recency time-decay,
saturation limits, and FactorDetail schema compliance.
"""

import pytest
from app.models.historical_model import HISTORICAL_WEIGHT, compute_historical_risk
from app.schemas.response import FactorDetail


def test_historical_risk_zero_incidents():
    """Verify zero incidents return a 0.0 score and clean telemetry text."""
    res = compute_historical_risk(incident_count=0, fatal_count=0, severe_count=0, radius_km=2.0)
    assert isinstance(res, FactorDetail)
    assert res.score == 0.0
    assert res.weight == HISTORICAL_WEIGHT
    assert "No historical incidents recorded" in res.details
    assert "2.0km radius" in res.details


def test_historical_risk_fatal_weighting():
    """Verify fatal incidents contribute 25.0 points each."""
    # 3 fatal incidents: 3 * 25.0 = 75.0 points
    res = compute_historical_risk(incident_count=3, fatal_count=3, severe_count=0, radius_km=2.0)
    assert res.score == 75.0
    assert res.weight == 0.20
    assert "3 fatal" in res.details
    assert "within 2.0km" in res.details


def test_historical_risk_mixed_severities():
    """Verify mixture of severe (12 pts) and moderate/minor (5 pts) incidents."""
    # 1 severe (12) + 2 moderate (2 * 5 = 10) = 22.0 points
    res = compute_historical_risk(incident_count=3, fatal_count=0, severe_count=1, radius_km=2.0)
    assert res.score == 22.0
    assert "1 severe" in res.details
    assert "2 moderate" in res.details


def test_historical_risk_distance_attenuation():
    """Verify distance attenuation when evaluated beyond baseline 2.0km radius."""
    # 3 fatal (75 pts) evaluated at 4.0km -> attenuation 2.0 / 4.0 = 0.5 -> score 37.5
    res = compute_historical_risk(incident_count=3, fatal_count=3, severe_count=0, radius_km=4.0)
    assert res.score == 37.5
    assert "within 4.0km" in res.details


def test_historical_risk_recency_attenuation():
    """Verify recency decay when evaluated over extended multi-year windows."""
    # 3 fatal (75 pts) over 10-year window -> attenuation 5.0 / 10.0 = 0.5 -> score 37.5
    res = compute_historical_risk(
        incident_count=3,
        fatal_count=3,
        severe_count=0,
        radius_km=2.0,
        recency_years=10.0,
    )
    assert res.score == 37.5
    assert "last 10 years" in res.details


def test_historical_risk_saturation_and_clamping():
    """Verify score is capped at 100.0 even with massive incident clusters."""
    # 5 fatal incidents = 125 pts -> capped at 100.0
    res = compute_historical_risk(incident_count=5, fatal_count=5, severe_count=0)
    assert res.score == 100.0


def test_historical_weight_constant():
    """Verify HISTORICAL_WEIGHT is strictly 0.20."""
    assert HISTORICAL_WEIGHT == 0.20
