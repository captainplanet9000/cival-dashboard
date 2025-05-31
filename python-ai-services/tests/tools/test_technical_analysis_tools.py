import pytest
import json
import pandas as pd # For creating test input data
from typing import Dict, Any

from python_ai_services.tools.technical_analysis_tools import run_technical_analysis_tool, RunTechnicalAnalysisArgs
from python_ai_services.tools.market_data_tools import fetch_market_data_tool, FetchMarketDataArgs # For sample input

import pytest_asyncio # To handle async fixtures/tests if needed for helpers

# --- Helper to get sample market data JSON string ---
# This helper now needs to be async because fetch_market_data_tool is async
@pytest_asyncio.fixture
async def sample_market_data_json_fixture():
    """Provides a sample market_data_json string using the async fetch_market_data_tool."""
    # Mock app_services for fetch_market_data_tool if it's not using its own fallback
    # For simplicity, assume fetch_market_data_tool's fallback to mock data is sufficient here,
    # or that app_services is available in the test environment for it.
    # If testing fetch_market_data_tool's actual service call, its own tests cover that.
    # Here, we just need its output format.
    days = 25 # Ensure enough data for default SMA period
    market_args = FetchMarketDataArgs(symbol="TEST/TA", timeframe="1d", historical_days=days)
    # Patch app_services specifically for this helper's call to fetch_market_data_tool
    # to ensure it uses mock data and doesn't try to make real service calls.
    with mock.patch('python_ai_services.tools.market_data_tools.app_services', {"market_data_service": None}):
        json_str = await fetch_market_data_tool(**market_args.dict())
    return json_str

# --- Tests for run_technical_analysis_tool ---

@pytest.mark.asyncio # Mark test as async because the fixture is async
async def test_run_technical_analysis_tool_success(sample_market_data_json_fixture: str):
    """Test run_technical_analysis_tool with valid market_data_json."""
    market_json_str = sample_market_data_json_fixture # Use the awaited fixture

    result_json = run_technical_analysis_tool(market_data_json=market_json_str, volume_sma_period=20)

    assert isinstance(result_json, str)
    data = json.loads(result_json)

    assert "error" not in data
    assert "symbol" in data
    assert data["symbol"] == "TEST/TA" # From fixture
    assert "timeframe" in data
    assert data["timeframe"] == "1d" # From fixture
    assert "summary" in data
    assert "ohlcv_with_ta" in data # Check for the new key
    assert isinstance(data["ohlcv_with_ta"], list)
    assert "columns_available" in data
    assert isinstance(data["columns_available"], list)
    assert "volume_sma" in data["columns_available"]

    if data["ohlcv_with_ta"]:
        # Convert back to DataFrame to check structure and content
        df_out = pd.DataFrame(data["ohlcv_with_ta"])
        assert not df_out.empty
        original_data_points = json.loads(market_json_str).get("data_points_returned")
        # Length might change if NA rows were dropped due to bad data in source,
        # but with mock data from fetch_market_data_tool, it should be consistent.
        assert len(df_out) == original_data_points

        required_original_cols = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        for col in required_original_cols:
            assert col in df_out.columns
        assert "volume_sma" in df_out.columns
        # Check if SMA actually has values (not all NaN) if period is met
        if len(df_out) >= 20: # volume_sma_period
            assert df_out["volume_sma"].notna().any()


def test_run_technical_analysis_tool_invalid_json_input():
    """Test with a malformed JSON string."""
    malformed_json = '{"symbol": "BADJSON", "data": "this is not a list... oops'
    result_json = run_technical_analysis_tool(market_data_json=malformed_json)
    data = json.loads(result_json)
    assert "error" in data
    assert "Invalid JSON format" in data["error"]

def test_run_technical_analysis_tool_missing_data_key():
    """Test with valid JSON but missing the 'data' key."""
    missing_data_key_json = json.dumps({"symbol": "NODATA", "timeframe": "1d"}) # 'data' key is missing
    result_json = run_technical_analysis_tool(market_data_json=missing_data_key_json)
    data = json.loads(result_json)
    assert "error" in data
    assert "'data' field in market_data_json is missing or not a list" in data["error"]

def test_run_technical_analysis_tool_empty_data_list():
    """Test with 'data' key present but the list is empty."""
    empty_data_list_json = json.dumps({"symbol": "EMPTYDATA", "timeframe": "1d", "data": []})
    result_json = run_technical_analysis_tool(market_data_json=empty_data_list_json)
    data = json.loads(result_json)
    assert "error" not in data # Should handle empty data gracefully as per implementation
    assert data["summary"] == "No OHLCV data provided to analyze."
    assert len(data["processed_data_preview"]) == 0

def test_run_technical_analysis_tool_dataframe_conversion_error():
    """Test with data that cannot be converted to numeric OHLCV."""
    # 'close' is a string that cannot be converted to numeric
    bad_ohlcv_data_json = json.dumps({
        "symbol": "BADDATATYPE", "timeframe": "1d",
        "data": [{"timestamp": "2023-01-01T00:00:00Z", "open": 10, "high": 11, "low": 9, "close": "bad_price", "volume": 100}]
    })
    result_json = run_technical_analysis_tool(market_data_json=bad_ohlcv_data_json)
    data = json.loads(result_json)
    assert "error" not in data # Current stub makes df empty and returns summary
    assert "Data for OHLCV columns was not numeric" in data["summary"]
    assert len(data["processed_data_preview"]) == 0


def test_run_technical_analysis_tool_args_schema():
    """Test that the tool has the correct args_schema linked."""
    if hasattr(run_technical_analysis_tool, 'args_schema'):
        assert run_technical_analysis_tool.args_schema == RunTechnicalAnalysisArgs
    elif hasattr(run_technical_analysis_tool, '_crew_tool_input_schema'):
         assert run_technical_analysis_tool._crew_tool_input_schema == RunTechnicalAnalysisArgs
    else:
        pytest.skip("Tool schema attribute not found, decorator might be a simple stub or crewai internal changed.")

```
