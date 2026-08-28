"""
Environment configuration for ML Risk Engine.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8000
    OPENWEATHER_API_KEY: str = ""
    DATABASE_URL: str = "postgresql://safeyatra_user:safeyatra_pass@localhost:5432/safeyatra"
    SIMULATION_MODE: bool = False
    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"


settings = Settings()
