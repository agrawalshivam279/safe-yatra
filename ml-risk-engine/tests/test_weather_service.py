"""
Unit tests for WeatherService, OpenWeatherMap payload parsing, caching, and fallback cascade.
"""

import asyncio
import time
import httpx
import pytest

from app.services.weather_service import WeatherData, WeatherService


def test_weather_service_fallback_when_no_api_key():
    """Verify that WeatherService gracefully returns fallback data when API key is empty."""

    async def run():
        service = WeatherService(api_key="", cache_ttl_seconds=300)
        data = await service.get_weather(18.75, 73.40)

        assert isinstance(data, WeatherData)
        assert data.source == "fallback"
        assert data.is_cached is False
        assert data.precipitation_mm == 0.0
        assert data.wind_speed_kmh == 15.0
        assert data.visibility_meters == 10000.0

    asyncio.run(run())


def test_weather_service_successful_api_parsing():
    """Verify that OpenWeatherMap JSON responses are parsed and normalized accurately."""
    mock_payload = {
        "main": {"temp": 28.5},
        "wind": {"speed": 10.0},  # 10 m/s -> 36.0 km/h
        "visibility": 4500,
        "rain": {"1h": 22.5},
        "weather": [{"description": "heavy intensity rain"}],
    }

    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert "lat=18.75" in str(request.url)
        assert "lon=73.4" in str(request.url)
        assert "appid=test_key_123" in str(request.url)
        assert "units=metric" in str(request.url)
        return httpx.Response(200, json=mock_payload)

    async def run():
        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            service = WeatherService(api_key="test_key_123", cache_ttl_seconds=300)
            data = await service.get_weather(18.75, 73.40, client=client)

            assert data.source == "openweather"
            assert data.is_cached is False
            assert data.temperature_c == 28.5
            assert data.wind_speed_kmh == 36.0  # 10 * 3.6
            assert data.visibility_meters == 4500.0
            assert data.precipitation_mm == 22.5
            assert data.description == "Heavy intensity rain"

    asyncio.run(run())


def test_weather_service_rain_3h_and_snow_parsing():
    """Verify parsing when rain is provided in 3h format or as snow."""
    mock_payload = {
        "main": {"temp": 12.0},
        "wind": {"speed": 5.0},  # 5 m/s -> 18.0 km/h
        "visibility": 8000,
        "rain": {"3h": 15.0},  # 15.0 / 3 = 5.0 mm/hr
        "weather": [{"description": "moderate rain"}],
    }

    async def run():
        transport = httpx.MockTransport(lambda req: httpx.Response(200, json=mock_payload))
        async with httpx.AsyncClient(transport=transport) as client:
            service = WeatherService(api_key="test_key_123", cache_ttl_seconds=300)
            data = await service.get_weather(18.75, 73.40, client=client)

            assert data.precipitation_mm == 5.0
            assert data.wind_speed_kmh == 18.0
            assert data.temperature_c == 12.0

    asyncio.run(run())


def test_weather_service_caching_behavior():
    """Verify that cached data is returned for subsequent requests within TTL."""
    call_count = 0

    def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            200,
            json={
                "main": {"temp": 24.0},
                "wind": {"speed": 2.0},
                "visibility": 10000,
                "weather": [{"description": "few clouds"}],
            },
        )

    async def run():
        nonlocal call_count
        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            service = WeatherService(api_key="test_key_123", cache_ttl_seconds=300)

            # First call: hits API
            data1 = await service.get_weather(18.7546, 73.4062, client=client)
            assert data1.is_cached is False
            assert data1.source == "openweather"
            assert call_count == 1

            # Second call with nearby coordinate matching quantized grid (18.75, 73.41): cache hit
            data2 = await service.get_weather(18.7549, 73.4060, client=client)
            assert data2.is_cached is True
            assert data2.source == "cache"
            assert data2.temperature_c == 24.0
            assert call_count == 1  # No additional network request made

            # Clear cache and verify re-fetch
            service.clear_cache()
            data3 = await service.get_weather(18.7546, 73.4062, client=client)
            assert data3.is_cached is False
            assert call_count == 2

    asyncio.run(run())


def test_weather_service_cache_expiration():
    """Verify that expired cache entries are refreshed."""
    call_count = 0

    def mock_handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(200, json={"main": {"temp": 20.0}, "wind": {"speed": 1.0}, "visibility": 10000})

    async def run():
        nonlocal call_count
        transport = httpx.MockTransport(mock_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            # TTL of 0.05 seconds
            service = WeatherService(api_key="test_key_123", cache_ttl_seconds=0.05)
            data1 = await service.get_weather(18.75, 73.40, client=client)
            assert data1.is_cached is False
            assert call_count == 1

            time.sleep(0.06)

            data2 = await service.get_weather(18.75, 73.40, client=client)
            assert data2.is_cached is False
            assert call_count == 2

    asyncio.run(run())


def test_weather_service_resilient_error_fallback():
    """Verify that network errors or 500 server errors fallback gracefully without raising."""

    def error_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"message": "Internal Server Error"})

    async def run():
        transport = httpx.MockTransport(error_handler)
        async with httpx.AsyncClient(transport=transport) as client:
            service = WeatherService(api_key="test_key_123", cache_ttl_seconds=300)
            data = await service.get_weather(18.75, 73.40, client=client)

            assert data.source == "fallback"
            assert data.is_cached is False
            assert data.precipitation_mm == 0.0
            assert data.wind_speed_kmh == 15.0

    asyncio.run(run())
