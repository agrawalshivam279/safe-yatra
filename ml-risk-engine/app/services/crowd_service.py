"""
Crowd density estimation service modeling diurnal footfall curves,
day-of-week multipliers, site-specific capacities, and manual overrides.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from pydantic import BaseModel, Field

from app.services.terrain_service import TerrainService, terrain_service

logger = logging.getLogger(__name__)

# Indian Standard Time (UTC+5:30) offset
IST_OFFSET = timezone(timedelta(hours=5, minutes=30))

# Baseline pilot site capacity and walkable surface areas
SITE_CAPACITIES: dict[str, dict[str, float]] = {
    "lonavala_bhushi_dam": {"base_crowd": 400.0, "area_sqm": 1200.0},
    "lonavala_tiger_point": {"base_crowd": 350.0, "area_sqm": 1000.0},
    "lonavala_karla_caves": {"base_crowd": 500.0, "area_sqm": 1800.0},
    "lonavala_rajmachi_fort": {"base_crowd": 150.0, "area_sqm": 3500.0},
    "lonavala_khandala_ghat": {"base_crowd": 250.0, "area_sqm": 2500.0},
}


def get_time_of_day_multiplier(hour: int) -> float:
    """Return diurnal tourist activity multiplier for a given 24h hour."""
    if 0 <= hour <= 5:
        return 0.1
    elif 6 <= hour <= 8:
        return 0.4
    elif 9 <= hour <= 11:
        return 1.2
    elif 12 <= hour <= 16:
        return 1.8  # Peak tourist afternoon
    elif 17 <= hour <= 19:
        return 1.3  # Sunset viewing
    else:
        return 0.3


def get_day_of_week_multiplier(weekday: int) -> float:
    """Return weekend surge multiplier. 0=Mon, ..., 4=Fri, 5=Sat, 6=Sun."""
    if weekday in (5, 6):  # Saturday, Sunday
        return 2.2
    elif weekday == 4:  # Friday
        return 1.3
    return 1.0


class CrowdData(BaseModel):
    """Normalized crowd estimation data model for risk scoring."""

    crowd_count: int = Field(0, ge=0, description="Estimated or observed number of persons present")
    area_sqm: float = Field(2500.0, gt=0.0, description="Walkable surface area in square meters")
    density_persons_sqm: float = Field(0.0, ge=0.0, description="Crowd density in persons/m^2")
    event_multiplier: float = Field(1.0, ge=0.1, le=10.0, description="Surge multiplier based on day/time/events")
    matched_site: Optional[str] = Field(None, description="Matched pilot profile identifier if near a known site")
    source: str = Field("estimation", description="Data origin: 'estimation' | 'override' | 'fallback'")


class CrowdService:
    """Async service to estimate crowd footfall and density."""

    def __init__(self, terrain_svc: Optional[TerrainService] = None) -> None:
        self.terrain_svc = terrain_svc or terrain_service

    async def get_crowd_estimate(
        self,
        lat: float,
        lng: float,
        dt: Optional[datetime] = None,
        override_count: Optional[int] = None,
        area_sqm_override: Optional[float] = None,
    ) -> CrowdData:
        """
        Estimate crowd size and density for given coordinates and time.
        Applies site capacity heuristics, diurnal time-of-day curves, and weekend surges.
        """
        # 1. Handle explicit manual override
        if override_count is not None:
            area = area_sqm_override if (area_sqm_override is not None and area_sqm_override > 0) else 2500.0
            density = round(max(0, override_count) / area, 4)
            return CrowdData(
                crowd_count=max(0, override_count),
                area_sqm=area,
                density_persons_sqm=density,
                event_multiplier=1.0,
                matched_site=None,
                source="override",
            )

        # 2. Check nearest pilot site profile for specific capacity & area
        match = self.terrain_svc.find_nearest_profile(lat, lng)
        matched_site_id = None
        base_crowd = 120.0
        area_sqm = 2500.0

        if match is not None:
            profile, _ = match
            site_id = profile.get("site_id")
            if site_id and site_id in SITE_CAPACITIES:
                matched_site_id = site_id
                base_crowd = SITE_CAPACITIES[site_id]["base_crowd"]
                area_sqm = SITE_CAPACITIES[site_id]["area_sqm"]

        if area_sqm_override is not None and area_sqm_override > 0:
            area_sqm = area_sqm_override

        # 3. Calculate temporal multipliers in IST
        target_dt = dt or datetime.now(timezone.utc)
        ist_dt = target_dt.astimezone(IST_OFFSET) if target_dt.tzinfo else target_dt + timedelta(hours=5, minutes=30)

        hour_mult = get_time_of_day_multiplier(ist_dt.hour)
        day_mult = get_day_of_week_multiplier(ist_dt.weekday())
        composite_multiplier = round(hour_mult * day_mult, 2)

        # 4. Compute estimated footfall and density
        estimated_count = max(0, int(round(base_crowd * composite_multiplier)))
        density = round(estimated_count / area_sqm, 4)

        return CrowdData(
            crowd_count=estimated_count,
            area_sqm=area_sqm,
            density_persons_sqm=density,
            event_multiplier=composite_multiplier,
            matched_site=matched_site_id,
            source="estimation",
        )


# Default singleton instance
crowd_service = CrowdService()
