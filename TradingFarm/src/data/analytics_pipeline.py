"""
Real-Time Analytics Pipeline Module

Implements a real-time data processing pipeline for market data analysis,
with support for stream processing, aggregation, and visualization data generation.
"""

import asyncio
import logging
import datetime
import json
from typing import Dict, List, Any, Optional, Callable, Awaitable, Union
from enum import Enum
import time
import uuid

import pandas as pd
import numpy as np
from pydantic import BaseModel

from .timeseries_db import TimeSeriesDB, get_timeseries_db


logger = logging.getLogger("data.analytics_pipeline")


class DataEventType(Enum):
    """Types of data events processed by the pipeline."""
    MARKET_DATA = "market_data"
    TRADE = "trade"
    ORDER = "order"
    STRATEGY = "strategy"
    CUSTOM = "custom"


class DataEvent(BaseModel):
    """Base model for data events in the pipeline."""
    
    id: str = ""
    event_type: str
    source: str
    timestamp: datetime.datetime
    data: Dict[str, Any]
    metadata: Dict[str, Any] = {}
    
    def __init__(self, **data):
        """Initialize with auto-generated ID if not provided."""
        if "id" not in data or not data["id"]:
            data["id"] = str(uuid.uuid4())
        if "timestamp" not in data:
            data["timestamp"] = datetime.datetime.now()
        super().__init__(**data)


class DataSource:
    """Base class for data sources in the analytics pipeline."""
    
    def __init__(self, name: str):
        """
        Initialize data source.
        
        Args:
            name: Source name
        """
        self.name = name
        self.subscribers: List[Callable[[DataEvent], Awaitable[None]]] = []
    
    async def subscribe(self, callback: Callable[[DataEvent], Awaitable[None]]) -> None:
        """
        Subscribe to data events.
        
        Args:
            callback: Async callback function
        """
        self.subscribers.append(callback)
    
    async def unsubscribe(self, callback: Callable[[DataEvent], Awaitable[None]]) -> None:
        """
        Unsubscribe from data events.
        
        Args:
            callback: Callback to remove
        """
        if callback in self.subscribers:
            self.subscribers.remove(callback)
    
    async def emit(self, event: DataEvent) -> None:
        """
        Emit data event to subscribers.
        
        Args:
            event: Data event
        """
        event.source = self.name
        tasks = [subscriber(event) for subscriber in self.subscribers]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


class MarketDataSource(DataSource):
    """Market data source that processes exchange data."""
    
    def __init__(
        self,
        exchange: str,
        symbols: List[str],
        resolution: str = "1m"
    ):
        """
        Initialize market data source.
        
        Args:
            exchange: Exchange name
            symbols: List of symbols to track
            resolution: Data resolution
        """
        super().__init__(f"market:{exchange}")
        self.exchange = exchange
        self.symbols = symbols
        self.resolution = resolution
        self.running = False
        self.task = None
        self.timeseries_db = None
    
    async def start(self) -> None:
        """Start data source processing."""
        if self.running:
            return
            
        self.running = True
        self.timeseries_db = await get_timeseries_db()
        self.task = asyncio.create_task(self._process_data())
        logger.info(f"Started market data source for {self.exchange}")
    
    async def stop(self) -> None:
        """Stop data source processing."""
        if not self.running:
            return
            
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            self.task = None
        
        logger.info(f"Stopped market data source for {self.exchange}")
    
    async def _process_data(self) -> None:
        """Process market data in background."""
        last_processed = {}
        
        for symbol in self.symbols:
            last_processed[symbol] = datetime.datetime.now() - datetime.timedelta(minutes=5)
        
        while self.running:
            try:
                for symbol in self.symbols:
                    # Get data since last processed
                    start_time = last_processed[symbol]
                    end_time = datetime.datetime.now()
                    
                    # Query time-series database
                    data = await self.timeseries_db.query_market_data(
                        exchange=self.exchange,
                        symbol=symbol,
                        resolution=self.resolution,
                        start_time=start_time,
                        end_time=end_time
                    )
                    
                    if data is not None and not data.empty:
                        # Process each new data point
                        for _, row in data.iterrows():
                            timestamp = pd.to_datetime(row.name)
                            event = DataEvent(
                                event_type=DataEventType.MARKET_DATA.value,
                                timestamp=timestamp,
                                data={
                                    "exchange": self.exchange,
                                    "symbol": symbol,
                                    "resolution": self.resolution,
                                    "open": row.get("open"),
                                    "high": row.get("high"),
                                    "low": row.get("low"),
                                    "close": row.get("close"),
                                    "volume": row.get("volume"),
                                }
                            )
                            await self.emit(event)
                        
                        # Update last processed time
                        last_processed[symbol] = data.index[-1]
                
                # Sleep before next check
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in market data source: {str(e)}")
                await asyncio.sleep(30)  # Longer sleep on error


class DataProcessor:
    """Base class for data processors in the analytics pipeline."""
    
    def __init__(self, name: str):
        """
        Initialize data processor.
        
        Args:
            name: Processor name
        """
        self.name = name
        self.output = DataSource(f"processor:{name}")
    
    async def process(self, event: DataEvent) -> Optional[DataEvent]:
        """
        Process data event.
        
        Args:
            event: Input event
            
        Returns:
            Processed event or None
        """
        # Base implementation passes through
        return event
    
    async def handle_event(self, event: DataEvent) -> None:
        """
        Handle incoming event.
        
        Args:
            event: Data event
        """
        result = await self.process(event)
        if result:
            await self.output.emit(result)


class MovingAverageProcessor(DataProcessor):
    """Processor that calculates moving averages on market data."""
    
    def __init__(
        self,
        window_sizes: List[int] = None,
        field: str = "close"
    ):
        """
        Initialize moving average processor.
        
        Args:
            window_sizes: List of window sizes
            field: Field to calculate MA on
        """
        super().__init__("moving_average")
        self.window_sizes = window_sizes or [20, 50, 200]
        self.field = field
        self.data_buffers: Dict[str, Dict[str, List[float]]] = {}
    
    def _get_buffer_key(self, event: DataEvent) -> str:
        """Get buffer key for event."""
        data = event.data
        return f"{data['exchange']}:{data['symbol']}:{data['resolution']}"
    
    def _ensure_buffer(self, key: str) -> None:
        """Ensure buffer exists for key."""
        if key not in self.data_buffers:
            self.data_buffers[key] = {
                "values": [],
                "timestamps": []
            }
    
    async def process(self, event: DataEvent) -> Optional[DataEvent]:
        """
        Process market data event.
        
        Args:
            event: Input event
            
        Returns:
            Processed event with moving averages
        """
        if event.event_type != DataEventType.MARKET_DATA.value:
            return None
            
        data = event.data
        if self.field not in data:
            return None
            
        # Get buffer for this symbol
        key = self._get_buffer_key(event)
        self._ensure_buffer(key)
        buffer = self.data_buffers[key]
        
        # Add new value to buffer
        value = data[self.field]
        buffer["values"].append(value)
        buffer["timestamps"].append(event.timestamp)
        
        # Calculate moving averages
        mas = {}
        values = buffer["values"]
        
        for window in self.window_sizes:
            if len(values) >= window:
                ma = sum(values[-window:]) / window
                mas[f"ma_{window}"] = ma
        
        # Trim buffer if needed (keep 2x max window)
        max_size = max(self.window_sizes) * 2
        if len(values) > max_size:
            buffer["values"] = values[-max_size:]
            buffer["timestamps"] = buffer["timestamps"][-max_size:]
        
        # Create output event with MAs
        result = DataEvent(
            event_type="analytics",
            timestamp=event.timestamp,
            data={
                "exchange": data["exchange"],
                "symbol": data["symbol"],
                "resolution": data["resolution"],
                "price": value,
                "moving_averages": mas
            },
            metadata={
                "processor": self.name,
                "original_event_id": event.id
            }
        )
        
        return result


class RSIProcessor(DataProcessor):
    """Processor that calculates Relative Strength Index (RSI)."""
    
    def __init__(
        self,
        window_size: int = 14,
        field: str = "close"
    ):
        """
        Initialize RSI processor.
        
        Args:
            window_size: RSI period
            field: Field to calculate RSI on
        """
        super().__init__("rsi")
        self.window_size = window_size
        self.field = field
        self.data_buffers: Dict[str, Dict[str, Any]] = {}
    
    def _get_buffer_key(self, event: DataEvent) -> str:
        """Get buffer key for event."""
        data = event.data
        return f"{data['exchange']}:{data['symbol']}:{data['resolution']}"
    
    def _ensure_buffer(self, key: str) -> None:
        """Ensure buffer exists for key."""
        if key not in self.data_buffers:
            self.data_buffers[key] = {
                "values": [],
                "timestamps": [],
                "gains": [],
                "losses": [],
                "avg_gain": None,
                "avg_loss": None
            }
    
    def _calculate_rsi(self, buffer: Dict[str, Any]) -> Optional[float]:
        """Calculate RSI from buffer."""
        values = buffer["values"]
        
        if len(values) < self.window_size + 1:
            return None
            
        # If first time calculating
        if buffer["avg_gain"] is None:
            # Initialize gains and losses
            gains = []
            losses = []
            
            for i in range(1, self.window_size + 1):
                change = values[i] - values[i-1]
                gains.append(max(0, change))
                losses.append(max(0, -change))
            
            avg_gain = sum(gains) / self.window_size
            avg_loss = sum(losses) / self.window_size
            
            buffer["avg_gain"] = avg_gain
            buffer["avg_loss"] = avg_loss
        else:
            # Use smoothed method
            current = values[-1]
            prev = values[-2]
            change = current - prev
            
            gain = max(0, change)
            loss = max(0, -change)
            
            # Update averages
            buffer["avg_gain"] = (buffer["avg_gain"] * 13 + gain) / 14
            buffer["avg_loss"] = (buffer["avg_loss"] * 13 + loss) / 14
        
        # Calculate RSI
        if buffer["avg_loss"] == 0:
            return 100.0
        
        rs = buffer["avg_gain"] / buffer["avg_loss"]
        rsi = 100.0 - (100.0 / (1.0 + rs))
        
        return rsi
    
    async def process(self, event: DataEvent) -> Optional[DataEvent]:
        """
        Process market data event.
        
        Args:
            event: Input event
            
        Returns:
            Processed event with RSI
        """
        if event.event_type != DataEventType.MARKET_DATA.value:
            return None
            
        data = event.data
        if self.field not in data:
            return None
            
        # Get buffer for this symbol
        key = self._get_buffer_key(event)
        self._ensure_buffer(key)
        buffer = self.data_buffers[key]
        
        # Add new value to buffer
        value = data[self.field]
        buffer["values"].append(value)
        buffer["timestamps"].append(event.timestamp)
        
        # Calculate RSI
        rsi = self._calculate_rsi(buffer)
        
        # Trim buffer if needed (keep 2x window)
        max_size = self.window_size * 3
        if len(buffer["values"]) > max_size:
            buffer["values"] = buffer["values"][-max_size:]
            buffer["timestamps"] = buffer["timestamps"][-max_size:]
        
        if rsi is not None:
            # Create output event with RSI
            result = DataEvent(
                event_type="analytics",
                timestamp=event.timestamp,
                data={
                    "exchange": data["exchange"],
                    "symbol": data["symbol"],
                    "resolution": data["resolution"],
                    "price": value,
                    "rsi": rsi
                },
                metadata={
                    "processor": self.name,
                    "original_event_id": event.id
                }
            )
            
            return result
        
        return None


class AnalyticsPipeline:
    """
    Real-time analytics processing pipeline.
    
    Manages data sources, processors, and sinks to create
    a complete data processing pipeline.
    """
    
    def __init__(self):
        """Initialize analytics pipeline."""
        self.sources: Dict[str, DataSource] = {}
        self.processors: Dict[str, DataProcessor] = {}
        self.running = False
        
        # Time-series database for storing results
        self.timeseries_db = None
        
        # Event bus for internal communication
        self.event_bus = DataSource("event_bus")
    
    async def initialize(self) -> None:
        """Initialize the pipeline."""
        if self.timeseries_db is None:
            self.timeseries_db = await get_timeseries_db()
    
    async def add_source(self, source: DataSource) -> None:
        """
        Add a data source to the pipeline.
        
        Args:
            source: Data source
        """
        if source.name in self.sources:
            return
            
        self.sources[source.name] = source
        await source.subscribe(self.handle_event)
        logger.info(f"Added source: {source.name}")
    
    async def add_processor(
        self,
        processor: DataProcessor,
        source_names: List[str] = None
    ) -> None:
        """
        Add a data processor to the pipeline.
        
        Args:
            processor: Data processor
            source_names: Sources to connect (None for all)
        """
        if processor.name in self.processors:
            return
            
        self.processors[processor.name] = processor
        
        # Connect processor to event bus
        await self.event_bus.subscribe(processor.handle_event)
        
        # Connect processor output to event bus
        await processor.output.subscribe(self.handle_event)
        
        logger.info(f"Added processor: {processor.name}")
    
    async def handle_event(self, event: DataEvent) -> None:
        """
        Handle data event.
        
        Args:
            event: Data event
        """
        # Forward to event bus
        await self.event_bus.emit(event)
        
        # Store analytics events
        if event.event_type == "analytics":
            await self._store_analytics(event)
    
    async def _store_analytics(self, event: DataEvent) -> None:
        """
        Store analytics event in time-series database.
        
        Args:
            event: Analytics event
        """
        if not self.timeseries_db:
            return
            
        data = event.data
        if "exchange" not in data or "symbol" not in data:
            return
            
        # Prepare data for storage
        measurement = f"analytics.{event.metadata.get('processor', 'unknown')}"
        tags = {
            "exchange": data["exchange"],
            "symbol": data["symbol"],
            "resolution": data.get("resolution", "unknown")
        }
        
        # Remove tag fields from data
        store_data = {k: v for k, v in data.items() if k not in tags}
        
        # Store in time-series DB
        await self.timeseries_db.write_market_data(
            exchange=tags["exchange"],
            symbol=f"{tags['symbol']}.{measurement}",
            resolution=tags["resolution"],
            data=store_data,
            timestamp=event.timestamp
        )
    
    async def start(self) -> None:
        """Start the pipeline."""
        if self.running:
            return
            
        await self.initialize()
        self.running = True
        
        # Start all sources
        for source in self.sources.values():
            if hasattr(source, "start"):
                await source.start()
        
        logger.info("Analytics pipeline started")
    
    async def stop(self) -> None:
        """Stop the pipeline."""
        if not self.running:
            return
            
        self.running = False
        
        # Stop all sources
        for source in self.sources.values():
            if hasattr(source, "stop"):
                await source.stop()
        
        logger.info("Analytics pipeline stopped")


# Singleton instance
_pipeline_instance = None


async def get_analytics_pipeline() -> AnalyticsPipeline:
    """
    Get the singleton analytics pipeline instance.
    
    Returns:
        AnalyticsPipeline instance
    """
    global _pipeline_instance
    
    if _pipeline_instance is None:
        _pipeline_instance = AnalyticsPipeline()
        await _pipeline_instance.initialize()
    
    return _pipeline_instance


# Helper functions to create standard pipelines
async def create_standard_pipeline(
    exchanges: List[str],
    symbols: List[str],
    resolutions: List[str] = None
) -> AnalyticsPipeline:
    """
    Create a standard analytics pipeline.
    
    Args:
        exchanges: List of exchanges
        symbols: List of symbols
        resolutions: List of resolutions
        
    Returns:
        Configured pipeline
    """
    pipeline = await get_analytics_pipeline()
    
    if resolutions is None:
        resolutions = ["1m", "5m", "1h"]
    
    # Add market data sources
    for exchange in exchanges:
        for resolution in resolutions:
            source = MarketDataSource(exchange, symbols, resolution)
            await pipeline.add_source(source)
    
    # Add standard processors
    ma_processor = MovingAverageProcessor([20, 50, 200])
    rsi_processor = RSIProcessor()
    
    await pipeline.add_processor(ma_processor)
    await pipeline.add_processor(rsi_processor)
    
    return pipeline
