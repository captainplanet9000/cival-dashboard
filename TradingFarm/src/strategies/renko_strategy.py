"""
Renko Strategy for Trading Farm.
This module implements a Renko trading strategy compatible with ElizaOS integration.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import numpy as np
from datetime import datetime
import math

from .base import BaseStrategy, Signal, SignalType
from .risk_management import RiskManager, RiskParameters

logger = logging.getLogger(__name__)

class RenkoBrick:
    """Represents a single Renko brick."""
    
    def __init__(self, 
                 open_price: float, 
                 close_price: float,
                 timestamp: pd.Timestamp,
                 is_up_brick: bool):
        self.open_price = open_price
        self.close_price = close_price
        self.timestamp = timestamp
        self.is_up_brick = is_up_brick
    
    def height(self) -> float:
        """Return the height of the brick."""
        return abs(self.close_price - self.open_price)
    
    def __str__(self) -> str:
        direction = "UP" if self.is_up_brick else "DOWN"
        return f"RenkoBrick({direction}, open={self.open_price:.2f}, close={self.close_price:.2f})"


class RenkoStrategy(BaseStrategy):
    """Renko strategy implementation."""
    
    def __init__(self, 
                 name: str, 
                 timeframes: List[str], 
                 symbols: List[str], 
                 params: Dict[str, Any] = None,
                 risk_params: Optional[RiskParameters] = None):
        """
        Initialize the Renko strategy.
        
        Args:
            name: Strategy name
            timeframes: List of timeframes to analyze
            symbols: List of symbols to trade
            params: Strategy parameters including:
                - brick_size_method: Method to determine brick size ('fixed', 'atr', 'percentage')
                - fixed_brick_size: Fixed brick size (when brick_size_method is 'fixed')
                - brick_size_atr_multiple: Multiplier for ATR (when brick_size_method is 'atr')
                - brick_size_percentage: Percentage for brick size (when brick_size_method is 'percentage')
                - atr_period: Period for ATR calculation
                - reversal_threshold: Number of bricks required for a trend reversal
                - lookback_period: Number of bricks to analyze for signals
            risk_params: Risk management parameters
        """
        super().__init__(name, timeframes, symbols)
        
        # Default parameters
        default_params = {
            "brick_size_method": "atr",  # 'fixed', 'atr', 'percentage'
            "fixed_brick_size": 1.0,  # Used when brick_size_method is 'fixed'
            "brick_size_atr_multiple": 1.0,  # Used when brick_size_method is 'atr'
            "brick_size_percentage": 0.01,  # Used when brick_size_method is 'percentage' (1%)
            "atr_period": 14,  # Period for ATR calculation
            "reversal_threshold": 2,  # Number of bricks required for a trend reversal
            "lookback_period": 10,  # Number of bricks to analyze for signals
            "max_history_bricks": 200,  # Maximum number of historical bricks to store
            "use_wicks": False,  # Whether to use high/low (wicks) or just close prices
            "renko_style": "classic"  # 'classic' or 'modern'
        }
        
        self.params = {**default_params, **(params or {})}
        
        # Initialize Renko bricks
        self.renko_data = {}  # {symbol: {timeframe: List[RenkoBrick]}}
        self.brick_sizes = {}  # {symbol: {timeframe: float}}
        
        # Initialize risk manager if provided
        self.risk_manager = RiskManager(risk_params) if risk_params else None
    
    def _initialize_renko_data(self, symbol: str, timeframe: str):
        """Initialize Renko data structure."""
        if symbol not in self.renko_data:
            self.renko_data[symbol] = {}
            self.brick_sizes[symbol] = {}
            
        if timeframe not in self.renko_data[symbol]:
            self.renko_data[symbol][timeframe] = []
            self.brick_sizes[symbol][timeframe] = None
    
    def _calculate_brick_size(self, df: pd.DataFrame, symbol: str, timeframe: str) -> float:
        """Calculate the brick size based on strategy parameters."""
        method = self.params["brick_size_method"]
        
        if method == "fixed":
            return self.params["fixed_brick_size"]
        
        elif method == "atr":
            # Calculate ATR
            atr = self.calculate_atr(df, period=self.params["atr_period"])
            if pd.isna(atr.iloc[-1]):
                # Default to a percentage of the last price if ATR is not available
                return df['close'].iloc[-1] * self.params["brick_size_percentage"]
            return atr.iloc[-1] * self.params["brick_size_atr_multiple"]
        
        elif method == "percentage":
            # Calculate brick size as a percentage of the last close price
            return df['close'].iloc[-1] * self.params["brick_size_percentage"]
        
        else:
            # Default to a fixed size
            return self.params["fixed_brick_size"]
    
    def _construct_renko_bricks(self, df: pd.DataFrame, symbol: str, timeframe: str):
        """Construct Renko bricks from OHLC data."""
        self._initialize_renko_data(symbol, timeframe)
        
        # If no data available, return
        if df.empty:
            return
        
        # Determine the brick size if not already set
        if self.brick_sizes[symbol][timeframe] is None:
            self.brick_sizes[symbol][timeframe] = self._calculate_brick_size(df, symbol, timeframe)
        
        brick_size = self.brick_sizes[symbol][timeframe]
        
        # If no bricks have been created yet, initialize with the first bar
        if not self.renko_data[symbol][timeframe]:
            first_brick_reference = df['close'].iloc[0]
            # Calculate how many bricks the first close would represent from zero
            # (this is just to have a reasonable starting point)
            bricks_from_zero = int(first_brick_reference / brick_size)
            
            # Create the first brick
            self.renko_data[symbol][timeframe].append(
                RenkoBrick(
                    open_price=bricks_from_zero * brick_size,
                    close_price=(bricks_from_zero + 1) * brick_size,
                    timestamp=df.index[0],
                    is_up_brick=True
                )
            )
        
        # Process each bar to generate Renko bricks
        for i in range(1, len(df)):
            current_price = df['close'].iloc[i]
            current_time = df.index[i]
            
            # Use high/low if enabled
            if self.params["use_wicks"]:
                high_price = df['high'].iloc[i]
                low_price = df['low'].iloc[i]
            else:
                high_price = current_price
                low_price = current_price
            
            # Get the last brick
            last_brick = self.renko_data[symbol][timeframe][-1]
            
            # Classic Renko style
            if self.params["renko_style"] == "classic":
                # Process price movement relative to the last brick's close
                self._process_classic_renko(
                    last_brick, current_price, high_price, low_price, 
                    current_time, brick_size, symbol, timeframe
                )
            
            # Modern Renko style (allows for gaps)
            else:
                # Process price movement - allows for gaps
                self._process_modern_renko(
                    last_brick, current_price, high_price, low_price, 
                    current_time, brick_size, symbol, timeframe
                )
        
        # Limit the number of bricks to prevent memory issues
        if len(self.renko_data[symbol][timeframe]) > self.params["max_history_bricks"]:
            excess = len(self.renko_data[symbol][timeframe]) - self.params["max_history_bricks"]
            self.renko_data[symbol][timeframe] = self.renko_data[symbol][timeframe][excess:]
    
    def _process_classic_renko(self, 
                             last_brick: RenkoBrick, 
                             current_price: float, 
                             high_price: float, 
                             low_price: float,
                             current_time: pd.Timestamp, 
                             brick_size: float, 
                             symbol: str, 
                             timeframe: str):
        """Process price data using classic Renko rules."""
        # Determine the direction of the last brick
        is_last_up = last_brick.is_up_brick
        
        # Calculate how many bricks to move up or down
        if is_last_up:
            # If the last brick was up, we need a full brick size down to reverse
            bricks_up = max(0, math.floor((high_price - last_brick.close_price) / brick_size))
            bricks_down = max(0, math.floor((last_brick.close_price - low_price) / brick_size + 1))
        else:
            # If the last brick was down, we need a full brick size up to reverse
            bricks_up = max(0, math.floor((high_price - last_brick.close_price) / brick_size + 1))
            bricks_down = max(0, math.floor((last_brick.close_price - low_price) / brick_size))
        
        # Create up bricks
        for i in range(bricks_up):
            new_open = last_brick.close_price if i == 0 else self.renko_data[symbol][timeframe][-1].close_price
            new_close = new_open + brick_size
            
            self.renko_data[symbol][timeframe].append(
                RenkoBrick(
                    open_price=new_open,
                    close_price=new_close,
                    timestamp=current_time,
                    is_up_brick=True
                )
            )
        
        # Create down bricks
        for i in range(bricks_down):
            new_open = last_brick.close_price if i == 0 else self.renko_data[symbol][timeframe][-1].close_price
            new_close = new_open - brick_size
            
            self.renko_data[symbol][timeframe].append(
                RenkoBrick(
                    open_price=new_open,
                    close_price=new_close,
                    timestamp=current_time,
                    is_up_brick=False
                )
            )
    
    def _process_modern_renko(self, 
                            last_brick: RenkoBrick, 
                            current_price: float, 
                            high_price: float, 
                            low_price: float,
                            current_time: pd.Timestamp, 
                            brick_size: float, 
                            symbol: str, 
                            timeframe: str):
        """Process price data using modern Renko rules (allows for gaps)."""
        # Handle gap up
        if current_price >= last_brick.close_price + brick_size:
            price_change = current_price - last_brick.close_price
            num_bricks = math.floor(price_change / brick_size)
            
            for i in range(num_bricks):
                open_price = last_brick.close_price + i * brick_size
                close_price = open_price + brick_size
                
                self.renko_data[symbol][timeframe].append(
                    RenkoBrick(
                        open_price=open_price,
                        close_price=close_price,
                        timestamp=current_time,
                        is_up_brick=True
                    )
                )
        
        # Handle gap down
        elif current_price <= last_brick.close_price - brick_size:
            price_change = last_brick.close_price - current_price
            num_bricks = math.floor(price_change / brick_size)
            
            for i in range(num_bricks):
                open_price = last_brick.close_price - i * brick_size
                close_price = open_price - brick_size
                
                self.renko_data[symbol][timeframe].append(
                    RenkoBrick(
                        open_price=open_price,
                        close_price=close_price,
                        timestamp=current_time,
                        is_up_brick=False
                    )
                )
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate technical indicators for Renko strategy."""
        df = self.data[symbol][timeframe]
        if df.empty:
            return
        
        # Build Renko bricks
        self._construct_renko_bricks(df, symbol, timeframe)
        
        # Calculate additional indicators on the original data for confirmation
        df['rsi'] = self.calculate_rsi(df, period=14)
        macd, signal, histogram = self.calculate_macd(df)
        df['macd'] = macd
        df['macd_signal'] = signal
        df['macd_histogram'] = histogram
    
    def _is_reversal(self, bricks: List[RenkoBrick], lookback: int = None) -> bool:
        """Check if recent bricks indicate a trend reversal."""
        if lookback is None:
            lookback = self.params["reversal_threshold"]
            
        if len(bricks) < lookback + 1:
            return False
            
        # Check the last brick against the previous ones
        last_brick = bricks[-1]
        prev_bricks = bricks[-(lookback+1):-1]
        
        # If all previous bricks were in the opposite direction of the last brick,
        # this might indicate a reversal
        all_opposite = all(brick.is_up_brick != last_brick.is_up_brick for brick in prev_bricks)
        
        return all_opposite
    
    def _get_trend_direction(self, bricks: List[RenkoBrick], lookback: int = None) -> str:
        """Determine the trend direction based on recent bricks."""
        if lookback is None:
            lookback = min(len(bricks), self.params["lookback_period"])
        else:
            lookback = min(len(bricks), lookback)
            
        if lookback == 0:
            return SignalType.NEUTRAL
            
        recent_bricks = bricks[-lookback:]
        
        # Count up and down bricks
        up_bricks = sum(1 for brick in recent_bricks if brick.is_up_brick)
        down_bricks = sum(1 for brick in recent_bricks if not brick.is_up_brick)
        
        # Determine the dominant direction
        if up_bricks > down_bricks * 1.5:  # Significantly more up bricks
            return SignalType.BUY
        elif down_bricks > up_bricks * 1.5:  # Significantly more down bricks
            return SignalType.SELL
        else:
            return SignalType.NEUTRAL
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Renko patterns."""
        signals = []
        
        if (symbol not in self.renko_data or 
            timeframe not in self.renko_data[symbol] or
            not self.renko_data[symbol][timeframe]):
            return signals
        
        df = self.data[symbol][timeframe]
        if df.empty:
            return signals
        
        current_price = df.iloc[-1]['close']
        current_timestamp = df.index[-1]
        
        # Get Renko bricks
        bricks = self.renko_data[symbol][timeframe]
        
        # We need a minimum number of bricks for analysis
        if len(bricks) < self.params["lookback_period"]:
            return signals
        
        # Look for trend reversals
        reversal_detected = self._is_reversal(bricks)
        trend_direction = self._get_trend_direction(bricks)
        
        last_brick = bricks[-1]
        
        signal_type = None
        confidence = 0.7  # Base confidence
        
        metadata = {
            "brick_size": self.brick_sizes[symbol][timeframe],
            "last_brick_direction": "up" if last_brick.is_up_brick else "down",
            "trend_direction": trend_direction,
            "reversal_detected": reversal_detected,
        }
        
        # Generate signals based on Renko patterns
        
        # Reversal signal
        if reversal_detected:
            # Upward reversal
            if last_brick.is_up_brick:
                signal_type = SignalType.BUY
                confidence = min(confidence + 0.1, 1.0)
                metadata["pattern"] = "upward_reversal"
                
                # Check for confirmation with RSI
                if 'rsi' in df.columns and not pd.isna(df['rsi'].iloc[-1]):
                    rsi_value = df['rsi'].iloc[-1]
                    if rsi_value < 30:  # Oversold condition
                        confidence = min(confidence + 0.1, 1.0)
                        metadata["rsi_confirmation"] = True
                
                # Check for confirmation with MACD
                if ('macd' in df.columns and 'macd_signal' in df.columns and 
                    not pd.isna(df['macd'].iloc[-1]) and not pd.isna(df['macd_signal'].iloc[-1])):
                    if df['macd'].iloc[-1] > df['macd_signal'].iloc[-1]:
                        confidence = min(confidence + 0.1, 1.0)
                        metadata["macd_confirmation"] = True
            
            # Downward reversal
            else:
                signal_type = SignalType.SELL
                confidence = min(confidence + 0.1, 1.0)
                metadata["pattern"] = "downward_reversal"
                
                # Check for confirmation with RSI
                if 'rsi' in df.columns and not pd.isna(df['rsi'].iloc[-1]):
                    rsi_value = df['rsi'].iloc[-1]
                    if rsi_value > 70:  # Overbought condition
                        confidence = min(confidence + 0.1, 1.0)
                        metadata["rsi_confirmation"] = True
                
                # Check for confirmation with MACD
                if ('macd' in df.columns and 'macd_signal' in df.columns and 
                    not pd.isna(df['macd'].iloc[-1]) and not pd.isna(df['macd_signal'].iloc[-1])):
                    if df['macd'].iloc[-1] < df['macd_signal'].iloc[-1]:
                        confidence = min(confidence + 0.1, 1.0)
                        metadata["macd_confirmation"] = True
        
        # Strong trend signal - multiple consecutive bricks in the same direction
        else:
            consecutive_count = 1
            for i in range(len(bricks) - 2, -1, -1):
                if bricks[i].is_up_brick == last_brick.is_up_brick:
                    consecutive_count += 1
                else:
                    break
            
            if consecutive_count >= 3:  # At least 3 consecutive bricks
                if last_brick.is_up_brick:
                    signal_type = SignalType.BUY
                    metadata["pattern"] = "strong_uptrend"
                else:
                    signal_type = SignalType.SELL
                    metadata["pattern"] = "strong_downtrend"
                
                metadata["consecutive_bricks"] = consecutive_count
                
                # Adjust confidence based on the number of consecutive bricks
                confidence = min(0.7 + (consecutive_count - 3) * 0.05, 0.9)
        
        if signal_type:
            signals.append(
                Signal(
                    symbol=symbol,
                    signal_type=signal_type,
                    price=current_price,
                    timestamp=int(current_timestamp.timestamp()),
                    confidence=confidence,
                    strategy_name=self.name,
                    timeframe=timeframe,
                    metadata=metadata
                )
            )
        
        return signals
