"""
Ichimoku Cloud Strategy for Trading Farm.
This module implements an Ichimoku Cloud trading strategy compatible with ElizaOS integration.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from .base import BaseStrategy, Signal, SignalType
from .risk_management import RiskManager, RiskParameters

logger = logging.getLogger(__name__)

class IchimokuCloudStrategy(BaseStrategy):
    """Ichimoku Cloud strategy implementation."""
    
    def __init__(self, 
                 name: str, 
                 timeframes: List[str], 
                 symbols: List[str], 
                 params: Dict[str, Any] = None,
                 risk_params: Optional[RiskParameters] = None):
        """
        Initialize the Ichimoku Cloud strategy.
        
        Args:
            name: Strategy name
            timeframes: List of timeframes to analyze
            symbols: List of symbols to trade
            params: Strategy parameters including:
                - tenkan_period: Period for Tenkan-sen (Conversion Line)
                - kijun_period: Period for Kijun-sen (Base Line)
                - senkou_span_b_period: Period for Senkou Span B
                - displacement: Displacement period for Senkou Span projections
                - chikou_lookback: Lookback period for Chikou Span analysis
                - use_custom_params: Whether to use custom parameters
                - filter_flat_kumo: Whether to filter signals during flat Kumo
                - require_trend_confirmation: Whether to require trend confirmation
            risk_params: Risk management parameters
        """
        super().__init__(name, timeframes, symbols)
        
        # Default parameters (standard Ichimoku values are 9, 26, 52, 26)
        default_params = {
            "tenkan_period": 9,
            "kijun_period": 26,
            "senkou_span_b_period": 52,
            "displacement": 26,
            "chikou_lookback": 10,
            "use_custom_params": False,
            "filter_flat_kumo": True,
            "require_trend_confirmation": True,
            "include_chikou_signals": True,
            "minimum_kumo_strength": 0.003,  # Minimum cloud thickness as % of price
            "minimize_whipsaws": True,
            "signal_smoothing": True
        }
        
        self.params = {**default_params, **(params or {})}
        
        # Initialize risk manager if provided
        self.risk_manager = RiskManager(risk_params) if risk_params else None
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate Ichimoku Cloud indicators."""
        df = self.data[symbol][timeframe]
        if df.empty or len(df) < max(self.params["tenkan_period"], self.params["kijun_period"], 
                                    self.params["senkou_span_b_period"], self.params["displacement"]) + 10:
            return
        
        # Tenkan-sen (Conversion Line): (highest high + lowest low) / 2 for the past 9 periods
        tenkan_high = df['high'].rolling(window=self.params["tenkan_period"]).max()
        tenkan_low = df['low'].rolling(window=self.params["tenkan_period"]).min()
        df['tenkan_sen'] = (tenkan_high + tenkan_low) / 2
        
        # Kijun-sen (Base Line): (highest high + lowest low) / 2 for the past 26 periods
        kijun_high = df['high'].rolling(window=self.params["kijun_period"]).max()
        kijun_low = df['low'].rolling(window=self.params["kijun_period"]).min()
        df['kijun_sen'] = (kijun_high + kijun_low) / 2
        
        # Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
        df['senkou_span_a'] = ((df['tenkan_sen'] + df['kijun_sen']) / 2).shift(self.params["displacement"])
        
        # Senkou Span B (Leading Span B): (highest high + lowest low) / 2 for the past 52 periods, plotted 26 periods ahead
        senkou_b_high = df['high'].rolling(window=self.params["senkou_span_b_period"]).max()
        senkou_b_low = df['low'].rolling(window=self.params["senkou_span_b_period"]).min()
        df['senkou_span_b'] = ((senkou_b_high + senkou_b_low) / 2).shift(self.params["displacement"])
        
        # Chikou Span (Lagging Span): Current closing price, plotted 26 periods behind
        df['chikou_span'] = df['close'].shift(-self.params["displacement"])
        
        # Calculate Kumo (Cloud) thickness and direction
        df['kumo_thickness'] = abs(df['senkou_span_a'] - df['senkou_span_b'])
        df['kumo_thickness_pct'] = df['kumo_thickness'] / df['close']
        df['kumo_direction'] = np.where(df['senkou_span_a'] > df['senkou_span_b'], 1, 
                                      np.where(df['senkou_span_a'] < df['senkou_span_b'], -1, 0))
        
        # Calculate additional indicators for confirmation
        df['price_above_kumo'] = np.where(df['close'] > df['senkou_span_a'], 1, 
                                        np.where(df['close'] > df['senkou_span_b'], 0.5, 0))
        
        df['tk_cross'] = np.where(
            (df['tenkan_sen'] > df['kijun_sen']) & (df['tenkan_sen'].shift(1) <= df['kijun_sen'].shift(1)), 1, 
            np.where((df['tenkan_sen'] < df['kijun_sen']) & (df['tenkan_sen'].shift(1) >= df['kijun_sen'].shift(1)), -1, 0)
        )
        
        # Calculate a combined signal strength indicator
        self._calculate_signal_strength(df)
    
    def _calculate_signal_strength(self, df: pd.DataFrame):
        """Calculate a combined signal strength indicator based on Ichimoku components."""
        # Initialize signal strength series
        df['ichimoku_signal_strength'] = 0
        
        # Add strength based on price position relative to cloud
        df['ichimoku_signal_strength'] += np.where(df['close'] > df['senkou_span_a'], 1, 
                                                 np.where(df['close'] < df['senkou_span_b'], -1, 0))
        
        # Add strength based on Tenkan-Kijun cross
        df['ichimoku_signal_strength'] += df['tk_cross']
        
        # Add strength based on Kumo direction
        df['ichimoku_signal_strength'] += df['kumo_direction'] * 0.5
        
        # Add strength based on Chikou Span position
        if len(df) > self.params["displacement"]:
            # Only calculate this if we have enough data
            for i in range(self.params["displacement"], len(df)):
                if i - self.params["displacement"] >= 0:
                    # Chikou is above price from 26 periods ago (bullish)
                    if df.iloc[i]['chikou_span'] > df.iloc[i - self.params["displacement"]]['close']:
                        df.loc[df.index[i], 'ichimoku_signal_strength'] += 1
                    # Chikou is below price from 26 periods ago (bearish)
                    elif df.iloc[i]['chikou_span'] < df.iloc[i - self.params["displacement"]]['close']:
                        df.loc[df.index[i], 'ichimoku_signal_strength'] -= 1
        
        # Normalize the signal strength to a range of -3 to 3
        df['ichimoku_signal_strength'] = df['ichimoku_signal_strength'].clip(-3, 3)
    
    def _is_flat_kumo(self, df: pd.DataFrame, idx: int) -> bool:
        """Check if the Kumo (cloud) is flat, indicating low trend strength."""
        if idx < 5 or idx >= len(df):
            return False
        
        # Calculate the rate of change of the cloud thickness
        thickness_now = df.iloc[idx]['kumo_thickness']
        thickness_before = df.iloc[idx-5]['kumo_thickness']
        
        # Calculate the slope of Senkou spans
        senkou_a_slope = abs(df.iloc[idx]['senkou_span_a'] - df.iloc[idx-5]['senkou_span_a']) / 5
        senkou_b_slope = abs(df.iloc[idx]['senkou_span_b'] - df.iloc[idx-5]['senkou_span_b']) / 5
        
        # Check if the cloud is thin and flat
        is_thin = df.iloc[idx]['kumo_thickness_pct'] < self.params["minimum_kumo_strength"]
        is_flat = (abs(thickness_now - thickness_before) / thickness_now < 0.1 if thickness_now > 0 else False)
        is_slow_moving = senkou_a_slope < 0.001 * df.iloc[idx]['close'] and senkou_b_slope < 0.001 * df.iloc[idx]['close']
        
        return is_thin or (is_flat and is_slow_moving)
    
    def _is_trending_strongly(self, df: pd.DataFrame, idx: int, direction: str) -> bool:
        """Check if the market is trending strongly in the specified direction."""
        if idx < 10 or idx >= len(df):
            return False
        
        # For bullish trend
        if direction == "bullish":
            # Price above cloud
            above_cloud = df.iloc[idx]['close'] > max(df.iloc[idx]['senkou_span_a'], df.iloc[idx]['senkou_span_b'])
            
            # Tenkan above Kijun
            tenkan_above_kijun = df.iloc[idx]['tenkan_sen'] > df.iloc[idx]['kijun_sen']
            
            # Chikou above price from 26 periods ago
            chikou_above_price = False
            if idx - self.params["displacement"] >= 0:
                chikou_above_price = df.iloc[idx]['chikou_span'] > df.iloc[idx - self.params["displacement"]]['close']
            
            # Cloud is green (Senkou A above Senkou B)
            green_cloud = df.iloc[idx]['senkou_span_a'] > df.iloc[idx]['senkou_span_b']
            
            # Check if the majority of conditions are met
            conditions_met = sum([above_cloud, tenkan_above_kijun, chikou_above_price, green_cloud])
            return conditions_met >= 3
        
        # For bearish trend
        elif direction == "bearish":
            # Price below cloud
            below_cloud = df.iloc[idx]['close'] < min(df.iloc[idx]['senkou_span_a'], df.iloc[idx]['senkou_span_b'])
            
            # Tenkan below Kijun
            tenkan_below_kijun = df.iloc[idx]['tenkan_sen'] < df.iloc[idx]['kijun_sen']
            
            # Chikou below price from 26 periods ago
            chikou_below_price = False
            if idx - self.params["displacement"] >= 0:
                chikou_below_price = df.iloc[idx]['chikou_span'] < df.iloc[idx - self.params["displacement"]]['close']
            
            # Cloud is red (Senkou A below Senkou B)
            red_cloud = df.iloc[idx]['senkou_span_a'] < df.iloc[idx]['senkou_span_b']
            
            # Check if the majority of conditions are met
            conditions_met = sum([below_cloud, tenkan_below_kijun, chikou_below_price, red_cloud])
            return conditions_met >= 3
        
        return False
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Ichimoku Cloud patterns."""
        signals = []
        
        df = self.data[symbol][timeframe]
        if df.empty or 'tenkan_sen' not in df.columns:
            return signals
        
        last_idx = len(df) - 1
        current_price = df.iloc[last_idx]['close']
        current_timestamp = df.index[last_idx]
        
        # Skip if we don't have enough data
        if last_idx < self.params["displacement"] + 5:
            return signals
        
        signal_type = None
        confidence = 0.7  # Base confidence
        
        metadata = {
            "tenkan_sen": float(df.iloc[last_idx]['tenkan_sen']),
            "kijun_sen": float(df.iloc[last_idx]['kijun_sen']),
            "senkou_span_a": float(df.iloc[last_idx]['senkou_span_a']),
            "senkou_span_b": float(df.iloc[last_idx]['senkou_span_b']),
            "chikou_span": float(df.iloc[last_idx - self.params["displacement"]]['chikou_span']) 
                           if last_idx - self.params["displacement"] >= 0 else None,
            "kumo_thickness": float(df.iloc[last_idx]['kumo_thickness']),
            "kumo_direction": int(df.iloc[last_idx]['kumo_direction'])
        }
        
        # Skip signals during flat Kumo if configured
        if self.params["filter_flat_kumo"] and self._is_flat_kumo(df, last_idx):
            metadata["signal_filtered"] = "flat_kumo"
            return signals
        
        # Get current state of the indicator
        tk_cross = df.iloc[last_idx]['tk_cross']
        price_above_kumo = df.iloc[last_idx]['price_above_kumo']
        signal_strength = df.iloc[last_idx]['ichimoku_signal_strength']
        
        # Check for trend confirmation if required
        if self.params["require_trend_confirmation"]:
            is_bullish_trend = self._is_trending_strongly(df, last_idx, "bullish")
            is_bearish_trend = self._is_trending_strongly(df, last_idx, "bearish")
            metadata["bullish_trend"] = is_bullish_trend
            metadata["bearish_trend"] = is_bearish_trend
        else:
            is_bullish_trend = is_bearish_trend = True  # Skip trend confirmation check
        
        # Tenkan-Kijun Cross (TK Cross)
        if tk_cross != 0:
            # Bullish TK Cross
            if tk_cross > 0 and is_bullish_trend:
                signal_type = SignalType.BUY
                confidence = 0.7
                metadata["pattern"] = "bullish_tk_cross"
                
                # Increase confidence if price is above the cloud
                if price_above_kumo > 0:
                    confidence = min(0.7 + 0.1 * price_above_kumo, 0.9)
            
            # Bearish TK Cross
            elif tk_cross < 0 and is_bearish_trend:
                signal_type = SignalType.SELL
                confidence = 0.7
                metadata["pattern"] = "bearish_tk_cross"
                
                # Increase confidence if price is below the cloud
                if price_above_kumo == 0:
                    confidence = 0.9
        
        # Kumo Breakout Signals (price crossing through the cloud)
        if signal_type is None:
            # Check for recent cloud breakout
            prev_above_cloud = df.iloc[last_idx-1]['price_above_kumo']
            
            # Bullish breakout (price moves above the cloud)
            if price_above_kumo == 1 and prev_above_cloud < 1 and is_bullish_trend:
                signal_type = SignalType.BUY
                confidence = 0.8  # Higher confidence for cloud breakout
                metadata["pattern"] = "bullish_kumo_breakout"
            
            # Bearish breakout (price moves below the cloud)
            elif price_above_kumo == 0 and prev_above_cloud > 0 and is_bearish_trend:
                signal_type = SignalType.SELL
                confidence = 0.8  # Higher confidence for cloud breakout
                metadata["pattern"] = "bearish_kumo_breakout"
        
        # Chikou Span Signals if enabled and no signal has been generated yet
        if signal_type is None and self.params["include_chikou_signals"] and last_idx - self.params["displacement"] >= 0:
            chikou_span = df.iloc[last_idx - self.params["displacement"]]['chikou_span']
            price_26_ago = df.iloc[last_idx - self.params["displacement"]]['close']
            
            # Look for Chikou crossing through historical price
            prev_chikou_span = df.iloc[last_idx - self.params["displacement"] - 1]['chikou_span']
            prev_price_26_ago = df.iloc[last_idx - self.params["displacement"] - 1]['close']
            
            # Bullish Chikou cross (Chikou crosses above historical price)
            if (chikou_span > price_26_ago and prev_chikou_span <= prev_price_26_ago and 
                is_bullish_trend and price_above_kumo > 0):
                signal_type = SignalType.BUY
                confidence = 0.75
                metadata["pattern"] = "bullish_chikou_cross"
            
            # Bearish Chikou cross (Chikou crosses below historical price)
            elif (chikou_span < price_26_ago and prev_chikou_span >= prev_price_26_ago and 
                  is_bearish_trend and price_above_kumo == 0):
                signal_type = SignalType.SELL
                confidence = 0.75
                metadata["pattern"] = "bearish_chikou_cross"
        
        # If still no signal but we have strong overall ichimoku signals
        if signal_type is None and abs(signal_strength) >= 2.5:
            if signal_strength > 2 and is_bullish_trend:
                signal_type = SignalType.BUY
                confidence = 0.7 + (signal_strength - 2) * 0.1
                metadata["pattern"] = "strong_bullish_alignment"
            elif signal_strength < -2 and is_bearish_trend:
                signal_type = SignalType.SELL
                confidence = 0.7 + (abs(signal_strength) - 2) * 0.1
                metadata["pattern"] = "strong_bearish_alignment"
        
        # Apply signal smoothing if enabled (avoid whipsaws by checking recent signals)
        if signal_type and self.params["signal_smoothing"]:
            # Check if we've given the opposite signal recently
            opposite_signal = False
            for i in range(max(0, last_idx - 3), last_idx):
                prev_tk_cross = df.iloc[i]['tk_cross']
                if (signal_type == SignalType.BUY and prev_tk_cross < 0) or (signal_type == SignalType.SELL and prev_tk_cross > 0):
                    opposite_signal = True
                    break
            
            if opposite_signal and self.params["minimize_whipsaws"]:
                if abs(signal_strength) < 2:  # Only filter weak signals
                    signal_type = None  # Cancel the signal to avoid whipsaw
                    metadata["signal_filtered"] = "whipsaw_prevention"
        
        # Generate signal if conditions are met
        if signal_type:
            # Add stop loss and take profit levels
            if signal_type == SignalType.BUY:
                # Use Kijun-sen as stop loss for bullish trades
                metadata["stop_loss"] = float(df.iloc[last_idx]['kijun_sen'])
                
                # Calculate take profit based on risk-reward ratio of 2:1
                risk = current_price - metadata["stop_loss"]
                metadata["take_profit"] = current_price + risk * 2
            else:  # SELL signal
                # Use Kijun-sen as stop loss for bearish trades
                metadata["stop_loss"] = float(df.iloc[last_idx]['kijun_sen'])
                
                # Calculate take profit based on risk-reward ratio of 2:1
                risk = metadata["stop_loss"] - current_price
                metadata["take_profit"] = current_price - risk * 2
            
            signals.append(
                Signal(
                    symbol=symbol,
                    signal_type=signal_type,
                    price=current_price,
                    timestamp=int(current_timestamp.timestamp()),
                    confidence=min(confidence, 1.0),
                    strategy_name=self.name,
                    timeframe=timeframe,
                    metadata=metadata
                )
            )
        
        return signals
