"""
Weather data ingestion service with OpenWeatherMap API integration,
coordinate-quantized TTL caching, and resilient fallback cascade.
"""

import logging
import time
from typing import Optional

import httpx
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)


class WeatherData(BaseModel):
    """Normalized meteorological data model for risk scoring."""

    precipitation_mm: float = Field(0.0, ge=0.0, description="Precipitation in mm (last 1-3 hr)")
    wind_speed_kmh: float = Field(0.0, ge=0.0, description="Wind speed in km/h")
    visibility_meters: float = Field(10000.0, ge=0.0, le=10000.0, description="Visibility in meters")
    temperature_c: float = Field(25.0, description="Ambient temperature in Celsius")
    description: str = Field("Clear", description="Human-readable weather description")
    is_cached: bool = Field(False, description="True if response served from in-memory TTL cache")
    source: str = Field("openweather", description="Data origin: 'openweather' | 'cache' | 'fallback'")


class WeatherService:
    """Async service to query weather telemetry with caching and fallbacks."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        cache_ttl_seconds: Optional[int] = None,
        timeout_seconds: float = 3.0,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.OPENWEATHER_API_KEY
        self.cache_ttl_seconds = (
            cache_ttl_seconds if cache_ttl_seconds is not None else settings.WEATHER_CACHE_TTL_SECONDS
        )
        self.timeout_seconds = timeout_seconds
        self._cache: dict[tuple[float, float], tuple[float, WeatherData]] = {}

    def _get_cache_key(self, lat: float, lng: float) -> tuple[float, float]:
        """Quantize coordinates to ~1.1km grid (2 decimal places) for cache sharing."""
        return (round(lat, 2), round(lng, 2))

    def _get_cached(self, lat: float, lng: float) -> Optional[WeatherData]:
        """Retrieve valid cached weather data if TTL has not expired."""
        key = self._get_cache_key(lat, lng)
        if key in self._cache:
            timestamp, data = self._cache[key]
            if time.time() - timestamp < self.cache_ttl_seconds:
                return data.model_copy(update={"is_cached": True, "source": "cache"})
            # Expired cache entry
            del self._cache[key]
        return None

    def _set_cached(self, lat: float, lng: float, data: WeatherData) -> None:
        """Store weather data in cache with current timestamp."""
        key = self._get_cache_key(lat, lng)
        self._cache[key] = (time.time(), data)

    def clear_cache(self) -> None:
        """Purge all entries from the in-memory cache."""
        self._cache.clear()

    async def get_weather(
        self,
        lat: float,
        lng: float,
        client: Optional[httpx.AsyncClient] = None,
    ) -> WeatherData:
        """
        Fetch real-time weather data for coordinates.
        Checks cache first, then calls OpenWeatherMap API, falling back to safe defaults on error.
        """
        cached = self._get_cached(lat, lng)
        if cached is not None:
            return cached

        if not self.api_key or self.api_key.strip() == "":
            logger.info("OpenWeatherMap API key not set; using baseline fallback defaults.")
            return WeatherData(
                precipitation_mm=0.0,
                wind_speed_kmh=15.0,
                visibility_meters=10000.0,
                temperature_c=25.0,
                description="Clear (Baseline Default)",
                is_cached=False,
                source="fallback",
            )

        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lng,
            "appid": self.api_key,
            "units": "metric",
        }

        try:
            should_close = False
            if client is None:
                client = httpx.AsyncClient(timeout=self.timeout_seconds)
                should_close = True

            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                payload = response.json()
            finally:
                if should_close:
                    await client.aclose()

            # Parse OpenWeatherMap JSON response
            main_data = payload.get("main", {})
            temp_c = float(main_data.get("temp", 25.0))

            wind_data = payload.get("wind", {})
            # OpenWeatherMap returns wind speed in m/s under metric units. Convert m/s -> km/h (* 3.6)
            wind_speed_mps = float(wind_data.get("speed", 0.0))
            wind_speed_kmh = round(wind_speed_mps * 3.6, 2)

            raw_visibility = float(payload.get("visibility", 10000.0))
            visibility_m = min(10000.0, max(0.0, raw_visibility))

            # Precipitation extraction (rain.1h or rain.3h or snow)
            rain_data = payload.get("rain", {})
            snow_data = payload.get("snow", {})
            precip_mm = 0.0
            if "1h" in rain_data:
                precip_mm = float(rain_data["1h"])
            elif "3h" in rain_data:
                precip_mm = round(float(rain_data["3h"]) / 3.0, 2)
            elif "1h" in snow_data:
                precip_mm = float(snow_data["1h"])

            weather_list = payload.get("weather", [])
            desc = "Clear"
            if weather_list and isinstance(weather_list, list) and "description" in weather_list[0]:
                desc = weather_list[0]["description"].capitalize()

            weather_data = WeatherData(
                precipitation_mm=precip_mm,
                wind_speed_kmh=wind_speed_kmh,
                visibility_meters=visibility_m,
                temperature_c=temp_c,
                description=desc,
                is_cached=False,
                source="openweather",
            )
            self._set_cached(lat, lng, weather_data)
            return weather_data

        except (httpx.HTTPError, httpx.TimeoutException, KeyError, ValueError) as exc:
            logger.warning("Failed to fetch weather from OpenWeatherMap (%s); returning fallback defaults.", exc)
            return WeatherData(
                precipitation_mm=0.0,
                wind_speed_kmh=15.0,
                visibility_meters=10000.0,
                temperature_c=25.0,
                description="Clear (Fallback)",
                is_cached=False,
                source="fallback",
            )


# Default singleton instance
weather_service = WeatherService()
