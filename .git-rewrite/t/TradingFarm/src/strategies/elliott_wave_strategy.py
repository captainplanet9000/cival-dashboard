"""
Elliott Wave Strategy for Trading Farm.
This module implements an Elliott Wave trading strategy compatible with ElizaOS integration.
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
import pandas as pd
import numpy as np
from datetime import datetime

from .base import BaseStrategy, Signal, SignalType
from .risk_management import RiskManager, RiskParameters

logger = logging.getLogger(__name__)

class WavePattern:
    """Elliott Wave pattern details."""
    IMPULSE = "IMPULSE"
    CORRECTIVE = "CORRECTIVE"
    DIAGONAL = "DIAGONAL"
    UNKNOWN = "UNKNOWN"

class WaveDegree:
    """Elliott Wave degrees."""
    GRAND_SUPERCYCLE = "GRAND_SUPERCYCLE"
    SUPERCYCLE = "SUPERCYCLE"
    CYCLE = "CYCLE"
    PRIMARY = "PRIMARY"
    INTERMEDIATE = "INTERMEDIATE"
    MINOR = "MINOR"
    MINUTE = "MINUTE"
    MINUETTE = "MINUETTE"
    SUBMINUETTE = "SUBMINUETTE"

class WavePoint:
    """Point in an Elliott Wave pattern."""
    def __init__(self, index: int, price: float, timestamp: int, wave_type: str = None):
        self.index = index
        self.price = price
        self.timestamp = timestamp
        self.wave_type = wave_type

class WaveStructure:
    """Structure describing a detected Elliott Wave pattern."""
    def __init__(self, 
                 pattern_type: str, 
                 degree: str, 
                 wave_points: List[WavePoint],
                 confidence: float,
                 start_idx: int,
                 end_idx: int):
        self.pattern_type = pattern_type
        self.degree = degree
        self.wave_points = wave_points
        self.confidence = confidence
        self.start_idx = start_idx
        self.end_idx = end_idx
        
    def is_complete(self) -> bool:
        """Check if the wave structure is complete."""
        if self.pattern_type == WavePattern.IMPULSE:
            return len(self.wave_points) >= 5
        elif self.pattern_type == WavePattern.CORRECTIVE:
            return len(self.wave_points) >= 3
        return False

class ElliottWaveStrategy(BaseStrategy):
    """Elliott Wave strategy implementation."""
    
    def __init__(self, 
                 name: str, 
                 timeframes: List[str], 
                 symbols: List[str], 
                 params: Dict[str, Any] = None,
                 risk_params: Optional[RiskParameters] = None):
        """
        Initialize the Elliott Wave strategy.
        
        Args:
            name: Strategy name
            timeframes: List of timeframes to analyze
            symbols: List of symbols to trade
            params: Strategy parameters including:
                - lookback_period: Data lookback period for wave detection
                - fibonacci_tolerance: Acceptable deviation from Fibonacci ratios
                - confirmation_indicators: List of confirming indicators
                - min_confidence: Minimum confidence level for trade signals
            risk_params: Risk management parameters
        """
        super().__init__(name, timeframes, symbols)
        
        # Default parameters
        default_params = {
            "lookback_period": 250,
            "fibonacci_tolerance": 0.1,
            "confirmation_indicators": ["rsi", "volume"],
            "min_confidence": 0.7,
            "impulse_wave_enabled": True,
            "corrective_wave_enabled": True,
            "diagonal_wave_enabled": False,
            "minimum_wave_size": 0.03,  # 3% minimum price movement for wave consideration
            "enforce_alternate_waves": True,  # Strictly enforce alternating waves
        }
        
        self.params = {**default_params, **(params or {})}
        
        # Initialize wave detection variables
        self.detected_waves = {}  # {symbol: {timeframe: List[WaveStructure]}}
        
        # Fibonacci ratios for wave relationships
        self.fib_ratios = {
            "0.236": 0.236,
            "0.382": 0.382,
            "0.500": 0.500,
            "0.618": 0.618,
            "0.786": 0.786,
            "1.000": 1.000,
            "1.272": 1.272,
            "1.618": 1.618,
            "2.000": 2.000,
            "2.618": 2.618
        }
        
        # Initialize risk manager if provided
        self.risk_manager = RiskManager(risk_params) if risk_params else None
    
    def _initialize_detected_waves(self, symbol: str, timeframe: str):
        """Initialize detected waves structure."""
        if symbol not in self.detected_waves:
            self.detected_waves[symbol] = {}
            
        if timeframe not in self.detected_waves[symbol]:
            self.detected_waves[symbol][timeframe] = []
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate technical indicators for Elliott Wave pattern detection."""
        self._initialize_detected_waves(symbol, timeframe)
        
        df = self.data[symbol][timeframe]
        if df.empty or len(df) < self.params["lookback_period"]:
            return
        
        # Calculate RSI for confirmation
        if "rsi" in self.params["confirmation_indicators"]:
            df['rsi'] = self.calculate_rsi(df, period=14)
        
        # Calculate EMA for trend direction
        df['ema50'] = df['close'].ewm(span=50, adjust=False).mean()
        df['ema200'] = df['close'].ewm(span=200, adjust=False).mean()
        
        # Calculate ATR for volatility assessment
        df['atr'] = self.calculate_atr(df, period=14)
        
        # Calculate percentage price changes
        df['pct_change'] = df['close'].pct_change()
        
        # Calculate zigzag extreme points for potential wave identification
        self._calculate_zigzag_extremes(df, symbol, timeframe)
    
    def _calculate_zigzag_extremes(self, df: pd.DataFrame, symbol: str, timeframe: str):
        """Calculate ZigZag indicator for identifying potential wave pivot points."""
        # Minimum percentage change required for a point to be considered an extreme
        min_change = self.params["minimum_wave_size"]
        
        # Store price extremes
        highs = []
        lows = []
        
        # Initial values
        last_extreme = None
        last_extreme_idx = None
        last_extreme_price = None
        last_trend = None
        
        # Find potential extremes
        for i in range(1, len(df) - 1):
            if df.iloc[i]['high'] > df.iloc[i-1]['high'] and df.iloc[i]['high'] > df.iloc[i+1]['high']:
                # Potential high
                highs.append((i, df.index[i], df.iloc[i]['high']))
            
            if df.iloc[i]['low'] < df.iloc[i-1]['low'] and df.iloc[i]['low'] < df.iloc[i+1]['low']:
                # Potential low
                lows.append((i, df.index[i], df.iloc[i]['low']))
        
        # Filter extremes by minimum percentage change
        filtered_extremes = []
        
        for idx, timestamp, price in sorted(highs + lows, key=lambda x: x[0]):
            # Determine if high or low
            is_high = (idx, timestamp, price) in highs
            
            if last_extreme is None:
                # First extreme
                last_extreme = "high" if is_high else "low"
                last_extreme_idx = idx
                last_extreme_price = price
                last_trend = None
                filtered_extremes.append((idx, timestamp, price, last_extreme))
            else:
                # Calculate percentage change
                pct_change = abs(price - last_extreme_price) / last_extreme_price
                
                # Only consider if the extreme is of opposite type and meets minimum change
                if (is_high and last_extreme == "low" or not is_high and last_extreme == "high") and pct_change >= min_change:
                    current_extreme = "high" if is_high else "low"
                    filtered_extremes.append((idx, timestamp, price, current_extreme))
                    
                    # Update last extreme
                    last_extreme = current_extreme
                    last_extreme_idx = idx
                    last_extreme_price = price
                    last_trend = "up" if current_extreme == "high" else "down"
        
        # Store filtered extremes as potential wave points
        wave_points = []
        for idx, timestamp, price, point_type in filtered_extremes:
            wave_points.append(WavePoint(idx, price, timestamp, point_type))
        
        # Attempt to identify Elliott Wave patterns from the extremes
        if len(wave_points) >= 5:  # Minimum required for an impulse wave
            self._detect_wave_patterns(wave_points, df, symbol, timeframe)
    
    def _detect_wave_patterns(self, 
                             wave_points: List[WavePoint], 
                             df: pd.DataFrame, 
                             symbol: str, 
                             timeframe: str):
        """Detect Elliott Wave patterns from the identified extreme points."""
        # Clear previous wave detections for this symbol and timeframe
        self.detected_waves[symbol][timeframe] = []
        
        # Try to identify impulse waves (5-wave patterns)
        if self.params["impulse_wave_enabled"]:
            self._detect_impulse_waves(wave_points, df, symbol, timeframe)
        
        # Try to identify corrective waves (3-wave patterns)
        if self.params["corrective_wave_enabled"]:
            self._detect_corrective_waves(wave_points, df, symbol, timeframe)
    
    def _detect_impulse_waves(self, 
                             wave_points: List[WavePoint], 
                             df: pd.DataFrame, 
                             symbol: str, 
                             timeframe: str):
        """Detect impulse wave patterns (5-wave structure)."""
        # Need at least 5 points for an impulse wave
        if len(wave_points) < 5:
            return
        
        # Sliding window approach to identify potential impulse wave patterns
        for i in range(len(wave_points) - 4):
            potential_wave = wave_points[i:i+5]
            
            # Check if the pattern alternates high/low correctly for an impulse wave
            # Impulse wave: Wave 1, 3, 5 are in the same direction; Waves 2, 4 are corrections
            if (potential_wave[0].wave_type == "low" and 
                potential_wave[1].wave_type == "high" and 
                potential_wave[2].wave_type == "low" and 
                potential_wave[3].wave_type == "high" and 
                potential_wave[4].wave_type == "low"):
                # Potential bearish impulse
                wave_direction = "bearish"
                confidence = self._evaluate_impulse_wave(potential_wave, df, wave_direction)
                
                if confidence >= self.params["min_confidence"]:
                    self.detected_waves[symbol][timeframe].append(
                        WaveStructure(
                            pattern_type=WavePattern.IMPULSE,
                            degree=WaveDegree.MINOR,  # Default degree
                            wave_points=potential_wave,
                            confidence=confidence,
                            start_idx=potential_wave[0].index,
                            end_idx=potential_wave[4].index
                        )
                    )
            
            elif (potential_wave[0].wave_type == "high" and 
                 potential_wave[1].wave_type == "low" and 
                 potential_wave[2].wave_type == "high" and 
                 potential_wave[3].wave_type == "low" and 
                 potential_wave[4].wave_type == "high"):
                # Potential bullish impulse
                wave_direction = "bullish"
                confidence = self._evaluate_impulse_wave(potential_wave, df, wave_direction)
                
                if confidence >= self.params["min_confidence"]:
                    self.detected_waves[symbol][timeframe].append(
                        WaveStructure(
                            pattern_type=WavePattern.IMPULSE,
                            degree=WaveDegree.MINOR,  # Default degree
                            wave_points=potential_wave,
                            confidence=confidence,
                            start_idx=potential_wave[0].index,
                            end_idx=potential_wave[4].index
                        )
                    )
    
    def _detect_corrective_waves(self, 
                               wave_points: List[WavePoint], 
                               df: pd.DataFrame, 
                               symbol: str, 
                               timeframe: str):
        """Detect corrective wave patterns (3-wave structure)."""
        # Need at least 3 points for a corrective wave
        if len(wave_points) < 3:
            return
        
        # Sliding window approach to identify potential corrective wave patterns
        for i in range(len(wave_points) - 2):
            potential_wave = wave_points[i:i+3]
            
            # Check if the pattern alternates correctly for a corrective wave
            # Corrective wave: A-B-C structure where A and C are in the same direction
            if (potential_wave[0].wave_type == "high" and 
                potential_wave[1].wave_type == "low" and 
                potential_wave[2].wave_type == "high"):
                # Potential bearish correction
                wave_direction = "bearish"
                confidence = self._evaluate_corrective_wave(potential_wave, df, wave_direction)
                
                if confidence >= self.params["min_confidence"]:
                    self.detected_waves[symbol][timeframe].append(
                        WaveStructure(
                            pattern_type=WavePattern.CORRECTIVE,
                            degree=WaveDegree.MINOR,  # Default degree
                            wave_points=potential_wave,
                            confidence=confidence,
                            start_idx=potential_wave[0].index,
                            end_idx=potential_wave[2].index
                        )
                    )
            
            elif (potential_wave[0].wave_type == "low" and 
                 potential_wave[1].wave_type == "high" and 
                 potential_wave[2].wave_type == "low"):
                # Potential bullish correction
                wave_direction = "bullish"
                confidence = self._evaluate_corrective_wave(potential_wave, df, wave_direction)
                
                if confidence >= self.params["min_confidence"]:
                    self.detected_waves[symbol][timeframe].append(
                        WaveStructure(
                            pattern_type=WavePattern.CORRECTIVE,
                            degree=WaveDegree.MINOR,  # Default degree
                            wave_points=potential_wave,
                            confidence=confidence,
                            start_idx=potential_wave[0].index,
                            end_idx=potential_wave[2].index
                        )
                    )
    
    def _evaluate_impulse_wave(self, 
                              wave_points: List[WavePoint], 
                              df: pd.DataFrame, 
                              wave_direction: str) -> float:
        """
        Evaluate an impulse wave pattern against Elliott Wave rules.
        
        Returns:
            confidence: Float between 0 and 1 indicating confidence level
        """
        confidence_scores = []
        
        # Rule 1: Wave 3 cannot be the shortest among waves 1, 3, and 5
        wave1_size = abs(wave_points[1].price - wave_points[0].price)
        wave3_size = abs(wave_points[3].price - wave_points[2].price)
        wave5_size = abs(wave_points[4].price - wave_points[3].price)
        
        if wave3_size <= wave1_size and wave3_size <= wave5_size:
            confidence_scores.append(0.3)  # Major rule violation
        else:
            confidence_scores.append(1.0)
        
        # Rule 2: Wave 3 is often the longest and most powerful
        if wave3_size > wave1_size and wave3_size > wave5_size:
            confidence_scores.append(1.0)
        elif wave3_size > wave1_size or wave3_size > wave5_size:
            confidence_scores.append(0.8)
        else:
            confidence_scores.append(0.6)
        
        # Rule 3: Wave 4 shouldn't overlap with Wave 1's price territory
        if wave_direction == "bullish":
            if wave_points[3].price > wave_points[1].price:
                confidence_scores.append(1.0)
            else:
                confidence_scores.append(0.4)  # Significant rule violation
        else:  # bearish
            if wave_points[3].price < wave_points[1].price:
                confidence_scores.append(1.0)
            else:
                confidence_scores.append(0.4)  # Significant rule violation
        
        # Rule 4: Check Fibonacci relationships
        # Wave 3 is often 1.618 times Wave 1
        wave3_to_wave1_ratio = wave3_size / wave1_size if wave1_size > 0 else 0
        fibonacci_error = min(
            abs(wave3_to_wave1_ratio - 1.618),
            abs(wave3_to_wave1_ratio - 2.618)
        )
        
        if fibonacci_error < self.params["fibonacci_tolerance"]:
            confidence_scores.append(1.0)
        elif fibonacci_error < 2 * self.params["fibonacci_tolerance"]:
            confidence_scores.append(0.7)
        else:
            confidence_scores.append(0.5)
        
        # Check volume profile (typically increasing in wave 3)
        volume_confirmed = False
        if "volume" in df.columns:
            # Get volume for each wave
            wave1_volume = df.iloc[wave_points[0].index:wave_points[1].index]['volume'].mean()
            wave3_volume = df.iloc[wave_points[2].index:wave_points[3].index]['volume'].mean()
            wave5_volume = df.iloc[wave_points[3].index:wave_points[4].index]['volume'].mean()
            
            # Wave 3 typically has highest volume
            if wave3_volume > wave1_volume and wave3_volume > wave5_volume:
                volume_confirmed = True
                confidence_scores.append(1.0)
            else:
                confidence_scores.append(0.6)
        
        # Final confidence is weighted average of all checks
        return sum(confidence_scores) / len(confidence_scores)
    
    def _evaluate_corrective_wave(self, 
                                wave_points: List[WavePoint], 
                                df: pd.DataFrame, 
                                wave_direction: str) -> float:
        """
        Evaluate a corrective wave pattern against Elliott Wave rules.
        
        Returns:
            confidence: Float between 0 and 1 indicating confidence level
        """
        confidence_scores = []
        
        # Corrective waves often retrace 50%, 61.8%, or 78.6% of the prior impulse wave
        # First find a preceding impulse wave if possible
        preceding_impulse = None
        for wave in self.detected_waves.get(df.name, {}).get(df.name, []):
            if (wave.pattern_type == WavePattern.IMPULSE and 
                wave.end_idx == wave_points[0].index):
                preceding_impulse = wave
                break
        
        if preceding_impulse:
            # Calculate retracement level
            impulse_size = abs(preceding_impulse.wave_points[-1].price - preceding_impulse.wave_points[0].price)
            correction_size = abs(wave_points[1].price - wave_points[0].price)
            retracement_level = correction_size / impulse_size if impulse_size > 0 else 0
            
            # Check common retracement levels
            fib_levels = [0.382, 0.5, 0.618, 0.786]
            min_error = min(abs(retracement_level - level) for level in fib_levels)
            
            if min_error < self.params["fibonacci_tolerance"]:
                confidence_scores.append(1.0)
            elif min_error < 2 * self.params["fibonacci_tolerance"]:
                confidence_scores.append(0.8)
            else:
                confidence_scores.append(0.6)
        else:
            # No preceding impulse wave found, less confidence
            confidence_scores.append(0.5)
        
        # Wave B often retraces 50-78.6% of Wave A
        wave_a_size = abs(wave_points[1].price - wave_points[0].price)
        wave_b_size = abs(wave_points[2].price - wave_points[1].price)
        b_to_a_ratio = wave_b_size / wave_a_size if wave_a_size > 0 else 0
        
        if 0.5 <= b_to_a_ratio <= 0.786:
            confidence_scores.append(1.0)
        elif 0.382 <= b_to_a_ratio <= 0.9:
            confidence_scores.append(0.7)
        else:
            confidence_scores.append(0.5)
        
        # Check if the volume diminishes in corrective waves compared to impulse waves
        if "volume" in df.columns:
            # Get average volume for this pattern
            avg_volume = df.iloc[wave_points[0].index:wave_points[2].index]['volume'].mean()
            
            # Compare to average volume in the dataset (rough approximation)
            overall_avg_volume = df['volume'].mean()
            
            if avg_volume < overall_avg_volume:
                confidence_scores.append(0.8)
            else:
                confidence_scores.append(0.6)
        
        # Final confidence is weighted average of all checks
        return sum(confidence_scores) / len(confidence_scores)
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Elliott Wave patterns."""
        signals = []
        
        if symbol not in self.detected_waves or timeframe not in self.detected_waves[symbol]:
            return signals
        
        df = self.data[symbol][timeframe]
        if df.empty:
            return signals
        
        current_price = df.iloc[-1]['close']
        current_timestamp = df.index[-1]
        
        for wave in self.detected_waves[symbol][timeframe]:
            if not wave.is_complete():
                continue
                
            # Only consider recent wave patterns that end near the current price
            last_wave_point = wave.wave_points[-1]
            time_difference = (current_timestamp - last_wave_point.timestamp) / np.timedelta64(1, 'h')
            
            # Skip older patterns (more than 24 hours old for example)
            if time_difference > 24:
                continue
            
            signal_type = None
            metadata = {
                "pattern_type": wave.pattern_type,
                "degree": wave.degree,
                "confidence": wave.confidence,
                "wave_points": [(p.price, p.timestamp) for p in wave.wave_points]
            }
            
            # Impulse Wave signals
            if wave.pattern_type == WavePattern.IMPULSE:
                # Bullish signal at end of 5-wave impulse pattern, expecting corrective wave
                if (wave.wave_points[0].wave_type == "low" and wave.wave_points[-1].wave_type == "high"):
                    signal_type = SignalType.SELL
                    metadata["expected_movement"] = "corrective down"
                    
                # Bearish signal at end of 5-wave impulse pattern, expecting corrective wave
                elif (wave.wave_points[0].wave_type == "high" and wave.wave_points[-1].wave_type == "low"):
                    signal_type = SignalType.BUY
                    metadata["expected_movement"] = "corrective up"
            
            # Corrective Wave signals
            elif wave.pattern_type == WavePattern.CORRECTIVE:
                # End of corrective wave may signal resumption of prior trend
                if (wave.wave_points[0].wave_type == "high" and wave.wave_points[-1].wave_type == "low"):
                    signal_type = SignalType.BUY
                    metadata["expected_movement"] = "impulse up"
                    
                elif (wave.wave_points[0].wave_type == "low" and wave.wave_points[-1].wave_type == "high"):
                    signal_type = SignalType.SELL
                    metadata["expected_movement"] = "impulse down"
            
            if signal_type:
                signals.append(
                    Signal(
                        symbol=symbol,
                        signal_type=signal_type,
                        price=current_price,
                        timestamp=int(current_timestamp.timestamp()),
                        confidence=wave.confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata=metadata
                    )
                )
        
        return signals
