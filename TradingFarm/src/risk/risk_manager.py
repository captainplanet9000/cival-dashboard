"""
Risk Management System for Trading Farm

Provides comprehensive risk management including:
- Position size limits
- Drawdown protection
- Exposure limits
- Order validation
- Circuit breakers
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime
import json
import os

from ..blockchain.base import Order, OrderSide, OrderType, Position

logger = logging.getLogger(__name__)

class RiskLimit:
    """Base class for risk limits."""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
    
    def validate(self, context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate the risk limit against a context.
        
        Args:
            context: Risk context containing positions, orders, balance, etc.
            
        Returns:
            Tuple of (is_valid, reason)
        """
        raise NotImplementedError("Subclasses must implement this method")
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "type": self.__class__.__name__
        }

class PositionSizeLimit(RiskLimit):
    """Limit on position size as percentage of account balance."""
    
    def __init__(self, max_position_pct: float, name: str = "Position Size Limit"):
        super().__init__(name, f"Limits position size to {max_position_pct}% of account balance")
        self.max_position_pct = max_position_pct
    
    def validate(self, context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate that a new order doesn't exceed the maximum position size.
        
        Args:
            context: Risk context containing:
                - order: Order being validated
                - account_balance: Current account balance
                - existing_positions: List of existing positions
                
        Returns:
            Tuple of (is_valid, reason)
        """
        order = context.get("order")
        account_balance = context.get("account_balance", 0)
        
        if not order or account_balance <= 0:
            return False, "Invalid context: missing order or account balance"
        
        # Calculate order value
        order_value = order.quantity * (order.price or context.get("market_price", 0))
        
        # Calculate the percentage of account
        position_pct = (order_value / account_balance) * 100
        
        if position_pct > self.max_position_pct:
            return (False, 
                    f"Position size ({position_pct:.2f}%) exceeds maximum allowed ({self.max_position_pct:.2f}%)")
        
        return True, "Position size within limits"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = super().to_dict()
        result["max_position_pct"] = self.max_position_pct
        return result

class DrawdownLimit(RiskLimit):
    """Stop trading if account drawdown exceeds threshold."""
    
    def __init__(self, max_drawdown_pct: float, name: str = "Drawdown Limit"):
        super().__init__(name, f"Stops trading if drawdown exceeds {max_drawdown_pct}%")
        self.max_drawdown_pct = max_drawdown_pct
    
    def validate(self, context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate that current drawdown doesn't exceed the maximum allowed.
        
        Args:
            context: Risk context containing:
                - peak_balance: All-time peak account balance
                - current_balance: Current account balance
                
        Returns:
            Tuple of (is_valid, reason)
        """
        peak_balance = context.get("peak_balance", 0)
        current_balance = context.get("current_balance", 0)
        
        if peak_balance <= 0 or current_balance <= 0:
            return True, "Insufficient data to calculate drawdown"
        
        # Calculate drawdown percentage
        drawdown_pct = ((peak_balance - current_balance) / peak_balance) * 100
        
        if drawdown_pct > self.max_drawdown_pct:
            return (False, 
                    f"Current drawdown ({drawdown_pct:.2f}%) exceeds maximum allowed ({self.max_drawdown_pct:.2f}%)")
        
        return True, "Drawdown within limits"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = super().to_dict()
        result["max_drawdown_pct"] = self.max_drawdown_pct
        return result

class DailyLossLimit(RiskLimit):
    """Limit on maximum daily losses."""
    
    def __init__(self, max_daily_loss_pct: float, name: str = "Daily Loss Limit"):
        super().__init__(name, f"Stops trading if daily losses exceed {max_daily_loss_pct}%")
        self.max_daily_loss_pct = max_daily_loss_pct
    
    def validate(self, context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate that daily losses don't exceed the maximum allowed.
        
        Args:
            context: Risk context containing:
                - daily_starting_balance: Balance at start of trading day
                - current_balance: Current account balance
                
        Returns:
            Tuple of (is_valid, reason)
        """
        daily_starting_balance = context.get("daily_starting_balance", 0)
        current_balance = context.get("current_balance", 0)
        
        if daily_starting_balance <= 0 or current_balance <= 0:
            return True, "Insufficient data to calculate daily loss"
        
        # Calculate daily loss percentage
        daily_loss_pct = ((daily_starting_balance - current_balance) / daily_starting_balance) * 100
        
        if daily_loss_pct > self.max_daily_loss_pct:
            return (False, 
                    f"Daily loss ({daily_loss_pct:.2f}%) exceeds maximum allowed ({self.max_daily_loss_pct:.2f}%)")
        
        return True, "Daily loss within limits"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = super().to_dict()
        result["max_daily_loss_pct"] = self.max_daily_loss_pct
        return result

class MaxTradesPerDay(RiskLimit):
    """Limit on maximum number of trades per day."""
    
    def __init__(self, max_trades: int, name: str = "Max Trades Per Day"):
        super().__init__(name, f"Limits to maximum {max_trades} trades per day")
        self.max_trades = max_trades
    
    def validate(self, context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate that the number of trades today doesn't exceed the maximum allowed.
        
        Args:
            context: Risk context containing:
                - trades_today: Number of trades executed today
                
        Returns:
            Tuple of (is_valid, reason)
        """
        trades_today = context.get("trades_today", 0)
        
        if trades_today >= self.max_trades:
            return (False, 
                    f"Number of trades today ({trades_today}) reaches maximum allowed ({self.max_trades})")
        
        return True, "Number of trades within daily limit"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = super().to_dict()
        result["max_trades"] = self.max_trades
        return result

class ExposureLimit(RiskLimit):
    """Limits total market exposure."""
    
    def __init__(self, max_exposure_pct: float, name: str = "Exposure Limit"):
        super().__init__(name, f"Limits total exposure to {max_exposure_pct}% of account")
        self.max_exposure_pct = max_exposure_pct
    
    def validate(self, context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate that total exposure doesn't exceed the maximum allowed.
        
        Args:
            context: Risk context containing:
                - positions: List of all open positions
                - account_balance: Current account balance
                - order: New order being validated
                
        Returns:
            Tuple of (is_valid, reason)
        """
        positions = context.get("positions", [])
        account_balance = context.get("account_balance", 0)
        order = context.get("order")
        
        if account_balance <= 0:
            return False, "Invalid account balance"
        
        # Calculate current exposure
        current_exposure = sum(p.quantity * p.entry_price for p in positions)
        current_exposure_pct = (current_exposure / account_balance) * 100
        
        # Calculate additional exposure from new order
        additional_exposure = 0
        if order:
            order_price = order.price or context.get("market_price", 0)
            additional_exposure = order.quantity * order_price
        
        additional_exposure_pct = (additional_exposure / account_balance) * 100
        total_exposure_pct = current_exposure_pct + additional_exposure_pct
        
        if total_exposure_pct > self.max_exposure_pct:
            return (False, 
                    f"Total exposure ({total_exposure_pct:.2f}%) would exceed maximum allowed ({self.max_exposure_pct:.2f}%)")
        
        return True, "Total exposure within limits"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = super().to_dict()
        result["max_exposure_pct"] = self.max_exposure_pct
        return result

class RiskManager:
    """
    Central risk management system that evaluates trading decisions against multiple risk limits.
    
    Provides:
    - Order validation
    - Position management
    - Risk metrics tracking
    - Circuit breaker functionality
    """
    
    def __init__(self, limits: Optional[List[RiskLimit]] = None, config_path: Optional[str] = None):
        """
        Initialize risk manager.
        
        Args:
            limits: Risk limits to apply
            config_path: Path to risk configuration file
        """
        self.limits: List[RiskLimit] = limits or []
        self.config_path = config_path
        
        # Trading session metrics
        self.peak_balance = 0
        self.daily_starting_balance = 0
        self.trades_today = 0
        self.circuit_breaker_active = False
        
        # If config path is provided, load configuration
        if config_path and os.path.exists(config_path):
            self._load_config()
        
        logger.info(f"Risk Manager initialized with {len(self.limits)} limits")
    
    def _load_config(self) -> None:
        """Load risk configuration from file."""
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            # Process limits
            for limit_config in config.get("limits", []):
                limit_type = limit_config.get("type")
                
                if limit_type == "PositionSizeLimit":
                    self.limits.append(PositionSizeLimit(
                        max_position_pct=limit_config.get("max_position_pct", 5.0),
                        name=limit_config.get("name", "Position Size Limit")
                    ))
                
                elif limit_type == "DrawdownLimit":
                    self.limits.append(DrawdownLimit(
                        max_drawdown_pct=limit_config.get("max_drawdown_pct", 20.0),
                        name=limit_config.get("name", "Drawdown Limit")
                    ))
                
                elif limit_type == "DailyLossLimit":
                    self.limits.append(DailyLossLimit(
                        max_daily_loss_pct=limit_config.get("max_daily_loss_pct", 5.0),
                        name=limit_config.get("name", "Daily Loss Limit")
                    ))
                
                elif limit_type == "MaxTradesPerDay":
                    self.limits.append(MaxTradesPerDay(
                        max_trades=limit_config.get("max_trades", 20),
                        name=limit_config.get("name", "Max Trades Per Day")
                    ))
                
                elif limit_type == "ExposureLimit":
                    self.limits.append(ExposureLimit(
                        max_exposure_pct=limit_config.get("max_exposure_pct", 50.0),
                        name=limit_config.get("name", "Exposure Limit")
                    ))
            
            logger.info(f"Loaded {len(self.limits)} limits from configuration file")
            
        except Exception as e:
            logger.error(f"Error loading risk configuration: {str(e)}")
    
    def add_limit(self, limit: RiskLimit) -> None:
        """
        Add a risk limit.
        
        Args:
            limit: Risk limit to add
        """
        self.limits.append(limit)
        logger.info(f"Added risk limit: {limit.name}")
    
    def update_metrics(self, context: Dict[str, Any]) -> None:
        """
        Update trading metrics.
        
        Args:
            context: Context containing updated metrics
        """
        # Update peak balance
        current_balance = context.get("current_balance", 0)
        if current_balance > self.peak_balance:
            self.peak_balance = current_balance
        
        # Update daily metrics if a new day has started
        last_trading_date = context.get("last_trading_date")
        current_date = datetime.now().date()
        
        if last_trading_date != current_date:
            self.daily_starting_balance = current_balance
            self.trades_today = 0
            logger.info(f"New trading day: {current_date}. Reset daily metrics.")
        
        # Track trades today
        if context.get("new_trade", False):
            self.trades_today += 1
    
    def validate_order(self, order: Order, positions: Optional[List[Position]] = None, 
                      account_balance: Optional[float] = None, market_price: Optional[float] = None) -> bool:
        """
        Validate if an order complies with all risk limits.
        
        Args:
            order: Order to validate
            positions: Current open positions
            account_balance: Current account balance
            market_price: Current market price if order doesn't have a price
            
        Returns:
            True if order is valid, False otherwise
        """
        # Prepare validation context
        context = {
            "order": order,
            "positions": positions or [],
            "account_balance": account_balance or 0,
            "current_balance": account_balance or 0,
            "peak_balance": self.peak_balance,
            "daily_starting_balance": self.daily_starting_balance,
            "trades_today": self.trades_today,
            "market_price": market_price or 0
        }
        
        # Check if circuit breaker is active
        if self.circuit_breaker_active:
            logger.warning("Circuit breaker is active. All orders rejected.")
            return False
        
        # Validate against each limit
        for limit in self.limits:
            valid, reason = limit.validate(context)
            
            if not valid:
                logger.warning(f"Order rejected by {limit.name}: {reason}")
                return False
        
        logger.info(f"Order validated against {len(self.limits)} risk limits")
        return True
    
    def activate_circuit_breaker(self) -> None:
        """
        Activate circuit breaker to stop all trading.
        """
        self.circuit_breaker_active = True
        logger.warning("Circuit breaker activated - all trading stopped")
    
    def deactivate_circuit_breaker(self) -> None:
        """
        Deactivate circuit breaker to resume trading.
        """
        self.circuit_breaker_active = False
        logger.info("Circuit breaker deactivated - trading resumed")
    
    def get_risk_status(self) -> Dict[str, Any]:
        """
        Get current risk status.
        
        Returns:
            Dictionary with risk metrics and status
        """
        return {
            "peak_balance": self.peak_balance,
            "daily_starting_balance": self.daily_starting_balance,
            "trades_today": self.trades_today,
            "circuit_breaker_active": self.circuit_breaker_active,
            "limits": [limit.to_dict() for limit in self.limits]
        }
