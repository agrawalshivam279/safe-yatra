"""
Safe Yatra — ML Risk Engine
Weather Risk Sub-Model.
Computes normalized meteorological hazard score (0–100, weight: 0.35).
"""

from app.schemas.response import FactorDetail

WEATHER_WEIGHT = 0.35


def compute_weather_risk(
    precipitation_mm: float = 0.0,
    wind_speed_kmh: float = 0.0,
    visibility_meters: float = 10000.0,
) -> FactorDetail:
    """
    Computes a normalized weather risk factor (0.0 to 100.0) from meteorological parameters.

    Formulation:
      - Precipitation Term (Max 60 pts): (precip_mm / 200) * 60
      - Wind Speed Term    (Max 25 pts): (wind_kmh / 150) * 25
      - Visibility Term    (Max 15 pts): (1 - (visibility_m / 10000)) * 15

    Args:
        precipitation_mm: 6-hour rainfall in millimeters (clamped >= 0).
        wind_speed_kmh: Sustained wind speed / gusts in km/h (clamped >= 0).
        visibility_meters: Optical visibility range in meters (clamped >= 0).

    Returns:
        FactorDetail containing score (0-100), weight (0.35), and descriptive justification.
    """
    # Sanitize and clamp inputs
    precip = max(0.0, float(precipitation_mm))
    wind = max(0.0, float(wind_speed_kmh))
    vis = max(0.0, min(10000.0, float(visibility_meters)))

    # Component risk calculations
    precip_term = min(60.0, (precip / 200.0) * 60.0)
    wind_term = min(25.0, (wind / 150.0) * 25.0)
    vis_term = max(0.0, (1.0 - (vis / 10000.0)) * 15.0)

    raw_score = precip_term + wind_term + vis_term
    normalized_score = round(min(100.0, max(0.0, raw_score)), 1)

    # Generate human-readable telemetry justification
    details_parts = []
    if precip >= 150.0:
        details_parts.append(f"Torrential rainfall ({precip:.1f}mm/6hr)")
    elif precip >= 50.0:
        details_parts.append(f"Heavy rainfall ({precip:.1f}mm/6hr)")
    elif precip >= 10.0:
        details_parts.append(f"Moderate rainfall ({precip:.1f}mm/6hr)")
    else:
        details_parts.append(f"Light/no precipitation ({precip:.1f}mm/6hr)")

    if wind >= 70.0:
        details_parts.append(f"Severe gale winds ({wind:.1f}km/h)")
    elif wind >= 40.0:
        details_parts.append(f"Strong winds ({wind:.1f}km/h)")

    if vis < 500.0:
        details_parts.append(f"Dense fog/critical low visibility ({int(vis)}m)")
    elif vis <= 2500.0:
        details_parts.append(f"Moderate fog/haze ({int(vis)}m)")

    details_str = ", ".join(details_parts)

    return FactorDetail(
        score=normalized_score,
        weight=WEATHER_WEIGHT,
        details=details_str,
    )
