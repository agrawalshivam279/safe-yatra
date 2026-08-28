# Safe Yatra

> 🛡️ A proactive safety ecosystem for India's tourist and pilgrimage sites.

## Modules

| Module | Description | Tech |
|--------|-------------|------|
| [`ml-risk-engine/`](./ml-risk-engine/) | Predicts danger scores (0–100) from weather, terrain, crowd, and historical data | Python / FastAPI |
| [`backend-spatial/`](./backend-spatial/) | Central API gateway; spatial queries, SOS dispatch, auth, geofencing | Node.js / Express |
| [`mobile-app/`](./mobile-app/) | Tourist & Yaatri Mitra mobile interfaces | React Native / Expo |
| [`admin-dashboard/`](./admin-dashboard/) | Command center portal with heatmaps, live tracking, zone management | Next.js |

## Quick Start

```bash
# Start all services with Docker
docker-compose up -d

# Or start individual modules:
cd ml-risk-engine && pip install -r requirements.txt && uvicorn app.main:app --reload
cd backend-spatial && npm install && npm run dev
cd mobile-app && npm install && npx expo start
cd admin-dashboard && npm install && npm run dev
```

## Documentation

See [GEMINI.md](./GEMINI.md) for the complete implementation plan, architecture, and API specifications.

## License

MIT
