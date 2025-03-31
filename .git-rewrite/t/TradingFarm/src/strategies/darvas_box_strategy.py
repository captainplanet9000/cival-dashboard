"""
Darvas Box Strategy for Trading Farm.
This module implements a Darvas Box trading strategy compatible with ElizaOS integration.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from .base import BaseStrategy, Signal, SignalType
from .risk_management import RiskManager, RiskParameters

logger = logging.getLogger(__name__)

class DarvasBox:
    """Represents a Darvas Box."""
    
    def __init__(self, 
                 top: float, 
                 bottom: float, 
                 start_idx: int, 
                 start_time: pd.Timestamp,
                 formation_period: int = 3):
        self.top = top
        self.bottom = bottom
        self.start_idx = start_idx
        self.start_time = start_time
        self.formation_period = formation_period
        self.confirmed = False
        self.broken = False
        self.broken_upward = None  # True if broken upward, False if broken downward, None if not broken
        self.break_idx = None
        self.break_time = None
        self.break_price = None
        
    def height(self) -> float:
        """Return the height of the box."""
        return self.top - self.bottom
    
    def is_valid(self) -> bool:
        """Check if the box has a valid height."""
        return self.height() > 0
    
    def contains(self, price: float) -> bool:
        """Check if a price is within the box."""
        return self.bottom <= price <= self.top
    
    def confirm(self) -> None:
        """Mark the box as confirmed."""
        self.confirmed = True
    
    def break_box(self, idx: int, time: pd.Timestamp, price: float, upward: bool) -> None:
        """Mark the box as broken in a direction."""
        self.broken = True
        self.broken_upward = upward
        self.break_idx = idx
        self.break_time = time
        self.break_price = price
    
    def __str__(self) -> str:
        status = "confirmed" if self.confirmed else "forming"
        status = "broken" if self.broken else status
        direction = ""
        if self.broken and self.broken_upward is not None:
            direction = "upward" if self.broken_upward else "downward"
        
        return (
            f"DarvasBox(top={self.top:.2f}, bottom={self.bottom:.2f}, "
            f"height={self.height():.2f}, status={status} {direction})"
        )


class DarvasBoxStrategy(BaseStrategy):
    """Darvas Box strategy implementation."""
    
    def __init__(self, 
                 name: str, 
                 timeframes: List[str], 
                 symbols: List[str], 
                 params: Dict[str, Any] = None,
                 risk_params: Optional[RiskParameters] = None):
        """
        Initialize the Darvas Box strategy.
        
        Args:
            name: Strategy name
            timeframes: List of timeframes to analyze
            symbols: List of symbols to trade
            params: Strategy parameters including:
                - box_formation_period: Number of bars for box confirmation
                - dynamic_box_size: Whether to use dynamic box size based on ATR
                - atr_multiplier: Multiplier for ATR when using dynamic box sizing
                - min_box_height: Minimum box height as percentage
                - volume_confirmation: Whether to require volume confirmation for breakouts
                - volume_increase_threshold: Required volume increase for confirmation
            risk_params: Risk management parameters
        """
        super().__init__(name, timeframes, symbols)
        
        # Default parameters
        default_params = {
            "box_formation_period": 3,
            "dynamic_box_size": True,
            "atr_multiplier": 1.0,
            "min_box_height_pct": 0.01,  # 1% minimum box height
            "max_lookback_period": 20,
            "volume_confirmation": True,
            "volume_increase_threshold": 1.5,  # 50% volume increase
            "consolidation_threshold": 0.005,  # 0.5% price range for consolidation
            "use_ghost_boxes": True,  # Continue tracking broken boxes
            "breakout_confirmation_bars": 1  # Bars to confirm breakout
        }
        
        self.params = {**default_params, **(params or {})}
        
        # Initialize boxes
        self.boxes = {}  # {symbol: {timeframe: List[DarvasBox]}}
        
        # Initialize risk manager if provided
        self.risk_manager = RiskManager(risk_params) if risk_params else None
    
    def _initialize_boxes(self, symbol: str, timeframe: str):
        """Initialize boxes structure."""
        if symbol not in self.boxes:
            self.boxes[symbol] = {}
            
        if timeframe not in self.boxes[symbol]:
            self.boxes[symbol][timeframe] = []
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate technical indicators for Darvas Box detection."""
        self._initialize_boxes(symbol, timeframe)
        
        df = self.data[symbol][timeframe]
        if df.empty or len(df) < self.params["box_formation_period"] + 5:
            return
        
        # Calculate ATR for dynamic box sizing if enabled
        if self.params["dynamic_box_size"]:
            df['atr'] = self.calculate_atr(df, period=14)
        
        # Calculate rolling high and low for box formation
        df['rolling_high'] = df['high'].rolling(window=self.params["box_formation_period"]).max()
        df['rolling_low'] = df['low'].rolling(window=self.params["box_formation_period"]).min()
        
        # Calculate percentage change and volatility metrics
        df['pct_change'] = df['close'].pct_change()
        df['volatility'] = df['high'] / df['low'] - 1
        
        # Calculate volume relative to average if available
        if 'volume' in df.columns:
            df['volume_ratio'] = df['volume'] / df['volume'].rolling(window=20).mean()
        
        # Identify potential Darvas Boxes
        self._identify_darvas_boxes(df, symbol, timeframe)
        
        # Update existing boxes (check for breakouts or invalidation)
        self._update_darvas_boxes(df, symbol, timeframe)
    
    def _identify_darvas_boxes(self, df: pd.DataFrame, symbol: str, timeframe: str):
        """Identify potential Darvas Boxes in the price data."""
        # Need sufficient data
        if len(df) < self.params["box_formation_period"] + 5:
            return
        
        # Clear old boxes that have been broken or invalidated
        active_boxes = [box for box in self.boxes[symbol][timeframe] 
                       if not box.broken]
        self.boxes[symbol][timeframe] = active_boxes
        
        # Only look for a new box if we don't have an active one being tracked
        if len(active_boxes) > 0 and not self.params["use_ghost_boxes"]:
            return
        
        lookback_period = min(self.params["max_lookback_period"], len(df) - self.params["box_formation_period"])
        
        # Identify potential new high points that could form box tops
        for i in range(len(df) - self.params["box_formation_period"] - 1, len(df) - self.params["box_formation_period"] - 1 - lookback_period, -1):
            if i < 0:
                continue
            
            # Check if the current point is a local high
            current_point = df.iloc[i]
            future_points = df.iloc[i+1:i+1+self.params["box_formation_period"]]
            
            if len(future_points) < self.params["box_formation_period"]:
                continue
            
            is_local_high = current_point['high'] >= future_points['high'].max()
            
            # If it's a local high, check for consolidation below this level
            if is_local_high:
                box_top = current_point['high']
                
                # Find the lowest low in the formation period after the high
                box_bottom = future_points['low'].min()
                
                # Calculate box height
                box_height = box_top - box_bottom
                box_height_pct = box_height / box_top
                
                # Adjust box size based on ATR if dynamic sizing is enabled
                min_box_height = self.params["min_box_height_pct"] * current_point['close']
                if self.params["dynamic_box_size"] and 'atr' in df.columns:
                    atr_value = current_point['atr']
                    dynamic_min_height = atr_value * self.params["atr_multiplier"]
                    min_box_height = max(min_box_height, dynamic_min_height)
                
                # Check if the box has sufficient height
                if box_height_pct >= self.params["min_box_height_pct"] and box_height >= min_box_height:
                    # Create a new Darvas Box
                    new_box = DarvasBox(
                        top=box_top,
                        bottom=box_bottom,
                        start_idx=i,
                        start_time=df.index[i],
                        formation_period=self.params["box_formation_period"]
                    )
                    
                    # Confirm the box right away since we're looking at historical data
                    new_box.confirm()
                    
                    # Add the box to our tracking list
                    self.boxes[symbol][timeframe].append(new_box)
                    
                    logger.debug(f"New Darvas Box detected for {symbol} on {timeframe}: {new_box}")
                    
                    # If we're not using ghost boxes, only track one active box at a time
                    if not self.params["use_ghost_boxes"]:
                        break
    
    def _update_darvas_boxes(self, df: pd.DataFrame, symbol: str, timeframe: str):
        """Update the status of existing Darvas Boxes."""
        current_idx = len(df) - 1
        current_row = df.iloc[-1]
        
        for box in self.boxes[symbol][timeframe]:
            if box.broken:
                continue
            
            # Check for breakouts
            if current_row['close'] > box.top:
                # Potential upward breakout
                
                # Volume confirmation if required
                volume_confirmed = True
                if (self.params["volume_confirmation"] and 
                    'volume' in df.columns and 
                    'volume_ratio' in df.columns):
                    volume_confirmed = current_row['volume_ratio'] >= self.params["volume_increase_threshold"]
                
                # Check if we need more than one bar to confirm the breakout
                breakout_confirmed = True
                if self.params["breakout_confirmation_bars"] > 1:
                    # Check if price stayed above the box top for the required number of bars
                    confirmation_window = min(self.params["breakout_confirmation_bars"], current_idx - box.start_idx - box.formation_period)
                    if confirmation_window < self.params["breakout_confirmation_bars"]:
                        breakout_confirmed = False
                    else:
                        # Check the required number of past bars
                        for j in range(1, self.params["breakout_confirmation_bars"]):
                            if current_idx - j < 0:
                                breakout_confirmed = False
                                break
                            if df.iloc[current_idx - j]['close'] <= box.top:
                                breakout_confirmed = False
                                break
                
                if volume_confirmed and breakout_confirmed:
                    box.break_box(
                        idx=current_idx,
                        time=df.index[current_idx],
                        price=current_row['close'],
                        upward=True
                    )
                    logger.debug(f"Darvas Box upward breakout for {symbol} on {timeframe}: {box}")
            
            elif current_row['close'] < box.bottom:
                # Potential downward breakout
                
                # Volume confirmation if required
                volume_confirmed = True
                if (self.params["volume_confirmation"] and 
                    'volume' in df.columns and 
                    'volume_ratio' in df.columns):
                    volume_confirmed = current_row['volume_ratio'] >= self.params["volume_increase_threshold"]
                
                # Check if we need more than one bar to confirm the breakout
                breakout_confirmed = True
                if self.params["breakout_confirmation_bars"] > 1:
                    # Check if price stayed below the box bottom for the required number of bars
                    confirmation_window = min(self.params["breakout_confirmation_bars"], current_idx - box.start_idx - box.formation_period)
                    if confirmation_window < self.params["breakout_confirmation_bars"]:
                        breakout_confirmed = False
                    else:
                        # Check the required number of past bars
                        for j in range(1, self.params["breakout_confirmation_bars"]):
                            if current_idx - j < 0:
                                breakout_confirmed = False
                                break
                            if df.iloc[current_idx - j]['close'] >= box.bottom:
                                breakout_confirmed = False
                                break
                
                if volume_confirmed and breakout_confirmed:
                    box.break_box(
                        idx=current_idx,
                        time=df.index[current_idx],
                        price=current_row['close'],
                        upward=False
                    )
                    logger.debug(f"Darvas Box downward breakout for {symbol} on {timeframe}: {box}")
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Darvas Box patterns."""
        signals = []
        
        if symbol not in self.boxes or timeframe not in self.boxes[symbol]:
            return signals
        
        df = self.data[symbol][timeframe]
        if df.empty:
            return signals
        
        current_price = df.iloc[-1]['close']
        current_timestamp = df.index[-1]
        
        # Look for recent breakouts
        for box in self.boxes[symbol][timeframe]:
            # Only consider boxes that have just broken
            if not box.broken or box.broken_upward is None:
                continue
            
            # Only consider recent breakouts (within the last 3 bars)
            if box.break_idx < len(df) - 3:
                continue
            
            signal_type = None
            confidence = 0.7  # Base confidence
            
            metadata = {
                "box_top": box.top,
                "box_bottom": box.bottom,
                "box_height": box.height(),
                "box_start_time": box.start_time,
                "breakout_time": box.break_time,
                "breakout_price": box.break_price,
                "breakout_direction": "upward" if box.broken_upward else "downward"
            }
            
            # Upward breakout - Buy signal
            if box.broken_upward:
                signal_type = SignalType.BUY
                
                # Adjust confidence based on volume if available
                if 'volume' in df.columns and 'volume_ratio' in df.columns:
                    volume_ratio = df.iloc[box.break_idx]['volume_ratio']
                    if volume_ratio > 2.0:
                        confidence = 0.9
                    elif volume_ratio > 1.5:
                        confidence = 0.8
                
                # Additional confirmation from trend
                if 'ema50' in df.columns and 'ema200' in df.columns:
                    if (df.iloc[box.break_idx]['ema50'] > df.iloc[box.break_idx]['ema200'] and
                        current_price > df.iloc[box.break_idx]['ema50']):
                        confidence = min(confidence + 0.1, 1.0)
                
                # Target calculation (box projection)
                box_height = box.height()
                target_price = box.top + box_height
                metadata["target_price"] = target_price
                metadata["stop_loss"] = box.bottom
            
            # Downward breakout - Sell signal
            else:
                signal_type = SignalType.SELL
                
                # Adjust confidence based on volume if available
                if 'volume' in df.columns and 'volume_ratio' in df.columns:
                    volume_ratio = df.iloc[box.break_idx]['volume_ratio']
                    if volume_ratio > 2.0:
                        confidence = 0.9
                    elif volume_ratio > 1.5:
                        confidence = 0.8
                
                # Additional confirmation from trend
                if 'ema50' in df.columns and 'ema200' in df.columns:
                    if (df.iloc[box.break_idx]['ema50'] < df.iloc[box.break_idx]['ema200'] and
                        current_price < df.iloc[box.break_idx]['ema50']):
                        confidence = min(confidence + 0.1, 1.0)
                
                # Target calculation (box projection)
                box_height = box.height()
                target_price = box.bottom - box_height
                metadata["target_price"] = target_price
                metadata["stop_loss"] = box.top
            
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
