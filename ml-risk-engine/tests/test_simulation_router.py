"""
Safe Yatra — ML Risk Engine
Integration tests for FastAPI Simulation & Disaster Scenario Router endpoints.
"""

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.response import DangerTier

client = TestClient(app)


def test_simulation_override_endpoint():
    """Verify POST /api/v1/simulate/override calculates custom simulation scores."""
    payload = {
        "lat": 18.7546,
        "lng": 73.4062,
        "zone_id": "sim_test_zone",
        "simulation_overrides": {
            "precipitation_mm": 120.0,
            "wind_speed_kmh": 60.0,
            "visibility_meters": 1000.0,
            "slope_degrees": 40.0,
            "water_proximity_meters": 50.0,
            "crowd_count": 600,
        },
    }
    response = client.post("/api/v1/simulate/override", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["zone_id"] in ("sim_test_zone", "lonavala_bhushi_dam")
    assert 0 <= data["danger_score"] <= 100
    assert "weather" in data["factors"]
    assert "terrain" in data["factors"]
    assert "crowd" in data["factors"]
    assert "history" in data["factors"]


def test_list_scenarios_discovery():
    """Verify GET /api/v1/simulate/scenarios discovers all predefined scenario fixtures."""
    response = client.get("/api/v1/simulate/scenarios")
    assert response.status_code == 200

    data = response.json()
    assert data["total_count"] >= 4
    slugs = [s["slug"] for s in data["scenarios"]]
    assert "flash_flood" in slugs
    assert "stampede_risk" in slugs
    assert "landslide" in slugs
    assert "all_clear" in slugs


def test_run_flash_flood_scenario():
    """Verify executing flash flood scenario produces CRITICAL danger score."""
    response = client.post("/api/v1/simulate/run/flash_flood")
    assert response.status_code == 200

    data = response.json()
    assert data["danger_score"] >= 76
    assert data["tier"] == DangerTier.CRITICAL.value
    assert "Torrential rainfall" in data["factors"]["weather"]["details"]
    assert "water body" in data["factors"]["terrain"]["details"].lower()


def test_run_stampede_risk_scenario():
    """Verify executing stampede scenario produces high crowd density risk."""
    response = client.post("/api/v1/simulate/run/stampede_risk")
    assert response.status_code == 200

    data = response.json()
    assert data["danger_score"] >= 51
    assert data["tier"] in (DangerTier.SEVERE.value, DangerTier.CRITICAL.value)
    assert "stampede" in data["factors"]["crowd"]["details"].lower()


def test_run_landslide_scenario():
    """Verify executing landslide scenario produces high danger score on steep slope."""
    response = client.post("/api/v1/simulate/run/landslide")
    assert response.status_code == 200

    data = response.json()
    assert data["danger_score"] >= 51
    assert data["tier"] in (DangerTier.SEVERE.value, DangerTier.CRITICAL.value)
    assert "Steep cliff incline" in data["factors"]["terrain"]["details"]


def test_run_all_clear_scenario():
    """Verify executing all-clear baseline produces LOW danger score."""
    response = client.post("/api/v1/simulate/run/all_clear")
    assert response.status_code == 200

    data = response.json()
    assert data["danger_score"] <= 25
    assert data["tier"] == DangerTier.LOW.value


def test_run_scenario_with_runtime_override():
    """Verify runtime override merges on top of base scenario."""
    # Base all_clear is LOW risk. Inject 250mm rain via runtime override.
    runtime_payload = {
        "precipitation_mm": 250.0,
        "wind_speed_kmh": 80.0,
    }
    response = client.post("/api/v1/simulate/run/all_clear", json=runtime_payload)
    assert response.status_code == 200

    data = response.json()
    assert data["danger_score"] > 25
    assert "Torrential rainfall" in data["factors"]["weather"]["details"]


def test_run_unknown_scenario_404():
    """Verify unknown scenario name returns 404."""
    response = client.post("/api/v1/simulate/run/non_existent_disaster_scenario")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()
