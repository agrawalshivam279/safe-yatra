"""
Safe Yatra — ML Risk Engine
Dynamic Danger Score Aggregator & Tier Classification Engine.
Combines Weather, Terrain, Crowd, and Historical risk vectors (0.35 / 0.20 / 0.25 / 0.20)
into a deterministic composite danger score (0–100) and maps categorical safety tiers.
"""

from typing import List, Optional, Tuple

from app.models.crowd_model import CROWD_WEIGHT
from app.models.historical_model import HISTORICAL_WEIGHT
from app.models.terrain_model import TERRAIN_WEIGHT
from app.models.weather_model import WEATHER_WEIGHT
from app.schemas.response import DangerFactors, DangerTier, FactorDetail


def score_to_tier(score: float | int) -> DangerTier:
    """
    Maps a continuous or integer danger score (0–100) to standard categorical DangerTier.

    Tier Thresholds:
      - 0 – 25   : LOW        — Safe for travel
      - 26 – 50  : MODERATE   — Exercise awareness
      - 51 – 75  : SEVERE     — Avoid if possible, proceed with extreme caution
      - 76 – 100 : CRITICAL   — Do Not Enter / Evacuate immediately

    Args:
        score: Computed danger score (0.0 to 100.0).

    Returns:
        DangerTier enum (LOW | MODERATE | SEVERE | CRITICAL).
    """
    rounded = round(float(score))
    if rounded <= 25:
        return DangerTier.LOW
    elif rounded <= 50:
        return DangerTier.MODERATE
    elif rounded <= 75:
        return DangerTier.SEVERE
    else:
        return DangerTier.CRITICAL


def build_justification(
    danger_score: int,
    tier: DangerTier,
    factors: DangerFactors,
    custom_summary: Optional[str] = None,
) -> str:
    """
    Constructs a plain-English safety telemetry explanation adhering to GEMINI.md Section 4.

    Args:
        danger_score: Integer danger score (0–100).
        tier: DangerTier categorical level.
        factors: DangerFactors containing sub-model scores and details.
        custom_summary: Optional custom leading statement.

    Returns:
        Formatted telemetry justification string.
    """
    if custom_summary:
        headline = custom_summary.strip()
    else:
        if tier == DangerTier.CRITICAL:
            headline = "CRITICAL HAZARD — Immediate evacuation or avoidance required"
        elif tier == DangerTier.SEVERE:
            headline = "Severe hazard detected — Extreme caution and heightened vigilance advised"
        elif tier == DangerTier.MODERATE:
            headline = "Moderate risk — Exercise awareness of environmental and crowd conditions"
        else:
            headline = "Low risk — Conditions safe for standard travel"

    factor_details = [
        f"Weather: {factors.weather.details}",
        f"Terrain: {factors.terrain.details}",
        f"Crowd: {factors.crowd.details}",
        f"History: {factors.history.details}",
    ]
    details_clause = ". ".join(factor_details)

    return f"Danger Score: {danger_score} ({tier.value}) — {headline}. {details_clause}."


def generate_recommendations(
    tier: DangerTier,
    factors: DangerFactors,
) -> List[str]:
    """
    Generates actionable context-aware safety advisory items based on tier and active risk sub-factors.

    Args:
        tier: DangerTier categorical level.
        factors: Sub-factor telemetry details.

    Returns:
        List of actionable guidance strings.
    """
    recommendations: List[str] = []

    if tier == DangerTier.CRITICAL:
        recommendations.append("EVACUATE or DO NOT ENTER: Immediate hazard in designated area.")
    elif tier == DangerTier.SEVERE:
        recommendations.append("Avoid travel to this sector unless urgent; prepare for rapid escalation.")

    # Weather-specific recommendations
    if factors.weather.score >= 40.0:
        recommendations.append(
            "Meteorological hazard active: Seek sheltered high ground; avoid open ridgelines and watercourses."
        )

    # Terrain-specific recommendations
    if factors.terrain.score >= 40.0:
        recommendations.append(
            "Topographical hazard active: Stay on marked trails; maintain safe distance from cliff edges and steep slopes."
        )

    # Crowd-specific recommendations
    if factors.crowd.score >= 40.0:
        recommendations.append(
            "Crowd congestion active: Avoid bottlenecks and entry bottlenecks; identify secondary exit routes."
        )

    # History-specific recommendations
    if factors.history.score >= 40.0:
        recommendations.append(
            "High-risk incident zone: Strictly observe local safety barriers and posted warning notices."
        )

    if not recommendations:
        recommendations.append("Conditions normal. Maintain standard safety awareness and stay on marked paths.")

    return recommendations


def compute_danger_score(
    weather: FactorDetail,
    terrain: FactorDetail,
    crowd: FactorDetail,
    history: FactorDetail,
    custom_summary: Optional[str] = None,
) -> Tuple[int, DangerTier, str, DangerFactors]:
    """
    Computes the final composite danger score from all 4 normalized sub-factors using the
    formula: DANGER_SCORE = 0.35*weather + 0.20*terrain + 0.25*crowd + 0.20*history.

    Args:
        weather: Weather sub-factor detail (weight: 0.35).
        terrain: Terrain sub-factor detail (weight: 0.20).
        crowd: Crowd density sub-factor detail (weight: 0.25).
        history: Historical incident sub-factor detail (weight: 0.20).
        custom_summary: Optional leading justification summary.

    Returns:
        Tuple containing:
          - danger_score (int 0–100)
          - tier (DangerTier)
          - justification (str)
          - factors (DangerFactors)
    """
    # Linear convex combination
    raw_score = (
        (weather.score * WEATHER_WEIGHT)
        + (terrain.score * TERRAIN_WEIGHT)
        + (crowd.score * CROWD_WEIGHT)
        + (history.score * HISTORICAL_WEIGHT)
    )

    clamped_score = min(100.0, max(0.0, raw_score))
    integer_score = int(round(clamped_score))

    tier = score_to_tier(integer_score)

    factors = DangerFactors(
        weather=weather,
        terrain=terrain,
        crowd=crowd,
        history=history,
    )

    justification = build_justification(
        danger_score=integer_score,
        tier=tier,
        factors=factors,
        custom_summary=custom_summary,
    )

    return integer_score, tier, justification, factors
