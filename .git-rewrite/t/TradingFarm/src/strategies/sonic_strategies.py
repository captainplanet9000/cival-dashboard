"""
Sonic Protocol Trading Strategies

This module provides strategy implementations for trading on Sonic Protocol.
Strategies can be used by SonicAgent for automated trading decisions.
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

class SonicMomentumStrategy(BaseStrategy):
    """
    Momentum-based trading strategy for Sonic Protocol.
    
    Analyzes price movements and generates buy/sell signals based on momentum indicators.
    """
    
    def __init__(self, 
                 lookback_period: int = 24, 
                 momentum_threshold: float = 0.05, 
                 volume_threshold: float = 1000,
                 max_position_size: Dict[str, float] = None):
        """
        Initialize the momentum strategy
        
        Args:
            lookback_period: Period (in hours) to look back for price analysis
            momentum_threshold: Price movement threshold to trigger a trade
            volume_threshold: Minimum volume required for trading
            max_position_size: Maximum position size per token
        """
        super().__init__()
        self.name = "sonic_momentum"
        self.lookback_period = lookback_period
        self.momentum_threshold = momentum_threshold
        self.volume_threshold = volume_threshold
        self.max_position_size = max_position_size or {
            "SUI": 100,
            "USDC": 1000,
            "USDT": 1000,
            "WETH": 0.5
        }
        
        # Track last signals to avoid excessive trading
        self.last_signals = {}
        
        logger.info(f"Initialized SonicMomentumStrategy with lookback_period={lookback_period}, "
                   f"momentum_threshold={momentum_threshold}, volume_threshold={volume_threshold}")
    
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
            # Extract token information
            token_a_history = market_data.get("token_a_history", [])
            token_b_history = market_data.get("token_b_history", [])
            pool = market_data.get("pool", {})
            reserves = market_data.get("reserves", {})
            
            # Check if we have enough data
            if (not token_a_history or not token_b_history or 
                len(token_a_history) < 2 or len(token_b_history) < 2):
                logger.warning("Insufficient historical data for signal generation")
                return signals
            
            # Extract token names
            token_a = market_data.get("token_a", {}).get("symbol", "UNKNOWN")
            token_b = market_data.get("token_b", {}).get("symbol", "UNKNOWN")
            pair_key = f"{token_a}-{token_b}"
            
            # Calculate momentum
            token_a_momentum = self._calculate_momentum(token_a_history)
            token_b_momentum = self._calculate_momentum(token_b_history)
            
            # Calculate relative momentum
            relative_momentum = token_a_momentum - token_b_momentum
            
            # Check volume
            volume_24h = float(pool.get("volume_24h", 0))
            
            # Check if we recently generated a signal for this pair
            last_signal_time = self.last_signals.get(pair_key, 0)
            time_since_last_signal = time.time() - last_signal_time
            
            # Only generate a new signal if it's been at least 1 hour
            if time_since_last_signal < 3600:
                return signals
            
            # Generate signals based on momentum and volume
            if volume_24h >= self.volume_threshold:
                if relative_momentum >= self.momentum_threshold:
                    # Token A has positive momentum compared to Token B
                    # Generate signal to swap Token B to Token A
                    token_b_balance = 1000  # Placeholder value, should be fetched from agent
                    swap_amount = min(token_b_balance * 0.1, self.max_position_size.get(token_b, token_b_balance))
                    
                    signals.append({
                        "action": "swap_b_to_a",
                        "amount": swap_amount,
                        "reason": f"{token_a} shows positive momentum vs {token_b} ({relative_momentum:.2%})",
                        "timestamp": time.time()
                    })
                    
                    # Update last signal time
                    self.last_signals[pair_key] = time.time()
                    
                elif relative_momentum <= -self.momentum_threshold:
                    # Token B has positive momentum compared to Token A
                    # Generate signal to swap Token A to Token B
                    token_a_balance = 1000  # Placeholder value, should be fetched from agent
                    swap_amount = min(token_a_balance * 0.1, self.max_position_size.get(token_a, token_a_balance))
                    
                    signals.append({
                        "action": "swap_a_to_b",
                        "amount": swap_amount,
                        "reason": f"{token_b} shows positive momentum vs {token_a} ({-relative_momentum:.2%})",
                        "timestamp": time.time()
                    })
                    
                    # Update last signal time
                    self.last_signals[pair_key] = time.time()
            
            logger.debug(f"Generated {len(signals)} signals for {pair_key}")
            
        except Exception as e:
            logger.error(f"Error generating momentum signals: {str(e)}")
        
        return signals
    
    def _calculate_momentum(self, price_history: List[Dict[str, Any]]) -> float:
        """
        Calculate momentum from price history
        
        Args:
            price_history: List of price data points
            
        Returns:
            Momentum score
        """
        try:
            if not price_history or len(price_history) < 2:
                return 0.0
            
            # Extract prices
            prices = [float(p["price"]) for p in price_history]
            
            # Calculate momentum as percentage change
            initial_price = prices[0]
            current_price = prices[-1]
            
            if initial_price == 0:
                return 0.0
            
            momentum = (current_price - initial_price) / initial_price
            return momentum
            
        except Exception as e:
            logger.error(f"Error calculating momentum: {str(e)}")
            return 0.0


class SonicLiquidityProvisionStrategy(BaseStrategy):
    """
    Liquidity provision strategy for Sonic Protocol.
    
    Manages adding and removing liquidity based on market conditions.
    """
    
    def __init__(self, 
                 min_apr_threshold: float = 0.05,  # 5% minimum APR
                 max_imbalance: float = 0.3,      # 30% maximum imbalance
                 rebalance_threshold: float = 0.1):  # 10% rebalance threshold
        """
        Initialize the liquidity provision strategy
        
        Args:
            min_apr_threshold: Minimum annual percentage rate to add liquidity
            max_imbalance: Maximum allowed token imbalance in pool
            rebalance_threshold: Threshold for rebalancing positions
        """
        super().__init__()
        self.name = "sonic_liquidity"
        self.min_apr_threshold = min_apr_threshold
        self.max_imbalance = max_imbalance
        self.rebalance_threshold = rebalance_threshold
        
        # Track active positions
        self.active_positions = {}
        
        logger.info(f"Initialized SonicLiquidityProvisionStrategy with min_apr_threshold={min_apr_threshold}, "
                   f"max_imbalance={max_imbalance}, rebalance_threshold={rebalance_threshold}")
    
    def generate_signals(self, market_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate liquidity provision signals based on market data
        
        Args:
            market_data: Market data for analysis
            
        Returns:
            List of liquidity provision signals
        """
        signals = []
        
        try:
            # Extract pool information
            pool = market_data.get("pool", {})
            reserves = market_data.get("reserves", {})
            token_a = market_data.get("token_a", {}).get("symbol", "UNKNOWN")
            token_b = market_data.get("token_b", {}).get("symbol", "UNKNOWN")
            pair_key = f"{token_a}-{token_b}"
            
            # Extract position information
            positions = market_data.get("positions", [])
            for pos in positions:
                position_id = pos.get("id")
                if position_id:
                    self.active_positions[position_id] = pos
            
            # Check if pool has sufficient data
            if not pool or not reserves:
                logger.warning(f"Insufficient pool data for {pair_key}")
                return signals
            
            # Calculate APR (example calculation, actual APR might be calculated differently)
            fees_24h = float(pool.get("fees_24h", 0))
            tvl = float(pool.get("tvl", 1))  # Default to 1 to avoid division by zero
            daily_return = fees_24h / tvl if tvl > 0 else 0
            apr = daily_return * 365
            
            # Calculate token reserves and imbalance
            token_a_reserve = float(reserves.get(f"{token_a}_reserve", 0))
            token_b_reserve = float(reserves.get(f"{token_b}_reserve", 0))
            
            # Calculate imbalance
            total_reserve_value = token_a_reserve + token_b_reserve  # Simplified, should consider token prices
            if total_reserve_value > 0:
                token_a_percentage = token_a_reserve / total_reserve_value
                token_b_percentage = token_b_reserve / total_reserve_value
                imbalance = abs(token_a_percentage - 0.5) / 0.5  # 0.5 = 50%, balanced pool
            else:
                imbalance = 0
            
            # Generate signals based on APR and imbalance
            if apr >= self.min_apr_threshold and imbalance <= self.max_imbalance:
                # Conditions are good for adding liquidity
                # Assuming we have 1000 units of each token available
                token_a_amount = 100  # Example amount
                token_b_amount = 100  # Example amount
                
                signals.append({
                    "action": "add_liquidity",
                    "amount_a": token_a_amount,
                    "amount_b": token_b_amount,
                    "reason": f"Pool APR is attractive at {apr:.2%}, imbalance: {imbalance:.2%}",
                    "timestamp": time.time()
                })
            
            # Check existing positions for rebalance or removal
            for position_id, position in self.active_positions.items():
                position_apr = float(position.get("apr", 0))
                position_imbalance = float(position.get("imbalance", 0))
                
                if position_apr < self.min_apr_threshold * 0.5 or position_imbalance > self.max_imbalance:
                    # APR dropped significantly or imbalance too high
                    signals.append({
                        "action": "remove_liquidity",
                        "position_id": position_id,
                        "percentage": 1.0,  # Remove all liquidity
                        "reason": f"Position APR decreased to {position_apr:.2%} or imbalance increased to {position_imbalance:.2%}",
                        "timestamp": time.time()
                    })
            
            logger.debug(f"Generated {len(signals)} liquidity signals for {pair_key}")
            
        except Exception as e:
            logger.error(f"Error generating liquidity signals: {str(e)}")
        
        return signals
