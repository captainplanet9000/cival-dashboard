"""
Simple Trend Strategy for Hyperliquid trading.
Combines EMA crossovers, RSI, and volume analysis.
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime

from .base import BaseStrategy, Signal, SignalType

logger = logging.getLogger(__name__)

class SimpleTrendStrategy(BaseStrategy):
    """
    A trend-following strategy that uses EMA crossovers, RSI, and volume analysis.
    
    Features:
    - EMA crossover for trend direction
    - RSI for overbought/oversold conditions
    - Volume confirmation for trend strength
    """
    
    def __init__(
        self,
        name: str = "SimpleTrend",
        timeframes: List[str] = ["5m", "15m", "1h", "4h"],
        symbols: List[str] = ["BTC-USD", "ETH-USD"],
        ema_short: int = 9,
        ema_long: int = 21,
        rsi_period: int = 14,
        rsi_overbought: int = 70,
        rsi_oversold: int = 30,
        volume_threshold: float = 1.5  # Volume must be X times the average
    ):
        """
        Initialize the Simple Trend Strategy.
        
        Args:
            name: Strategy name
            timeframes: List of timeframes to analyze
            symbols: List of symbols to trade
            ema_short: Short EMA period
            ema_long: Long EMA period
            rsi_period: RSI calculation period
            rsi_overbought: RSI level considered overbought
            rsi_oversold: RSI level considered oversold
            volume_threshold: Minimum volume multiplier over average to confirm signal
        """
        super().__init__(name, timeframes, symbols)
        self.ema_short = ema_short
        self.ema_long = ema_long
        self.rsi_period = rsi_period
        self.rsi_overbought = rsi_overbought
        self.rsi_oversold = rsi_oversold
        self.volume_threshold = volume_threshold
        
        logger.info(f"SimpleTrendStrategy initialized with EMA({ema_short},{ema_long}), RSI({rsi_period})")
    
    def _calculate_indicators(self, symbol: str, timeframe: str):
        """Calculate technical indicators for a specific symbol and timeframe."""
        df = self.data[symbol][timeframe]
        
        if len(df) < self.ema_long + 10:  # Need enough data to calculate indicators
            logger.debug(f"Not enough data for {symbol} {timeframe} to calculate indicators")
            return
        
        # Calculate EMAs
        df['ema_short'] = df['close'].ewm(span=self.ema_short, adjust=False).mean()
        df['ema_long'] = df['close'].ewm(span=self.ema_long, adjust=False).mean()
        
        # Calculate RSI
        df['rsi'] = self.calculate_rsi(df, period=self.rsi_period)
        
        # Calculate volume indicators
        df['volume_sma'] = df['volume'].rolling(window=20).mean()
        df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Calculate trend direction
        df['trend'] = 0  # 0 = neutral, 1 = bullish, -1 = bearish
        df.loc[df['ema_short'] > df['ema_long'], 'trend'] = 1
        df.loc[df['ema_short'] < df['ema_long'], 'trend'] = -1
        
        # Calculate crossovers
        df['crossover'] = 0  # 0 = no crossover, 1 = bullish, -1 = bearish
        
        # Previous values shifted
        prev_ema_short = df['ema_short'].shift(1)
        prev_ema_long = df['ema_long'].shift(1)
        
        # Bullish crossover (short crosses above long)
        bullish_crossover = (df['ema_short'] > df['ema_long']) & (prev_ema_short <= prev_ema_long)
        df.loc[bullish_crossover, 'crossover'] = 1
        
        # Bearish crossover (short crosses below long)
        bearish_crossover = (df['ema_short'] < df['ema_long']) & (prev_ema_short >= prev_ema_long)
        df.loc[bearish_crossover, 'crossover'] = -1
        
        # Update the data
        self.data[symbol][timeframe] = df
    
    def generate_signals(self, symbol: str, timeframe: str) -> List[Signal]:
        """Generate trading signals for a specific symbol and timeframe."""
        if symbol not in self.data or timeframe not in self.data[symbol]:
            return []
            
        df = self.data[symbol][timeframe]
        
        if len(df) < self.ema_long + 10:  # Need enough data
            return []
        
        signals = []
        last_idx = df.index[-1]
        last_row = df.iloc[-1]
        
        # Skip if indicators not calculated yet
        if 'ema_short' not in df.columns or 'rsi' not in df.columns:
            return []
        
        # Check for signals
        if last_row['crossover'] == 1:  # Bullish crossover
            if last_row['rsi'] < 70:  # Not overbought
                if last_row['volume_ratio'] >= self.volume_threshold:  # Volume confirmation
                    confidence = min(last_row['volume_ratio'] / 3, 0.95)  # Cap confidence at 0.95
                    
                    signal = Signal(
                        symbol=symbol,
                        signal_type=SignalType.BUY,
                        price=last_row['close'],
                        timestamp=int(last_idx),
                        confidence=confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata={
                            "reason": "Bullish EMA crossover with volume confirmation",
                            "ema_short": last_row['ema_short'],
                            "ema_long": last_row['ema_long'],
                            "rsi": last_row['rsi'],
                            "volume_ratio": last_row['volume_ratio']
                        }
                    )
                    signals.append(signal)
                    
        elif last_row['crossover'] == -1:  # Bearish crossover
            if last_row['rsi'] > 30:  # Not oversold
                if last_row['volume_ratio'] >= self.volume_threshold:  # Volume confirmation
                    confidence = min(last_row['volume_ratio'] / 3, 0.95)  # Cap confidence at 0.95
                    
                    signal = Signal(
                        symbol=symbol,
                        signal_type=SignalType.SELL,
                        price=last_row['close'],
                        timestamp=int(last_idx),
                        confidence=confidence,
                        strategy_name=self.name,
                        timeframe=timeframe,
                        metadata={
                            "reason": "Bearish EMA crossover with volume confirmation",
                            "ema_short": last_row['ema_short'],
                            "ema_long": last_row['ema_long'],
                            "rsi": last_row['rsi'],
                            "volume_ratio": last_row['volume_ratio']
                        }
                    )
                    signals.append(signal)
        
        # RSI Oversold/Overbought signals (secondary)
        if last_row['rsi'] <= self.rsi_oversold and last_row['trend'] == -1:
            # Potential reversal from downtrend (RSI oversold)
            confidence = 0.5 + ((self.rsi_oversold - last_row['rsi']) / 100)  # Higher confidence as RSI gets lower
            
            signal = Signal(
                symbol=symbol,
                signal_type=SignalType.BUY,
                price=last_row['close'],
                timestamp=int(last_idx),
                confidence=min(confidence, 0.85),  # Cap at 0.85 for RSI signals
                strategy_name=self.name,
                timeframe=timeframe,
                metadata={
                    "reason": "RSI oversold in downtrend",
                    "rsi": last_row['rsi'],
                    "trend": "bearish",
                    "ema_short": last_row['ema_short'],
                    "ema_long": last_row['ema_long']
                }
            )
            signals.append(signal)
            
        elif last_row['rsi'] >= self.rsi_overbought and last_row['trend'] == 1:
            # Potential reversal from uptrend (RSI overbought)
            confidence = 0.5 + ((last_row['rsi'] - self.rsi_overbought) / 100)  # Higher confidence as RSI gets higher
            
            signal = Signal(
                symbol=symbol,
                signal_type=SignalType.SELL,
                price=last_row['close'],
                timestamp=int(last_idx),
                confidence=min(confidence, 0.85),  # Cap at 0.85 for RSI signals
                strategy_name=self.name,
                timeframe=timeframe,
                metadata={
                    "reason": "RSI overbought in uptrend",
                    "rsi": last_row['rsi'],
                    "trend": "bullish",
                    "ema_short": last_row['ema_short'],
                    "ema_long": last_row['ema_long']
                }
            )
            signals.append(signal)
        
        # Log signals
        for signal in signals:
            logger.info(f"Generated {signal}")
        
        return signals
    
    async def update_data(self, symbol: str, timeframe: str):
        """
        Async wrapper for updating strategy data from exchange.
        In a real implementation, this would fetch candle data from an API.
        """
        # This is a placeholder - in a real implementation, you would:
        # 1. Fetch candle data from the exchange API for this symbol and timeframe
        # 2. Format the data as needed
        # 3. Call self.update_data(symbol, timeframe, candles)
        
        # For now, we'll just log that we would be fetching data
        logger.info(f"Would fetch candle data for {symbol} {timeframe}")
        
        # In a real implementation, you would do something like:
        # candles = await exchange_client.get_candles(symbol, timeframe)
        # self.update_data(symbol, timeframe, candles)
        
        # Since we can't actually fetch data here, we'll just make sure the data structure exists
        self._ensure_data_initialized(symbol, timeframe)
    
    async def update_orderbook(self, symbol: str, orderbook: Dict[str, Any]):
        """Process updates to the order book."""
        # In a real strategy, you might use order book data to make trading decisions
        logger.debug(f"Received orderbook update for {symbol}")
        
        # Example: Check if there's significant buy/sell imbalance
        if 'bids' in orderbook and 'asks' in orderbook:
            bids = orderbook['bids']
            asks = orderbook['asks']
            
            if bids and asks:
                # Calculate total volume at top 5 levels
                bid_volume = sum(bid['quantity'] for bid in bids[:5])
                ask_volume = sum(ask['quantity'] for ask in asks[:5])
                
                # Calculate buy/sell ratio
                if ask_volume > 0:
                    buy_sell_ratio = bid_volume / ask_volume
                    logger.debug(f"{symbol} buy/sell ratio: {buy_sell_ratio:.2f}")
                    
                    # You could store this for use in your signal generation
                    # For example, a high buy_sell_ratio might strengthen a buy signal
    
    async def update_trades(self, symbol: str, trades: List[Dict[str, Any]]):
        """Process updates to recent trades."""
        # In a real strategy, you might use recent trade data to make trading decisions
        logger.debug(f"Received {len(trades)} trades for {symbol}")
        
        # Example: Calculate average price and volume
        if trades:
            prices = [trade['price'] for trade in trades]
            volumes = [trade['quantity'] for trade in trades]
            
            avg_price = sum(p * v for p, v in zip(prices, volumes)) / sum(volumes) if sum(volumes) > 0 else 0
            total_volume = sum(volumes)
            
            logger.debug(f"{symbol} avg price: {avg_price:.2f}, total volume: {total_volume:.2f}")
            
            # You could store this for use in your signal generation
            # For example, a sudden spike in volume might indicate a strong move
