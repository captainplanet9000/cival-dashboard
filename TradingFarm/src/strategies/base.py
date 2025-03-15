from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from ..blockchain.base import OrderType, OrderSide

logger = logging.getLogger(__name__)

class SignalType:
    BUY = "BUY"
    SELL = "SELL"
    NEUTRAL = "NEUTRAL"

class Signal:
    def __init__(
        self,
        symbol: str,
        signal_type: str,
        price: float,
        timestamp: int,
        confidence: float,
        strategy_name: str,
        timeframe: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.symbol = symbol
        self.signal_type = signal_type
        self.price = price
        self.timestamp = timestamp
        self.confidence = confidence  # 0.0 to 1.0
        self.strategy_name = strategy_name
        self.timeframe = timeframe
        self.metadata = metadata or {}
        self.created_at = datetime.now().timestamp()
    
    def __str__(self):
        return (
            f"Signal({self.strategy_name}, {self.symbol}, {self.signal_type}, "
            f"price={self.price}, confidence={self.confidence:.2f}, timeframe={self.timeframe})"
        )

class BaseStrategy(ABC):
    """Base class for all trading strategies."""
    
    def __init__(self, name: str, timeframes: List[str], symbols: List[str]):
        self.name = name
        self.timeframes = timeframes
        self.symbols = symbols
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
        self.data: Dict[str, Dict[str, pd.DataFrame]] = {}  # {symbol: {timeframe: dataframe}}
    
    def _ensure_data_initialized(self, symbol: str, timeframe: str):
        """Ensure data structure is initialized for a symbol and timeframe."""
        if symbol not in self.data:
            self.data[symbol] = {}
        
        if timeframe not in self.data[symbol]:
            self.data[symbol][timeframe] = pd.DataFrame()
    
    def update_data(self, symbol: str, timeframe: str, candles: List[Dict[str, Any]]):
        """Update the strategy with new candle data."""
        self._ensure_data_initialized(symbol, timeframe)
        
        # Convert candles to DataFrame
        df = pd.DataFrame(candles)
        if df.empty:
            return
        
        # Set timestamp as index
        df.set_index('timestamp', inplace=True)
        df.sort_index(inplace=True)
        
        # Update or replace existing data
        if not self.data[symbol][timeframe].empty:
            # Merge new data with existing data
            combined = pd.concat([self.data[symbol][timeframe], df])
            combined = combined[~combined.index.duplicated(keep='last')]
            combined.sort_index(inplace=True)
            self.data[symbol][timeframe] = combined
        else:
            self.data[symbol][timeframe] = df
        
        # Process indicators for the updated data
        self._calculate_indicators(symbol, timeframe)
    
    @abstractmethod
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate technical indicators for a specific symbol and timeframe."""
        pass
    
    @abstractmethod
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals for a specific symbol and timeframe."""
        pass
    
    def get_signal_for_all_timeframes(self, symbol: str) -> List[Signal]:
        """Get signals for all timeframes for a symbol."""
        signals = []
        for timeframe in self.timeframes:
            if symbol in self.data and timeframe in self.data[symbol]:
                signals.extend(self.generate_signals(symbol, timeframe))
        return signals
    
    def get_signals_for_all_symbols(self, timeframe: str) -> List[Signal]:
        """Get signals for all symbols for a timeframe."""
        signals = []
        for symbol in self.symbols:
            if symbol in self.data and timeframe in self.data[symbol]:
                signals.extend(self.generate_signals(symbol, timeframe))
        return signals
    
    def get_all_signals(self) -> List[Signal]:
        """Get all signals for all symbols and all timeframes."""
        signals = []
        for symbol in self.symbols:
            for timeframe in self.timeframes:
                if symbol in self.data and timeframe in self.data[symbol]:
                    signals.extend(self.generate_signals(symbol, timeframe))
        return signals
    
    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Average True Range."""
        high = df['high']
        low = df['low']
        close = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)
        
        tr = pd.DataFrame({'tr1': tr1, 'tr2': tr2, 'tr3': tr3}).max(axis=1)
        atr = tr.rolling(window=period).mean()
        
        return atr
    
    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index."""
        delta = df['close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    @staticmethod
    def calculate_macd(df: pd.DataFrame, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate MACD, Signal and Histogram."""
        ema_fast = df['close'].ewm(span=fast_period, adjust=False).mean()
        ema_slow = df['close'].ewm(span=slow_period, adjust=False).mean()
        
        macd = ema_fast - ema_slow
        signal = macd.ewm(span=signal_period, adjust=False).mean()
        histogram = macd - signal
        
        return macd, signal, histogram
    
    @staticmethod
    def calculate_bollinger_bands(df: pd.DataFrame, period: int = 20, stdev_factor: float = 2.0) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate Bollinger Bands."""
        middle_band = df['close'].rolling(window=period).mean()
        std_dev = df['close'].rolling(window=period).std()
        
        upper_band = middle_band + (std_dev * stdev_factor)
        lower_band = middle_band - (std_dev * stdev_factor)
        
        return upper_band, middle_band, lower_band
    
    @staticmethod
    def calculate_fibonacci_levels(high: float, low: float) -> Dict[float, float]:
        """Calculate Fibonacci retracement levels."""
        diff = high - low
        
        levels = {
            0.0: high,
            0.236: high - (diff * 0.236),
            0.382: high - (diff * 0.382),
            0.5: high - (diff * 0.5),
            0.618: high - (diff * 0.618),
            0.786: high - (diff * 0.786),
            1.0: low,
            1.272: low - (diff * 0.272),
            1.618: low - (diff * 0.618)
        }
        
        return levels
