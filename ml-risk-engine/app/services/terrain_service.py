"""
Topographical and terrain data service supporting precomputed pilot profiles,
nearest-neighbor Haversine matching, and OpenTopoData elevation API fallback.
"""

import json
import logging
import math
from pathlib import Path
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


class TerrainData(BaseModel):
    """Normalized topographical data model for risk scoring."""

    elevation_meters: float = Field(0.0, ge=-500.0, le=9000.0, description="Altitude above sea level in meters")
    slope_degrees: float = Field(0.0, ge=0.0, le=90.0, description="Topographical slope incline in degrees")
    water_proximity_meters: float = Field(1000.0, ge=0.0, description="Distance to nearest water body in meters")
    terrain_type: str = Field("general", description="Categorical terrain description")
    matched_site: Optional[str] = Field(None, description="Identifier of matched pilot profile site")
    source: str = Field("precomputed", description="Data origin: 'precomputed' | 'opentopo' | 'fallback'")


class TerrainService:
    """Async service to determine terrain characteristics for coordinates."""

    def __init__(
        self,
        profiles_path: Optional[Path | str] = None,
        opentopo_url: Optional[str] = None,
        timeout_seconds: float = 3.0,
        max_match_distance_km: float = 5.0,
    ) -> None:
        self.opentopo_url = opentopo_url if opentopo_url is not None else settings.OPENTOPO_API_URL
        self.timeout_seconds = timeout_seconds
        self.max_match_distance_km = max_match_distance_km
        self.profiles: list[dict[str, Any]] = []

        if profiles_path is None:
            # Default to data/terrain_profiles.json relative to project root
            base_dir = Path(__file__).resolve().parent.parent.parent
            profiles_path = base_dir / "data" / "terrain_profiles.json"
        else:
            profiles_path = Path(profiles_path)

        self._load_profiles(profiles_path)

    def _load_profiles(self, path: Path) -> None:
        """Load precomputed terrain profiles from disk if available."""
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self.profiles = json.load(f)
                logger.info("Loaded %d precomputed terrain profiles from %s", len(self.profiles), path)
            except Exception as exc:
                logger.error("Failed to parse terrain profiles from %s: %s", path, exc)
                self.profiles = []
        else:
            logger.warning("Terrain profiles file not found at %s", path)
            self.profiles = []

    def find_nearest_profile(self, lat: float, lng: float) -> Optional[tuple[dict[str, Any], float]]:
        """
        Find nearest precomputed pilot profile within the maximum match distance.
        Returns tuple of (profile_dict, distance_km) or None.
        """
        if not self.profiles:
            return None

        best_profile: Optional[dict[str, Any]] = None
        min_distance = float("inf")

        for profile in self.profiles:
            p_lat = profile.get("lat")
            p_lng = profile.get("lng")
            if p_lat is None or p_lng is None:
                continue

            distance = haversine_distance_km(lat, lng, float(p_lat), float(p_lng))
            if distance < min_distance:
                min_distance = distance
                best_profile = profile

        if best_profile is not None and min_distance <= self.max_match_distance_km:
            return (best_profile, round(min_distance, 3))
        return None

    async def get_terrain(
        self,
        lat: float,
        lng: float,
        client: Optional[httpx.AsyncClient] = None,
    ) -> TerrainData:
        """
        Determine terrain metrics for given coordinates.
        Checks precomputed offline profiles first, then queries OpenTopoData, falling back to neutral baselines.
        """
        # 1. Check precomputed offline profile
        match = self.find_nearest_profile(lat, lng)
        if match is not None:
            profile, dist = match
            logger.debug("Matched precomputed terrain profile %s (dist: %.2f km)", profile.get("site_id"), dist)
            return TerrainData(
                elevation_meters=float(profile.get("elevation_meters", 0.0)),
                slope_degrees=float(profile.get("slope_degrees", 0.0)),
                water_proximity_meters=float(profile.get("water_proximity_meters", 1000.0)),
                terrain_type=str(profile.get("terrain_type", "general")),
                matched_site=profile.get("site_id"),
                source="precomputed",
            )

        # 2. Query OpenTopoData elevation API if configured
        if self.opentopo_url and self.opentopo_url.strip() != "":
            try:
                should_close = False
                if client is None:
                    client = httpx.AsyncClient(timeout=self.timeout_seconds)
                    should_close = True

                try:
                    response = await client.get(self.opentopo_url, params={"locations": f"{lat},{lng}"})
                    response.raise_for_status()
                    payload = response.json()
                finally:
                    if should_close:
                        await client.aclose()

                results = payload.get("results", [])
                if results and isinstance(results, list):
                    elevation_raw = results[0].get("elevation")
                    if elevation_raw is not None:
                        elevation_val = max(-500.0, min(9000.0, float(elevation_raw)))
                        return TerrainData(
                            elevation_meters=elevation_val,
                            slope_degrees=10.0,
                            water_proximity_meters=1000.0,
                            terrain_type="general",
                            matched_site=None,
                            source="opentopo",
                        )
            except Exception as exc:
                logger.warning("Failed to query OpenTopoData API (%s); falling back to neutral defaults.", exc)

        # 3. Default fallback values
        return TerrainData(
            elevation_meters=300.0,
            slope_degrees=10.0,
            water_proximity_meters=1000.0,
            terrain_type="general",
            matched_site=None,
            source="fallback",
        )


# Default singleton instance
terrain_service = TerrainService()
