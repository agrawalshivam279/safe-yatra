"""
Safe Yatra — ML Risk Engine
Score Router: Single Coordinate, Batch, Zone-Level Scoring & Safety Explanations.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.models.crowd_model import compute_crowd_risk
from app.models.danger_score import (
    compute_danger_score,
    generate_recommendations,
)
from app.models.historical_model import compute_historical_risk
from app.models.terrain_model import compute_terrain_risk
from app.models.weather_model import compute_weather_risk
from app.schemas.request import (
    BatchScoreRequest,
    ScoreRequest,
    SimulationOverrides,
    ZoneScoreRequest,
)
from app.schemas.response import (
    BatchScoreResponse,
    CoordinatesModel,
    ExplanationResponse,
    ScoreResponse,
)
from app.services.crowd_service import crowd_service
from app.services.incident_service import incident_service
from app.services.terrain_service import terrain_service
from app.services.weather_service import weather_service

logger = logging.getLogger(__name__)

score_router = APIRouter(prefix="", tags=["Danger Score Engine"])


def _find_zone_profile(zone_id: str) -> Optional[dict[str, Any]]:
    """
    Resolve zone profile from precomputed terrain profiles by ID or fuzzy slug match.
    Matches direct IDs (e.g. 'lonavala_bhushi_dam') or normalized variants
    (e.g. 'zone-lonavala-bhushi-dam-01', 'zone_lonavala_waterfall_01').
    """
    normalized_query = zone_id.lower().replace("-", "_")

    # 1. Exact match on site_id
    for profile in terrain_service.profiles:
        site_id = profile.get("site_id", "").lower().replace("-", "_")
        if site_id and (site_id == normalized_query):
            return profile

    # 2. Substring / slug match (e.g. 'bhushi_dam' or 'tiger_point')
    for profile in terrain_service.profiles:
        site_id = profile.get("site_id", "").lower().replace("-", "_")
        # Extract core site key (e.g. 'bhushi_dam' from 'lonavala_bhushi_dam')
        core_key = site_id.replace("lonavala_", "")
        if core_key and core_key in normalized_query:
            return profile

    # 3. Check name matches
    for profile in terrain_service.profiles:
        name = profile.get("name", "").lower().replace(" ", "_")
        if name and (name in normalized_query or normalized_query in name):
            return profile

    return None


async def _evaluate_point_danger(
    lat: float,
    lng: float,
    zone_id: Optional[str] = None,
    overrides: Optional[SimulationOverrides] = None,
) -> ScoreResponse:
    """
    Orchestrate all 4 data ingestion services, calculate individual risk factors,
    and compute composite danger score envelope.
    """
    # 1. Ingest & normalize Weather Risk
    weather_data = await weather_service.get_weather(lat, lng)
    precip = (
        overrides.precipitation_mm
        if (overrides and overrides.precipitation_mm is not None)
        else weather_data.precipitation_mm
    )
    wind = (
        overrides.wind_speed_kmh
        if (overrides and overrides.wind_speed_kmh is not None)
        else weather_data.wind_speed_kmh
    )
    vis = (
        overrides.visibility_meters
        if (overrides and overrides.visibility_meters is not None)
        else weather_data.visibility_meters
    )
    weather_factor = compute_weather_risk(
        precipitation_mm=precip,
        wind_speed_kmh=wind,
        visibility_meters=vis,
    )

    # 2. Ingest & normalize Terrain Risk
    terrain_data = await terrain_service.get_terrain(lat, lng)
    slope = (
        overrides.slope_degrees
        if (overrides and overrides.slope_degrees is not None)
        else terrain_data.slope_degrees
    )
    water_dist = (
        overrides.water_proximity_meters
        if (overrides and overrides.water_proximity_meters is not None)
        else terrain_data.water_proximity_meters
    )
    elev = (
        overrides.elevation_meters
        if (overrides and overrides.elevation_meters is not None)
        else terrain_data.elevation_meters
    )
    terrain_factor = compute_terrain_risk(
        slope_degrees=slope,
        water_proximity_meters=water_dist,
        elevation_meters=elev,
    )

    # 3. Ingest & normalize Crowd Density Risk
    crowd_count_override = overrides.crowd_count if overrides else None
    crowd_data = await crowd_service.get_crowd_estimate(
        lat=lat,
        lng=lng,
        override_count=crowd_count_override,
    )
    crowd_factor = compute_crowd_risk(
        crowd_count=crowd_data.crowd_count,
        area_sqm=crowd_data.area_sqm,
        event_multiplier=crowd_data.event_multiplier,
    )

    # 4. Ingest & normalize Historical Incident Risk
    incident_summary = await incident_service.get_incident_summary(
        lat=lat,
        lng=lng,
        radius_km=2.0,
    )
    if overrides and overrides.historical_incident_count is not None:
        inc_count = overrides.historical_incident_count
        fatal_count = 1 if inc_count > 0 else 0
        severe_count = max(0, inc_count - 1)
        recency_years = 1.0 if inc_count > 0 else 5.0
    else:
        inc_count = incident_summary.incident_count
        fatal_count = incident_summary.fatal_count
        severe_count = incident_summary.severe_count
        recency_years = incident_summary.recency_years

    history_factor = compute_historical_risk(
        incident_count=inc_count,
        fatal_count=fatal_count,
        severe_count=severe_count,
        radius_km=2.0,
        recency_years=recency_years,
    )

    # 5. Composite Danger Score Aggregation
    danger_score, tier, justification, factors = compute_danger_score(
        weather=weather_factor,
        terrain=terrain_factor,
        crowd=crowd_factor,
        history=history_factor,
    )

    # Effective zone_id
    effective_zone_id = zone_id or terrain_data.matched_site

    return ScoreResponse(
        zone_id=effective_zone_id,
        coordinates=CoordinatesModel(lat=lat, lng=lng),
        danger_score=danger_score,
        tier=tier,
        justification=justification,
        factors=factors,
        computed_at=datetime.now(timezone.utc),
        ttl_seconds=300,
    )


@score_router.post(
    "/score",
    response_model=ScoreResponse,
    summary="Compute Dynamic Danger Score for a Coordinate",
    status_code=status.HTTP_200_OK,
)
async def compute_score(request: ScoreRequest) -> ScoreResponse:
    """
    Compute real-time multi-variable danger score (0–100) for a given geographic coordinate.
    Orchestrates weather, terrain slope, crowd density, and historical incidents.
    """
    return await _evaluate_point_danger(
        lat=request.lat,
        lng=request.lng,
        zone_id=request.zone_id,
        overrides=request.simulation_overrides,
    )


@score_router.post(
    "/score/batch",
    response_model=BatchScoreResponse,
    summary="Batch Compute Danger Scores for Multiple Coordinates",
    status_code=status.HTTP_200_OK,
)
async def compute_score_batch(request: BatchScoreRequest) -> BatchScoreResponse:
    """
    Concurrently compute danger scores for 1 to 100 coordinates.
    Applies global simulation overrides unless overridden per point.
    """
    tasks = []
    for point in request.points:
        # Merge overrides: local point override takes precedence over global batch override
        effective_overrides = point.simulation_overrides or request.simulation_overrides
        tasks.append(
            _evaluate_point_danger(
                lat=point.lat,
                lng=point.lng,
                zone_id=point.zone_id,
                overrides=effective_overrides,
            )
        )

    results = await asyncio.gather(*tasks)

    return BatchScoreResponse(
        results=list(results),
        total_computed=len(results),
        computed_at=datetime.now(timezone.utc),
    )


@score_router.post(
    "/score/zone/{zone_id}",
    response_model=ScoreResponse,
    summary="Compute Danger Score for a Predefined Zone",
    status_code=status.HTTP_200_OK,
)
async def compute_zone_score(
    zone_id: str,
    request: Optional[ZoneScoreRequest] = None,
) -> ScoreResponse:
    """
    Compute danger score for a predefined pilgrimage or tourist zone by its unique identifier.
    Resolves geographic center coordinates from the zone registry.
    """
    profile = _find_zone_profile(zone_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Predefined zone '{zone_id}' not found in registry.",
        )

    lat = float(profile["lat"])
    lng = float(profile["lng"])
    overrides = request.simulation_overrides if request else None

    return await _evaluate_point_danger(
        lat=lat,
        lng=lng,
        zone_id=zone_id,
        overrides=overrides,
    )


@score_router.get(
    "/score/explain/{zone_id}",
    response_model=ExplanationResponse,
    summary="Explain Danger Score and Provide Safety Advisories",
    status_code=status.HTTP_200_OK,
)
async def explain_zone_score(
    zone_id: str,
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Optional custom latitude"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Optional custom longitude"),
) -> ExplanationResponse:
    """
    Generate plain-English safety telemetry briefings and actionable recommendations for a zone.
    """
    if lat is not None and lng is not None:
        eval_lat, eval_lng = lat, lng
    else:
        profile = _find_zone_profile(zone_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Predefined zone '{zone_id}' not found in registry.",
            )
        eval_lat = float(profile["lat"])
        eval_lng = float(profile["lng"])

    score_result = await _evaluate_point_danger(
        lat=eval_lat,
        lng=eval_lng,
        zone_id=zone_id,
        overrides=None,
    )

    recommendations = generate_recommendations(
        tier=score_result.tier,
        factors=score_result.factors,
    )

    return ExplanationResponse(
        zone_id=zone_id,
        coordinates=score_result.coordinates,
        danger_score=score_result.danger_score,
        tier=score_result.tier,
        summary=score_result.justification,
        recommendations=recommendations,
        factors=score_result.factors,
    )
