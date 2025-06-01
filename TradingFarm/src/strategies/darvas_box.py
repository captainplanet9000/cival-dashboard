import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional

from .base import BaseStrategy, Signal, SignalType
from ...config.config import DARVAS_BOX_LOOKBACK_PERIOD, DARVAS_BOX_ATR_PERIOD, DARVAS_BOX_ATR_MULTIPLIER

logger = logging.getLogger(__name__)

class DarvasBox:
    """Class representing a Darvas Box."""
    
    def __init__(self, top: float, bottom: float, start_index: int, breakout_index: Optional[int] = None):
        self.top = top
        self.bottom = bottom
        self.start_index = start_index
        self.breakout_index = breakout_index
        self.broken = False
        self.breakout_direction = None  # 'up' or 'down'
    
    def __str__(self):
        return f"DarvasBox(top={self.top:.2f}, bottom={self.bottom:.2f}, range={self.top-self.bottom:.2f})"

class DarvasBoxStrategy(BaseStrategy):
    """Implementation of Darvas Box Strategy."""
    
    def __init__(self, timeframes: List[str], symbols: List[str]):
        super().__init__("Darvas Box", timeframes, symbols)
        self.lookback_period = DARVAS_BOX_LOOKBACK_PERIOD
        self.atr_period = DARVAS_BOX_ATR_PERIOD
        self.atr_multiplier = DARVAS_BOX_ATR_MULTIPLIER
        self.boxes: Dict[str, Dict[str, List[DarvasBox]]] = {}
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate indicators for Darvas Box strategy."""
        df = self.data[symbol][timeframe]
        if len(df) < self.lookback_period + self.atr_period:
            return
        
        # Calculate ATR for dynamic box size adjustment
        df['atr'] = self.calculate_atr(df, self.atr_period)
        
        # Calculate pivot highs and lows
        df['rolling_high'] = df['high'].rolling(window=self.lookback_period, center=False).max()
        df['rolling_low'] = df['low'].rolling(window=self.lookback_period, center=False).min()
        
        # Identify potential Darvas boxes
        if symbol not in self.boxes:
            self.boxes[symbol] = {}
        
        self.boxes[symbol][timeframe] = self._identify_darvas_boxes(df)
    
    def _identify_darvas_boxes(self, df: pd.DataFrame) -> List[DarvasBox]:
        """Identify Darvas boxes in the price data."""
        boxes = []
        potential_box = None
        
        # Skip the initial rows where rolling calculations don't have full window
        start_idx = self.lookback_period + self.atr_period
        
        for i in range(start_idx, len(df)):
            current_high = df['high'].iloc[i]
            current_low = df['low'].iloc[i]
            current_atr = df['atr'].iloc[i]
            
            # Check if we have an active potential box
            if potential_box is None:
                # Check if current bar's high is a new high in the lookback period
                if current_high == df['rolling_high'].iloc[i] and current_high > df['high'].iloc[i-1]:
                    # New high - start of a potential box
                    box_top = current_high
                    # Box bottom is the lowest low in the lookback period
                    box_bottom = min(df['low'].iloc[i-self.lookback_period:i])
                    
                    # Ensure box height is at least 1x ATR
                    box_height = box_top - box_bottom
                    if box_height >= current_atr * self.atr_multiplier:
                        potential_box = DarvasBox(box_top, box_bottom, i)
            else:
                # We have a potential box, check if price breaks out
                if current_high > potential_box.top:
                    # Upside breakout - the box is confirmed
                    potential_box.broken = True
                    potential_box.breakout_direction = 'up'
                    potential_box.breakout_index = i
                    boxes.append(potential_box)
                    potential_box = None
                elif current_low < potential_box.bottom:
                    # Downside breakout - the box is confirmed but in the opposite direction
                    potential_box.broken = True
                    potential_box.breakout_direction = 'down'
                    potential_box.breakout_index = i
                    boxes.append(potential_box)
                    potential_box = None
                elif i - potential_box.start_index > 2 * self.lookback_period:
                    # Box has been in formation for too long without a breakout
                    # Consider it invalid and look for a new box
                    potential_box = None
        
        # If we have a potential box at the end, add it but mark as unbroken
        if potential_box is not None:
            boxes.append(potential_box)
        
        return boxes
    
    def _get_active_box(self, symbol: str, timeframe: str) -> Optional[DarvasBox]:
        """Get the most recent active (unbroken) Darvas box."""
        if symbol not in self.boxes or timeframe not in self.boxes[symbol]:
            return None
        
        boxes = self.boxes[symbol][timeframe]
        if not boxes:
            return None
        
        # Get the most recent box
        latest_box = boxes[-1]
        
        # Check if the latest box is still active (unbroken)
        if not latest_box.broken:
            return latest_box
        
        return None
    
    def _get_latest_broken_box(self, symbol: str, timeframe: str) -> Optional[DarvasBox]:
        """Get the most recently broken Darvas box."""
        if symbol not in self.boxes or timeframe not in self.boxes[symbol]:
            return None
        
        boxes = self.boxes[symbol][timeframe]
        if not boxes:
            return None
        
        # Look for the most recent broken box
        for box in reversed(boxes):
            if box.broken:
                return box
        
        return None
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Darvas Box analysis."""
        signals = []
        
        if symbol not in self.data or timeframe not in self.data[symbol]:
            return signals
        
        df = self.data[symbol][timeframe]
        if len(df) < self.lookback_period + self.atr_period:
            return signals
        
        # Get the latest candle
        latest_candle = df.iloc[-1]
        latest_close = latest_candle['close']
        latest_high = latest_candle['high']
        latest_low = latest_candle['low']
        latest_timestamp = latest_candle.name
        
        # Check for breakout of active box
        active_box = self._get_active_box(symbol, timeframe)
        if active_box:
            if latest_high > active_box.top:
                # Upside breakout - buy signal
                box_height = active_box.top - active_box.bottom
                target_price = active_box.top + box_height  # Target is box height above the top
                stop_loss = active_box.bottom  # Stop loss at the bottom of the box
                
                confidence = 0.7  # Base confidence for a box breakout
                
                # Higher confidence if volume is increasing
                if 'volume' in df.columns and len(df) > 5:
                    avg_volume = df['volume'].iloc[-6:-1].mean()
                    current_volume = df['volume'].iloc[-1]
                    if current_volume > avg_volume * 1.5:
                        confidence = min(confidence + 0.15, 1.0)
                
                metadata = {
                    'box_top': active_box.top,
                    'box_bottom': active_box.bottom,
                    'box_height': box_height,
                    'target_price': target_price,
                    'stop_loss': stop_loss,
                    'risk_reward_ratio': (target_price - latest_close) / (latest_close - stop_loss)
                }
                
                signals.append(Signal(
                    symbol=symbol,
                    signal_type=SignalType.BUY,
                    price=latest_close,
                    timestamp=latest_timestamp,
                    confidence=confidence,
                    strategy_name=self.name,
                    timeframe=timeframe,
                    metadata=metadata
                ))
            
            elif latest_low < active_box.bottom:
                # Downside breakout - sell signal
                box_height = active_box.top - active_box.bottom
                target_price = active_box.bottom - box_height  # Target is box height below the bottom
                stop_loss = active_box.top  # Stop loss at the top of the box
                
                confidence = 0.7  # Base confidence for a box breakout
                
                # Higher confidence if volume is increasing
                if 'volume' in df.columns and len(df) > 5:
                    avg_volume = df['volume'].iloc[-6:-1].mean()
                    current_volume = df['volume'].iloc[-1]
                    if current_volume > avg_volume * 1.5:
                        confidence = min(confidence + 0.15, 1.0)
                
                metadata = {
                    'box_top': active_box.top,
                    'box_bottom': active_box.bottom,
                    'box_height': box_height,
                    'target_price': target_price,
                    'stop_loss': stop_loss,
                    'risk_reward_ratio': (latest_close - target_price) / (stop_loss - latest_close)
                }
                
                signals.append(Signal(
                    symbol=symbol,
                    signal_type=SignalType.SELL,
                    price=latest_close,
                    timestamp=latest_timestamp,
                    confidence=confidence,
                    strategy_name=self.name,
                    timeframe=timeframe,
                    metadata=metadata
                ))
        
        # Check for potential entry after a recent breakout
        latest_broken_box = self._get_latest_broken_box(symbol, timeframe)
        if latest_broken_box and latest_broken_box.breakout_index is not None:
            # Only consider recent breakouts (within the last 10 candles)
            if len(df) - latest_broken_box.breakout_index <= 10:
                if latest_broken_box.breakout_direction == 'up':
                    # Check for pullback to the top of the box (now support)
                    if latest_low <= latest_broken_box.top and latest_close > latest_broken_box.top:
                        # Pullback and bounce - good entry point
                        box_height = latest_broken_box.top - latest_broken_box.bottom
                        target_price = latest_broken_box.top + box_height
                        stop_loss = min(latest_broken_box.bottom, latest_low - (latest_broken_box.top - latest_low))
                        
                        # Slightly lower confidence for pullback entries
                        confidence = 0.65
                        
                        metadata = {
                            'entry_type': 'pullback',
                            'box_top': latest_broken_box.top,
                            'box_bottom': latest_broken_box.bottom,
                            'target_price': target_price,
                            'stop_loss': stop_loss,
                            'risk_reward_ratio': (target_price - latest_close) / (latest_close - stop_loss)
                        }
                        
                        signals.append(Signal(
                            symbol=symbol,
                            signal_type=SignalType.BUY,
                            price=latest_close,
                            timestamp=latest_timestamp,
                            confidence=confidence,
                            strategy_name=self.name,
                            timeframe=timeframe,
                            metadata=metadata
                        ))
                
                elif latest_broken_box.breakout_direction == 'down':
                    # Check for pullback to the bottom of the box (now resistance)
                    if latest_high >= latest_broken_box.bottom and latest_close < latest_broken_box.bottom:
                        # Pullback and bounce - good entry point
                        box_height = latest_broken_box.top - latest_broken_box.bottom
                        target_price = latest_broken_box.bottom - box_height
                        stop_loss = max(latest_broken_box.top, latest_high + (latest_high - latest_broken_box.bottom))
                        
                        # Slightly lower confidence for pullback entries
                        confidence = 0.65
                        
                        metadata = {
                            'entry_type': 'pullback',
                            'box_top': latest_broken_box.top,
                            'box_bottom': latest_broken_box.bottom,
                            'target_price': target_price,
                            'stop_loss': stop_loss,
                            'risk_reward_ratio': (latest_close - target_price) / (stop_loss - latest_close)
                        }
                        
                        signals.append(Signal(
                            symbol=symbol,
                            signal_type=SignalType.SELL,
                            price=latest_close,
                            timestamp=latest_timestamp,
                            confidence=confidence,
                            strategy_name=self.name,
                            timeframe=timeframe,
                            metadata=metadata
                        ))
        
        return signals
