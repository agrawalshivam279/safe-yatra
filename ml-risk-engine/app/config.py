"""
Environment configuration for ML Risk Engine.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PORT: int = 8000
    OPENWEATHER_API_KEY: str = ""
    DATABASE_URL: str = ""
    OPENTOPO_API_URL: str = "https://api.opentopodata.org/v1/eudem25m"
    WEATHER_CACHE_TTL_SECONDS: int = 300
    SIMULATION_MODE: bool = False
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8081"
    LOG_LEVEL: str = "info"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
