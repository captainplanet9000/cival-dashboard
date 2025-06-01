"""
Williams Alligator Strategy for Trading Farm.
This module implements a Williams Alligator trading strategy compatible with ElizaOS integration.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from .base import BaseStrategy, Signal, SignalType
from .risk_management import RiskManager, RiskParameters

logger = logging.getLogger(__name__)

class WilliamsAlligatorStrategy(BaseStrategy):
    """Williams Alligator strategy implementation."""
    
    def __init__(self, 
                 name: str, 
                 timeframes: List[str], 
                 symbols: List[str], 
                 params: Dict[str, Any] = None,
                 risk_params: Optional[RiskParameters] = None):
        """
        Initialize the Williams Alligator strategy.
        
        Args:
            name: Strategy name
            timeframes: List of timeframes to analyze
            symbols: List of symbols to trade
            params: Strategy parameters including:
                - jaw_period: Period for jaw line (blue)
                - teeth_period: Period for teeth line (red)
                - lips_period: Period for lips line (green)
                - jaw_shift: Shift for jaw line
                - teeth_shift: Shift for teeth line
                - lips_shift: Shift for lips line
                - fractals_lookback: Lookback period for Williams Fractals
                - gator_threshold: Min distance between lines to confirm signal
                - use_fractals: Whether to use Williams Fractals
                - use_gator: Whether to use Gator Oscillator
                - use_momentum: Whether to use Momentum for confirmation
            risk_params: Risk management parameters
        """
        super().__init__(name, timeframes, symbols)
        
        # Default parameters (standard values are 13, 8, 5 for periods and 8, 5, 3 for shifts)
        default_params = {
            "jaw_period": 13,
            "teeth_period": 8,
            "lips_period": 5,
            "jaw_shift": 8,
            "teeth_shift": 5,
            "lips_shift": 3,
            "fractals_lookback": 5,
            "gator_threshold": 0.0005,  # Min % distance between lines
            "use_fractals": True,
            "use_gator": True,
            "use_momentum": True,
            "momentum_period": 10,
            "signal_smoothing": True
        }
        
        self.params = {**default_params, **(params or {})}
        
        # Initialize risk manager if provided
        self.risk_manager = RiskManager(risk_params) if risk_params else None
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate Williams Alligator indicators."""
        df = self.data[symbol][timeframe]
        if df.empty or len(df) < max(self.params["jaw_period"], self.params["teeth_period"], self.params["lips_period"]) + 10:
            return
        
        # Calculate median price
        df['median_price'] = (df['high'] + df['low']) / 2
        
        # Calculate Alligator lines (Smoothed Moving Averages)
        df['jaw'] = self._calculate_smoothed_ma(df['median_price'], self.params["jaw_period"], self.params["jaw_shift"])
        df['teeth'] = self._calculate_smoothed_ma(df['median_price'], self.params["teeth_period"], self.params["teeth_shift"])
        df['lips'] = self._calculate_smoothed_ma(df['median_price'], self.params["lips_period"], self.params["lips_shift"])
        
        # Calculate Gator Oscillator if enabled
        if self.params["use_gator"]:
            df['gator_upper'] = abs(df['jaw'] - df['teeth'])
            df['gator_lower'] = abs(df['teeth'] - df['lips'])
        
        # Calculate Williams Fractals if enabled
        if self.params["use_fractals"]:
            self._calculate_fractals(df)
        
        # Calculate Momentum if enabled
        if self.params["use_momentum"]:
            df['momentum'] = df['close'].diff(self.params["momentum_period"])
    
    def _calculate_smoothed_ma(self, series: pd.Series, period: int, shift: int) -> pd.Series:
        """Calculate Smoothed Moving Average with shift."""
        # First calculate the simple moving average
        sma = series.rolling(window=period).mean()
        
        # Apply shift (positive shift moves the SMA to the right/future)
        if shift > 0:
            sma_shifted = sma.shift(-shift)
        else:
            sma_shifted = sma
        
        return sma_shifted
    
    def _calculate_fractals(self, df: pd.DataFrame) -> None:
        """Calculate Williams Fractals."""
        lookback = self.params["fractals_lookback"]
        
        if len(df) < lookback * 2 + 1:
            # Need enough data for fractal calculation
            return
        
        # Initialize fractal columns
        df['bullish_fractal'] = False
        df['bearish_fractal'] = False
        
        # Calculate bullish fractals (V-shape with low point in the middle)
        for i in range(lookback, len(df) - lookback):
            if df.iloc[i]['low'] < min([df.iloc[i-j]['low'] for j in range(1, lookback+1)] + 
                                     [df.iloc[i+j]['low'] for j in range(1, lookback+1)]):
                df.loc[df.index[i], 'bullish_fractal'] = True
        
        # Calculate bearish fractals (Λ-shape with high point in the middle)
        for i in range(lookback, len(df) - lookback):
            if df.iloc[i]['high'] > max([df.iloc[i-j]['high'] for j in range(1, lookback+1)] + 
                                       [df.iloc[i+j]['high'] for j in range(1, lookback+1)]):
                df.loc[df.index[i], 'bearish_fractal'] = True
    
    def _get_alligator_state(self, df: pd.DataFrame, idx: int) -> str:
        """
        Determine the current state of the Alligator.
        
        Returns:
            - "sleeping" - lines are intertwined (no clear direction)
            - "eating" - lines are properly ordered for a trend
            - "sated" - lines starting to converge again (trend weakening)
        """
        if idx < 5 or idx >= len(df):
            return "unknown"
        
        jaw = df.iloc[idx]['jaw']
        teeth = df.iloc[idx]['teeth']
        lips = df.iloc[idx]['lips']
        
        prev_jaw = df.iloc[idx-5]['jaw']
        prev_teeth = df.iloc[idx-5]['teeth']
        prev_lips = df.iloc[idx-5]['lips']
        
        # Check if lines are intertwined (sleeping)
        if (abs(jaw - teeth) < jaw * self.params["gator_threshold"] and
            abs(teeth - lips) < teeth * self.params["gator_threshold"]):
            return "sleeping"
        
        # Check if lines are properly ordered for bullish trend
        if lips > teeth and teeth > jaw:
            # Check if trend is strengthening or weakening
            if (lips - teeth) > (prev_lips - prev_teeth) and (teeth - jaw) > (prev_teeth - prev_jaw):
                return "eating_bullish"
            else:
                return "sated_bullish"
        
        # Check if lines are properly ordered for bearish trend
        if lips < teeth and teeth < jaw:
            # Check if trend is strengthening or weakening
            if (teeth - lips) > (prev_teeth - prev_lips) and (jaw - teeth) > (prev_jaw - prev_teeth):
                return "eating_bearish"
            else:
                return "sated_bearish"
        
        # Lines are crossing or changing order - transition state
        return "transition"
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Williams Alligator patterns."""
        signals = []
        
        df = self.data[symbol][timeframe]
        if df.empty or 'jaw' not in df.columns or 'teeth' not in df.columns or 'lips' not in df.columns:
            return signals
        
        last_idx = len(df) - 1
        current_price = df.iloc[last_idx]['close']
        current_timestamp = df.index[last_idx]
        
        # Get Alligator state
        alligator_state = self._get_alligator_state(df, last_idx)
        
        signal_type = None
        confidence = 0.7  # Base confidence
        
        metadata = {
            "alligator_state": alligator_state,
            "jaw": float(df.iloc[last_idx]['jaw']),
            "teeth": float(df.iloc[last_idx]['teeth']),
            "lips": float(df.iloc[last_idx]['lips'])
        }
        
        # Detect crossovers - price breaking above/below the Alligator's mouth
        price_above_lips = current_price > df.iloc[last_idx]['lips']
        price_above_teeth = current_price > df.iloc[last_idx]['teeth']
        price_above_jaw = current_price > df.iloc[last_idx]['jaw']
        
        # Previous values for crossover detection
        prev_idx = max(0, last_idx - 1)
        prev_price_above_lips = df.iloc[prev_idx]['close'] > df.iloc[prev_idx]['lips']
        prev_price_above_teeth = df.iloc[prev_idx]['close'] > df.iloc[prev_idx]['teeth']
        prev_price_above_jaw = df.iloc[prev_idx]['close'] > df.iloc[prev_idx]['jaw']
        
        # Check for bullish signals
        if alligator_state in ["eating_bullish", "transition"]:
            # Price crossing above the lips line (entry signal)
            if price_above_lips and not prev_price_above_lips:
                signal_type = SignalType.BUY
                confidence = 0.7
                metadata["pattern"] = "price_crossover_lips"
            
            # Price above all lines and lines in bullish order
            elif (price_above_lips and price_above_teeth and price_above_jaw and
                  df.iloc[last_idx]['lips'] > df.iloc[last_idx]['teeth'] > df.iloc[last_idx]['jaw']):
                signal_type = SignalType.BUY
                confidence = 0.8
                metadata["pattern"] = "bullish_alignment"
            
            # Check for confirmation with Fractals if enabled
            if self.params["use_fractals"] and 'bullish_fractal' in df.columns:
                recent_fractal = False
                for i in range(last_idx, max(0, last_idx - 5), -1):
                    if df.iloc[i]['bullish_fractal']:
                        recent_fractal = True
                        break
                
                if recent_fractal:
                    confidence = min(confidence + 0.1, 1.0)
                    metadata["fractal_confirmation"] = True
            
            # Check for confirmation with Momentum if enabled
            if self.params["use_momentum"] and 'momentum' in df.columns:
                if df.iloc[last_idx]['momentum'] > 0:
                    confidence = min(confidence + 0.1, 1.0)
                    metadata["momentum_confirmation"] = True
        
        # Check for bearish signals
        elif alligator_state in ["eating_bearish", "transition"]:
            # Price crossing below the lips line (entry signal)
            if not price_above_lips and prev_price_above_lips:
                signal_type = SignalType.SELL
                confidence = 0.7
                metadata["pattern"] = "price_crossover_lips"
            
            # Price below all lines and lines in bearish order
            elif (not price_above_lips and not price_above_teeth and not price_above_jaw and
                  df.iloc[last_idx]['lips'] < df.iloc[last_idx]['teeth'] < df.iloc[last_idx]['jaw']):
                signal_type = SignalType.SELL
                confidence = 0.8
                metadata["pattern"] = "bearish_alignment"
            
            # Check for confirmation with Fractals if enabled
            if self.params["use_fractals"] and 'bearish_fractal' in df.columns:
                recent_fractal = False
                for i in range(last_idx, max(0, last_idx - 5), -1):
                    if df.iloc[i]['bearish_fractal']:
                        recent_fractal = True
                        break
                
                if recent_fractal:
                    confidence = min(confidence + 0.1, 1.0)
                    metadata["fractal_confirmation"] = True
            
            # Check for confirmation with Momentum if enabled
            if self.params["use_momentum"] and 'momentum' in df.columns:
                if df.iloc[last_idx]['momentum'] < 0:
                    confidence = min(confidence + 0.1, 1.0)
                    metadata["momentum_confirmation"] = True
        
        # Check for Gator Oscillator confirmation if enabled
        if (self.params["use_gator"] and 'gator_upper' in df.columns and 'gator_lower' in df.columns and
            signal_type is not None):
            
            # Gator opening its mouth indicates strengthening trend
            if (df.iloc[last_idx]['gator_upper'] > df.iloc[prev_idx]['gator_upper'] and
                df.iloc[last_idx]['gator_lower'] > df.iloc[prev_idx]['gator_lower']):
                confidence = min(confidence + 0.1, 1.0)
                metadata["gator_confirmation"] = True
        
        # Generate signal if conditions are met
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
