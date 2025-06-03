import pytest
import pytest_asyncio
from typing import List, Dict, Any
from datetime import datetime, timezone

from python_ai_services.services.market_data_service import MarketDataService

@pytest_asyncio.fixture
async def market_service() -> MarketDataService:
    return MarketDataService()

@pytest.mark.asyncio
async def test_get_historical_klines_returns_list_of_dicts(market_service: MarketDataService):
    symbol = "TEST/USD"
    limit = 50
    klines = await market_service.get_historical_klines(symbol, limit=limit)

    assert isinstance(klines, list)
    assert len(klines) == limit
    if limit > 0:
        assert isinstance(klines[0], dict)

@pytest.mark.asyncio
async def test_get_historical_klines_content_and_keys(market_service: MarketDataService):
    symbol = "MOCK/COIN"
    limit = 3 # Small limit for easier inspection if needed
    klines = await market_service.get_historical_klines(symbol, limit=limit)

    assert len(klines) == limit
    for kline in klines:
        assert "timestamp" in kline
        assert "open" in kline
        assert "high" in kline
        assert "low" in kline
        assert "close" in kline
        assert "volume" in kline

        assert isinstance(kline["timestamp"], int)
        assert isinstance(kline["open"], float)
        assert isinstance(kline["high"], float)
        assert isinstance(kline["low"], float)
        assert isinstance(kline["close"], float)
        assert isinstance(kline["volume"], (int, float)) # Volume can sometimes be float

        assert kline["high"] >= kline["low"]
        assert kline["high"] >= kline["open"]
        assert kline["high"] >= kline["close"]
        assert kline["low"] <= kline["open"]
        assert kline["low"] <= kline["close"]

@pytest.mark.asyncio
async def test_get_historical_klines_limit_respected(market_service: MarketDataService):
    symbol = "LIMIT/TEST"
    test_limits = [1, 10, 100] # Default is 100
    for limit_val in test_limits:
        klines = await market_service.get_historical_klines(symbol, limit=limit_val)
        assert len(klines) == limit_val

@pytest.mark.asyncio
async def test_get_historical_klines_timestamps_are_increasing(market_service: MarketDataService):
    symbol = "TIME/TEST"
    limit = 20
    klines = await market_service.get_historical_klines(symbol, limit=limit)

    assert len(klines) == limit
    timestamps = [kline["timestamp"] for kline in klines]
    for i in range(len(timestamps) - 1):
        assert timestamps[i] < timestamps[i+1]

@pytest.mark.asyncio
async def test_get_historical_klines_mock_data_pattern(market_service: MarketDataService):
    """
    More specific test for the mock data generation pattern, especially the breakout.
    This test is tightly coupled to the mock implementation but useful for Darvas testing.
    """
    symbol = "DARVAS/MOCK"
    limit = 30 # Needs to be enough to see the pattern: initial, consolidation, breakout
                # Initial phase < limit - 15. Consolidation < limit - 1. Breakout = last.
                # So limit = 15 (initial) + some consolidation (e.g. 10) + 1 (breakout) = 26+

    klines = await market_service.get_historical_klines(symbol, limit=limit)
    assert len(klines) == limit

    box_consolidation_top = 105.0 # From mock service

    # Check last candle for breakout characteristics
    last_candle = klines[-1]
    assert last_candle["high"] > box_consolidation_top
    assert last_candle["close"] > box_consolidation_top

    # Check a candle in consolidation phase
    # Example: candle at index limit - 5 (should be in consolidation)
    if limit - 5 >= limit - 15 : # Ensure it's in consolidation part
        consolidation_candle_index = limit - 5
        consolidation_candle = klines[consolidation_candle_index]
        assert consolidation_candle["high"] == box_consolidation_top # Mock makes highs hit the top
        # Other checks for consolidation can be added if pattern is more complex

    # Check a candle in initial phase
    if limit > 15: # Ensure there's an initial phase
        initial_phase_candle = klines[0] # First candle
        assert initial_phase_candle["high"] < box_consolidation_top
        # (More specific assertions depend on the exact mock generation logic for initial phase)

```
