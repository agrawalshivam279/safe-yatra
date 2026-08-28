"""
Safe Yatra — ML Risk Engine
Pydantic Request Schemas & Simulation Overrides.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class Coordinates(BaseModel):
    """Geographic coordinates in WGS 84 format."""

    lat: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (-90.0 to 90.0)",
    )
    lng: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (-180.0 to 180.0)",
    )

    model_config = ConfigDict(populate_by_name=True)


class SimulationOverrides(BaseModel):
    """
    Environmental and situational overrides for simulation, testing, and what-if analysis.
    """

    precipitation_mm: Optional[float] = Field(
        None,
        ge=0.0,
        le=1000.0,
        description="Simulated 6-hour rainfall in millimeters (0-1000mm)",
    )
    wind_speed_kmh: Optional[float] = Field(
        None,
        ge=0.0,
        le=300.0,
        description="Simulated wind speed in km/h (0-300 km/h)",
    )
    visibility_meters: Optional[float] = Field(
        None,
        ge=0.0,
        le=50000.0,
        description="Simulated optical visibility in meters (0-50000m)",
    )
    slope_degrees: Optional[float] = Field(
        None,
        ge=0.0,
        le=90.0,
        description="Simulated terrain slope angle in degrees (0-90°)",
    )
    water_proximity_meters: Optional[float] = Field(
        None,
        ge=0.0,
        le=50000.0,
        description="Simulated distance to closest water body in meters",
    )
    crowd_count: Optional[int] = Field(
        None,
        ge=0,
        description="Simulated estimated crowd headcount",
    )
    elevation_meters: Optional[float] = Field(
        None,
        ge=-500.0,
        le=9000.0,
        description="Simulated elevation above sea level in meters",
    )
    historical_incident_count: Optional[int] = Field(
        None,
        ge=0,
        description="Simulated historical incident count in 2km radius",
    )

    model_config = ConfigDict(populate_by_name=True)


class ScoreRequest(BaseModel):
    """Request payload for danger score computation for a single coordinate."""

    lat: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (-90.0 to 90.0)",
    )
    lng: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (-180.0 to 180.0)",
    )
    zone_id: Optional[str] = Field(
        None,
        description="Optional predefined zone ID (e.g. zone_lonavala_tiger_point_02)",
    )
    simulation_overrides: Optional[SimulationOverrides] = Field(
        None,
        description="Optional environmental parameter overrides",
    )

    model_config = ConfigDict(populate_by_name=True)


class BatchScoreRequest(BaseModel):
    """Request payload for batch scoring multiple coordinates or zones."""

    points: List[ScoreRequest] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of 1 to 100 coordinates to compute scores for",
    )
    simulation_overrides: Optional[SimulationOverrides] = Field(
        None,
        description="Global simulation overrides applied to all batch items unless overridden individually",
    )

    model_config = ConfigDict(populate_by_name=True)


class ZoneScoreRequest(BaseModel):
    """Request payload for computing danger score for a predefined zone by ID."""

    zone_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier of the predefined zone",
    )
    simulation_overrides: Optional[SimulationOverrides] = Field(
        None,
        description="Optional environmental parameter overrides",
    )

    model_config = ConfigDict(populate_by_name=True)
