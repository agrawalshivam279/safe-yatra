"""
Unit tests for IncidentService, CSV dataset parsing, Haversine filtering, and recency aggregation.
"""

import asyncio
from datetime import datetime, timezone
import pytest

from app.services.incident_service import IncidentService, IncidentSummary


def test_incident_service_csv_loading():
    """Verify that IncidentService successfully loads historical incidents from disk."""
    service = IncidentService()
    assert len(service.incidents_cache) >= 10


def test_incident_service_bhushi_dam_proximity_query():
    """Verify querying Bhushi Dam area retrieves drowning and flood incidents within 2km."""

    async def run():
        service = IncidentService()
        # Reference date set to 2024-09-01
        ref_dt = datetime(2024, 9, 1, tzinfo=timezone.utc)

        # Coordinates near Bhushi Dam (18.735, 73.418)
        summary = await service.get_incident_summary(18.7352, 73.4182, radius_km=2.0, reference_date=ref_dt)

        assert isinstance(summary, IncidentSummary)
        assert summary.source == "csv_seed"
        # In seed dataset, inc-001, inc-004, and inc-007 are at Bhushi Dam within 2km
        assert summary.incident_count >= 3
        # inc-001 has 2 fatalities, inc-007 has 1 fatality -> total >= 3 fatalities
        assert summary.fatal_count >= 3
        # inc-004 is a major flood without fatalities -> severe count >= 1
        assert summary.severe_count >= 1
        # Most recent is inc-001 (July 2024, ~0.13 years from Sept 2024)
        assert summary.recency_years < 1.0

    asyncio.run(run())


def test_incident_service_remote_coordinates_zero_incidents():
    """Verify querying coordinates far from any known incidents returns 0 counts."""

    async def run():
        service = IncidentService()
        # Delhi coordinates
        summary = await service.get_incident_summary(28.6139, 77.2090, radius_km=2.0)

        assert summary.incident_count == 0
        assert summary.fatal_count == 0
        assert summary.severe_count == 0
        assert summary.recency_years == 5.0
        assert len(summary.incidents) == 0

    asyncio.run(run())


def test_incident_service_custom_radius_expansion():
    """Verify expanding search radius captures broader regional incidents."""

    async def run():
        service = IncidentService()
        # Point between Tiger Point and Khandala Ghat
        summary_small = await service.get_incident_summary(18.740, 73.375, radius_km=0.5)
        summary_large = await service.get_incident_summary(18.740, 73.375, radius_km=10.0)

        assert summary_large.incident_count >= summary_small.incident_count

    asyncio.run(run())
