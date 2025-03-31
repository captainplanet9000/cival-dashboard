import logging
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional

from .base import BaseStrategy, Signal, SignalType
from ...config.config import ICHIMOKU_TENKAN_PERIOD, ICHIMOKU_KIJUN_PERIOD, ICHIMOKU_SENKOU_B_PERIOD, ICHIMOKU_DISPLACEMENT

logger = logging.getLogger(__name__)

class IchimokuCloudStrategy(BaseStrategy):
    """Implementation of Ichimoku Cloud Strategy."""
    
    def __init__(self, timeframes: List[str], symbols: List[str]):
        super().__init__("Ichimoku Cloud", timeframes, symbols)
        self.tenkan_period = ICHIMOKU_TENKAN_PERIOD
        self.kijun_period = ICHIMOKU_KIJUN_PERIOD
        self.senkou_b_period = ICHIMOKU_SENKOU_B_PERIOD
        self.displacement = ICHIMOKU_DISPLACEMENT
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate Ichimoku Cloud indicators."""
        df = self.data[symbol][timeframe]
        if len(df) < self.senkou_b_period + self.displacement:  # Need enough data for calculations
            return
        
        # Calculate Tenkan-sen (Conversion Line)
        tenkan_high = df['high'].rolling(window=self.tenkan_period).max()
        tenkan_low = df['low'].rolling(window=self.tenkan_period).min()
        df['tenkan_sen'] = (tenkan_high + tenkan_low) / 2
        
        # Calculate Kijun-sen (Base Line)
        kijun_high = df['high'].rolling(window=self.kijun_period).max()
        kijun_low = df['low'].rolling(window=self.kijun_period).min()
        df['kijun_sen'] = (kijun_high + kijun_low) / 2
        
        # Calculate Senkou Span A (Leading Span A)
        df['senkou_span_a'] = ((df['tenkan_sen'] + df['kijun_sen']) / 2).shift(self.displacement)
        
        # Calculate Senkou Span B (Leading Span B)
        senkou_high = df['high'].rolling(window=self.senkou_b_period).max()
        senkou_low = df['low'].rolling(window=self.senkou_b_period).min()
        df['senkou_span_b'] = ((senkou_high + senkou_low) / 2).shift(self.displacement)
        
        # Calculate Chikou Span (Lagging Span)
        df['chikou_span'] = df['close'].shift(-self.displacement)
        
        # Calculate additional indicators for signal generation
        # Tenkan-sen/Kijun-sen Cross
        df['tk_cross'] = 0
        df.loc[df['tenkan_sen'] > df['kijun_sen'], 'tk_cross'] = 1
        df.loc[df['tenkan_sen'] < df['kijun_sen'], 'tk_cross'] = -1
        
        # Cloud color (bullish when Senkou Span A > Senkou Span B)
        df['cloud_green'] = df['senkou_span_a'] > df['senkou_span_b']
        
        # Price relative to cloud
        df['price_above_cloud'] = df['close'] > df['senkou_span_a'].fillna(0)
        df['price_below_cloud'] = df['close'] < df['senkou_span_b'].fillna(0)
        df['price_in_cloud'] = ~(df['price_above_cloud'] | df['price_below_cloud'])
        
        # Chikou Span relative to price
        df['chikou_above_price'] = df['chikou_span'] > df['close'].shift(self.displacement)
    
    def _check_bullish_conditions(self, df: pd.DataFrame, index: int) -> Tuple[bool, float]:
        """Check conditions for a bullish signal and calculate confidence."""
        # Need to have enough historical data
        if index < self.senkou_b_period + self.displacement or index >= len(df):
            return False, 0.0
        
        confidence = 0.5  # Base confidence
        bullish_conditions = 0
        total_conditions = 5
        
        # Condition 1: Price is above the cloud
        if df['price_above_cloud'].iloc[index]:
            bullish_conditions += 1
            confidence += 0.1
        
        # Condition 2: Tenkan-sen crossed above Kijun-sen recently
        recent_cross = False
        for i in range(max(0, index - 5), index + 1):
            if df['tk_cross'].iloc[i-1] <= 0 and df['tk_cross'].iloc[i] > 0:
                recent_cross = True
                break
        
        if recent_cross:
            bullish_conditions += 1
            confidence += 0.1
        
        # Condition 3: Chikou Span is above the price from 26 periods ago
        if index - self.displacement >= 0 and df['chikou_above_price'].iloc[index - self.displacement]:
            bullish_conditions += 1
            confidence += 0.1
        
        # Condition 4: The cloud ahead is green (bullish)
        future_cloud_bullish = False
        for i in range(index, min(index + self.displacement, len(df))):
            if df['cloud_green'].iloc[i]:
                future_cloud_bullish = True
                break
        
        if future_cloud_bullish:
            bullish_conditions += 1
            confidence += 0.1
        
        # Condition 5: Tenkan-sen is above Kijun-sen
        if df['tenkan_sen'].iloc[index] > df['kijun_sen'].iloc[index]:
            bullish_conditions += 1
            confidence += 0.1
        
        # Calculate final confidence based on number of conditions met
        is_bullish = bullish_conditions >= 3  # At least 3 conditions must be met
        
        return is_bullish, min(confidence, 1.0)
    
    def _check_bearish_conditions(self, df: pd.DataFrame, index: int) -> Tuple[bool, float]:
        """Check conditions for a bearish signal and calculate confidence."""
        # Need to have enough historical data
        if index < self.senkou_b_period + self.displacement or index >= len(df):
            return False, 0.0
        
        confidence = 0.5  # Base confidence
        bearish_conditions = 0
        total_conditions = 5
        
        # Condition 1: Price is below the cloud
        if df['price_below_cloud'].iloc[index]:
            bearish_conditions += 1
            confidence += 0.1
        
        # Condition 2: Tenkan-sen crossed below Kijun-sen recently
        recent_cross = False
        for i in range(max(0, index - 5), index + 1):
            if df['tk_cross'].iloc[i-1] >= 0 and df['tk_cross'].iloc[i] < 0:
                recent_cross = True
                break
        
        if recent_cross:
            bearish_conditions += 1
            confidence += 0.1
        
        # Condition 3: Chikou Span is below the price from 26 periods ago
        if index - self.displacement >= 0 and not df['chikou_above_price'].iloc[index - self.displacement]:
            bearish_conditions += 1
            confidence += 0.1
        
        # Condition 4: The cloud ahead is red (bearish)
        future_cloud_bearish = False
        for i in range(index, min(index + self.displacement, len(df))):
            if not df['cloud_green'].iloc[i]:
                future_cloud_bearish = True
                break
        
        if future_cloud_bearish:
            bearish_conditions += 1
            confidence += 0.1
        
        # Condition 5: Tenkan-sen is below Kijun-sen
        if df['tenkan_sen'].iloc[index] < df['kijun_sen'].iloc[index]:
            bearish_conditions += 1
            confidence += 0.1
        
        # Calculate final confidence based on number of conditions met
        is_bearish = bearish_conditions >= 3  # At least 3 conditions must be met
        
        return is_bearish, min(confidence, 1.0)
    
    def _calculate_support_resistance(self, df: pd.DataFrame, index: int) -> Dict[str, float]:
        """Calculate support and resistance levels based on Ichimoku components."""
        levels = {}
        
        # The Kijun-sen (Base Line) often acts as support/resistance
        levels['kijun'] = df['kijun_sen'].iloc[index]
        
        # The edges of the cloud can also act as support/resistance
        if df['senkou_span_a'].iloc[index] > df['senkou_span_b'].iloc[index]:
            levels['cloud_top'] = df['senkou_span_a'].iloc[index]
            levels['cloud_bottom'] = df['senkou_span_b'].iloc[index]
        else:
            levels['cloud_top'] = df['senkou_span_b'].iloc[index]
            levels['cloud_bottom'] = df['senkou_span_a'].iloc[index]
        
        # Tenkan-sen can be a minor support/resistance level
        levels['tenkan'] = df['tenkan_sen'].iloc[index]
        
        return levels
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals based on Ichimoku Cloud analysis."""
        signals = []
        
        if symbol not in self.data or timeframe not in self.data[symbol]:
            return signals
        
        df = self.data[symbol][timeframe]
        if len(df) < self.senkou_b_period + self.displacement:
            return signals
        
        # Get the latest candle
        latest_index = len(df) - 1
        latest_candle = df.iloc[latest_index]
        latest_close = latest_candle['close']
        latest_timestamp = latest_candle.name
        
        # Check for bullish signal
        is_bullish, bullish_confidence = self._check_bullish_conditions(df, latest_index)
        if is_bullish:
            # Calculate support levels for stop loss
            levels = self._calculate_support_resistance(df, latest_index)
            
            # Default stop loss is below the Kijun-sen or cloud bottom
            if latest_close > levels['kijun']:
                stop_loss = levels['kijun']
            else:
                stop_loss = levels['cloud_bottom']
            
            # Calculate target based on recent price action
            recent_high = df['high'].iloc[max(0, latest_index - self.kijun_period):latest_index + 1].max()
            target_price = latest_close + (latest_close - stop_loss) * 1.5  # Risk:Reward ratio of 1:1.5
            
            # If there's a recent high, use it as reference for the target
            if recent_high > latest_close:
                target_price = min(target_price, recent_high + (recent_high - latest_close) * 0.5)
            
            metadata = {
                'tenkan': levels['tenkan'],
                'kijun': levels['kijun'],
                'cloud_top': levels['cloud_top'],
                'cloud_bottom': levels['cloud_bottom'],
                'cloud_color': 'green' if df['cloud_green'].iloc[latest_index] else 'red',
                'tk_cross_direction': 'bullish' if df['tk_cross'].iloc[latest_index] > 0 else 'bearish',
                'price_position': 'above_cloud' if df['price_above_cloud'].iloc[latest_index] else
                                 'below_cloud' if df['price_below_cloud'].iloc[latest_index] else 'in_cloud',
                'stop_loss': stop_loss,
                'target_price': target_price
            }
            
            signals.append(Signal(
                symbol=symbol,
                signal_type=SignalType.BUY,
                price=latest_close,
                timestamp=latest_timestamp,
                confidence=bullish_confidence,
                strategy_name=self.name,
                timeframe=timeframe,
                metadata=metadata
            ))
        
        # Check for bearish signal
        is_bearish, bearish_confidence = self._check_bearish_conditions(df, latest_index)
        if is_bearish:
            # Calculate resistance levels for stop loss
            levels = self._calculate_support_resistance(df, latest_index)
            
            # Default stop loss is above the Kijun-sen or cloud top
            if latest_close < levels['kijun']:
                stop_loss = levels['kijun']
            else:
                stop_loss = levels['cloud_top']
            
            # Calculate target based on recent price action
            recent_low = df['low'].iloc[max(0, latest_index - self.kijun_period):latest_index + 1].min()
            target_price = latest_close - (stop_loss - latest_close) * 1.5  # Risk:Reward ratio of 1:1.5
            
            # If there's a recent low, use it as reference for the target
            if recent_low < latest_close:
                target_price = max(target_price, recent_low - (latest_close - recent_low) * 0.5)
            
            metadata = {
                'tenkan': levels['tenkan'],
                'kijun': levels['kijun'],
                'cloud_top': levels['cloud_top'],
                'cloud_bottom': levels['cloud_bottom'],
                'cloud_color': 'green' if df['cloud_green'].iloc[latest_index] else 'red',
                'tk_cross_direction': 'bullish' if df['tk_cross'].iloc[latest_index] > 0 else 'bearish',
                'price_position': 'above_cloud' if df['price_above_cloud'].iloc[latest_index] else
                                 'below_cloud' if df['price_below_cloud'].iloc[latest_index] else 'in_cloud',
                'stop_loss': stop_loss,
                'target_price': target_price
            }
            
            signals.append(Signal(
                symbol=symbol,
                signal_type=SignalType.SELL,
                price=latest_close,
                timestamp=latest_timestamp,
                confidence=bearish_confidence,
                strategy_name=self.name,
                timeframe=timeframe,
                metadata=metadata
            ))
        
        return signals
