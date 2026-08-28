"""
Unit tests for CrowdService, diurnal footfall curves, weekend surges, and manual overrides.
"""

import asyncio
from datetime import datetime, timezone

from app.services.crowd_service import (
    CrowdData,
    CrowdService,
    get_day_of_week_multiplier,
    get_time_of_day_multiplier,
)


def test_time_of_day_multiplier_ranges():
    """Verify diurnal curve multipliers across different 24h intervals."""
    assert get_time_of_day_multiplier(2) == 0.1   # Midnight/early morning
    assert get_time_of_day_multiplier(7) == 0.4   # Dawn
    assert get_time_of_day_multiplier(10) == 1.2  # Morning influx
    assert get_time_of_day_multiplier(14) == 1.8  # Peak afternoon
    assert get_time_of_day_multiplier(18) == 1.3  # Sunset
    assert get_time_of_day_multiplier(22) == 0.3  # Night


def test_day_of_week_multiplier():
    """Verify weekend surge multipliers vs weekday baselines."""
    assert get_day_of_week_multiplier(0) == 1.0  # Monday
    assert get_day_of_week_multiplier(2) == 1.0  # Wednesday
    assert get_day_of_week_multiplier(4) == 1.3  # Friday
    assert get_day_of_week_multiplier(5) == 2.2  # Saturday
    assert get_day_of_week_multiplier(6) == 2.2  # Sunday


def test_crowd_service_manual_override():
    """Verify that manual crowd count override bypasses heuristics."""

    async def run():
        service = CrowdService()
        data = await service.get_crowd_estimate(18.75, 73.40, override_count=3500)

        assert isinstance(data, CrowdData)
        assert data.source == "override"
        assert data.crowd_count == 3500
        assert data.area_sqm == 2500.0
        assert data.density_persons_sqm == 1.4  # 3500 / 2500
        assert data.event_multiplier == 1.0

    asyncio.run(run())


def test_crowd_service_pilot_site_match_weekend_peak():
    """Verify estimation for Bhushi Dam during weekend afternoon peak."""

    async def run():
        service = CrowdService()
        # Fixed datetime: Saturday 14:00 IST (08:30 UTC)
        saturday_peak_utc = datetime(2026, 8, 29, 8, 30, tzinfo=timezone.utc)

        # Coordinates of Bhushi Dam
        data = await service.get_crowd_estimate(18.7546, 73.4062, dt=saturday_peak_utc)

        assert data.source == "estimation"
        assert data.matched_site == "lonavala_bhushi_dam"
        assert data.area_sqm == 1200.0
        # Multiplier = 1.8 (14h) * 2.2 (Sat) = 3.96
        assert data.event_multiplier == 3.96
        # Expected count = int(400 * 3.96) = 1584
        assert data.crowd_count == 1584
        assert data.density_persons_sqm == round(1584 / 1200.0, 4)

    asyncio.run(run())


def test_crowd_service_generic_site_weekday_night():
    """Verify estimation for an unlisted site on a weekday night."""

    async def run():
        service = CrowdService()
        # Tuesday 02:00 IST (Monday 20:30 UTC)
        tuesday_night_utc = datetime(2026, 8, 24, 20, 30, tzinfo=timezone.utc)

        # Coordinates far from Lonavala (Delhi)
        data = await service.get_crowd_estimate(28.6139, 77.2090, dt=tuesday_night_utc)

        assert data.source == "estimation"
        assert data.matched_site is None
        assert data.area_sqm == 2500.0
        # Multiplier = 0.1 (02h) * 1.0 (Tue) = 0.1
        assert data.event_multiplier == 0.1
        # Expected count = int(120 * 0.1) = 12
        assert data.crowd_count == 12
        assert data.density_persons_sqm == round(12 / 2500.0, 4)

    asyncio.run(run())
