"""
Safe Yatra — ML Risk Engine Routes Package.
"""

from app.routes.score import score_router
from app.routes.simulation import simulation_router

__all__ = ["score_router", "simulation_router"]
