"""
Safe Yatra — ML Risk Engine
FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(
    title="Safe Yatra ML Risk Engine",
    description="Dynamic Danger Score computation engine for tourist safety",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ml-risk-engine",
        "version": "1.0.0",
        "simulation_mode": settings.SIMULATION_MODE,
    }


# TODO: Import and include routers
# from app.routes import score_router, simulation_router
# app.include_router(score_router, prefix="/api/v1")
# app.include_router(simulation_router, prefix="/api/v1/simulate")
