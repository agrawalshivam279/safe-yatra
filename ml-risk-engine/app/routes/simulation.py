"""
Safe Yatra — ML Risk Engine
Simulation Router: Override Injection, Scenario Discovery & Disaster Simulations.
"""

import json
import logging
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.routes.score import _evaluate_point_danger
from app.schemas.request import ScoreRequest, SimulationOverrides
from app.schemas.response import ScoreResponse

logger = logging.getLogger(__name__)

simulation_router = APIRouter(prefix="", tags=["Simulation & What-If Engine"])


class ScenarioMetadata(BaseModel):
    """Metadata descriptor for a predefined disaster test scenario."""

    slug: str = Field(..., description="Unique URL-safe identifier for the scenario")
    name: str = Field(..., description="Human-readable title of the scenario")
    category: str = Field(..., description="Hazard category: FLOOD | CROWD | TERRAIN | BASELINE")
    description: str = Field(..., description="Detailed description of simulated environmental conditions")
    site_id: str = Field(..., description="Target pilot site identifier")
    lat: float = Field(..., description="Target geographic latitude")
    lng: float = Field(..., description="Target geographic longitude")
    expected_tier: str = Field(..., description="Expected resulting danger tier (LOW | MODERATE | SEVERE | CRITICAL)")
    simulation_overrides: SimulationOverrides = Field(..., description="Forced environmental parameters")


class ScenarioListResponse(BaseModel):
    """Response payload listing available test scenarios."""

    scenarios: List[ScenarioMetadata] = Field(..., description="List of available disaster test scenarios")
    total_count: int = Field(..., ge=0, description="Total number of scenarios available")


def _get_scenarios_dir() -> Path:
    """Resolve data/scenarios directory path relative to project root."""
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "data" / "scenarios"


def _load_all_scenarios() -> list[dict[str, Any]]:
    """Discover and parse all JSON scenario fixtures from data/scenarios."""
    scenarios_dir = _get_scenarios_dir()
    if not scenarios_dir.exists():
        logger.warning("Scenarios directory not found at %s", scenarios_dir)
        return []

    scenarios = []
    for filepath in scenarios_dir.glob("*.json"):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                scenarios.append(data)
        except Exception as exc:
            logger.error("Failed to parse scenario file %s: %s", filepath, exc)

    return scenarios


def _find_scenario(slug: str) -> Optional[dict[str, Any]]:
    """Lookup scenario by exact slug or normalized filename."""
    normalized_slug = slug.lower().replace("-", "_").replace(".json", "")
    for sc in _load_all_scenarios():
        if sc.get("slug", "").lower() == normalized_slug:
            return sc
    return None


@simulation_router.post(
    "/override",
    response_model=ScoreResponse,
    summary="Simulate Danger Score with Custom Environmental Overrides",
    status_code=status.HTTP_200_OK,
)
async def simulate_override(request: ScoreRequest) -> ScoreResponse:
    """
    Execute danger score computation with explicit parameter overrides.
    Bypasses external weather APIs and historical DB dependencies to test edge cases.
    """
    return await _evaluate_point_danger(
        lat=request.lat,
        lng=request.lng,
        zone_id=request.zone_id,
        overrides=request.simulation_overrides,
    )


@simulation_router.get(
    "/scenarios",
    response_model=ScenarioListResponse,
    summary="List Predefined Disaster Test Scenarios",
    status_code=status.HTTP_200_OK,
)
async def list_scenarios() -> ScenarioListResponse:
    """
    Retrieve catalog of predefined disaster test scenarios (Flash Flood, Stampede, Landslide, All Clear).
    """
    raw_scenarios = _load_all_scenarios()
    parsed_scenarios = [ScenarioMetadata(**s) for s in raw_scenarios]

    return ScenarioListResponse(
        scenarios=parsed_scenarios,
        total_count=len(parsed_scenarios),
    )


@simulation_router.post(
    "/run/{scenario}",
    response_model=ScoreResponse,
    summary="Execute Predefined Disaster Test Scenario",
    status_code=status.HTTP_200_OK,
)
async def run_scenario(
    scenario: str,
    runtime_overrides: Optional[SimulationOverrides] = None,
) -> ScoreResponse:
    """
    Execute a predefined disaster test scenario by name (e.g. 'flash_flood', 'stampede_risk', 'landslide', 'all_clear').
    Optionally merge additional runtime overrides on top of the scenario definition.
    """
    sc_data = _find_scenario(scenario)
    if sc_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disaster scenario '{scenario}' not found in registry.",
        )

    lat = float(sc_data["lat"])
    lng = float(sc_data["lng"])
    site_id = sc_data.get("site_id")

    base_overrides_dict = sc_data.get("simulation_overrides", {})
    if runtime_overrides is not None:
        # Merge runtime overrides over scenario base overrides
        runtime_dict = runtime_overrides.model_dump(exclude_unset=True)
        base_overrides_dict.update(runtime_dict)

    combined_overrides = SimulationOverrides(**base_overrides_dict)

    return await _evaluate_point_danger(
        lat=lat,
        lng=lng,
        zone_id=site_id,
        overrides=combined_overrides,
    )
