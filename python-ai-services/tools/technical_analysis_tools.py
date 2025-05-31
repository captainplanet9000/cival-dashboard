from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from loguru import logger
import json
import pandas as pd

# Attempt to import the 'tool' decorator from crewai_tools
try:
    from crewai_tools import tool
except ImportError:
    logger.warning("crewai_tools.tool not found. Using a placeholder decorator '@tool_stub'.")
    # Define a placeholder decorator if crewai_tools is not available
    def tool_stub(name: str, args_schema: Optional[Any] = None, description: Optional[str] = None):
        def decorator(func):
            func.tool_name = name
            func.args_schema = args_schema
            func.description = description
            logger.debug(f"Tool stub '{name}' registered with args_schema: {args_schema}, desc: {description}")
            return func
        return decorator
    tool = tool_stub

# Conceptual import - not directly used in this stubbed tool's body,
# but indicates the intended interaction in a real implementation.
# from ..strategies.technical_analysis_engine import TechnicalAnalysisEngine

class RunTechnicalAnalysisArgs(BaseModel):
    """
    Input arguments for the Run Technical Analysis Tool.
    Specifies the market data (as JSON string) and parameters for TA calculation.
    """
    market_data_json: str = Field(..., description="JSON string containing market data, typically from fetch_market_data_tool. Expected to have a 'data' key with a list of OHLCV records.")
    volume_sma_period: int = Field(default=20, description="Period for calculating Volume Simple Moving Average (SMA).", gt=0)
    # Add other TA parameters here if needed, e.g., rsi_period, macd_fast, etc.


@tool("Run Technical Analysis Tool", args_schema=RunTechnicalAnalysisArgs, description="Processes market data (OHLCV) to calculate technical indicators like Volume SMA and prepares data for strategy application.")
def run_technical_analysis_tool(market_data_json: str, volume_sma_period: int = 20) -> str:
    """
    Runs technical analysis on the provided market data (OHLCV).
    This tool primarily converts the JSON market data into a Pandas DataFrame,
    calculates a Volume Simple Moving Average (SMA) as an example indicator,
    and returns a summary including a preview of the processed data as a JSON string.

    Args:
        market_data_json: JSON string containing market data. Expected structure includes
                          a 'data' key with a list of OHLCV dictionaries, each having
                          'timestamp', 'open', 'high', 'low', 'close', 'volume'.
        volume_sma_period: The lookback period for calculating the Volume SMA.

    Returns:
        A JSON string summarizing the operation. Includes symbol, timeframe, a status message,
        a preview of the last 5 rows of the DataFrame (with volume_sma), and a list of all columns
        in the processed DataFrame. Returns an error JSON if input is invalid.
    """
    logger.info(f"TOOL: Running technical analysis. Volume SMA period: {volume_sma_period}.")

    try:
        input_data_dict = json.loads(market_data_json)
        ohlcv_records = input_data_dict.get('data')
        symbol = input_data_dict.get('symbol', 'UNKNOWN')
        timeframe = input_data_dict.get('timeframe', 'UNKNOWN')

        if not isinstance(ohlcv_records, list):
            logger.error("TOOL: 'data' field in market_data_json is missing or not a list.")
            return json.dumps({"error": "'data' field in market_data_json is missing or not a list."})
        if not ohlcv_records:
            logger.warning("TOOL: 'data' field in market_data_json is empty.")
            return json.dumps({"symbol": symbol, "timeframe": timeframe, "summary": "No OHLCV data provided to analyze.", "processed_data_preview": [], "columns": []})

        df = pd.DataFrame(ohlcv_records)
        logger.debug(f"TOOL: Initial DataFrame created with {len(df)} records for {symbol}.")

    except json.JSONDecodeError as e:
        logger.error(f"TOOL: Invalid JSON format in market_data_json: {e}")
        return json.dumps({"error": "Invalid JSON format for market_data_json.", "details": str(e)})
    except Exception as e: # Catch other potential errors during initial parsing
        logger.error(f"TOOL: Error processing input market_data_json: {e}")
        return json.dumps({"error": "Error processing input market_data_json.", "details": str(e)})

    required_cols = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
    if not all(col in df.columns for col in required_cols):
        logger.error(f"TOOL: DataFrame missing one or more required columns: {required_cols}. Found: {list(df.columns)}")
        return json.dumps({"error": f"DataFrame missing required OHLCV columns. Expected: {required_cols}", "found_columns": list(df.columns)})

    try:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('timestamp')

        numeric_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        df = df.dropna(subset=numeric_cols) # Drop rows where essential numeric conversion failed
        if df.empty:
            logger.warning(f"TOOL: DataFrame for {symbol} became empty after numeric conversion and NA drop.")
            return json.dumps({"symbol": symbol, "timeframe": timeframe, "summary": "Data for OHLCV columns was not numeric or resulted in empty dataset after cleaning.", "processed_data_preview": [], "columns": list(df.columns)})

    except Exception as e:
        logger.error(f"TOOL: Error converting DataFrame columns for {symbol}: {e}")
        return json.dumps({"error": "Error during DataFrame column conversion.", "details": str(e)})

    # Calculate Volume SMA (example of an ancillary TA)
    if 'volume' in df.columns and not df['volume'].empty and len(df) >= volume_sma_period:
        df['volume_sma'] = df['volume'].rolling(window=volume_sma_period, min_periods=min(volume_sma_period, len(df))).mean()
        logger.info(f"TOOL: Calculated volume SMA for {symbol} using period {volume_sma_period}.")
    else:
        df['volume_sma'] = pd.NA # Or np.nan, or 0, depending on downstream needs
        logger.warning(f"TOOL: Volume SMA not calculated for {symbol}. Insufficient data or 'volume' column missing/empty. Data length: {len(df)}, Required period: {volume_sma_period}")

    # Prepare output
    # In a real scenario, this tool might return a more complex object with various indicators.
    # For CrewAI, returning a JSON string of the processed data or key findings is common.
    # The 'full_data_preview_cols' helps the next agent/LLM know what's in the DataFrame.

    # Convert Timestamp index back to string for JSON serialization if to_dict is used on rows
    df_for_output = df.copy()
    if isinstance(df_for_output.index, pd.DatetimeIndex):
         df_for_output.index = df_for_output.index.map(lambda ts: ts.isoformat())


    # Prepare output to include the full DataFrame with TA indicators
    # Convert Timestamp index back to string for JSON serialization
    df_for_output = df.copy()
    if isinstance(df_for_output.index, pd.DatetimeIndex):
         df_for_output.index = df_for_output.index.map(lambda ts: ts.isoformat())

    # Include all original columns plus the new TA columns like 'volume_sma'
    # The next tool (strategy application) will need this full data.
    ohlcv_with_ta_records = df_for_output.reset_index().to_dict(orient='records')

    output_data = {
        "symbol": symbol,
        "timeframe": timeframe,
        "summary": f"Technical analysis complete for {symbol}. DataFrame includes {len(ohlcv_with_ta_records)} records with calculated Volume SMA.",
        "ohlcv_with_ta": ohlcv_with_ta_records, # Full data with TA
        "columns_available": list(df_for_output.columns) # List of columns including new TA ones
    }

    try:
        # Using default=str to handle any potential datetime objects or pd.NA if not fully converted
        return json.dumps(output_data, default=str, ignore_nan=True)
    except (TypeError, OverflowError) as e:
        logger.error(f"TOOL: Error serializing TA output to JSON for {symbol}: {e}")
        return json.dumps({"error": "Failed to serialize TA output.", "details": str(e)})


if __name__ == '__main__':
    from python_ai_services.tools.market_data_tools import fetch_market_data_tool, FetchMarketDataArgs

    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="INFO")

    # 1. Get sample market data using the other tool
    market_args = FetchMarketDataArgs(symbol="TSLA", timeframe="1h", historical_days=3) # Short history for example
    market_data_json_str = fetch_market_data_tool(**market_args.dict())
    logger.info(f"\nSample Market Data JSON from fetch_market_data_tool:\n{json.dumps(json.loads(market_data_json_str), indent=2)}\n")

    # 2. Run technical analysis on this data
    ta_args = RunTechnicalAnalysisArgs(market_data_json=market_data_json_str, volume_sma_period=5) # Short SMA for few data points
    ta_json_output = run_technical_analysis_tool(**ta_args.dict())
    logger.info(f"Technical Analysis Tool Output:\n{json.dumps(json.loads(ta_json_output), indent=2)}")

    # Example with potentially problematic JSON
    invalid_json = '{"symbol": "BAD", "data": "not a list"}'
    ta_invalid_output = run_technical_analysis_tool(market_data_json=invalid_json)
    logger.info(f"Technical Analysis Tool Output (Invalid JSON input):\n{json.dumps(json.loads(ta_invalid_output), indent=2)}")

    empty_data_json = '{"symbol": "EMPTY", "data": []}'
    ta_empty_data_output = run_technical_analysis_tool(market_data_json=empty_data_json)
    logger.info(f"Technical Analysis Tool Output (Empty data list input):\n{json.dumps(json.loads(ta_empty_data_output), indent=2)}")

```
