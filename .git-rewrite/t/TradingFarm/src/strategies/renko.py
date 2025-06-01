import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional

from .base import BaseStrategy, Signal, SignalType
from ...config.config import RENKO_BRICK_SIZE, RENKO_USE_ATR, RENKO_ATR_PERIOD

logger = logging.getLogger(__name__)

class RenkoChartStrategy(BaseStrategy):
    """Implementation of Renko Chart Strategy."""
    
    def __init__(self, timeframes: List[str], symbols: List[str]):
        super().__init__("Renko Chart", timeframes, symbols)
        self.brick_size = RENKO_BRICK_SIZE
        self.use_atr = RENKO_USE_ATR
        self.atr_period = RENKO_ATR_PERIOD
        self.renko_data: Dict[str, Dict[str, pd.DataFrame]] = {}
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate Renko chart data and indicators."""
        df = self.data[symbol][timeframe]
        if len(df) < self.atr_period + 10:  # Need enough data to calculate ATR and establish trend
            return
        
        # Ensure we have the necessary columns
        if symbol not in self.renko_data:
            self.renko_data[symbol] = {}
        
        # Calculate Renko chart data
        self.renko_data[symbol][timeframe] = self._construct_renko_chart(df, symbol, timeframe)
    
    def _construct_renko_chart(self, df: pd.DataFrame, symbol: str, timeframe: str) -> pd.DataFrame:
        """Construct Renko chart from OHLC data."""
        # Initialize with the first price
        renko_prices = []
        renko_directions = []  # 1 for up, -1 for down
        
        # Calculate brick size
        brick_size = self.brick_size
        if self.use_atr:
            atr = self.calculate_atr(df, self.atr_period)
            # Use latest ATR value as brick size if available
            if not pd.isna(atr.iloc[-1]):
                brick_size = atr.iloc[-1]
        
        # If brick_size is percentage-based (e.g. 0.01 for 1%), convert to absolute value
        if brick_size < 1:
            # Use the mean price to determine the absolute brick size
            mean_price = df['close'].mean()
            brick_size = mean_price * brick_size
        
        # Start with the first close price
        current_price = df['close'].iloc[0]
        renko_prices.append(current_price)
        
        # Determine when to create new bricks
        for i in range(1, len(df)):
            close_price = df['close'].iloc[i]
            price_change = close_price - current_price
            
            # Check if price change is enough to create a new brick
            if abs(price_change) >= brick_size:
                # Calculate how many bricks to add
                num_bricks = int(price_change / brick_size)
                
                # Add each brick one by one
                for j in range(abs(num_bricks)):
                    if num_bricks > 0:
                        current_price += brick_size
                        renko_directions.append(1)  # Up brick
                    else:
                        current_price -= brick_size
                        renko_directions.append(-1)  # Down brick
                    
                    renko_prices.append(current_price)
        
        # Create DataFrame for Renko chart
        renko_df = pd.DataFrame({
            'price': renko_prices,
            'direction': [0] + renko_directions  # First brick has no direction
        })
        
        # Add trend indicators
        if len(renko_df) > 1:
            # Calculate trend based on consecutive bricks in the same direction
            renko_df['trend'] = 0
            current_trend = 0
            
            for i in range(1, len(renko_df)):
                if renko_df['direction'].iloc[i] == 1:
                    if current_trend >= 0:
                        current_trend += 1
                    else:
                        current_trend = 1
                elif renko_df['direction'].iloc[i] == -1:
                    if current_trend <= 0:
                        current_trend -= 1
                    else:
                        current_trend = -1
                
                renko_df.loc[renko_df.index[i], 'trend'] = current_trend
            
            # Add moving averages to identify potential reversals
            renko_df['ma_short'] = renko_df['price'].rolling(window=3).mean()
            renko_df['ma_medium'] = renko_df['price'].rolling(window=8).mean()
            renko_df['ma_long'] = renko_df['price'].rolling(window=13).mean()
        
        return renko_df
    
    def _identify_trend_reversals(self, renko_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify potential trend reversals in Renko chart."""
        if len(renko_df) < 5:  # Need at least 5 bricks for meaningful patterns
            return []
        
        reversals = []
        
        for i in range(4, len(renko_df)):
            # Check for bullish reversal pattern
            if (renko_df['trend'].iloc[i-3] <= -3 and
                renko_df['direction'].iloc[i-1] == 1 and
                renko_df['direction'].iloc[i] == 1):
                
                # Two consecutive up bricks after a downtrend
                reversals.append({
                    'index': i,
                    'type': 'bullish',
                    'price': renko_df['price'].iloc[i],
                    'strength': min(abs(renko_df['trend'].iloc[i-3]) / 5, 1.0),  # Strength based on prior trend length
                    'trend_length': abs(renko_df['trend'].iloc[i-3])
                })
            
            # Check for bearish reversal pattern
            elif (renko_df['trend'].iloc[i-3] >= 3 and
                  renko_df['direction'].iloc[i-1] == -1 and
                  renko_df['direction'].iloc[i] == -1):
                
                # Two consecutive down bricks after an uptrend
                reversals.append({
                    'index': i,
                    'type': 'bearish',
                    'price': renko_df['price'].iloc[i],
                    'strength': min(abs(renko_df['trend'].iloc[i-3]) / 5, 1.0),  # Strength based on prior trend length
                    'trend_length': abs(renko_df['trend'].iloc[i-3])
                })
            
            # Check for moving average crossovers
            if i > 13 and not pd.isna(renko_df['ma_short'].iloc[i]) and not pd.isna(renko_df['ma_long'].iloc[i]):
                # Bullish crossover: Short MA crosses above Long MA
                if (renko_df['ma_short'].iloc[i-1] <= renko_df['ma_long'].iloc[i-1] and
                    renko_df['ma_short'].iloc[i] > renko_df['ma_long'].iloc[i]):
                    
                    reversals.append({
                        'index': i,
                        'type': 'bullish_ma_crossover',
                        'price': renko_df['price'].iloc[i],
                        'strength': 0.7,  # Fixed strength for MA crossovers
                        'ma_short': renko_df['ma_short'].iloc[i],
                        'ma_long': renko_df['ma_long'].iloc[i]
                    })
                
                # Bearish crossover: Short MA crosses below Long MA
                elif (renko_df['ma_short'].iloc[i-1] >= renko_df['ma_long'].iloc[i-1] and
                      renko_df['ma_short'].iloc[i] < renko_df['ma_long'].iloc[i]):
                    
                    reversals.append({
                        'index': i,
                        'type': 'bearish_ma_crossover',
                        'price': renko_df['price'].iloc[i],
                        'strength': 0.7,  # Fixed strength for MA crossovers
                        'ma_short': renko_df['ma_short'].iloc[i],
                        'ma_long': renko_df['ma_long'].iloc[i]
                    })
        
        return reversals
    
    def _identify_continuation_patterns(self, renko_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Identify potential trend continuation patterns in Renko chart."""
        if len(renko_df) < 5:
            return []
        
        patterns = []
        
        for i in range(4, len(renko_df)):
            # Check for bullish continuation pattern
            if (renko_df['trend'].iloc[i] >= 3 and
                renko_df['direction'].iloc[i] == 1 and
                renko_df['direction'].iloc[i-1] == 1):
                
                # Series of consecutive up bricks in an uptrend
                patterns.append({
                    'index': i,
                    'type': 'bullish_continuation',
                    'price': renko_df['price'].iloc[i],
                    'strength': min(renko_df['trend'].iloc[i] / 8, 1.0),  # Strength based on trend length
                    'trend_length': renko_df['trend'].iloc[i]
                })
            
            # Check for bearish continuation pattern
            elif (renko_df['trend'].iloc[i] <= -3 and
                  renko_df['direction'].iloc[i] == -1 and
                  renko_df['direction'].iloc[i-1] == -1):
                
                # Series of consecutive down bricks in a downtrend
                patterns.append({
                    'index': i,
                    'type': 'bearish_continuation',
                    'price': renko_df['price'].iloc[i],
                    'strength': min(abs(renko_df['trend'].iloc[i]) / 8, 1.0),  # Strength based on trend length
                    'trend_length': abs(renko_df['trend'].iloc[i])
                })
            
            # Check for pullback pattern in a strong trend
            if i > 5:
                # Pullback in uptrend
                if (renko_df['trend'].iloc[i-3] >= 4 and
                    renko_df['direction'].iloc[i-2] == -1 and  # Pullback brick
                    renko_df['direction'].iloc[i-1] == 1 and   # Resumption brick
                    renko_df['direction'].iloc[i] == 1):       # Confirmation brick
                    
                    patterns.append({
                        'index': i,
                        'type': 'bullish_pullback',
                        'price': renko_df['price'].iloc[i],
                        'strength': 0.8,  # Higher confidence for pullback patterns
                        'trend_length': renko_df['trend'].iloc[i-3]
                    })
                
                # Pullback in downtrend
                elif (renko_df['trend'].iloc[i-3] <= -4 and
                      renko_df['direction'].iloc[i-2] == 1 and   # Pullback brick
                      renko_df['direction'].iloc[i-1] == -1 and  # Resumption brick
                      renko_df['direction'].iloc[i] == -1):      # Confirmation brick
                    
                    patterns.append({
                        'index': i,
                        'type': 'bearish_pullback',
                        'price': renko_df['price'].iloc[i],
                        'strength': 0.8,  # Higher confidence for pullback patterns
                        'trend_length': abs(renko_df['trend'].iloc[i-3])
                    })
        
        return patterns
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Renko chart analysis."""
        signals = []
        
        if (symbol not in self.data or timeframe not in self.data[symbol] or
            symbol not in self.renko_data or timeframe not in self.renko_data[symbol]):
            return signals
        
        df = self.data[symbol][timeframe]
        renko_df = self.renko_data[symbol][timeframe]
        
        if len(df) < self.atr_period + 10 or len(renko_df) < 5:
            return signals
        
        # Get latest candle from the OHLC data
        latest_candle = df.iloc[-1]
        latest_close = latest_candle['close']
        latest_timestamp = latest_candle.name
        
        # Identify reversal and continuation patterns
        reversals = self._identify_trend_reversals(renko_df)
        continuations = self._identify_continuation_patterns(renko_df)
        
        # Process reversal patterns
        if reversals:
            latest_reversal = reversals[-1]
            
            # Only generate signals for recent reversals
            if latest_reversal['index'] >= len(renko_df) - 3:
                if latest_reversal['type'] == 'bullish' or latest_reversal['type'] == 'bullish_ma_crossover':
                    signal_type = SignalType.BUY
                    confidence = latest_reversal['strength'] * 0.9  # Slightly discount the strength
                    
                    metadata = {
                        'pattern_type': latest_reversal['type'],
                        'trend_length': latest_reversal.get('trend_length', 0),
                        'renko_price': latest_reversal['price'],
                        'ma_short': latest_reversal.get('ma_short'),
                        'ma_long': latest_reversal.get('ma_long')
                    }
                    
                    signals.append(Signal(
                        symbol=symbol,
                        signal_type=signal_type,
                        price=latest_close,
                        timestamp=latest_timestamp,
                        confidence=confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata=metadata
                    ))
                
                elif latest_reversal['type'] == 'bearish' or latest_reversal['type'] == 'bearish_ma_crossover':
                    signal_type = SignalType.SELL
                    confidence = latest_reversal['strength'] * 0.9  # Slightly discount the strength
                    
                    metadata = {
                        'pattern_type': latest_reversal['type'],
                        'trend_length': latest_reversal.get('trend_length', 0),
                        'renko_price': latest_reversal['price'],
                        'ma_short': latest_reversal.get('ma_short'),
                        'ma_long': latest_reversal.get('ma_long')
                    }
                    
                    signals.append(Signal(
                        symbol=symbol,
                        signal_type=signal_type,
                        price=latest_close,
                        timestamp=latest_timestamp,
                        confidence=confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata=metadata
                    ))
        
        # Process continuation patterns
        if continuations:
            latest_continuation = continuations[-1]
            
            # Only generate signals for recent continuations
            if latest_continuation['index'] >= len(renko_df) - 3:
                if latest_continuation['type'] == 'bullish_continuation' or latest_continuation['type'] == 'bullish_pullback':
                    signal_type = SignalType.BUY
                    confidence = latest_continuation['strength'] * 0.95  # Higher confidence for continuations
                    
                    metadata = {
                        'pattern_type': latest_continuation['type'],
                        'trend_length': latest_continuation['trend_length'],
                        'renko_price': latest_continuation['price']
                    }
                    
                    signals.append(Signal(
                        symbol=symbol,
                        signal_type=signal_type,
                        price=latest_close,
                        timestamp=latest_timestamp,
                        confidence=confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata=metadata
                    ))
                
                elif latest_continuation['type'] == 'bearish_continuation' or latest_continuation['type'] == 'bearish_pullback':
                    signal_type = SignalType.SELL
                    confidence = latest_continuation['strength'] * 0.95  # Higher confidence for continuations
                    
                    metadata = {
                        'pattern_type': latest_continuation['type'],
                        'trend_length': latest_continuation['trend_length'],
                        'renko_price': latest_continuation['price']
                    }
                    
                    signals.append(Signal(
                        symbol=symbol,
                        signal_type=signal_type,
                        price=latest_close,
                        timestamp=latest_timestamp,
                        confidence=confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata=metadata
                    ))
        
        return signals
