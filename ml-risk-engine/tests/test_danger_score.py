"""
Unit tests for the Dynamic Danger Score Aggregator in ml-risk-engine.
Validates linear convex combination, exact tier boundary transitions,
justification formatting, and context-aware recommendation synthesis.
"""

import pytest
from app.models.danger_score import (
    build_justification,
    compute_danger_score,
    generate_recommendations,
    score_to_tier,
)
from app.schemas.response import DangerFactors, DangerTier, FactorDetail


def test_score_to_tier_exact_boundaries():
    """Verify all exact boundary conditions map to the correct DangerTier enum."""
    assert score_to_tier(0) == DangerTier.LOW
    assert score_to_tier(25) == DangerTier.LOW
    assert score_to_tier(25.4) == DangerTier.LOW
    assert score_to_tier(25.6) == DangerTier.MODERATE
    assert score_to_tier(26) == DangerTier.MODERATE
    assert score_to_tier(50) == DangerTier.MODERATE
    assert score_to_tier(50.4) == DangerTier.MODERATE
    assert score_to_tier(50.6) == DangerTier.SEVERE
    assert score_to_tier(51) == DangerTier.SEVERE
    assert score_to_tier(75) == DangerTier.SEVERE
    assert score_to_tier(75.4) == DangerTier.SEVERE
    assert score_to_tier(75.6) == DangerTier.CRITICAL
    assert score_to_tier(76) == DangerTier.CRITICAL
    assert score_to_tier(100) == DangerTier.CRITICAL


def test_compute_danger_score_all_zero():
    """Verify clean zero risk returns 0 score, LOW tier, and clean justification."""
    w = FactorDetail(score=0.0, weight=0.35, details="Clear skies")
    t = FactorDetail(score=0.0, weight=0.20, details="Flat terrain")
    c = FactorDetail(score=0.0, weight=0.25, details="No crowds")
    h = FactorDetail(score=0.0, weight=0.20, details="No past incidents")

    score, tier, just, factors = compute_danger_score(w, t, c, h)
    assert score == 0
    assert tier == DangerTier.LOW
    assert "Danger Score: 0 (LOW)" in just
    assert factors.weather.score == 0.0


def test_compute_danger_score_maximum_saturation():
    """Verify 100 across all factors computes 100 score and CRITICAL tier."""
    w = FactorDetail(score=100.0, weight=0.35, details="Torrential cyclone")
    t = FactorDetail(score=100.0, weight=0.20, details="Vertical cliff")
    c = FactorDetail(score=100.0, weight=0.25, details="Stampede crush")
    h = FactorDetail(score=100.0, weight=0.20, details="Multiple fatal incidents")

    score, tier, just, factors = compute_danger_score(w, t, c, h)
    assert score == 100
    assert tier == DangerTier.CRITICAL
    assert "Danger Score: 100 (CRITICAL)" in just


def test_compute_danger_score_weighted_fusion():
    """
    Verify exact mathematical weighting:
    Weather (92 * 0.35 = 32.2) + Terrain (88 * 0.20 = 17.6) +
    Crowd (65 * 0.25 = 16.25) + History (78 * 0.20 = 15.6)
    Total = 81.65 -> rounded = 82 (CRITICAL)
    """
    w = FactorDetail(score=92.0, weight=0.35, details="Heavy rainfall 180mm/6hr")
    t = FactorDetail(score=88.0, weight=0.20, details="Steep slope 45°")
    c = FactorDetail(score=65.0, weight=0.25, details="~340 estimated persons")
    h = FactorDetail(score=78.0, weight=0.20, details="3 fatal incidents within 2km")

    score, tier, just, factors = compute_danger_score(w, t, c, h)
    assert score == 82
    assert tier == DangerTier.CRITICAL
    assert "Heavy rainfall" in just
    assert "Steep slope" in just
    assert "340 estimated persons" in just
    assert "3 fatal incidents" in just


def test_build_justification_with_custom_summary():
    """Verify custom leading summary is included in justification."""
    w = FactorDetail(score=10.0, weight=0.35, details="Light breeze")
    t = FactorDetail(score=10.0, weight=0.20, details="Gentle slope")
    c = FactorDetail(score=10.0, weight=0.25, details="Low footfall")
    h = FactorDetail(score=10.0, weight=0.20, details="Safe track")

    factors = DangerFactors(weather=w, terrain=t, crowd=c, history=h)
    just = build_justification(
        danger_score=10,
        tier=DangerTier.LOW,
        factors=factors,
        custom_summary="Morning Trek Inspection",
    )
    assert "Morning Trek Inspection" in just
    assert "Danger Score: 10 (LOW)" in just


def test_generate_recommendations_context_aware():
    """Verify recommendations are synthesized based on active hazard thresholds."""
    # Test high weather and crowd hazard
    w = FactorDetail(score=85.0, weight=0.35, details="Heavy downpour")
    t = FactorDetail(score=20.0, weight=0.20, details="Gentle slope")
    c = FactorDetail(score=75.0, weight=0.25, details="Congested bottleneck")
    h = FactorDetail(score=10.0, weight=0.20, details="No incidents")

    factors = DangerFactors(weather=w, terrain=t, crowd=c, history=h)
    recs = generate_recommendations(tier=DangerTier.CRITICAL, factors=factors)

    assert any("EVACUATE" in r or "DO NOT ENTER" in r for r in recs)
    assert any("Meteorological hazard" in r for r in recs)
    assert any("Crowd congestion" in r for r in recs)
