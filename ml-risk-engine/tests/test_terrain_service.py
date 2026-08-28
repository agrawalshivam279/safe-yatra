"""
Unit tests for TerrainService, precomputed profiles, Haversine distance, and OpenTopoData fallback.
"""

import asyncio

import httpx
import pytest

from app.services.terrain_service import (
    TerrainData,
    TerrainService,
    haversine_distance_km,
)


def test_haversine_distance_calculation():
    """Verify haversine distance calculates accurate geographic distances."""
    # Distance between Bhushi Dam (18.7546, 73.4062) and Tiger Point (18.7833, 73.3833) ~ 4.04 km
    dist = haversine_distance_km(18.7546, 73.4062, 18.7833, 73.3833)
    assert 3.5 < dist < 4.5

    # Same point distance should be 0.0
    dist_zero = haversine_distance_km(18.75, 73.40, 18.75, 73.40)
    assert dist_zero == pytest.approx(0.0, abs=1e-5)


def test_terrain_service_precomputed_exact_match():
    """Verify that coordinates matching Bhushi Dam return precomputed profile data."""

    async def run():
        service = TerrainService()
        # Coordinates of Bhushi Dam
        data = await service.get_terrain(18.7546, 73.4062)

        assert isinstance(data, TerrainData)
        assert data.source == "precomputed"
        assert data.matched_site == "lonavala_bhushi_dam"
        assert data.elevation_meters == 610.0
        assert data.slope_degrees == 45.0
        assert data.water_proximity_meters == 12.0
        assert data.terrain_type == "waterfall_basin"

    asyncio.run(run())


def test_terrain_service_precomputed_nearby_match():
    """Verify coordinates within 5km radius of a pilot site match the nearest site."""

    async def run():
        service = TerrainService()
        # Coordinates ~1.5km from Tiger Point
        data = await service.get_terrain(18.7900, 73.3800)

        assert data.source == "precomputed"
        assert data.matched_site == "lonavala_tiger_point"
        assert data.slope_degrees == 60.0
        assert data.terrain_type == "cliff_edge"

    asyncio.run(run())


def test_terrain_service_opentopo_api_query():
    """Verify that coordinates far outside known pilot sites query OpenTopoData API."""
    mock_payload = {
        "results": [{"elevation": 1250.5, "location": {"lat": 28.5, "lng": 77.2}}],
        "status": "OK",
    }

    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert "locations=28.5%2C77.2" in str(request.url) or "locations=28.5,77.2" in str(request.url)
        return httpx.Response(200, json=mock_payload)

    async def run():
        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            service = TerrainService(opentopo_url="https://api.opentopodata.org/v1/eudem25m")
            # Delhi coordinates, far outside Lonavala
            data = await service.get_terrain(28.5, 77.2, client=client)

            assert data.source == "opentopo"
            assert data.elevation_meters == 1250.5
            assert data.matched_site is None
            assert data.slope_degrees == 10.0
            assert data.water_proximity_meters == 1000.0

    asyncio.run(run())


def test_terrain_service_fallback_on_api_error():
    """Verify graceful fallback to neutral defaults when external API fails."""

    def error_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"error": "Service Unavailable"})

    async def run():
        transport = httpx.MockTransport(error_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            service = TerrainService(opentopo_url="https://api.opentopodata.org/v1/eudem25m")
            # Far coordinate outside pilot sites
            data = await service.get_terrain(28.5, 77.2, client=client)

            assert data.source == "fallback"
            assert data.elevation_meters == 300.0
            assert data.slope_degrees == 10.0
            assert data.water_proximity_meters == 1000.0

    asyncio.run(run())
