# ML Risk Engine

> Dynamic Danger Score computation engine for Safe Yatra.

## Overview

A standalone Python microservice that computes a **Dynamic Danger Score (0–100)** for any given geographic coordinate or predefined zone by analyzing:

- 🌧️ **Weather Risk** (35%) — Precipitation, wind, visibility, storm warnings
- ⛰️ **Terrain Risk** (20%) — Elevation, slope, water proximity
- 👥 **Crowd Density** (25%) — Estimated footfall, congestion levels
- 📊 **Historical Risk** (20%) — Past incidents within radius

## Tech Stack

- Python 3.11+
- FastAPI
- scikit-learn, pandas, numpy
- httpx (async HTTP client)
- pydantic (data validation)

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/score` | Compute danger score for coordinates |
| `POST` | `/api/v1/score/batch` | Batch compute for multiple zones |
| `GET`  | `/api/v1/score/explain/{zone_id}` | Human-readable justification |
| `POST` | `/api/v1/simulate/override` | **[DEV]** Force mock inputs |

## Architecture

See [GEMINI.md](../GEMINI.md#4-module-1-ml-risk-engine) for full details.
