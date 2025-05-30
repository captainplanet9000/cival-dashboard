"""
Time-Series Database Module

Implements a high-performance time-series database for market data storage
and retrieval. Uses InfluxDB as the underlying storage engine with optimized
data structures for financial time-series.
"""

import os
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
import datetime
import pandas as pd
import numpy as np
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS, ASYNCHRONOUS
from influxdb_client.client.exceptions import InfluxDBError

from ..config import get_config


logger = logging.getLogger("data.timeseries")


class TimeSeriesDB:
    """
    Time-series database client for market data storage and retrieval.
    
    Provides a high-level interface for storing and querying market data,
    with optimizations for financial time-series.
    """
    
    def __init__(
        self,
        url: Optional[str] = None,
        token: Optional[str] = None,
        org: Optional[str] = None,
        bucket: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the time-series database client.
        
        Args:
            url: InfluxDB server URL
            token: API token for authentication
            org: Organization name
            bucket: Default bucket name
            config: Optional configuration dictionary
        """
        self.config = config or get_config().get("timeseries_db", {})
        
        # Get configuration from parameters or config
        self.url = url or self.config.get("url", "http://localhost:8086")
        self.token = token or self.config.get("token")
        self.org = org or self.config.get("org", "trading_farm")
        self.default_bucket = bucket or self.config.get("bucket", "market_data")
        
        # Default retention periods
        self.retention_policies = self.config.get("retention_policies", {
            "tick_data": "7d",  # 7 days for tick data
            "minute_data": "30d",  # 30 days for minute data
            "hour_data": "90d",  # 90 days for hourly data
            "day_data": "10y"  # 10 years for daily data
        })
        
        # Initialize client
        self.client = None
        self.write_api = None
        self.query_api = None
        self.bucket_api = None
        self.initialized = False
    
    async def initialize(self) -> bool:
        """
        Initialize the database connection and create necessary buckets.
        
        Returns:
            True if initialization was successful
        """
        try:
            # Create client
            self.client = InfluxDBClient(
                url=self.url,
                token=self.token,
                org=self.org
            )
            
            # Initialize APIs
            self.write_api = self.client.write_api(write_options=ASYNCHRONOUS)
            self.query_api = self.client.query_api()
            self.bucket_api = self.client.buckets_api()
            
            # Ensure buckets exist
            await self._ensure_buckets()
            
            self.initialized = True
            logger.info(f"Time-series database initialized at {self.url}")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing time-series database: {str(e)}")
            return False
    
    async def _ensure_buckets(self) -> None:
        """Ensure all necessary buckets exist with proper retention policies."""
        # Create default bucket if it doesn't exist
        if not self.bucket_api.find_bucket_by_name(self.default_bucket):
            logger.info(f"Creating default bucket: {self.default_bucket}")
            self.bucket_api.create_bucket(bucket_name=self.default_bucket, org=self.org)
        
        # Create specific buckets for different data resolutions
        for name, retention in self.retention_policies.items():
            bucket_name = f"{self.default_bucket}_{name}"
            if not self.bucket_api.find_bucket_by_name(bucket_name):
                logger.info(f"Creating bucket: {bucket_name} with retention {retention}")
                self.bucket_api.create_bucket(
                    bucket_name=bucket_name,
                    org=self.org,
                    retention_rules=[{"everySeconds": self._parse_retention(retention)}]
                )
    
    def _parse_retention(self, retention: str) -> int:
        """
        Parse retention period string to seconds.
        
        Args:
            retention: Retention period (e.g., "7d", "30d", "90d", "10y")
            
        Returns:
            Retention period in seconds
        """
        unit = retention[-1]
        value = int(retention[:-1])
        
        if unit == 'd':  # Days
            return value * 24 * 60 * 60
        elif unit == 'h':  # Hours
            return value * 60 * 60
        elif unit == 'm':  # Minutes
            return value * 60
        elif unit == 'w':  # Weeks
            return value * 7 * 24 * 60 * 60
        elif unit == 'y':  # Years
            return value * 365 * 24 * 60 * 60
        else:
            # Default to seconds
            return value
    
    def _get_bucket_for_resolution(self, resolution: str) -> str:
        """
        Get the appropriate bucket for a given data resolution.
        
        Args:
            resolution: Data resolution (tick, 1m, 5m, 15m, 1h, 4h, 1d, etc.)
            
        Returns:
            Bucket name
        """
        if resolution == "tick":
            return f"{self.default_bucket}_tick_data"
        elif resolution.endswith("m"):
            return f"{self.default_bucket}_minute_data"
        elif resolution.endswith("h"):
            return f"{self.default_bucket}_hour_data"
        elif resolution.endswith("d") or resolution.endswith("w"):
            return f"{self.default_bucket}_day_data"
        else:
            return self.default_bucket
    
    async def write_market_data(
        self,
        exchange: str,
        symbol: str,
        resolution: str,
        data: Union[Dict[str, Any], List[Dict[str, Any]]],
        timestamp_field: str = "timestamp"
    ) -> bool:
        """
        Write market data to the database.
        
        Args:
            exchange: Exchange name
            symbol: Trading pair symbol
            resolution: Data resolution (tick, 1m, 5m, 15m, 1h, 4h, 1d, etc.)
            data: Market data point or list of points
            timestamp_field: Field containing the timestamp
            
        Returns:
            True if data was written successfully
        """
        if not self.initialized:
            logger.error("Time-series database not initialized")
            return False
        
        try:
            bucket = self._get_bucket_for_resolution(resolution)
            
            # Convert to list if single data point
            if not isinstance(data, list):
                data = [data]
            
            # Create points
            points = []
            for item in data:
                # Get timestamp or use current time
                timestamp = item.get(timestamp_field, datetime.datetime.now())
                
                # Convert from milliseconds if needed
                if isinstance(timestamp, (int, float)) and timestamp > 1e10:
                    timestamp = datetime.datetime.fromtimestamp(timestamp / 1000.0)
                
                # Create point
                point = Point("market_data") \
                    .tag("exchange", exchange) \
                    .tag("symbol", symbol) \
                    .tag("resolution", resolution)
                
                # Add all fields except timestamp
                for field, value in item.items():
                    if field != timestamp_field:
                        if isinstance(value, (int, float)) and not pd.isna(value):
                            point = point.field(field, value)
                        elif isinstance(value, str):
                            point = point.field(field, value)
                
                # Set timestamp
                point = point.time(timestamp, WritePrecision.MS)
                points.append(point)
            
            # Write data
            self.write_api.write(bucket=bucket, org=self.org, record=points)
            return True
            
        except Exception as e:
            logger.error(f"Error writing market data: {str(e)}")
            return False
    
    async def query_market_data(
        self,
        exchange: str,
        symbol: str,
        resolution: str,
        start_time: Union[str, datetime.datetime],
        end_time: Optional[Union[str, datetime.datetime]] = None,
        fields: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Query market data from the database.
        
        Args:
            exchange: Exchange name
            symbol: Trading pair symbol
            resolution: Data resolution (tick, 1m, 5m, 15m, 1h, 4h, 1d, etc.)
            start_time: Start time for query
            end_time: Optional end time for query (defaults to now)
            fields: Optional list of fields to query (defaults to all)
            
        Returns:
            DataFrame with query results
        """
        if not self.initialized:
            logger.error("Time-series database not initialized")
            return pd.DataFrame()
        
        try:
            bucket = self._get_bucket_for_resolution(resolution)
            
            # Build field list
            field_str = "*" if not fields else ", ".join([f'r["{field}"]' for field in fields])
            
            # Build query
            query = f"""
            from(bucket: "{bucket}")
                |> range(start: {start_time}, stop: {end_time or "now()"})
                |> filter(fn: (r) => r._measurement == "market_data")
                |> filter(fn: (r) => r.exchange == "{exchange}")
                |> filter(fn: (r) => r.symbol == "{symbol}")
                |> filter(fn: (r) => r.resolution == "{resolution}")
                |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            """
            
            # Execute query
            result = self.query_api.query_data_frame(query, org=self.org)
            
            # Process result
            if isinstance(result, list):
                if not result:
                    return pd.DataFrame()
                df = pd.concat(result)
            else:
                df = result
            
            # Clean up DataFrame
            if not df.empty:
                # Drop unnecessary columns
                drop_cols = ['result', 'table', '_start', '_stop', '_measurement']
                df = df.drop([col for col in drop_cols if col in df.columns], axis=1)
                
                # Rename time column
                df = df.rename(columns={'_time': 'timestamp'})
                
                # Set timestamp as index
                df = df.set_index('timestamp')
            
            return df
            
        except Exception as e:
            logger.error(f"Error querying market data: {str(e)}")
            return pd.DataFrame()
    
    async def get_latest_price(
        self,
        exchange: str,
        symbol: str,
        resolution: str = "1m"
    ) -> Optional[float]:
        """
        Get the latest price for a symbol.
        
        Args:
            exchange: Exchange name
            symbol: Trading pair symbol
            resolution: Data resolution
            
        Returns:
            Latest price or None if not available
        """
        if not self.initialized:
            logger.error("Time-series database not initialized")
            return None
        
        try:
            bucket = self._get_bucket_for_resolution(resolution)
            
            # Build query for latest price
            query = f"""
            from(bucket: "{bucket}")
                |> range(start: -1h)
                |> filter(fn: (r) => r._measurement == "market_data")
                |> filter(fn: (r) => r.exchange == "{exchange}")
                |> filter(fn: (r) => r.symbol == "{symbol}")
                |> filter(fn: (r) => r.resolution == "{resolution}")
                |> filter(fn: (r) => r._field == "close" or r._field == "price")
                |> last()
            """
            
            # Execute query
            result = self.query_api.query_data_frame(query, org=self.org)
            
            # Process result
            if isinstance(result, list):
                if not result:
                    return None
                df = pd.concat(result)
            else:
                df = result
            
            if df.empty:
                return None
            
            return float(df['_value'].iloc[0])
            
        except Exception as e:
            logger.error(f"Error getting latest price: {str(e)}")
            return None
    
    async def get_ohlcv(
        self,
        exchange: str,
        symbol: str,
        resolution: str,
        start_time: Union[str, datetime.datetime],
        end_time: Optional[Union[str, datetime.datetime]] = None,
        limit: int = 1000
    ) -> pd.DataFrame:
        """
        Get OHLCV (Open, High, Low, Close, Volume) data.
        
        Args:
            exchange: Exchange name
            symbol: Trading pair symbol
            resolution: Data resolution
            start_time: Start time for query
            end_time: Optional end time for query
            limit: Maximum number of records to return
            
        Returns:
            DataFrame with OHLCV data
        """
        fields = ["open", "high", "low", "close", "volume"]
        
        df = await self.query_market_data(
            exchange=exchange,
            symbol=symbol,
            resolution=resolution,
            start_time=start_time,
            end_time=end_time,
            fields=fields
        )
        
        # Limit number of records
        if not df.empty and len(df) > limit:
            df = df.iloc[-limit:]
        
        return df
    
    async def delete_market_data(
        self,
        exchange: str,
        symbol: str,
        resolution: str,
        start_time: Union[str, datetime.datetime],
        end_time: Optional[Union[str, datetime.datetime]] = None
    ) -> bool:
        """
        Delete market data from the database.
        
        Args:
            exchange: Exchange name
            symbol: Trading pair symbol
            resolution: Data resolution
            start_time: Start time for query
            end_time: Optional end time for query
            
        Returns:
            True if data was deleted successfully
        """
        if not self.initialized:
            logger.error("Time-series database not initialized")
            return False
        
        try:
            bucket = self._get_bucket_for_resolution(resolution)
            
            # Build delete query
            delete_query = f"""
            from(bucket: "{bucket}")
                |> range(start: {start_time}, stop: {end_time or "now()"})
                |> filter(fn: (r) => r._measurement == "market_data")
                |> filter(fn: (r) => r.exchange == "{exchange}")
                |> filter(fn: (r) => r.symbol == "{symbol}")
                |> filter(fn: (r) => r.resolution == "{resolution}")
            """
            
            # Execute delete
            self.client.delete_api().delete(
                start=start_time,
                stop=end_time or datetime.datetime.now(),
                predicate=f'exchange="{exchange}" AND symbol="{symbol}" AND resolution="{resolution}"',
                bucket=bucket,
                org=self.org
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting market data: {str(e)}")
            return False
    
    async def get_symbols_with_data(
        self,
        exchange: Optional[str] = None,
        resolution: Optional[str] = None
    ) -> List[str]:
        """
        Get a list of symbols that have data in the database.
        
        Args:
            exchange: Optional exchange filter
            resolution: Optional resolution filter
            
        Returns:
            List of symbols
        """
        if not self.initialized:
            logger.error("Time-series database not initialized")
            return []
        
        try:
            # Determine which bucket to query
            bucket = self.default_bucket
            if resolution:
                bucket = self._get_bucket_for_resolution(resolution)
            
            # Build filter conditions
            filters = [
                'r._measurement == "market_data"'
            ]
            
            if exchange:
                filters.append(f'r.exchange == "{exchange}"')
            
            if resolution:
                filters.append(f'r.resolution == "{resolution}"')
            
            filter_condition = " and ".join([f"({f})" for f in filters])
            
            # Build query
            query = f"""
            import "influxdata/influxdb/schema"
            
            schema.tagValues(
                bucket: "{bucket}",
                tag: "symbol",
                predicate: (r) => {filter_condition}
            )
            """
            
            # Execute query
            result = self.query_api.query(query, org=self.org)
            
            # Extract symbols
            symbols = []
            for table in result:
                for record in table.records:
                    symbols.append(record.get_value())
            
            return sorted(symbols)
            
        except Exception as e:
            logger.error(f"Error getting symbols with data: {str(e)}")
            return []
    
    async def close(self) -> None:
        """Close the database connection."""
        if self.client:
            self.client.close()
            self.initialized = False
            logger.info("Time-series database connection closed")


# Singleton instance
_timeseries_db_instance = None


async def get_timeseries_db() -> TimeSeriesDB:
    """
    Get the singleton time-series database instance.
    
    Returns:
        TimeSeriesDB instance
    """
    global _timeseries_db_instance
    
    if _timeseries_db_instance is None:
        _timeseries_db_instance = TimeSeriesDB()
        await _timeseries_db_instance.initialize()
    
    return _timeseries_db_instance
