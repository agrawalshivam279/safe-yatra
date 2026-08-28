"""
Unit tests for Weather Risk Sub-Model (app/models/weather_model.py).
Tests meteorological scoring calculations, clamping, and telemetry explanations.
"""

from app.models.weather_model import WEATHER_WEIGHT, compute_weather_risk


class TestWeatherRiskModel:
    """Test suite for weather hazard normalization algorithm."""

    def test_ideal_clear_weather(self):
        result = compute_weather_risk(
            precipitation_mm=0.0,
            wind_speed_kmh=5.0,
            visibility_meters=10000.0,
        )
        assert result.weight == WEATHER_WEIGHT
        assert result.score < 2.0
        assert "Light/no precipitation" in result.details

    def test_heavy_monsoon_downpour(self):
        result = compute_weather_risk(
            precipitation_mm=180.0,
            wind_speed_kmh=60.0,
            visibility_meters=400.0,
        )
        # precip: (180/200)*60 = 54.0
        # wind: (60/150)*25 = 10.0
        # vis: (1 - 400/10000)*15 = 14.4
        # expected raw: 54.0 + 10.0 + 14.4 = 78.4
        assert result.score == 78.4
        assert result.weight == 0.35
        assert "Torrential rainfall" in result.details
        assert "Strong winds" in result.details
        assert "Dense fog" in result.details

    def test_catastrophic_cyclone_saturation(self):
        result = compute_weather_risk(
            precipitation_mm=350.0,
            wind_speed_kmh=200.0,
            visibility_meters=0.0,
        )
        # All terms saturate (60 + 25 + 15 = 100)
        assert result.score == 100.0
        assert "Torrential rainfall" in result.details
        assert "Severe gale winds" in result.details

    def test_negative_and_extreme_inputs_clamped(self):
        result = compute_weather_risk(
            precipitation_mm=-50.0,
            wind_speed_kmh=-10.0,
            visibility_meters=25000.0,
        )
        assert result.score == 0.0
        assert result.weight == 0.35

    def test_visibility_degradation_only(self):
        result = compute_weather_risk(
            precipitation_mm=0.0,
            wind_speed_kmh=0.0,
            visibility_meters=2000.0,
        )
        # vis: (1 - 2000/10000)*15 = 0.8 * 15 = 12.0
        assert result.score == 12.0
        assert "Moderate fog/haze" in result.details
