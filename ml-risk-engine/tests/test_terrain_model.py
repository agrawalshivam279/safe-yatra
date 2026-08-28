"""
Unit tests for Terrain Risk Sub-Model (app/models/terrain_model.py).
Tests topographical scoring calculations, distance decay curves, and slope saturation.
"""

import pytest
from app.models.terrain_model import TERRAIN_WEIGHT, compute_terrain_risk


class TestTerrainRiskModel:
    """Test suite for terrain hazard normalization algorithm."""

    def test_flat_inland_plains(self):
        result = compute_terrain_risk(
            slope_degrees=0.0,
            water_proximity_meters=2000.0,
            elevation_meters=200.0,
        )
        assert result.weight == TERRAIN_WEIGHT
        assert result.score == 0.0
        assert "Gentle/flat terrain" in result.details
        assert "Safe distance from water" in result.details

    def test_dangerous_waterfall_cliff_edge(self):
        result = compute_terrain_risk(
            slope_degrees=54.0,
            water_proximity_meters=10.0,
            elevation_meters=650.0,
        )
        # slope: (54/60)*50 = 45.0
        # water: <= 10m = 35.0
        # elev: <= 1000m = 0.0
        # expected raw: 45.0 + 35.0 = 80.0
        assert result.score == 80.0
        assert result.weight == 0.20
        assert "Steep cliff incline" in result.details
        assert "Critical proximity to water body" in result.details

    def test_water_distance_decay_curve(self):
        # 10m: max water hazard (35.0)
        res_10m = compute_terrain_risk(0.0, 10.0, 0.0)
        assert res_10m.score == 35.0

        # 255m (midpoint between 10m and 500m): half hazard (17.5)
        res_mid = compute_terrain_risk(0.0, 255.0, 0.0)
        assert res_mid.score == 17.5

        # >= 500m: 0 water hazard
        res_500m = compute_terrain_risk(0.0, 500.0, 0.0)
        assert res_500m.score == 0.0

    def test_slope_saturation(self):
        # 60 degrees hits max 50 pts
        res_60 = compute_terrain_risk(60.0, 1000.0, 0.0)
        assert res_60.score == 50.0

        # 90 degrees clamped to max 50 pts
        res_90 = compute_terrain_risk(90.0, 1000.0, 0.0)
        assert res_90.score == 50.0

    def test_high_altitude_trek_hazard(self):
        result = compute_terrain_risk(
            slope_degrees=30.0,
            water_proximity_meters=1000.0,
            elevation_meters=3000.0,
        )
        # slope: (30/60)*50 = 25.0
        # water: 0.0
        # elev: ((3000-1000)/3000)*15 = 10.0
        # expected total: 35.0
        assert result.score == 35.0
        assert "Moderate slope" in result.details
        assert "High altitude alpine terrain" in result.details
