"""
Safe Yatra — ML Risk Engine
Historical Incident Risk Sub-Model.
Computes normalized safety incident hazard score (0–100, weight: 0.20)
based on past incident frequency, severity classification, distance attenuation, and recency decay.
"""

from app.schemas.response import FactorDetail

HISTORICAL_WEIGHT = 0.20


def compute_historical_risk(
    incident_count: int = 0,
    fatal_count: int = 0,
    severe_count: int = 0,
    radius_km: float = 2.0,
    recency_years: float = 5.0,
) -> FactorDetail:
    """
    Computes a normalized historical incident risk factor (0.0 to 100.0) from past safety records
    within a geographic radius.

    Formulation:
      - Fatal incidents contribute 25.0 points each (drowning, fatal landslides, stampedes)
      - Severe incidents contribute 12.0 points each (critical rescues, serious trauma)
      - Moderate / other incidents contribute 5.0 points each
      - Proximity attenuation: Inversely scaled if radius > 2.0km
      - Recency attenuation: Time-window scaled over baseline 5.0 years

    Args:
        incident_count: Total number of recorded safety incidents in the area (clamped >= 0).
        fatal_count: Number of fatal incidents in the area (clamped >= 0).
        severe_count: Number of critical / severe non-fatal incidents (clamped >= 0).
        radius_km: Search radius in kilometers (default: 2.0 km, clamped > 0.0).
        recency_years: Historical observation window in years (default: 5.0 yr, clamped > 0.0).

    Returns:
        FactorDetail containing score (0-100), weight (0.20), and descriptive justification.
    """
    # Sanitize and clamp inputs
    total_incidents = max(0, int(incident_count))
    fatalities = max(0, int(fatal_count))
    severe = max(0, int(severe_count))
    rad = max(0.1, float(radius_km))
    years = max(0.5, float(recency_years))

    # Ensure consistent classification counts
    classified_count = fatalities + severe
    if classified_count > total_incidents:
        total_incidents = classified_count

    moderate = max(0, total_incidents - classified_count)

    # Base severity score calculation
    raw_base = (fatalities * 25.0) + (severe * 12.0) + (moderate * 5.0)

    # Distance attenuation: Baseline is 2.0 km radius
    if rad <= 2.0:
        distance_factor = 1.0
    else:
        distance_factor = min(1.0, 2.0 / rad)

    # Recency attenuation: Baseline is 5.0 years window
    recency_factor = min(1.0, 5.0 / years)

    raw_score = raw_base * distance_factor * recency_factor
    normalized_score = round(min(100.0, max(0.0, raw_score)), 1)

    # Generate human-readable telemetry justification
    details_parts = []
    if total_incidents == 0:
        details_str = f"No historical incidents recorded within {rad:.1f}km radius"
    else:
        summary_tokens = []
        if fatalities > 0:
            summary_tokens.append(f"{fatalities} fatal")
        if severe > 0:
            summary_tokens.append(f"{severe} severe")
        if moderate > 0:
            summary_tokens.append(f"{moderate} moderate")

        breakdown_str = ", ".join(summary_tokens) if summary_tokens else f"{total_incidents} incidents"
        details_str = f"{total_incidents} incidents ({breakdown_str}) within {rad:.1f}km in last {int(years)} years"

    return FactorDetail(
        score=normalized_score,
        weight=HISTORICAL_WEIGHT,
        details=details_str,
    )
