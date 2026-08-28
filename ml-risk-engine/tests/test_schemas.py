"""
Unit tests for ML Risk Engine Pydantic Schemas.
Tests request validation, simulation overrides, response envelopes, and boundary conditions.
"""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from app.schemas.request import (
    BatchScoreRequest,
    Coordinates,
    ScoreRequest,
    SimulationOverrides,
    ZoneScoreRequest,
)
from app.schemas.response import (
    BatchScoreResponse,
    CoordinatesModel,
    DangerFactors,
    DangerTier,
    ExplanationResponse,
    FactorDetail,
    ScoreResponse,
)


class TestRequestSchemas:
    """Test suite for request models and simulation overrides."""

    def test_coordinates_valid(self):
        coord = Coordinates(lat=18.7546, lng=73.4062)
        assert coord.lat == 18.7546
        assert coord.lng == 73.4062

    def test_coordinates_invalid_latitude(self):
        with pytest.raises(ValidationError) as exc_info:
            Coordinates(lat=95.0, lng=73.4062)
        assert "lat" in str(exc_info.value)

        with pytest.raises(ValidationError):
            Coordinates(lat=-90.1, lng=73.4062)

    def test_coordinates_invalid_longitude(self):
        with pytest.raises(ValidationError) as exc_info:
            Coordinates(lat=18.7546, lng=185.0)
        assert "lng" in str(exc_info.value)

        with pytest.raises(ValidationError):
            Coordinates(lat=18.7546, lng=-180.1)

    def test_score_request_minimal(self):
        req = ScoreRequest(lat=18.75, lng=73.40)
        assert req.lat == 18.75
        assert req.lng == 73.40
        assert req.zone_id is None
        assert req.simulation_overrides is None

    def test_score_request_with_zone_and_overrides(self):
        overrides = SimulationOverrides(
            precipitation_mm=120.5,
            wind_speed_kmh=45.0,
            visibility_meters=500.0,
            slope_degrees=35.0,
            water_proximity_meters=25.0,
            crowd_count=250,
            elevation_meters=650.0,
            historical_incident_count=3,
        )
        req = ScoreRequest(
            lat=18.7546,
            lng=73.4062,
            zone_id="zone_lonavala_waterfall_01",
            simulation_overrides=overrides,
        )
        assert req.zone_id == "zone_lonavala_waterfall_01"
        assert req.simulation_overrides is not None
        assert req.simulation_overrides.precipitation_mm == 120.5
        assert req.simulation_overrides.crowd_count == 250

    def test_simulation_overrides_boundary_checks(self):
        # Negative precipitation should fail
        with pytest.raises(ValidationError):
            SimulationOverrides(precipitation_mm=-5.0)

        # Precipitation > 1000mm should fail
        with pytest.raises(ValidationError):
            SimulationOverrides(precipitation_mm=1001.0)

        # Slope > 90 degrees should fail
        with pytest.raises(ValidationError):
            SimulationOverrides(slope_degrees=95.0)

        # Negative crowd count should fail
        with pytest.raises(ValidationError):
            SimulationOverrides(crowd_count=-10)

    def test_batch_score_request_valid(self):
        points = [
            ScoreRequest(lat=18.75, lng=73.40),
            ScoreRequest(lat=18.76, lng=73.41, zone_id="zone_test"),
        ]
        batch = BatchScoreRequest(points=points)
        assert len(batch.points) == 2

    def test_batch_score_request_empty_fails(self):
        with pytest.raises(ValidationError):
            BatchScoreRequest(points=[])

    def test_zone_score_request(self):
        req = ZoneScoreRequest(zone_id="zone_rajmachi_01")
        assert req.zone_id == "zone_rajmachi_01"

        with pytest.raises(ValidationError):
            ZoneScoreRequest(zone_id="")


class TestResponseSchemas:
    """Test suite for response envelopes, factor breakdowns, and serialization."""

    @pytest.fixture
    def sample_danger_factors(self) -> DangerFactors:
        return DangerFactors(
            weather=FactorDetail(
                score=92.0,
                weight=0.35,
                details="Heavy rainfall 180mm/6hr, visibility 200m",
            ),
            terrain=FactorDetail(
                score=88.0,
                weight=0.20,
                details="Steep slope 45°, 12m from water body",
            ),
            crowd=FactorDetail(
                score=65.0,
                weight=0.25,
                details="~340 estimated persons, moderate density",
            ),
            history=FactorDetail(
                score=78.0,
                weight=0.20,
                details="3 fatal incidents within 2km in 5 years",
            ),
        )

    def test_danger_tier_enum(self):
        assert DangerTier.LOW.value == "LOW"
        assert DangerTier.MODERATE.value == "MODERATE"
        assert DangerTier.SEVERE.value == "SEVERE"
        assert DangerTier.CRITICAL.value == "CRITICAL"

        assert DangerTier("CRITICAL") == DangerTier.CRITICAL
        with pytest.raises(ValueError):
            DangerTier("EXTREME")

    def test_factor_detail_validation(self):
        factor = FactorDetail(score=85.5, weight=0.35, details="High monsoon surge")
        assert factor.score == 85.5
        assert factor.weight == 0.35

        with pytest.raises(ValidationError):
            FactorDetail(score=105.0, weight=0.35, details="Invalid score")

        with pytest.raises(ValidationError):
            FactorDetail(score=50.0, weight=1.5, details="Invalid weight")

    def test_score_response_creation_and_serialization(self, sample_danger_factors):
        resp = ScoreResponse(
            zone_id="zone_lonavala_waterfall_01",
            coordinates=CoordinatesModel(lat=18.7546, lng=73.4062),
            danger_score=85,
            tier=DangerTier.CRITICAL,
            justification="Danger Score: 85 — High risk of flash flooding.",
            factors=sample_danger_factors,
            ttl_seconds=300,
        )

        assert resp.danger_score == 85
        assert resp.tier == DangerTier.CRITICAL
        assert resp.ttl_seconds == 300
        assert isinstance(resp.computed_at, datetime)

        # Test JSON roundtrip serialization
        json_data = resp.model_dump_json()
        restored = ScoreResponse.model_validate_json(json_data)
        assert restored.danger_score == resp.danger_score
        assert restored.tier == resp.tier
        assert restored.coordinates.lat == resp.coordinates.lat

    def test_batch_score_response(self, sample_danger_factors):
        item1 = ScoreResponse(
            coordinates=CoordinatesModel(lat=18.75, lng=73.40),
            danger_score=20,
            tier=DangerTier.LOW,
            justification="Safe conditions.",
            factors=sample_danger_factors,
        )
        item2 = ScoreResponse(
            coordinates=CoordinatesModel(lat=18.76, lng=73.41),
            danger_score=80,
            tier=DangerTier.CRITICAL,
            justification="Critical hazards detected.",
            factors=sample_danger_factors,
        )

        batch_resp = BatchScoreResponse(
            results=[item1, item2],
            total_computed=2,
        )
        assert batch_resp.total_computed == 2
        assert len(batch_resp.results) == 2

    def test_explanation_response(self, sample_danger_factors):
        explanation = ExplanationResponse(
            zone_id="zone_bhushi_dam",
            coordinates=CoordinatesModel(lat=18.75, lng=73.40),
            danger_score=78,
            tier=DangerTier.CRITICAL,
            summary="Flash flood and waterfall overflow warning.",
            recommendations=[
                "Evacuate low-lying riverbed immediately.",
                "Follow designated egress routes.",
            ],
            factors=sample_danger_factors,
        )
        assert explanation.danger_score == 78
        assert len(explanation.recommendations) == 2
