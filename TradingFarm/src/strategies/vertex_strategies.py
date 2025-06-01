"""
Vertex Protocol Trading Strategies

This module provides strategy implementations for trading on Vertex Protocol.
Strategies can be used by VertexAgent for automated trading decisions.
"""

import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union
import numpy as np
from decimal import Decimal

from .base import BaseStrategy

# Set up logging
logger = logging.getLogger(__name__)

class VertexMeanReversionStrategy(BaseStrategy):
    """
    Mean reversion trading strategy for Vertex Protocol.
    
    Identifies assets that have deviated from their historical mean price
    and generates signals to profit from their expected reversion to the mean.
    """
    
    def __init__(self, 
                 lookback_period: int = 24,      # 24 hour lookback
                 entry_threshold: float = 2.0,    # 2 standard deviations
                 exit_threshold: float = 0.5,     # 0.5 standard deviations
                 max_position_size: Dict[str, float] = None,
                 stop_loss_pct: float = 0.05):    # 5% stop loss
        """
        Initialize the mean reversion strategy
        
        Args:
            lookback_period: Period (in hours) to look back for price analysis
            entry_threshold: Standard deviation threshold for entry (higher = stronger signal)
            exit_threshold: Standard deviation threshold for exit (lower = quicker exit)
            max_position_size: Maximum position size per market
            stop_loss_pct: Stop loss percentage
        """
        super().__init__()
        self.name = "vertex_mean_reversion"
        self.lookback_period = lookback_period
        self.entry_threshold = entry_threshold
        self.exit_threshold = exit_threshold
        self.stop_loss_pct = stop_loss_pct
        self.max_position_size = max_position_size or {
            "ETH-PERP": 1.0,
            "BTC-PERP": 0.05,
            "SOL-PERP": 10.0,
            "SUI-PERP": 100.0
        }
        
        # Track active positions
        self.positions = {}
        
        # Track market state
        self.market_states = {}
        
        logger.info(f"Initialized VertexMeanReversionStrategy with lookback_period={lookback_period}, "
                   f"entry_threshold={entry_threshold}, exit_threshold={exit_threshold}, "
                   f"stop_loss_pct={stop_loss_pct}")
    
    def generate_signals(self, market_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate trading signals based on market data
        
        Args:
            market_data: Market data for analysis
            
        Returns:
            List of trading signals
        """
        signals = []
        
        try:
            # Extract market information
            symbol = market_data.get("symbol", "UNKNOWN")
            price_history = market_data.get("price_history", [])
            current_price = market_data.get("current_price", 0)
            
            # Extract position information
            positions = market_data.get("positions", [])
            for pos in positions:
                position_symbol = pos.get("symbol")
                if position_symbol:
                    self.positions[position_symbol] = pos
            
            # Check if we have enough data
            if not price_history or len(price_history) < 2 or current_price == 0:
                logger.warning(f"Insufficient market data for {symbol}")
                return signals
            
            # Calculate mean and standard deviation
            prices = [float(p.get("price", 0)) for p in price_history]
            mean_price = np.mean(prices)
            std_price = np.std(prices)
            
            if std_price == 0:
                # Avoid division by zero
                return signals
            
            # Calculate Z-score (number of standard deviations from mean)
            z_score = (current_price - mean_price) / std_price
            
            # Update market state
            self.market_states[symbol] = {
                "mean_price": mean_price,
                "std_price": std_price,
                "z_score": z_score,
                "current_price": current_price,
                "timestamp": time.time()
            }
            
            # Check for current position
            current_position = self.positions.get(symbol)
            
            # Generate entry signals if no position exists
            if not current_position:
                if z_score <= -self.entry_threshold:
                    # Price is significantly below mean, go long
                    size = self.max_position_size.get(symbol, 1.0)
                    
                    signals.append({
                        "action": "open_long",
                        "symbol": symbol,
                        "size": size,
                        "price": None,  # Market order
                        "reason": f"Mean reversion long: price {z_score:.2f} std below mean",
                        "timestamp": time.time()
                    })
                
                elif z_score >= self.entry_threshold:
                    # Price is significantly above mean, go short
                    size = self.max_position_size.get(symbol, 1.0)
                    
                    signals.append({
                        "action": "open_short",
                        "symbol": symbol,
                        "size": size,
                        "price": None,  # Market order
                        "reason": f"Mean reversion short: price {z_score:.2f} std above mean",
                        "timestamp": time.time()
                    })
            
            # Generate exit signals for existing positions
            else:
                position_size = float(current_position.get("size", 0))
                position_entry_price = float(current_position.get("entry_price", 0))
                position_side = current_position.get("side", "").lower()
                
                # Calculate current P&L
                if position_side == "long":
                    pnl_pct = (current_price - position_entry_price) / position_entry_price if position_entry_price > 0 else 0
                    
                    # Exit if price reverted to mean or stop loss hit
                    if z_score >= -self.exit_threshold or pnl_pct <= -self.stop_loss_pct:
                        signals.append({
                            "action": "close_position",
                            "symbol": symbol,
                            "reason": (f"Mean reversion target reached: {z_score:.2f} std" if z_score >= -self.exit_threshold
                                      else f"Stop loss triggered: {pnl_pct:.2%}"),
                            "timestamp": time.time()
                        })
                
                elif position_side == "short":
                    pnl_pct = (position_entry_price - current_price) / position_entry_price if position_entry_price > 0 else 0
                    
                    # Exit if price reverted to mean or stop loss hit
                    if z_score <= self.exit_threshold or pnl_pct <= -self.stop_loss_pct:
                        signals.append({
                            "action": "close_position",
                            "symbol": symbol,
                            "reason": (f"Mean reversion target reached: {z_score:.2f} std" if z_score <= self.exit_threshold
                                      else f"Stop loss triggered: {pnl_pct:.2%}"),
                            "timestamp": time.time()
                        })
            
            logger.debug(f"Generated {len(signals)} signals for {symbol}")
            
        except Exception as e:
            logger.error(f"Error generating mean reversion signals: {str(e)}")
        
        return signals


class VertexTrendFollowingStrategy(BaseStrategy):
    """
    Trend following trading strategy for Vertex Protocol.
    
    Identifies and follows market trends using moving averages.
    """
    
    def __init__(self, 
                 short_ma_period: int = 5,       # 5 hour MA
                 long_ma_period: int = 20,       # 20 hour MA 
                 max_position_size: Dict[str, float] = None,
                 trailing_stop_pct: float = 0.03):  # 3% trailing stop
        """
        Initialize the trend following strategy
        
        Args:
            short_ma_period: Period for short moving average
            long_ma_period: Period for long moving average
            max_position_size: Maximum position size per market
            trailing_stop_pct: Trailing stop percentage
        """
        super().__init__()
        self.name = "vertex_trend_following"
        self.short_ma_period = short_ma_period
        self.long_ma_period = long_ma_period
        self.trailing_stop_pct = trailing_stop_pct
        self.max_position_size = max_position_size or {
            "ETH-PERP": 1.0,
            "BTC-PERP": 0.05,
            "SOL-PERP": 10.0,
            "SUI-PERP": 100.0
        }
        
        # Track highest/lowest since entry for trailing stops
        self.price_extremes = {}
        
        # Track active positions
        self.positions = {}
        
        logger.info(f"Initialized VertexTrendFollowingStrategy with short_ma_period={short_ma_period}, "
                   f"long_ma_period={long_ma_period}, trailing_stop_pct={trailing_stop_pct}")
    
    def generate_signals(self, market_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate trading signals based on market data
        
        Args:
            market_data: Market data for analysis
            
        Returns:
            List of trading signals
        """
        signals = []
        
        try:
            # Extract market information
            symbol = market_data.get("symbol", "UNKNOWN")
            price_history = market_data.get("price_history", [])
            current_price = market_data.get("current_price", 0)
            
            # Extract position information
            positions = market_data.get("positions", [])
            for pos in positions:
                position_symbol = pos.get("symbol")
                if position_symbol:
                    self.positions[position_symbol] = pos
            
            # Check if we have enough data
            if (not price_history or 
                len(price_history) < self.long_ma_period or 
                current_price == 0):
                logger.warning(f"Insufficient market data for {symbol}")
                return signals
            
            # Calculate moving averages
            prices = [float(p.get("price", 0)) for p in price_history]
            
            # More recent prices at the end of the list
            short_ma = np.mean(prices[-self.short_ma_period:])
            long_ma = np.mean(prices[-self.long_ma_period:])
            
            # Determine trend direction
            trend_up = short_ma > long_ma
            trend_down = short_ma < long_ma
            
            # Check for current position
            current_position = self.positions.get(symbol)
            
            # Generate entry signals if no position exists
            if not current_position:
                if trend_up:
                    # Upward trend detected, go long
                    size = self.max_position_size.get(symbol, 1.0)
                    
                    signals.append({
                        "action": "open_long",
                        "symbol": symbol,
                        "size": size,
                        "price": None,  # Market order
                        "reason": f"Trend following long: short MA {short_ma:.2f} > long MA {long_ma:.2f}",
                        "timestamp": time.time()
                    })
                    
                    # Initialize price extreme for trailing stop
                    self.price_extremes[symbol] = {
                        "highest": current_price,
                        "lowest": current_price,
                        "entry_price": current_price,
                        "side": "long"
                    }
                
                elif trend_down:
                    # Downward trend detected, go short
                    size = self.max_position_size.get(symbol, 1.0)
                    
                    signals.append({
                        "action": "open_short",
                        "symbol": symbol,
                        "size": size,
                        "price": None,  # Market order
                        "reason": f"Trend following short: short MA {short_ma:.2f} < long MA {long_ma:.2f}",
                        "timestamp": time.time()
                    })
                    
                    # Initialize price extreme for trailing stop
                    self.price_extremes[symbol] = {
                        "highest": current_price,
                        "lowest": current_price,
                        "entry_price": current_price,
                        "side": "short"
                    }
            
            # Update price extremes for trailing stops
            if symbol in self.price_extremes:
                extremes = self.price_extremes[symbol]
                side = extremes.get("side")
                
                if side == "long":
                    # Update highest price seen
                    if current_price > extremes["highest"]:
                        extremes["highest"] = current_price
                
                elif side == "short":
                    # Update lowest price seen
                    if current_price < extremes["lowest"]:
                        extremes["lowest"] = current_price
            
            # Generate exit signals for existing positions
            if current_position:
                position_side = current_position.get("side", "").lower()
                
                # Check for trend reversal
                trend_reversal = (position_side == "long" and trend_down) or (position_side == "short" and trend_up)
                
                # Check for trailing stop hit
                trailing_stop_hit = False
                
                if symbol in self.price_extremes:
                    extremes = self.price_extremes[symbol]
                    if position_side == "long":
                        # Calculate distance from highest
                        drop_pct = (extremes["highest"] - current_price) / extremes["highest"] if extremes["highest"] > 0 else 0
                        trailing_stop_hit = drop_pct >= self.trailing_stop_pct
                    
                    elif position_side == "short":
                        # Calculate distance from lowest
                        rise_pct = (current_price - extremes["lowest"]) / extremes["lowest"] if extremes["lowest"] > 0 else 0
                        trailing_stop_hit = rise_pct >= self.trailing_stop_pct
                
                # Exit position if trend reversed or trailing stop hit
                if trend_reversal or trailing_stop_hit:
                    signals.append({
                        "action": "close_position",
                        "symbol": symbol,
                        "reason": ("Trend reversal detected" if trend_reversal 
                                  else f"Trailing stop triggered: {self.trailing_stop_pct:.2%}"),
                        "timestamp": time.time()
                    })
                    
                    # Clear price extremes on exit
                    if symbol in self.price_extremes:
                        del self.price_extremes[symbol]
            
            logger.debug(f"Generated {len(signals)} signals for {symbol}")
            
        except Exception as e:
            logger.error(f"Error generating trend following signals: {str(e)}")
        
        return signals
