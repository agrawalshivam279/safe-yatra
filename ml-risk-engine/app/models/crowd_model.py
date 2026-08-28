"""
Safe Yatra — ML Risk Engine
Crowd Density Risk Sub-Model.
Computes normalized pedestrian density hazard score (0–100, weight: 0.25)
based on Fruin's Level of Service (LoS) standards and stampede crush dynamics.
"""

from app.schemas.response import FactorDetail

CROWD_WEIGHT = 0.25


def compute_crowd_risk(
    crowd_count: int = 0,
    area_sqm: float = 1000.0,
    event_multiplier: float = 1.0,
) -> FactorDetail:
    """
    Computes a normalized crowd density risk factor (0.0 to 100.0) from estimated headcount
    and spatial surface area using Fruin's Level of Service (LoS) framework.

    Density Formulations (persons per m²):
      - LoS A/B (0.0 – 0.5 p/m²): Free flow, safe pedestrian movement (0–20 pts)
      - LoS C/D (0.5 – 1.5 p/m²): Constrained flow, restricted speed (20–50 pts)
      - LoS E   (1.5 – 3.0 p/m²): Severe congestion, high crush risk (50–80 pts)
      - LoS F   (> 3.0 p/m²)    : Critical crush / Stampede hazard (80–100 pts)

    Args:
        crowd_count: Estimated footfall headcount in the designated zone (clamped >= 0).
        area_sqm: Effective spatial surface area in square meters (default: 1000.0 m²).
        event_multiplier: Festival / peak pilgrimage surge multiplier (default: 1.0, clamped >= 0.1).

    Returns:
        FactorDetail containing score (0-100), weight (0.25), and descriptive justification.
    """
    # Sanitize and clamp inputs
    headcount = max(0, int(crowd_count))
    effective_area = max(1.0, float(area_sqm))
    multiplier = max(0.1, float(event_multiplier))

    effective_headcount = headcount * multiplier
    density = effective_headcount / effective_area

    # Fruin Level of Service non-linear risk mapping
    if density <= 0.5:
        # LoS A/B: Free flow (0 to 20 pts)
        raw_score = (density / 0.5) * 20.0
    elif density <= 1.5:
        # LoS C/D: Constrained flow (20 to 50 pts)
        raw_score = 20.0 + ((density - 0.5) / 1.0) * 30.0
    elif density <= 3.0:
        # LoS E: Severe congestion (50 to 80 pts)
        raw_score = 50.0 + ((density - 1.5) / 1.5) * 30.0
    else:
        # LoS F: Critical crush / stampede hazard (80 to 100 pts, saturates at 5.0 p/m²)
        raw_score = 80.0 + min(20.0, ((density - 3.0) / 2.0) * 20.0)

    normalized_score = round(min(100.0, max(0.0, raw_score)), 1)

    # Generate human-readable telemetry justification
    details_parts = []
    if density >= 3.0 or normalized_score >= 76.0:
        details_parts.append(
            f"CRITICAL STAMPEDE HAZARD: ~{int(effective_headcount)} estimated persons "
            f"({density:.2f} p/m²), extreme crowd crush danger"
        )
    elif density >= 1.5 or normalized_score >= 51.0:
        details_parts.append(
            f"Severe crowd congestion: ~{int(effective_headcount)} estimated persons "
            f"({density:.2f} p/m²), high crush hazard"
        )
    elif density >= 0.5 or normalized_score >= 26.0:
        details_parts.append(
            f"~{int(effective_headcount)} estimated persons, moderate density ({density:.2f} p/m²)"
        )
    else:
        if headcount > 0:
            details_parts.append(
                f"~{int(effective_headcount)} estimated persons, free-flowing low density ({density:.2f} p/m²)"
            )
        else:
            details_parts.append("Sparse footfall / no active crowd congestion")

    if multiplier > 1.0:
        details_parts.append(f"event surge multiplier {multiplier:.1f}x applied")

    details_str = ", ".join(details_parts)

    return FactorDetail(
        score=normalized_score,
        weight=CROWD_WEIGHT,
        details=details_str,
    )
