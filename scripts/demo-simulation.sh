#!/usr/bin/env bash
# ==============================================================================
# Safe Yatra — Automated 1-Click SIH 2026 Demo Simulation Orchestrator (Bash)
# ==============================================================================

set -e

SCENARIO="${1:-full-demo}"
BASE_URL="${2:-http://localhost:3001/api/v1}"

echo -e "\033[36m=================================================================\033[0m"
echo -e "\033[33m  🛡️  SAFE YATRA — SIH 2026 DEMO SIMULATION ORCHESTRATOR        \033[0m"
echo -e "\033[36m=================================================================\033[0m"
echo -e "\033[32mScenario Selected: ${SCENARIO}\033[0m"
echo -e "\033[90mTarget Gateway:    ${BASE_URL}\033[0m\n"

run_weather_override() {
  echo -e "\033[33m[1/3] Overriding Environmental Weather Inputs...\033[0m"
  curl -s -X POST "${BASE_URL}/sim/weather-override" \
    -H "Content-Type: application/json" \
    -d '{
      "zoneId": "zone-lonavala-bhushi-dam-01",
      "rainfallMm": 180.0,
      "windSpeedKmh": 55.0,
      "visibilityMeters": 150,
      "temperatureC": 21.0,
      "forcedDangerScore": 85
    }' | grep -o '"success":true' && echo -e "  \033[32m✓ Weather override applied: Score set to 85 (CRITICAL)\033[0m" || echo -e "  \033[31m✗ Weather override failed\033[0m"
}

run_geofence_walk() {
  echo -e "\n\033[33m[2/3] Replaying Tourist Trajectory into Geofenced Hazard...\033[0m"
  curl -s -X POST "${BASE_URL}/sim/trajectory" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "11111111-1111-1111-1111-111111111111",
      "coordinates": [
        { "lat": 18.7300, "lng": 73.4100, "altitude": 600, "accuracy": 5, "battery": 95 },
        { "lat": 18.7330, "lng": 73.4150, "altitude": 615, "accuracy": 4, "battery": 94 },
        { "lat": 18.7350, "lng": 73.4180, "altitude": 620, "accuracy": 4, "battery": 93 }
      ],
      "intervalSeconds": 5
    }' | grep -o '"success":true' && echo -e "  \033[32m✓ Trajectory replayed into hazard\033[0m" || echo -e "  \033[31m✗ Trajectory replay failed\033[0m"
}

run_sos_loop() {
  echo -e "\n\033[33m[3/3] Triggering Automated Emergency Dispatch & Rescue Loop...\033[0m"
  curl -s -X POST "${BASE_URL}/sim/sos" \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "11111111-1111-1111-1111-111111111111",
      "lat": 18.7352,
      "lng": 73.4182,
      "battery": 88,
      "scenario": "full_loop"
    }' | grep -o '"success":true' && echo -e "  \033[32m✓ SOS full emergency loop simulated\033[0m" || echo -e "  \033[31m✗ SOS loop failed\033[0m"
}

case "$SCENARIO" in
  "weather")
    run_weather_override
    ;;
  "geofence")
    run_geofence_walk
    ;;
  "sos")
    run_sos_loop
    ;;
  "full-demo"|*)
    run_weather_override
    sleep 1
    run_geofence_walk
    sleep 1
    run_sos_loop
    ;;
esac

echo -e "\n\033[36m=================================================================\033[0m"
echo -e "\033[32m  🎉 SIMULATION WORKFLOW COMPLETED SUCCESSFULLY!                \033[0m"
echo -e "\033[36m=================================================================\033[0m"
