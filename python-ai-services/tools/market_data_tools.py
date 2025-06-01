from openbb import obb
from typing import Optional, Dict, Any, List
import pandas as pd
from pydantic import BaseModel, Field
from logging import getLogger

logger = getLogger(__name__)

class HistoricalPriceRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol, e.g., AAPL.")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format.")
    end_date: str = Field(..., description="End date in YYYY-MM-DD format.")
    interval: str = Field(default="1d", description="Data interval, e.g., '1d', '1h'.")
    provider: str = Field(default="yfinance", description="Data provider, e.g., 'yfinance', 'fmp'.")

class QuoteRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol, e.g., AAPL.")
    provider: str = Field(default="yfinance", description="Data provider.")

class SymbolSearchRequest(BaseModel):
    query: str = Field(..., description="Search query for symbols or companies.")
    provider: str = Field(default="yfinance", description="Data provider.")
    is_etf: Optional[bool] = Field(default=None, description="Whether to search specifically for ETFs.")

def get_historical_price_data_tool(
    symbol: str,
    start_date: str,
    end_date: str,
    interval: str = "1d",
    provider: str = "yfinance"
) -> Optional[pd.DataFrame]:
    logger.info(f"Fetching historical prices for {symbol} ({interval}) from {start_date} to {end_date} via {provider}")
    try:
        # Validate inputs using the Pydantic model
        _ = HistoricalPriceRequest(symbol=symbol, start_date=start_date, end_date=end_date, interval=interval, provider=provider)
        data = obb.equity.price.historical(
            symbol=symbol, start_date=start_date, end_date=end_date, interval=interval, provider=provider
        )
        # OpenBB often returns an OBBject which might be empty or have an empty results list
        if data and hasattr(data, 'to_df'): # Check if it's an OBBject with to_df
            df = data.to_df()
            if not df.empty:
                logger.info(f"Successfully fetched {len(df)} rows of historical data for {symbol}.")
                return df
            else:
                logger.warning(f"No data returned by OpenBB (empty DataFrame) for historical prices of {symbol}.")
                return None
        else:
            logger.warning(f"No data or unexpected data format returned by OpenBB for historical prices of {symbol}.")
            return None
    except Exception as e:
        logger.error(f"Error fetching historical price data for {symbol}: {e}", exc_info=True)
        return None

def get_current_quote_tool(symbol: str, provider: str = "yfinance") -> Optional[Dict[str, Any]]:
    logger.info(f"Fetching current quote for {symbol} via {provider}")
    try:
        _ = QuoteRequest(symbol=symbol, provider=provider)
        data = obb.equity.price.quote(symbol=symbol, provider=provider)

        # Handle cases where data might be a list of OBBjects or a single OBBject
        if isinstance(data, list):
            if not data: # Empty list
                logger.warning(f"No quote data (empty list) returned by OpenBB for {symbol}.")
                return None
            # Assuming the first item is the most relevant if multiple are returned
            target_data = data[0]
        else: # Assuming it's a single OBBject
            target_data = data

        if target_data and hasattr(target_data, 'to_df'):
            df = target_data.to_df()
            if not df.empty:
                # If df has multiple rows, take the first. If one row, iloc[0] is fine.
                quote_data_dict = df.iloc[0].to_dict()
                logger.info(f"Successfully fetched quote for {symbol}: {quote_data_dict}")
                return quote_data_dict
            else:
                logger.warning(f"Quote data for {symbol} was empty after DataFrame conversion.")
                return None
        else:
            logger.warning(f"No data or unexpected data format returned by OpenBB for quote of {symbol}.")
            return None
    except Exception as e:
        logger.error(f"Error fetching current quote for {symbol}: {e}", exc_info=True)
        return None

def search_symbols_tool(query: str, provider: str = "yfinance", is_etf: Optional[bool] = None) -> Optional[List[Dict[str, Any]]]:
    logger.info(f"Searching for symbols with query '{query}' via {provider}, is_etf={is_etf}")
    try:
        _ = SymbolSearchRequest(query=query, provider=provider, is_etf=is_etf)
        # The structure of OpenBB's search result is an OBBject with a 'results' attribute,
        # which is a list of model instances (e.g., EquitySearch).
        data = obb.equity.search(query=query, provider=provider, is_etf=is_etf)
        if data and hasattr(data, 'results') and data.results:
            # Each item in data.results should have a to_dict() method if they are Pydantic models or similar.
            symbols_list = [item.model_dump() if hasattr(item, 'model_dump') else dict(item) for item in data.results]
            logger.info(f"Found {len(symbols_list)} symbols for query '{query}'.")
            return symbols_list
        else:
            logger.warning(f"No symbols found or empty results for query '{query}'.")
            return [] # Return empty list for no results, None for error
    except Exception as e:
        logger.error(f"Error searching for symbols with query '{query}': {e}", exc_info=True)
        return None
