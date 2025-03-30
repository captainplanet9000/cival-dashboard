"""
Risk Management
=============
Base class for risk management components that handle position sizing, drawdown protection,
and other risk-related aspects of trading strategies.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union, Tuple
import pandas as pd
import numpy as np
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class RiskManagement(ABC):
    """
    Base class for components that manage trading risk.
    
    Risk management is responsible for position sizing, setting stop losses,
    managing drawdowns, and other risk-related aspects of trading strategies.
    """
    
    def __init__(self, name: str, parameters: Dict[str, Any] = None):
        """
        Initialize risk management component.
        
        Args:
            name: Name of the risk management component
            parameters: Parameters for customizing risk behavior
        """
        self.name = name
        self.parameters = parameters or {
            'max_position_size_pct': 0.05,  # Maximum position size as % of account
            'max_risk_per_trade_pct': 0.01,  # Maximum risk per trade (1%)
            'max_open_trades': 5,  # Maximum number of concurrent open trades
            'max_drawdown_pct': 0.15,  # Maximum drawdown before reducing position sizes
            'severe_drawdown_pct': 0.25,  # Drawdown level for emergency measures
            'position_size_scaling': 'constant',  # Options: constant, kelly, volatility
            'enable_dynamic_sizing': True,  # Enable dynamic position sizing
            'trailing_stop_enabled': True,  # Enable trailing stops
        }
        
        # Override defaults with any provided parameters
        if parameters:
            self.parameters.update(parameters)
        
        # Risk state tracking
        self.current_drawdown = 0.0
        self.peak_account_value = 0.0
        self.open_positions = []
        self.risk_level = "normal"  # normal, elevated, high, extreme
        self.last_assessment_time = None
        
        logger.info(f"Risk management component '{name}' initialized")
    
    @abstractmethod
    def calculate_position_size(self, account_size: float, entry_price: float, 
                              stop_loss: float, market_info: Dict[str, Any]) -> float:
        """
        Calculate the position size for a trade.
        
        Args:
            account_size: Total account size in base currency
            entry_price: Planned entry price
            stop_loss: Stop loss price
            market_info: Additional market information
            
        Returns:
            Recommended position size
        """
        pass
    
    @abstractmethod
    def assess_risk(self, account_data: Dict[str, Any], market_data: Dict[str, Any], 
                  open_positions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Assess current risk levels based on account, market, and position data.
        
        Args:
            account_data: Account information including balance, equity, margin
            market_data: Current market conditions
            open_positions: List of currently open positions
            
        Returns:
            Risk assessment results
        """
        pass
    
    def update_drawdown(self, current_equity: float) -> float:
        """
        Update and return the current drawdown.
        
        Args:
            current_equity: Current account equity
            
        Returns:
            Current drawdown as a percentage
        """
        # Update peak account value if current equity is higher
        if current_equity > self.peak_account_value:
            self.peak_account_value = current_equity
        
        # Calculate drawdown (if peak is 0, assume no drawdown)
        if self.peak_account_value > 0:
            self.current_drawdown = (self.peak_account_value - current_equity) / self.peak_account_value
        else:
            self.current_drawdown = 0.0
        
        return self.current_drawdown
    
    def get_risk_adjustment_factor(self) -> float:
        """
        Get a risk adjustment factor based on current risk state.
        
        Returns:
            Risk adjustment factor (1.0 = normal, <1.0 = reduced risk)
        """
        # Default risk factor of 1.0 (no adjustment)
        risk_factor = 1.0
        
        # Adjust based on drawdown
        max_dd = self.parameters['max_drawdown_pct']
        severe_dd = self.parameters['severe_drawdown_pct']
        
        if self.current_drawdown > severe_dd:
            risk_factor = 0.25  # Severe risk reduction
            self.risk_level = "extreme"
        elif self.current_drawdown > max_dd:
            risk_factor = 0.5  # Significant risk reduction
            self.risk_level = "high"
        elif self.current_drawdown > (max_dd * 0.7):
            risk_factor = 0.75  # Moderate risk reduction
            self.risk_level = "elevated"
        else:
            self.risk_level = "normal"
        
        return risk_factor
    
    def check_max_trades_limit(self, open_positions_count: int) -> bool:
        """
        Check if the maximum number of open trades has been reached.
        
        Args:
            open_positions_count: Current number of open positions
            
        Returns:
            True if another trade can be opened, False otherwise
        """
        return open_positions_count < self.parameters['max_open_trades']
    
    def calculate_kelly_criterion(self, win_rate: float, win_loss_ratio: float) -> float:
        """
        Calculate Kelly criterion for optimal position sizing.
        
        Args:
            win_rate: Probability of winning (0.0 to 1.0)
            win_loss_ratio: Ratio of average win to average loss
            
        Returns:
            Kelly fraction (can be negative, 0.0 = no bet, 1.0 = bet full amount)
        """
        kelly = (win_rate * win_loss_ratio - (1 - win_rate)) / win_loss_ratio
        
        # Kelly can suggest betting no money or even shorting,
        # but we'll restrict it to be between 0 and max_position_size_pct
        kelly = max(0.0, kelly)
        kelly = min(kelly, self.parameters['max_position_size_pct'])
        
        return kelly
    
    def set_parameters(self, parameters: Dict[str, Any]) -> None:
        """
        Update the risk management parameters.
        
        Args:
            parameters: New parameters to update
        """
        self.parameters.update(parameters)
        logger.info(f"Risk management component '{self.name}' parameters updated")
    
    def get_risk_report(self) -> Dict[str, Any]:
        """
        Get a comprehensive risk report.
        
        Returns:
            Dictionary with risk metrics and assessment
        """
        self.last_assessment_time = datetime.now().isoformat()
        
        return {
            "risk_level": self.risk_level,
            "current_drawdown": self.current_drawdown,
            "peak_account_value": self.peak_account_value,
            "risk_adjustment_factor": self.get_risk_adjustment_factor(),
            "open_positions_count": len(self.open_positions),
            "parameters": self.parameters,
            "assessment_time": self.last_assessment_time
        }
    
    def __str__(self) -> str:
        """String representation of the risk management component."""
        return f"RiskManagement(name={self.name}, risk_level={self.risk_level})"
