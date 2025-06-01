import logging
import asyncio
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta

from ..blockchain.base import OrderSide, OrderType
from ..blockchain.hyperliquid import HyperliquidClient
from ..blockchain.sonic import SonicClient
from ..blockchain.vertex import VertexClient
from .base import WorkflowStep

logger = logging.getLogger(__name__)

class DataFetchStep(WorkflowStep):
    """Base class for data fetching steps in the workflow."""
    
    def __init__(self, name: str, symbols: List[str], timeframes: List[str]):
        super().__init__(name)
        self.symbols = symbols
        self.timeframes = timeframes
        self.data = {}  # Symbol -> Timeframe -> DataFrame
    
    def get_data(self) -> Dict[str, Dict[str, pd.DataFrame]]:
        """Return the fetched market data."""
        return self.data
    
    def _initialize_data_structure(self) -> None:
        """Initialize the nested data dictionary structure."""
        for symbol in self.symbols:
            if symbol not in self.data:
                self.data[symbol] = {}
            for timeframe in self.timeframes:
                if timeframe not in self.data[symbol]:
                    self.data[symbol][timeframe] = None


class HyperliquidDataFetchStep(DataFetchStep):
    """Fetch market data from Hyperliquid exchange."""
    
    def __init__(self, symbols: List[str], timeframes: List[str], lookback_periods: Dict[str, int] = None):
        super().__init__("Hyperliquid Data Fetch", symbols, timeframes)
        self.client = HyperliquidClient()
        self.lookback_periods = lookback_periods or {tf: 100 for tf in timeframes}  # Default to 100 candles
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch OHLCV data for the configured symbols and timeframes."""
        self._initialize_data_structure()
        
        for symbol in self.symbols:
            for timeframe in self.timeframes:
                lookback = self.lookback_periods.get(timeframe, 100)
                
                try:
                    # Calculate start and end times based on timeframe and lookback
                    end_time = datetime.now()
                    
                    # Convert timeframe string to timedelta (e.g., "1h" to 1 hour)
                    td = self._timeframe_to_timedelta(timeframe)
                    start_time = end_time - (td * lookback)
                    
                    # Fetch candles from Hyperliquid
                    candles = await self.client.get_candles(
                        symbol=symbol,
                        interval=timeframe,
                        start_time=int(start_time.timestamp() * 1000),
                        end_time=int(end_time.timestamp() * 1000)
                    )
                    
                    # Convert to DataFrame
                    if candles:
                        df = pd.DataFrame(candles)
                        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                        df.set_index('timestamp', inplace=True)
                        self.data[symbol][timeframe] = df
                        logger.info(f"Fetched {len(df)} {timeframe} candles for {symbol} from Hyperliquid")
                    else:
                        logger.warning(f"No candles returned for {symbol} {timeframe} from Hyperliquid")
                
                except Exception as e:
                    logger.error(f"Error fetching {symbol} {timeframe} data from Hyperliquid: {str(e)}", exc_info=True)
                    # Don't fail the entire step if one symbol/timeframe fails
                    # Just continue with the next one
        
        # Add fetched data to the context
        if 'market_data' not in context:
            context['market_data'] = {}
        
        context['market_data']['hyperliquid'] = self.data
        return context
    
    def _timeframe_to_timedelta(self, timeframe: str) -> timedelta:
        """Convert a timeframe string to a timedelta object."""
        unit = timeframe[-1].lower()
        value = int(timeframe[:-1])
        
        if unit == 'm':
            return timedelta(minutes=value)
        elif unit == 'h':
            return timedelta(hours=value)
        elif unit == 'd':
            return timedelta(days=value)
        elif unit == 'w':
            return timedelta(weeks=value)
        else:
            raise ValueError(f"Unsupported timeframe unit: {unit}")


class SonicDataFetchStep(DataFetchStep):
    """Fetch market data from Sonic exchange."""
    
    def __init__(self, symbols: List[str], timeframes: List[str], lookback_periods: Dict[str, int] = None):
        super().__init__("Sonic Data Fetch", symbols, timeframes)
        self.client = SonicClient()
        self.lookback_periods = lookback_periods or {tf: 100 for tf in timeframes}
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch OHLCV data for the configured symbols and timeframes."""
        self._initialize_data_structure()
        
        for symbol in self.symbols:
            for timeframe in self.timeframes:
                lookback = self.lookback_periods.get(timeframe, 100)
                
                try:
                    # Calculate start and end times
                    end_time = datetime.now()
                    td = self._timeframe_to_timedelta(timeframe)
                    start_time = end_time - (td * lookback)
                    
                    # Fetch candles from Sonic
                    candles = await self.client.get_candles(
                        symbol=symbol,
                        interval=timeframe,
                        start_time=int(start_time.timestamp() * 1000),
                        end_time=int(end_time.timestamp() * 1000)
                    )
                    
                    # Convert to DataFrame
                    if candles:
                        df = pd.DataFrame(candles)
                        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                        df.set_index('timestamp', inplace=True)
                        self.data[symbol][timeframe] = df
                        logger.info(f"Fetched {len(df)} {timeframe} candles for {symbol} from Sonic")
                    else:
                        logger.warning(f"No candles returned for {symbol} {timeframe} from Sonic")
                
                except Exception as e:
                    logger.error(f"Error fetching {symbol} {timeframe} data from Sonic: {str(e)}", exc_info=True)
        
        # Add fetched data to the context
        if 'market_data' not in context:
            context['market_data'] = {}
        
        context['market_data']['sonic'] = self.data
        return context
    
    def _timeframe_to_timedelta(self, timeframe: str) -> timedelta:
        """Convert a timeframe string to a timedelta object."""
        unit = timeframe[-1].lower()
        value = int(timeframe[:-1])
        
        if unit == 'm':
            return timedelta(minutes=value)
        elif unit == 'h':
            return timedelta(hours=value)
        elif unit == 'd':
            return timedelta(days=value)
        elif unit == 'w':
            return timedelta(weeks=value)
        else:
            raise ValueError(f"Unsupported timeframe unit: {unit}")


class VertexDataFetchStep(DataFetchStep):
    """Fetch market data from Vertex exchange."""
    
    def __init__(self, symbols: List[str], timeframes: List[str], lookback_periods: Dict[str, int] = None):
        super().__init__("Vertex Data Fetch", symbols, timeframes)
        self.client = VertexClient()
        self.lookback_periods = lookback_periods or {tf: 100 for tf in timeframes}
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch OHLCV data for the configured symbols and timeframes."""
        self._initialize_data_structure()
        
        for symbol in self.symbols:
            for timeframe in self.timeframes:
                lookback = self.lookback_periods.get(timeframe, 100)
                
                try:
                    # Calculate start and end times
                    end_time = datetime.now()
                    td = self._timeframe_to_timedelta(timeframe)
                    start_time = end_time - (td * lookback)
                    
                    # Fetch candles from Vertex
                    candles = await self.client.get_candles(
                        symbol=symbol,
                        interval=timeframe,
                        start_time=int(start_time.timestamp() * 1000),
                        end_time=int(end_time.timestamp() * 1000)
                    )
                    
                    # Convert to DataFrame
                    if candles:
                        df = pd.DataFrame(candles)
                        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
                        df.set_index('timestamp', inplace=True)
                        self.data[symbol][timeframe] = df
                        logger.info(f"Fetched {len(df)} {timeframe} candles for {symbol} from Vertex")
                    else:
                        logger.warning(f"No candles returned for {symbol} {timeframe} from Vertex")
                
                except Exception as e:
                    logger.error(f"Error fetching {symbol} {timeframe} data from Vertex: {str(e)}", exc_info=True)
        
        # Add fetched data to the context
        if 'market_data' not in context:
            context['market_data'] = {}
        
        context['market_data']['vertex'] = self.data
        return context
    
    def _timeframe_to_timedelta(self, timeframe: str) -> timedelta:
        """Convert a timeframe string to a timedelta object."""
        unit = timeframe[-1].lower()
        value = int(timeframe[:-1])
        
        if unit == 'm':
            return timedelta(minutes=value)
        elif unit == 'h':
            return timedelta(hours=value)
        elif unit == 'd':
            return timedelta(days=value)
        elif unit == 'w':
            return timedelta(weeks=value)
        else:
            raise ValueError(f"Unsupported timeframe unit: {unit}")


class MarketDepthFetchStep(WorkflowStep):
    """Fetch order book and market depth data from exchanges."""
    
    def __init__(self, exchange: str, symbols: List[str], depth: int = 10):
        super().__init__(f"{exchange} Market Depth Fetch")
        self.exchange = exchange.lower()
        self.symbols = symbols
        self.depth = depth
        self.order_books = {}
        
        # Initialize the appropriate client
        if self.exchange == 'hyperliquid':
            self.client = HyperliquidClient()
        elif self.exchange == 'sonic':
            self.client = SonicClient()
        elif self.exchange == 'vertex':
            self.client = VertexClient()
        else:
            raise ValueError(f"Unsupported exchange: {exchange}")
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch order book data for the configured symbols."""
        for symbol in self.symbols:
            try:
                # Fetch order book
                order_book = await self.client.get_order_book(symbol, self.depth)
                self.order_books[symbol] = order_book
                logger.info(f"Fetched order book for {symbol} from {self.exchange}")
            
            except Exception as e:
                logger.error(f"Error fetching order book for {symbol} from {self.exchange}: {str(e)}", exc_info=True)
        
        # Add order book data to the context
        if 'market_depth' not in context:
            context['market_depth'] = {}
        
        context['market_depth'][self.exchange] = self.order_books
        return context


class DataCleaningStep(WorkflowStep):
    """Clean and preprocess market data."""
    
    def __init__(self, data_sources: List[str]):
        super().__init__("Data Cleaning and Preprocessing")
        self.data_sources = data_sources  # List of exchange names
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and preprocess market data from all sources."""
        if 'market_data' not in context:
            logger.warning("No market data found in context. Skipping cleaning step.")
            return context
        
        market_data = context['market_data']
        
        for source in self.data_sources:
            if source not in market_data:
                logger.warning(f"No data found for source {source}. Skipping.")
                continue
            
            source_data = market_data[source]
            
            for symbol in source_data:
                for timeframe in source_data[symbol]:
                    df = source_data[symbol][timeframe]
                    
                    if df is None or df.empty:
                        continue
                    
                    try:
                        # Remove duplicate timestamps
                        df = df[~df.index.duplicated(keep='last')]
                        
                        # Ensure required columns exist
                        required_columns = ['open', 'high', 'low', 'close']
                        if not all(col in df.columns for col in required_columns):
                            logger.warning(f"Missing required columns in {symbol} {timeframe} data from {source}")
                            continue
                        
                        # Sort by timestamp
                        df = df.sort_index()
                        
                        # Handle missing values
                        df = df.ffill()  # Forward fill
                        
                        # Derive additional columns
                        if 'volume' in df.columns:
                            # Calculate volume moving average
                            df['volume_ma'] = df['volume'].rolling(window=20).mean()
                        
                        # Calculate returns
                        df['returns'] = df['close'].pct_change()
                        
                        # Calculate moving averages
                        df['ma20'] = df['close'].rolling(window=20).mean()
                        df['ma50'] = df['close'].rolling(window=50).mean()
                        
                        # Update the DataFrame in the context
                        market_data[source][symbol][timeframe] = df
                        
                        logger.info(f"Cleaned {symbol} {timeframe} data from {source}")
                    
                    except Exception as e:
                        logger.error(f"Error cleaning {symbol} {timeframe} data from {source}: {str(e)}", exc_info=True)
        
        return context


class DataMergeStep(WorkflowStep):
    """Merge data from multiple sources into a unified dataset."""
    
    def __init__(self, target_exchange: str = None):
        super().__init__("Data Merge")
        self.target_exchange = target_exchange  # If specified, use this as primary source
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Merge data from different exchanges into a unified dataset."""
        if 'market_data' not in context:
            logger.warning("No market data found in context. Skipping merge step.")
            return context
        
        market_data = context['market_data']
        exchanges = list(market_data.keys())
        
        if not exchanges:
            logger.warning("No exchange data found. Skipping merge step.")
            return context
        
        # If target_exchange is specified and available, use it as primary source
        primary_exchange = self.target_exchange if self.target_exchange in exchanges else exchanges[0]
        
        # Initialize merged data structure
        if 'merged_data' not in context:
            context['merged_data'] = {}
        
        merged_data = context['merged_data']
        
        # Use the primary exchange's data as the base
        primary_data = market_data[primary_exchange]
        
        for symbol in primary_data:
            if symbol not in merged_data:
                merged_data[symbol] = {}
            
            for timeframe in primary_data[symbol]:
                try:
                    # Start with the primary exchange's data
                    base_df = primary_data[symbol][timeframe]
                    
                    if base_df is None or base_df.empty:
                        continue
                    
                    # Create a copy to avoid modifying the original
                    merged_df = base_df.copy()
                    
                    # Add marker for the data source
                    merged_df['source'] = primary_exchange
                    
                    # Fill in missing data from other exchanges
                    for exchange in exchanges:
                        if exchange == primary_exchange:
                            continue
                        
                        if (exchange in market_data and
                            symbol in market_data[exchange] and
                            timeframe in market_data[exchange][symbol]):
                            
                            other_df = market_data[exchange][symbol][timeframe]
                            
                            if other_df is None or other_df.empty:
                                continue
                            
                            # Find timestamps in other_df that aren't in merged_df
                            missing_timestamps = other_df.index.difference(merged_df.index)
                            
                            if len(missing_timestamps) > 0:
                                # Add missing data from the other exchange
                                missing_data = other_df.loc[missing_timestamps]
                                missing_data['source'] = exchange
                                merged_df = pd.concat([merged_df, missing_data])
                                merged_df = merged_df.sort_index()
                    
                    # Store the merged dataframe
                    merged_data[symbol][timeframe] = merged_df
                    logger.info(f"Merged {symbol} {timeframe} data from {len(exchanges)} exchanges")
                
                except Exception as e:
                    logger.error(f"Error merging {symbol} {timeframe} data: {str(e)}", exc_info=True)
        
        return context
