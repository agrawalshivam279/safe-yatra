"""
Safe Yatra — ML Risk Engine
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.score import score_router
from app.routes.simulation import simulation_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage shared HTTP client lifecycle."""
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    yield
    await app.state.http_client.aclose()


app = FastAPI(
    title="Safe Yatra ML Risk Engine",
    description="Dynamic Danger Score computation engine for tourist safety",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware with explicit allowed origins
cors_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
] or ["http://localhost:3000", "http://localhost:3001", "http://localhost:8081"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ml-risk-engine",
        "version": "1.0.0",
        "simulation_mode": settings.SIMULATION_MODE,
    }


# Include Routers
app.include_router(score_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1/simulate")

