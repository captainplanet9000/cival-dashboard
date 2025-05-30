"""
Risk Management module for Trading Farm strategies.
This module provides risk management utilities for trading strategies.
"""

from typing import Dict, Any, Optional, Tuple
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class RiskParameters:
    """Risk parameters for trading strategies."""
    max_position_size: float  # Max position size as percentage of available capital
    max_drawdown: float  # Maximum acceptable drawdown as percentage
    max_daily_loss: float  # Maximum daily loss as percentage of capital  
    stop_loss_pct: float  # Stop loss percentage from entry price
    take_profit_pct: float  # Take profit percentage from entry price
    trailing_stop_pct: Optional[float] = None  # Trailing stop percentage, if used
    max_trades_per_day: Optional[int] = None  # Maximum number of trades per day
    position_sizing_model: str = "fixed"  # fixed, volatility, kelly, etc.
    risk_reward_ratio: float = 2.0  # Minimum risk-reward ratio for trades

    def __post_init__(self):
        """Validate risk parameters."""
        if self.max_position_size <= 0 or self.max_position_size > 1:
            raise ValueError("max_position_size must be between 0 and 1")
        if self.max_drawdown <= 0 or self.max_drawdown > 1:
            raise ValueError("max_drawdown must be between 0 and 1")
        if self.max_daily_loss <= 0 or self.max_daily_loss > 1:
            raise ValueError("max_daily_loss must be between 0 and 1")
        if self.stop_loss_pct <= 0:
            raise ValueError("stop_loss_pct must be positive")
        if self.take_profit_pct <= 0:
            raise ValueError("take_profit_pct must be positive")
        if self.trailing_stop_pct is not None and self.trailing_stop_pct <= 0:
            raise ValueError("trailing_stop_pct must be positive")
        if self.max_trades_per_day is not None and self.max_trades_per_day <= 0:
            raise ValueError("max_trades_per_day must be positive")
        if self.risk_reward_ratio <= 0:
            raise ValueError("risk_reward_ratio must be positive")


class RiskManager:
    """Risk manager for trading strategies."""
    
    def __init__(self, risk_params: RiskParameters):
        self.risk_params = risk_params
        self.daily_pnl = 0.0
        self.max_equity = 0.0
        self.current_equity = 0.0
        self.daily_trades_count = 0
    
    def calculate_position_size(self, capital: float, entry_price: float, 
                                stop_price: float, volatility: Optional[float] = None) -> float:
        """
        Calculate appropriate position size based on risk parameters.
        
        Args:
            capital: Available capital
            entry_price: Planned entry price
            stop_price: Planned stop loss price
            volatility: Market volatility metric (if used for position sizing)
            
        Returns:
            Position size in base units
        """
        if self.risk_params.position_sizing_model == "fixed":
            # Risk a fixed percentage of capital
            risk_amount = capital * self.risk_params.max_position_size * 0.01
            price_risk = abs(entry_price - stop_price) / entry_price
            position_size = risk_amount / (price_risk * entry_price)
            
        elif self.risk_params.position_sizing_model == "volatility":
            # Adjust position size based on volatility
            if volatility is None:
                raise ValueError("Volatility must be provided for volatility-based position sizing")
            
            # Lower position size in higher volatility environments
            volatility_factor = 1.0 / (1.0 + volatility)
            base_position_size = capital * self.risk_params.max_position_size
            position_size = base_position_size * volatility_factor
            
        elif self.risk_params.position_sizing_model == "kelly":
            # Kelly criterion for position sizing (simplified version)
            # Assumes a win rate and average win/loss ratio are available
            win_rate = 0.5  # This should come from strategy backtest
            avg_win_loss_ratio = self.risk_params.risk_reward_ratio
            
            # Kelly formula: f* = (p × b – q) / b
            # where f* is the fraction of capital to risk,
            # p is probability of win, q is probability of loss (1-p),
            # b is the ratio of average win to average loss
            
            kelly_fraction = (win_rate * avg_win_loss_ratio - (1 - win_rate)) / avg_win_loss_ratio
            # Usually apply a fraction of Kelly (half Kelly) for safety
            half_kelly = kelly_fraction * 0.5
            position_size = capital * min(half_kelly, self.risk_params.max_position_size)
        
        else:
            # Default to a conservative fixed percentage
            position_size = capital * 0.01
        
        return position_size
    
    def check_trade_allowed(self, trade_side: str, current_positions: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Check if a new trade is allowed according to risk parameters.
        
        Args:
            trade_side: 'BUY' or 'SELL'
            current_positions: Current open positions
            
        Returns:
            (allowed, reason) tuple
        """
        # Check daily loss limit
        if self.daily_pnl < -self.risk_params.max_daily_loss * self.max_equity:
            return False, "Daily loss limit exceeded"
        
        # Check maximum drawdown
        current_drawdown = (self.max_equity - self.current_equity) / self.max_equity
        if current_drawdown > self.risk_params.max_drawdown:
            return False, "Maximum drawdown exceeded"
        
        # Check maximum trades per day
        if (self.risk_params.max_trades_per_day is not None and 
                self.daily_trades_count >= self.risk_params.max_trades_per_day):
            return False, "Maximum daily trades limit reached"
        
        return True, "Trade allowed"
    
    def update_equity(self, equity: float) -> None:
        """Update current equity and track maximum equity."""
        self.current_equity = equity
        self.max_equity = max(self.max_equity, equity)
    
    def reset_daily_metrics(self) -> None:
        """Reset daily metrics (should be called at the start of each trading day)."""
        self.daily_pnl = 0.0
        self.daily_trades_count = 0
    
    def update_daily_pnl(self, pnl: float) -> None:
        """Update daily profit and loss."""
        self.daily_pnl += pnl
    
    def calculate_risk_adjusted_returns(self, returns: float, volatility: float) -> float:
        """Calculate risk-adjusted returns (Sharpe ratio)."""
        # Assuming risk-free rate is 0 for simplicity
        if volatility == 0:
            return 0
        return returns / volatility
