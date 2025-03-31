import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional

from .base import BaseStrategy, Signal, SignalType
from ...config.config import ALLIGATOR_JAW_PERIOD, ALLIGATOR_JAW_SHIFT, ALLIGATOR_TEETH_PERIOD, ALLIGATOR_TEETH_SHIFT, ALLIGATOR_LIPS_PERIOD, ALLIGATOR_LIPS_SHIFT

logger = logging.getLogger(__name__)

class AlligatorStrategy(BaseStrategy):
    """Implementation of Williams Alligator Strategy."""
    
    def __init__(self, timeframes: List[str], symbols: List[str]):
        super().__init__("Williams Alligator", timeframes, symbols)
        self.jaw_period = ALLIGATOR_JAW_PERIOD
        self.jaw_shift = ALLIGATOR_JAW_SHIFT
        self.teeth_period = ALLIGATOR_TEETH_PERIOD
        self.teeth_shift = ALLIGATOR_TEETH_SHIFT
        self.lips_period = ALLIGATOR_LIPS_PERIOD
        self.lips_shift = ALLIGATOR_LIPS_SHIFT
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate Williams Alligator indicators."""
        df = self.data[symbol][timeframe]
        if len(df) < max(self.jaw_period, self.teeth_period, self.lips_period) + max(self.jaw_shift, self.teeth_shift, self.lips_shift):
            return
        
        # Calculate median price
        df['median_price'] = (df['high'] + df['low']) / 2
        
        # Calculate Alligator's Jaw - Blue (longest SMMA, most lagging)
        df['jaw'] = self._smoothed_moving_average(df['median_price'], self.jaw_period, self.jaw_shift)
        
        # Calculate Alligator's Teeth - Red (intermediate SMMA)
        df['teeth'] = self._smoothed_moving_average(df['median_price'], self.teeth_period, self.teeth_shift)
        
        # Calculate Alligator's Lips - Green (shortest SMMA, most responsive)
        df['lips'] = self._smoothed_moving_average(df['median_price'], self.lips_period, self.lips_shift)
        
        # Calculate Fractals (pivots for volatility assessment)
        df['fractal_high'] = self._calculate_fractal_highs(df)
        df['fractal_low'] = self._calculate_fractal_lows(df)
        
        # Calculate additional Williams indicators
        
        # Awesome Oscillator (AO)
        df['ao'] = self._calculate_awesome_oscillator(df)
        
        # Acceleration/Deceleration Oscillator (AC)
        df['ac'] = self._calculate_acceleration_oscillator(df)
        
        # Market Facilitation Index (MFI)
        if 'volume' in df.columns:
            df['mfi'] = self._calculate_market_facilitation_index(df)
    
    def _smoothed_moving_average(self, series: pd.Series, period: int, shift: int) -> pd.Series:
        """Calculate Smoothed Moving Average with shift."""
        # First, calculate an SMA for the first value
        sma = series.rolling(window=period).mean()
        
        # Then calculate SMMA (modified EMA)
        smma = pd.Series(index=series.index)
        smma.iloc[period-1] = sma.iloc[period-1]  # Initial value
        
        # Calculate SMMA for the rest of the values
        for i in range(period, len(series)):
            smma.iloc[i] = (smma.iloc[i-1] * (period-1) + series.iloc[i]) / period
        
        # Apply the shift
        return smma.shift(shift)
    
    def _calculate_fractal_highs(self, df: pd.DataFrame, window: int = 5) -> pd.Series:
        """Identify Fractal Highs - pivot points where the middle candle has the highest high."""
        fractal_high = pd.Series(np.nan, index=df.index)
        
        # Need at least window data points
        if len(df) < window:
            return fractal_high
        
        # Calculate fractals
        for i in range(2, len(df) - 2):
            # Check if the middle point is a high fractal
            if (df['high'].iloc[i] > df['high'].iloc[i-1] and
                df['high'].iloc[i] > df['high'].iloc[i-2] and
                df['high'].iloc[i] > df['high'].iloc[i+1] and
                df['high'].iloc[i] > df['high'].iloc[i+2]):
                
                fractal_high.iloc[i] = df['high'].iloc[i]
        
        return fractal_high
    
    def _calculate_fractal_lows(self, df: pd.DataFrame, window: int = 5) -> pd.Series:
        """Identify Fractal Lows - pivot points where the middle candle has the lowest low."""
        fractal_low = pd.Series(np.nan, index=df.index)
        
        # Need at least window data points
        if len(df) < window:
            return fractal_low
        
        # Calculate fractals
        for i in range(2, len(df) - 2):
            # Check if the middle point is a low fractal
            if (df['low'].iloc[i] < df['low'].iloc[i-1] and
                df['low'].iloc[i] < df['low'].iloc[i-2] and
                df['low'].iloc[i] < df['low'].iloc[i+1] and
                df['low'].iloc[i] < df['low'].iloc[i+2]):
                
                fractal_low.iloc[i] = df['low'].iloc[i]
        
        return fractal_low
    
    def _calculate_awesome_oscillator(self, df: pd.DataFrame) -> pd.Series:
        """Calculate Awesome Oscillator (AO)."""
        # AO = 5-period SMA of median price - 34-period SMA of median price
        sma5 = df['median_price'].rolling(window=5).mean()
        sma34 = df['median_price'].rolling(window=34).mean()
        
        return sma5 - sma34
    
    def _calculate_acceleration_oscillator(self, df: pd.DataFrame) -> pd.Series:
        """Calculate Acceleration/Deceleration Oscillator (AC)."""
        # AC = AO - 5-period SMA of AO
        ao = df['ao']
        ao_sma5 = ao.rolling(window=5).mean()
        
        return ao - ao_sma5
    
    def _calculate_market_facilitation_index(self, df: pd.DataFrame) -> pd.Series:
        """Calculate Market Facilitation Index (MFI)."""
        # MFI = (High - Low) / Volume
        return (df['high'] - df['low']) / df['volume']
    
    def _check_alligator_state(self, df: pd.DataFrame, index: int) -> str:
        """Determine the Alligator's state (sleeping, awakening, eating, or sated)."""
        # Need enough data to analyze
        if index < 5:
            return "unknown"
        
        # Check for intertwining of the lines (sleeping)
        sleeping_threshold = 0.001  # 0.1% price difference
        jaw = df['jaw'].iloc[index]
        teeth = df['teeth'].iloc[index]
        lips = df['lips'].iloc[index]
        
        price_avg = (jaw + teeth + lips) / 3
        jaw_diff = abs(jaw - price_avg) / price_avg
        teeth_diff = abs(teeth - price_avg) / price_avg
        lips_diff = abs(lips - price_avg) / price_avg
        
        if (jaw_diff < sleeping_threshold and teeth_diff < sleeping_threshold and lips_diff < sleeping_threshold):
            return "sleeping"
        
        # Check for proper alignment for bullish trend (awakening or eating)
        # Lips above Teeth above Jaw
        if lips > teeth > jaw:
            # Check if this alignment just started (awakening) or has been continuing (eating)
            if (df['lips'].iloc[index-1] <= df['teeth'].iloc[index-1] or 
                df['teeth'].iloc[index-1] <= df['jaw'].iloc[index-1]):
                return "awakening_bullish"
            else:
                return "eating_bullish"
        
        # Check for proper alignment for bearish trend (awakening or eating)
        # Lips below Teeth below Jaw
        if lips < teeth < jaw:
            # Check if this alignment just started (awakening) or has been continuing (eating)
            if (df['lips'].iloc[index-1] >= df['teeth'].iloc[index-1] or 
                df['teeth'].iloc[index-1] >= df['jaw'].iloc[index-1]):
                return "awakening_bearish"
            else:
                return "eating_bearish"
        
        # Check for convergence of lines (sated)
        # After eating phase, the lines start coming together
        if (lips > teeth > jaw) and (df['lips'].iloc[index] - df['jaw'].iloc[index] < 
                                    df['lips'].iloc[index-1] - df['jaw'].iloc[index-1]):
            return "sated_bullish"
        
        if (lips < teeth < jaw) and (df['jaw'].iloc[index] - df['lips'].iloc[index] < 
                                    df['jaw'].iloc[index-1] - df['lips'].iloc[index-1]):
            return "sated_bearish"
        
        # Default state if none of the above
        return "transition"
    
    def _check_confirmation_signals(self, df: pd.DataFrame, index: int, direction: str) -> float:
        """Check for confirmation signals from AO and AC for the given direction."""
        confidence = 0.5  # Base confidence
        confirmations = 0
        
        # Check Awesome Oscillator (AO)
        if direction == "bullish":
            # Bullish AO: above zero and increasing
            if df['ao'].iloc[index] > 0 and df['ao'].iloc[index] > df['ao'].iloc[index-1]:
                confidence += 0.1
                confirmations += 1
        else:  # bearish
            # Bearish AO: below zero and decreasing
            if df['ao'].iloc[index] < 0 and df['ao'].iloc[index] < df['ao'].iloc[index-1]:
                confidence += 0.1
                confirmations += 1
        
        # Check Acceleration/Deceleration Oscillator (AC)
        if direction == "bullish":
            # Bullish AC: above zero or turning positive
            if df['ac'].iloc[index] > 0 or (df['ac'].iloc[index] > df['ac'].iloc[index-1] and 
                                          df['ac'].iloc[index-1] > df['ac'].iloc[index-2]):
                confidence += 0.1
                confirmations += 1
        else:  # bearish
            # Bearish AC: below zero or turning negative
            if df['ac'].iloc[index] < 0 or (df['ac'].iloc[index] < df['ac'].iloc[index-1] and 
                                          df['ac'].iloc[index-1] < df['ac'].iloc[index-2]):
                confidence += 0.1
                confirmations += 1
        
        # Check fractals
        if direction == "bullish":
            # Recent bullish fractal (low)
            recent_fractal = False
            for i in range(max(0, index-5), index+1):
                if not pd.isna(df['fractal_low'].iloc[i]):
                    recent_fractal = True
                    break
            
            if recent_fractal:
                confidence += 0.1
                confirmations += 1
        else:  # bearish
            # Recent bearish fractal (high)
            recent_fractal = False
            for i in range(max(0, index-5), index+1):
                if not pd.isna(df['fractal_high'].iloc[i]):
                    recent_fractal = True
                    break
            
            if recent_fractal:
                confidence += 0.1
                confirmations += 1
        
        # Volume-based confirmation (if available)
        if 'volume' in df.columns and 'mfi' in df.columns:
            if direction == "bullish" and df['volume'].iloc[index] > df['volume'].iloc[index-1]:
                confidence += 0.1
                confirmations += 1
            elif direction == "bearish" and df['volume'].iloc[index] > df['volume'].iloc[index-1]:
                confidence += 0.1
                confirmations += 1
        
        # Adjust confidence based on number of confirmations
        # At least 2 confirmations are needed for a valid signal
        if confirmations < 2:
            confidence = max(0.3, confidence - 0.2)
        
        return min(confidence, 1.0)
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Williams Alligator analysis."""
        signals = []
        
        if symbol not in self.data or timeframe not in self.data[symbol]:
            return signals
        
        df = self.data[symbol][timeframe]
        min_required_len = max(self.jaw_period, self.teeth_period, self.lips_period) + max(self.jaw_shift, self.teeth_shift, self.lips_shift)
        if len(df) < min_required_len + 5:  # Need extra data for state determination
            return signals
        
        # Get the latest candle
        latest_index = len(df) - 1
        latest_candle = df.iloc[latest_index]
        latest_close = latest_candle['close']
        latest_timestamp = latest_candle.name
        
        # Determine Alligator state
        alligator_state = self._check_alligator_state(df, latest_index)
        
        # Generate signals based on the Alligator state
        if alligator_state in ["awakening_bullish", "eating_bullish"]:
            # Bullish signal when Alligator awakens or is eating
            # Check for confirmations from other Williams indicators
            confidence = self._check_confirmation_signals(df, latest_index, "bullish")
            
            # Calculate stop loss and target levels
            jaw = df['jaw'].iloc[latest_index]
            teeth = df['teeth'].iloc[latest_index]
            
            # Stop loss below the Alligator's jaw
            stop_loss = min(jaw, df['low'].iloc[latest_index-5:latest_index+1].min())
            
            # Target based on recent fractals or a multiple of the risk
            target_price = latest_close + (latest_close - stop_loss) * 2  # Risk:Reward ratio of 1:2
            
            # Find recent high fractals for potential targets
            for i in range(latest_index-20, latest_index):
                if not pd.isna(df['fractal_high'].iloc[i]) and df['fractal_high'].iloc[i] > latest_close:
                    # Use the nearest high fractal above current price as target
                    target_price = df['fractal_high'].iloc[i]
                    break
            
            metadata = {
                'alligator_state': alligator_state,
                'jaw': jaw,
                'teeth': teeth,
                'lips': df['lips'].iloc[latest_index],
                'ao': df['ao'].iloc[latest_index],
                'ac': df['ac'].iloc[latest_index],
                'stop_loss': stop_loss,
                'target_price': target_price
            }
            
            # Only generate a signal if confidence is sufficient
            if confidence >= 0.5:
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
            
        elif alligator_state in ["awakening_bearish", "eating_bearish"]:
            # Bearish signal when Alligator awakens or is eating (in bearish configuration)
            # Check for confirmations from other Williams indicators
            confidence = self._check_confirmation_signals(df, latest_index, "bearish")
            
            # Calculate stop loss and target levels
            jaw = df['jaw'].iloc[latest_index]
            teeth = df['teeth'].iloc[latest_index]
            
            # Stop loss above the Alligator's jaw
            stop_loss = max(jaw, df['high'].iloc[latest_index-5:latest_index+1].max())
            
            # Target based on recent fractals or a multiple of the risk
            target_price = latest_close - (stop_loss - latest_close) * 2  # Risk:Reward ratio of 1:2
            
            # Find recent low fractals for potential targets
            for i in range(latest_index-20, latest_index):
                if not pd.isna(df['fractal_low'].iloc[i]) and df['fractal_low'].iloc[i] < latest_close:
                    # Use the nearest low fractal below current price as target
                    target_price = df['fractal_low'].iloc[i]
                    break
            
            metadata = {
                'alligator_state': alligator_state,
                'jaw': jaw,
                'teeth': teeth,
                'lips': df['lips'].iloc[latest_index],
                'ao': df['ao'].iloc[latest_index],
                'ac': df['ac'].iloc[latest_index],
                'stop_loss': stop_loss,
                'target_price': target_price
            }
            
            # Only generate a signal if confidence is sufficient
            if confidence >= 0.5:
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
        
        # Handle exit signals
        if alligator_state in ["sated_bullish", "sleeping"] and df['close'].iloc[latest_index-1] > df['teeth'].iloc[latest_index-1] and df['close'].iloc[latest_index] < df['teeth'].iloc[latest_index]:
            # Exit bullish position when price closes below Teeth (middle line) after being above
            metadata = {
                'alligator_state': alligator_state,
                'jaw': df['jaw'].iloc[latest_index],
                'teeth': df['teeth'].iloc[latest_index],
                'lips': df['lips'].iloc[latest_index],
                'exit_reason': 'price_crossed_below_teeth'
            }
            
            signals.append(Signal(
                symbol=symbol,
                signal_type=SignalType.EXIT_BUY,
                price=latest_close,
                timestamp=latest_timestamp,
                confidence=0.7,  # High confidence for exit signals
                strategy_name=self.name,
                timeframe=timeframe,
                metadata=metadata
            ))
        
        elif alligator_state in ["sated_bearish", "sleeping"] and df['close'].iloc[latest_index-1] < df['teeth'].iloc[latest_index-1] and df['close'].iloc[latest_index] > df['teeth'].iloc[latest_index]:
            # Exit bearish position when price closes above Teeth (middle line) after being below
            metadata = {
                'alligator_state': alligator_state,
                'jaw': df['jaw'].iloc[latest_index],
                'teeth': df['teeth'].iloc[latest_index],
                'lips': df['lips'].iloc[latest_index],
                'exit_reason': 'price_crossed_above_teeth'
            }
            
            signals.append(Signal(
                symbol=symbol,
                signal_type=SignalType.EXIT_SELL,
                price=latest_close,
                timestamp=latest_timestamp,
                confidence=0.7,  # High confidence for exit signals
                strategy_name=self.name,
                timeframe=timeframe,
                metadata=metadata
            ))
        
        return signals
