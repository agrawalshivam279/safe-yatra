"""
Safe Yatra — ML Risk Engine
Integration tests for FastAPI Score Router endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.response import DangerTier

client = TestClient(app)


def test_health_check():
    """Verify system health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ml-risk-engine"
    assert "simulation_mode" in data


def test_score_single_coordinate_success():
    """Verify POST /api/v1/score calculates danger score and factor breakdown."""
    payload = {
        "lat": 18.7546,
        "lng": 73.4062,
        "zone_id": "zone_lonavala_waterfall_01",
    }
    response = client.post("/api/v1/score", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["coordinates"]["lat"] == pytest.approx(18.7546, abs=1e-4)
    assert data["coordinates"]["lng"] == pytest.approx(73.4062, abs=1e-4)
    assert 0 <= data["danger_score"] <= 100
    assert data["tier"] in [t.value for t in DangerTier]
    assert len(data["justification"]) > 0
    assert data["ttl_seconds"] == 300

    factors = data["factors"]
    assert "weather" in factors
    assert "terrain" in factors
    assert "crowd" in factors
    assert "history" in factors
    assert factors["weather"]["weight"] == 0.35
    assert factors["terrain"]["weight"] == 0.20
    assert factors["crowd"]["weight"] == 0.25
    assert factors["history"]["weight"] == 0.20


def test_score_with_simulation_overrides():
    """Verify simulation overrides force extreme risk calculations and CRITICAL tier."""
    payload = {
        "lat": 18.7546,
        "lng": 73.4062,
        "simulation_overrides": {
            "precipitation_mm": 200.0,
            "wind_speed_kmh": 120.0,
            "visibility_meters": 100.0,
            "slope_degrees": 65.0,
            "water_proximity_meters": 5.0,
            "crowd_count": 8000,
            "historical_incident_count": 5,
        },
    }
    response = client.post("/api/v1/score", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["danger_score"] >= 76
    assert data["tier"] == DangerTier.CRITICAL.value
    assert "Torrential rainfall" in data["factors"]["weather"]["details"]
    assert "Steep cliff incline" in data["factors"]["terrain"]["details"]


def test_score_batch_success():
    """Verify POST /api/v1/score/batch computes multiple coordinates concurrently."""
    payload = {
        "points": [
            {"lat": 18.7546, "lng": 73.4062, "zone_id": "point_1"},
            {"lat": 18.7833, "lng": 73.3833, "zone_id": "point_2"},
            {
                "lat": 18.7830,
                "lng": 73.4750,
                "zone_id": "point_3",
                "simulation_overrides": {"precipitation_mm": 150.0},
            },
        ],
        "simulation_overrides": {
            "wind_speed_kmh": 30.0,
        },
    }
    response = client.post("/api/v1/score/batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["total_computed"] == 3
    assert len(data["results"]) == 3
    assert data["results"][0]["zone_id"] in ("point_1", "lonavala_bhushi_dam")
    assert data["results"][1]["zone_id"] in ("point_2", "lonavala_tiger_point")
    assert data["results"][2]["zone_id"] in ("point_3", "lonavala_karla_caves")


def test_score_predefined_zone_success():
    """Verify POST /api/v1/score/zone/{zone_id} resolves coordinates and computes score."""
    # Test with site_id
    response = client.post("/api/v1/score/zone/lonavala_bhushi_dam")
    assert response.status_code == 200
    data = response.json()
    assert data["coordinates"]["lat"] == pytest.approx(18.7546, abs=1e-4)
    assert data["coordinates"]["lng"] == pytest.approx(73.4062, abs=1e-4)

    # Test with normalized slug variant
    response_slug = client.post("/api/v1/score/zone/zone-lonavala-tiger-point-02")
    assert response_slug.status_code == 200
    data_slug = response_slug.json()
    assert data_slug["coordinates"]["lat"] == pytest.approx(18.7833, abs=1e-4)
    assert data_slug["coordinates"]["lng"] == pytest.approx(73.3833, abs=1e-4)


def test_score_unknown_zone_404():
    """Verify unknown zone ID returns 404 Not Found."""
    response = client.post("/api/v1/score/zone/non_existent_zone_99999")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


def test_score_explain_endpoint():
    """Verify GET /api/v1/score/explain/{zone_id} returns safety briefings and recommendations."""
    response = client.get("/api/v1/score/explain/lonavala_bhushi_dam")
    assert response.status_code == 200

    data = response.json()
    assert data["zone_id"] == "lonavala_bhushi_dam"
    assert "summary" in data
    assert len(data["summary"]) > 0
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)
    assert len(data["recommendations"]) > 0
    assert "factors" in data


def test_score_explain_unknown_zone_404():
    """Verify GET /api/v1/score/explain/{zone_id} returns 404 for unknown zone without coords."""
    response = client.get("/api/v1/score/explain/unknown_zone_xyz")
    assert response.status_code == 404


def test_score_invalid_coordinates_422():
    """Verify invalid coordinates trigger validation error (422)."""
    payload = {
        "lat": 125.0,  # Invalid (>90.0)
        "lng": 73.4062,
    }
    response = client.post("/api/v1/score", json=payload)
    assert response.status_code == 422
