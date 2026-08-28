"""
Safe Yatra — ML Risk Engine
Terrain / Topography Risk Sub-Model.
Computes normalized topographical hazard score (0–100, weight: 0.20).
"""

from app.schemas.response import FactorDetail

TERRAIN_WEIGHT = 0.20


def compute_terrain_risk(
    slope_degrees: float = 0.0,
    water_proximity_meters: float = 1000.0,
    elevation_meters: float = 0.0,
) -> FactorDetail:
    """
    Computes a normalized terrain risk factor (0.0 to 100.0) from topographical parameters.

    Formulation:
      - Slope Incline Term      (Max 50 pts): (slope_deg / 60) * 50
      - Water Proximity Term    (Max 35 pts): Inverse linear decay between 10m and 500m
      - Elevation / Altitude Term(Max 15 pts): High altitude risk (> 1000m ASL)

    Args:
        slope_degrees: Incline angle in degrees (0 to 90°).
        water_proximity_meters: Distance to closest water body in meters.
        elevation_meters: Elevation above sea level in meters.

    Returns:
        FactorDetail containing score (0-100), weight (0.20), and descriptive justification.
    """
    # Sanitize and clamp inputs
    slope = max(0.0, min(90.0, float(slope_degrees)))
    water_dist = max(0.0, float(water_proximity_meters))
    elevation = float(elevation_meters)

    # Component risk calculations
    # 1. Slope risk: Slopes >= 60° saturate to 50 pts
    slope_term = min(50.0, (slope / 60.0) * 50.0)

    # 2. Water proximity risk: <= 10m is 35 pts, >= 500m is 0 pts
    if water_dist <= 10.0:
        water_term = 35.0
    elif water_dist >= 500.0:
        water_term = 0.0
    else:
        water_term = 35.0 * (1.0 - (water_dist - 10.0) / 490.0)

    # 3. Elevation hazard: Elevated trekking altitude > 1000m ASL
    if elevation <= 1000.0:
        elev_term = 0.0
    else:
        elev_term = min(15.0, ((elevation - 1000.0) / 3000.0) * 15.0)

    raw_score = slope_term + water_term + elev_term
    normalized_score = round(min(100.0, max(0.0, raw_score)), 1)

    # Generate human-readable telemetry justification
    details_parts = []
    if slope >= 45.0:
        details_parts.append(f"Steep cliff incline ({slope:.1f}°)")
    elif slope >= 25.0:
        details_parts.append(f"Moderate slope ({slope:.1f}°)")
    else:
        details_parts.append(f"Gentle/flat terrain ({slope:.1f}°)")

    if water_dist <= 20.0:
        details_parts.append(f"Critical proximity to water body ({water_dist:.1f}m)")
    elif water_dist <= 100.0:
        details_parts.append(f"Close to water body ({water_dist:.1f}m)")
    elif water_dist <= 500.0:
        details_parts.append(f"Water body in vicinity ({water_dist:.1f}m)")
    else:
        details_parts.append(f"Safe distance from water ({water_dist:.1f}m)")

    if elevation >= 2500.0:
        details_parts.append(f"High altitude alpine terrain ({int(elevation)}m)")
    elif elevation > 1000.0:
        details_parts.append(f"Elevated terrain ({int(elevation)}m)")

    details_str = ", ".join(details_parts)

    return FactorDetail(
        score=normalized_score,
        weight=TERRAIN_WEIGHT,
        details=details_str,
    )
