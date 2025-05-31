from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from loguru import logger
import json
import pandas as pd
import numpy as np # For mock data generation if service call fails or for the stub path

# Attempt to import the 'tool' decorator from crewai_tools
try:
    from crewai_tools import tool
except ImportError:
    logger.warning("crewai_tools.tool not found. Using a placeholder decorator '@tool_stub'.")
    def tool_stub(name: str, args_schema: Optional[Any] = None, description: Optional[str] = None):
        def decorator(func):
            func.tool_name = name
            func.args_schema = args_schema
            func.description = description
            logger.debug(f"Tool stub '{name}' registered with args_schema: {args_schema}, desc: {description}")
            return func
        return decorator
    tool = tool_stub

# Import MarketDataService and the global services registry
# This direct import is a simplification for this subtask.
# In a production CrewAI setup, tools often get dependencies injected or use a service locator.
try:
    from ..services.market_data_service import MarketDataService
    from ..main import services as app_services # Accessing the global 'services' dict from main.py
    SERVICE_ACCESS_METHOD = "app_services_dict"
except ImportError:
    logger.warning("Could not import MarketDataService or app_services from ..services/..main. Tool will rely on mock data only.")
    MarketDataService = None
    app_services = None
    SERVICE_ACCESS_METHOD = "mock_only"


class FetchMarketDataArgs(BaseModel):
    """
    Input arguments for the Fetch Market Data Tool.
    Specifies the symbol, timeframe, and historical data range for market data retrieval.
    """
    symbol: str = Field(..., description="The trading symbol to fetch market data for (e.g., 'BTC-USD', 'AAPL').")
    timeframe: str = Field(..., description="The timeframe for the data (e.g., '1h', '4h', '1d'). Common values might be '1min', '5min', '15min', '1h', '4h', '1d', '1w'.")
    historical_days: int = Field(default=30, description="Number of past days of historical data to fetch.", gt=0)


@tool("Fetch Market Data Tool", args_schema=FetchMarketDataArgs, description="Fetches historical OHLCV market data for a given financial symbol and timeframe. Includes simulated current price.")
async def fetch_market_data_tool(symbol: str, timeframe: str, historical_days: int = 30) -> str:
    """
    Fetches historical OHLCV market data for a specified trading symbol and timeframe.
    This tool attempts to use the MarketDataService. If unavailable or if an error occurs,
    it falls back to generating mock data.

    Args:
        symbol: The trading symbol (e.g., 'BTC-USD', 'AAPL').
        timeframe: The timeframe for the data (e.g., '1h', '1d'). Corresponds to 'interval' in MarketDataService.
        historical_days: Number of past days of historical OHLCV data to retrieve.

    Returns:
        A JSON string representing a dictionary with market data including:
        'symbol', 'timeframe', 'requested_historical_days', 'limit_calculated' (number of candles),
        'data' (a list of OHLCV records), and 'current_price_simulated'.
        Returns an error JSON if the service call fails and mock generation also fails.
    """
    logger.info(f"TOOL: Fetching market data for {symbol}, timeframe {timeframe}, last {historical_days} days.")

    limit = historical_days # Default for '1d'
    if 'h' in timeframe:
        try:
            hours = int(timeframe.replace('h', ''))
            if hours > 0 and 24 % hours == 0:
                limit = historical_days * (24 // hours)
            else: # Default to 24 candles per day if timeframe is unusual, e.g. 5h
                limit = historical_days * 24
                logger.warning(f"Uncommon hour timeframe '{timeframe}', defaulting limit calculation to 24 periods per day.")
        except ValueError:
            limit = historical_days * 24 # Default to 1h if parse fails for hour format
            logger.warning(f"Could not parse hour timeframe '{timeframe}', defaulting limit calculation to 24 periods per day.")
    elif 'min' in timeframe:
        try:
            minutes = int(timeframe.replace('min', ''))
            if minutes > 0 and (60*24) % minutes == 0 :
                 limit = historical_days * ( (24 * 60) // minutes)
            else: # Default to a large number of 1-min candles per day if unusual
                limit = historical_days * 24 * 60
                logger.warning(f"Uncommon minute timeframe '{timeframe}', defaulting limit calculation to 1440 periods per day.")
        except ValueError:
            limit = historical_days * 24 * 60 # Default to 1min if parse fails
            logger.warning(f"Could not parse minute timeframe '{timeframe}', defaulting limit calculation to 1440 periods per day.")

    logger.debug(f"Calculated limit: {limit} candles for {historical_days} days with timeframe {timeframe}.")

    actual_call_result: Optional[List[Dict[str, Any]]] = None
    error_message: Optional[str] = None

    if SERVICE_ACCESS_METHOD == "app_services_dict" and app_services:
        market_data_service: Optional[MarketDataService] = app_services.get("market_data_service")
        if not market_data_service:
            logger.error("MarketDataService not available in app_services registry.")
            error_message = "MarketDataService not available."
        else:
            try:
                logger.info(f"TOOL: Calling MarketDataService.get_historical_data(symbol='{symbol}', interval='{timeframe}', limit={limit})")
                # This is an async call
                actual_call_result = await market_data_service.get_historical_data(
                    symbol=symbol,
                    interval=timeframe,
                    limit=limit
                )
                if actual_call_result is None: # Service method might return None on its own error
                    logger.warning(f"MarketDataService returned None for {symbol}, {timeframe}.")
                    error_message = "No data returned from MarketDataService (service returned None)."
                elif not actual_call_result: # Empty list
                    logger.warning(f"No data (empty list) returned from MarketDataService for {symbol}, {timeframe}.")
                    # This is not an error, just no data. Let it proceed to output.
            except Exception as e:
                logger.error(f"Error calling MarketDataService: {e}")
                error_message = f"Error calling MarketDataService: {str(e)}"
    else: # Fallback if service cannot be accessed
        logger.warning(f"MarketDataService access not available (SERVICE_ACCESS_METHOD: {SERVICE_ACCESS_METHOD}). Tool will use mock data.")
        error_message = "MarketDataService not configured for tool access; using mock data as fallback."


    # If service call failed or service not available, use mock data generation
    if actual_call_result is None: # This means either service failed, or returned None, or was not called
        logger.info(f"Using mock data for {symbol} due to: {error_message or 'Service not called'}")
        mock_ohlcv_data: List[Dict[str, Any]] = []
        base_price = 150.0 + symbol_to_int(symbol)
        current_dt = pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=historical_days +1)

        for i in range(limit): # Generate up to 'limit' mock candles
            current_dt += pd.Timedelta(hours=1) if 'h' in timeframe else (pd.Timedelta(minutes=1) if 'min' in timeframe else pd.Timedelta(days=1))
            open_price = round(base_price + np.random.randn() * 2, 2)
            high_price = round(open_price + np.random.rand() * 5, 2)
            low_price = round(open_price - np.random.rand() * 5, 2)
            close_price = round(np.clip(open_price + np.random.randn(), low_price, high_price) , 2)
            volume = int(10000 + np.random.rand() * 5000)
            base_price = close_price

            mock_ohlcv_data.append({
                "timestamp": current_dt.isoformat().replace("+00:00", "Z"), "symbol": symbol,
                "open": open_price, "high": high_price, "low": low_price, "close": close_price, "volume": volume
            })
        actual_call_result = mock_ohlcv_data
        if error_message is None: error_message = "Used mock data as service was unavailable."


    current_price_simulated = actual_call_result[-1]['close'] if actual_call_result else None

    output_payload = {
        "symbol": symbol,
        "timeframe": timeframe,
        "requested_historical_days": historical_days,
        "limit_calculated": limit,
        "data_source_status": error_message if error_message else "Successfully retrieved from MarketDataService (or service mock).",
        "data_points_returned": len(actual_call_result) if actual_call_result is not None else 0,
        "current_price_simulated": current_price_simulated,
        "data": actual_call_result if actual_call_result is not None else []
    }

    try:
        return json.dumps(output_payload, default=str) # default=str for datetime if any
    except (TypeError, OverflowError) as e:
        logger.error(f"TOOL: Error serializing market data to JSON for {symbol}: {e}")
        return json.dumps({"error": "Failed to serialize market data.", "details": str(e), "symbol": symbol, "timeframe": timeframe})

def symbol_to_int(symbol_str: str) -> int:
    """Helper to generate somewhat consistent integer from symbol string for mock data."""
    val = 0
    for char in symbol_str:
        val += ord(char)
    return val % 100

async def main_async_example(): # Renamed for clarity
    logger.remove()
    logger.add(lambda msg: print(msg, end=''), colorize=True, format="<level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="INFO")

    # This example assumes app_services might be populated if run within a broader context.
    # For standalone tool test, it will likely use mock data.
    logger.info(f"Service access method for tool: {SERVICE_ACCESS_METHOD}")
    if SERVICE_ACCESS_METHOD == "app_services_dict" and app_services is None:
        logger.warning("app_services is None. MarketDataService will not be called by the tool.")
        # Simulate app_services and a mock MarketDataService for a more complete example run
        # In a real app, main.py's lifespan would populate app_services.
        class MockMarketDataService:
            async def get_historical_data(self, symbol: str, interval: str, limit: int) -> List[Dict[str, Any]]:
                logger.info(f"MOCK MarketDataService called: get_historical_data for {symbol}, {interval}, {limit}")
                return [{"timestamp": "2023-10-01T00:00:00Z", "symbol": symbol, "open": 1, "high": 2, "low": 0.5, "close": 1.5, "volume": 1000}]

        # This global modification is only for this example's purpose
        global app_services
        app_services = {"market_data_service": MockMarketDataService()}
        logger.info("Using a temporary mock MarketDataService for this example run.")


    args_valid = FetchMarketDataArgs(symbol="AAPL", timeframe="1h", historical_days=1)
    json_output = await fetch_market_data_tool( # await the async tool
        symbol=args_valid.symbol,
        timeframe=args_valid.timeframe,
        historical_days=args_valid.historical_days
    )
    logger.info(f"Fetch Market Data Tool Output (AAPL, 1h, 1 day):\n{json.dumps(json.loads(json_output), indent=2)}")

    args_btc = FetchMarketDataArgs(symbol="BTC-USD", timeframe="1d", historical_days=2)
    json_output_btc = await fetch_market_data_tool(**args_btc.dict()) # await the async tool
    logger.info(f"Fetch Market Data Tool Output (BTC-USD, 1d, 2 days):\n{json.dumps(json.loads(json_output_btc), indent=2)}")

if __name__ == '__main__':
    import asyncio
    asyncio.run(main_async_example())
```
