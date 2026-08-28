"""
Historical incident resolution service querying past safety incidents
via CSV dataset and database with Haversine proximity filtering and recency decay.
"""

import csv
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.config import settings
from app.services.terrain_service import haversine_distance_km

logger = logging.getLogger(__name__)


class IncidentSummary(BaseModel):
    """Aggregated historical incident data model for risk scoring."""

    incident_count: int = Field(0, ge=0, description="Total incidents within search radius")
    fatal_count: int = Field(0, ge=0, description="Total fatalities across matched incidents")
    severe_count: int = Field(0, ge=0, description="Total severe non-fatal incidents")
    radius_km: float = Field(2.0, gt=0.0, description="Search radius in kilometers")
    recency_years: float = Field(5.0, ge=0.0, description="Years since the most recent incident")
    incidents: list[dict[str, Any]] = Field(default_factory=list, description="List of matched incident records")
    source: str = Field("csv_seed", description="Data origin: 'database' | 'csv_seed' | 'fallback'")


class IncidentService:
    """Async service to query and aggregate historical safety incidents."""

    def __init__(
        self,
        csv_path: Optional[Path | str] = None,
        database_url: Optional[str] = None,
    ) -> None:
        self.database_url = database_url or settings.DATABASE_URL
        self.incidents_cache: list[dict[str, Any]] = []

        if csv_path is None:
            base_dir = Path(__file__).resolve().parent.parent.parent
            csv_path = base_dir / "data" / "historical_incidents.csv"
        else:
            csv_path = Path(csv_path)

        self._load_csv_incidents(csv_path)

    def _load_csv_incidents(self, path: Path) -> None:
        """Load incidents from CSV into memory."""
        if not path.exists():
            logger.warning("Historical incidents CSV not found at %s", path)
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                records = []
                for row in reader:
                    try:
                        record = {
                            "incident_id": row.get("incident_id", ""),
                            "zone_id": row.get("zone_id", ""),
                            "incident_type": row.get("incident_type", "general"),
                            "severity": row.get("severity", "MINOR").upper(),
                            "fatalities": int(row.get("fatalities", 0)),
                            "injuries": int(row.get("injuries", 0)),
                            "lat": float(row.get("lat", 0.0)),
                            "lng": float(row.get("lng", 0.0)),
                            "occurred_at": row.get("occurred_at", ""),
                            "description": row.get("description", ""),
                            "source": row.get("source", "GOVT_REPORT"),
                        }
                        records.append(record)
                    except (ValueError, TypeError) as parse_err:
                        logger.warning("Skipping malformed incident row %s: %s", row, parse_err)
                self.incidents_cache = records
                logger.info("Loaded %d historical incident records from %s", len(self.incidents_cache), path)
        except Exception as exc:
            logger.error("Failed to read historical incidents CSV %s: %s", path, exc)
            self.incidents_cache = []

    async def get_incident_summary(
        self,
        lat: float,
        lng: float,
        radius_km: float = 2.0,
        max_recency_years: float = 5.0,
        reference_date: Optional[datetime] = None,
    ) -> IncidentSummary:
        """
        Query historical safety incidents within a geographic radius and recency window.
        Aggregates total incident count, fatalities, severe injuries, and most recent incident timing.
        """
        if not self.incidents_cache:
            return IncidentSummary(
                incident_count=0,
                fatal_count=0,
                severe_count=0,
                radius_km=radius_km,
                recency_years=max_recency_years,
                incidents=[],
                source="fallback",
            )

        ref_dt = reference_date or datetime.now(timezone.utc)
        matched_incidents: list[dict[str, Any]] = []
        recency_list: list[float] = []

        total_fatalities = 0
        total_severe = 0

        for inc in self.incidents_cache:
            inc_lat = inc["lat"]
            inc_lng = inc["lng"]
            distance = haversine_distance_km(lat, lng, inc_lat, inc_lng)

            if distance <= radius_km:
                # Parse timestamp and compute recency in years
                recency_years = max_recency_years
                occ_str = inc["occurred_at"]
                if occ_str:
                    try:
                        # ISO 8601 parsing
                        occ_dt = datetime.fromisoformat(occ_str.replace("Z", "+00:00"))
                        delta_days = (ref_dt - occ_dt).total_seconds() / 86400.0
                        recency_years = max(0.0, delta_days / 365.25)
                    except Exception:
                        recency_years = 2.0

                if recency_years <= max_recency_years:
                    matched_inc = {**inc, "distance_km": round(distance, 3), "recency_years": round(recency_years, 2)}
                    matched_incidents.append(matched_inc)
                    recency_list.append(recency_years)

                    fatalities = inc.get("fatalities", 0)
                    total_fatalities += fatalities

                    sev = inc.get("severity", "").upper()
                    if sev in ("SEVERE", "MAJOR") and fatalities == 0:
                        total_severe += 1

        min_recency = min(recency_list) if recency_list else max_recency_years

        return IncidentSummary(
            incident_count=len(matched_incidents),
            fatal_count=total_fatalities,
            severe_count=total_severe,
            radius_km=radius_km,
            recency_years=round(min_recency, 2),
            incidents=matched_incidents,
            source="csv_seed",
        )


# Default singleton instance
incident_service = IncidentService()
