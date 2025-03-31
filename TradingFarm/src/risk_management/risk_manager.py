"""
Risk Management Module for the TradingFarm platform.
Provides risk controls and portfolio protection features.
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Set, Any, Callable, Union
from dataclasses import dataclass, field
import math

from ..exchanges.base import (
    ExchangeClient, 
    Order, 
    OrderSide, 
    OrderStatus,
    OrderType,
    Position,
    MarketData
)
from ..agents.eliza_protocol import ElizaMessage, MessageType

logger = logging.getLogger(__name__)

@dataclass
class RiskRule:
    """Base class for risk management rules."""
    name: str
    enabled: bool = True
    params: Dict[str, Any] = field(default_factory=dict)
    
    def check(
        self, 
        exchange_id: str, 
        symbol: str, 
        order: Optional[Order] = None,
        position: Optional[Position] = None,
        market_data: Optional[MarketData] = None,
        portfolio: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Check if the risk rule is violated.
        
        Returns:
            Dict with:
                'allowed': bool - whether the action is allowed
                'reason': str - reason if not allowed
                'suggestions': Dict - suggested modifications to comply with the rule
        """
        raise NotImplementedError("Risk rule check not implemented")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert rule to dictionary for serialization."""
        return {
            "name": self.name,
            "enabled": self.enabled,
            "params": self.params
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RiskRule':
        """Create rule from dictionary."""
        return cls(
            name=data["name"],
            enabled=data["enabled"],
            params=data["params"]
        )

@dataclass
class MaxPositionSizeRule(RiskRule):
    """Rule to limit the maximum position size."""
    
    def __init__(
        self, 
        max_position_pct: float = 5.0, 
        max_position_absolute: Optional[float] = None,
        **kwargs
    ):
        """
        Initialize with maximum position parameters.
        
        Args:
            max_position_pct: Maximum position size as percentage of portfolio
            max_position_absolute: Maximum position size in absolute terms (optional)
        """
        super().__init__(
            name="max_position_size", 
            params={
                "max_position_pct": max_position_pct,
                "max_position_absolute": max_position_absolute,
                **kwargs
            }
        )
    
    def check(
        self, 
        exchange_id: str, 
        symbol: str, 
        order: Optional[Order] = None,
        position: Optional[Position] = None,
        market_data: Optional[MarketData] = None,
        portfolio: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Check if position size is within limits."""
        if not self.enabled:
            return {"allowed": True}
        
        if not order or not portfolio:
            return {"allowed": True}
        
        # Get current position size
        current_size = 0
        if position:
            current_size = position.amount
        
        # Calculate total position size after order
        total_size = current_size
        if order.side == OrderSide.BUY:
            total_size += order.amount
        else:
            total_size -= order.amount
        
        # Absolute size check
        max_absolute = self.params.get("max_position_absolute")
        if max_absolute and abs(total_size) > max_absolute:
            max_allowed = max_absolute - abs(current_size)
            if max_allowed < 0:
                max_allowed = 0
                
            return {
                "allowed": False,
                "reason": f"Position size {abs(total_size)} exceeds maximum {max_absolute}",
                "suggestions": {
                    "max_allowed": max_allowed
                }
            }
        
        # Percentage check
        portfolio_value = portfolio.get("total_value", 0)
        if portfolio_value <= 0:
            return {"allowed": True}  # Can't check percentage if no portfolio value
        
        max_pct = self.params.get("max_position_pct", 5.0)
        
        # Convert position size to value
        position_value = 0
        if market_data:
            mid_price = market_data.get_mid_price()
            position_value = abs(total_size) * mid_price
        elif order.price:
            position_value = abs(total_size) * order.price
        else:
            return {"allowed": True}  # Can't calculate value without price
        
        position_pct = (position_value / portfolio_value) * 100
        
        if position_pct > max_pct:
            max_allowed_value = (max_pct / 100) * portfolio_value
            max_allowed_size = max_allowed_value / (market_data.get_mid_price() if market_data else order.price)
            max_allowed = max_allowed_size - abs(current_size)
            if max_allowed < 0:
                max_allowed = 0
                
            return {
                "allowed": False,
                "reason": f"Position size {position_pct:.2f}% exceeds maximum {max_pct}%",
                "suggestions": {
                    "max_allowed": max_allowed
                }
            }
        
        return {"allowed": True}

@dataclass
class MaxDrawdownRule(RiskRule):
    """Rule to limit maximum drawdown."""
    
    def __init__(
        self, 
        max_drawdown_pct: float = 5.0,
        trailing: bool = True,
        **kwargs
    ):
        """
        Initialize with maximum drawdown parameters.
        
        Args:
            max_drawdown_pct: Maximum allowable drawdown percentage
            trailing: Whether to use trailing high water mark
        """
        super().__init__(
            name="max_drawdown", 
            params={
                "max_drawdown_pct": max_drawdown_pct,
                "trailing": trailing,
                "high_water_mark": 0.0,
                "initial_portfolio_value": 0.0,
                **kwargs
            }
        )
    
    def check(
        self, 
        exchange_id: str, 
        symbol: str, 
        order: Optional[Order] = None,
        position: Optional[Position] = None,
        market_data: Optional[MarketData] = None,
        portfolio: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Check if drawdown is within limits."""
        if not self.enabled or not portfolio:
            return {"allowed": True}
        
        current_value = portfolio.get("total_value", 0)
        if current_value <= 0:
            return {"allowed": True}
        
        # Initialize high water mark if not set
        if self.params.get("high_water_mark", 0) <= 0:
            self.params["high_water_mark"] = current_value
            self.params["initial_portfolio_value"] = current_value
            return {"allowed": True}
        
        # Update high water mark if trailing and new high reached
        high_water_mark = self.params["high_water_mark"]
        if self.params.get("trailing", True) and current_value > high_water_mark:
            self.params["high_water_mark"] = current_value
            high_water_mark = current_value
        
        # Calculate drawdown
        drawdown_pct = ((high_water_mark - current_value) / high_water_mark) * 100
        max_drawdown_pct = self.params.get("max_drawdown_pct", 5.0)
        
        if drawdown_pct > max_drawdown_pct:
            return {
                "allowed": False,
                "reason": f"Current drawdown {drawdown_pct:.2f}% exceeds maximum {max_drawdown_pct}%",
                "suggestions": {
                    "reduce_position": True,
                    "pause_trading": True
                }
            }
        
        return {"allowed": True}

@dataclass
class CorrelationRule(RiskRule):
    """Rule to limit correlated positions."""
    
    def __init__(
        self, 
        max_correlation: float = 0.7,
        max_exposure_pct: float = 15.0,
        correlation_matrix: Dict[str, Dict[str, float]] = None,
        **kwargs
    ):
        """
        Initialize with correlation parameters.
        
        Args:
            max_correlation: Maximum allowable correlation between positions
            max_exposure_pct: Maximum portfolio exposure to correlated assets
            correlation_matrix: Pre-defined correlation values between symbols
        """
        super().__init__(
            name="correlation", 
            params={
                "max_correlation": max_correlation,
                "max_exposure_pct": max_exposure_pct,
                "correlation_matrix": correlation_matrix or {},
                **kwargs
            }
        )
    
    def check(
        self, 
        exchange_id: str, 
        symbol: str, 
        order: Optional[Order] = None,
        position: Optional[Position] = None,
        market_data: Optional[MarketData] = None,
        portfolio: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Check if correlated exposure is within limits."""
        if not self.enabled or not portfolio or not order:
            return {"allowed": True}
        
        positions = portfolio.get("positions", [])
        if not positions:
            return {"allowed": True}
        
        # Get correlation matrix
        correlation_matrix = self.params.get("correlation_matrix", {})
        if not correlation_matrix:
            return {"allowed": True}  # No correlation data
        
        # Get max correlation and exposure limits
        max_correlation = self.params.get("max_correlation", 0.7)
        max_exposure_pct = self.params.get("max_exposure_pct", 15.0)
        
        # Find correlated positions
        correlated_positions = []
        for pos in positions:
            if pos.symbol == symbol:
                continue  # Skip the current symbol
            
            # Check correlation
            correlation = self._get_correlation(symbol, pos.symbol, correlation_matrix)
            if abs(correlation) >= max_correlation:
                correlated_positions.append(pos)
        
        if not correlated_positions:
            return {"allowed": True}  # No correlated positions
        
        # Calculate total correlated exposure
        total_value = portfolio.get("total_value", 0)
        if total_value <= 0:
            return {"allowed": True}
        
        correlated_exposure = 0
        for pos in correlated_positions:
            # Get position value
            if pos.symbol in portfolio.get("position_values", {}):
                correlated_exposure += portfolio["position_values"][pos.symbol]
        
        # Add current order value
        order_value = 0
        if market_data:
            order_value = order.amount * market_data.get_mid_price()
        elif order.price:
            order_value = order.amount * order.price
        
        total_correlated_exposure = correlated_exposure + order_value
        exposure_pct = (total_correlated_exposure / total_value) * 100
        
        if exposure_pct > max_exposure_pct:
            return {
                "allowed": False,
                "reason": f"Correlated exposure {exposure_pct:.2f}% exceeds maximum {max_exposure_pct}%",
                "suggestions": {
                    "reduce_size": True,
                    "hedge_position": True
                }
            }
        
        return {"allowed": True}
    
    def _get_correlation(
        self, 
        symbol1: str, 
        symbol2: str, 
        correlation_matrix: Dict[str, Dict[str, float]]
    ) -> float:
        """Get correlation between two symbols."""
        if symbol1 in correlation_matrix and symbol2 in correlation_matrix[symbol1]:
            return correlation_matrix[symbol1][symbol2]
        
        if symbol2 in correlation_matrix and symbol1 in correlation_matrix[symbol2]:
            return correlation_matrix[symbol2][symbol1]
        
        return 0.0  # Default to no correlation

class RiskManager:
    """
    Risk management system for the TradingFarm platform.
    
    Responsibilities:
    1. Enforce risk limits on orders and positions
    2. Monitor portfolio risk metrics
    3. Implement drawdown protection
    4. Perform correlation analysis
    5. Integrate with ElizaOS for AI-driven risk management
    """
    
    def __init__(self):
        self.rules: Dict[str, RiskRule] = {}
        self.portfolio: Dict[str, Any] = {
            "total_value": 0.0,
            "positions": [],
            "position_values": {},
            "drawdown": 0.0
        }
        
        # Trading enabled flag
        self.trading_enabled = True
        
        # Callbacks
        self._risk_event_callbacks: List[Callable[[Dict[str, Any]], None]] = []
        
        # Initialize default rules
        self._init_default_rules()
    
    def _init_default_rules(self) -> None:
        """Initialize default risk rules."""
        self.add_rule(MaxPositionSizeRule())
        self.add_rule(MaxDrawdownRule())
        self.add_rule(CorrelationRule())
    
    def add_rule(self, rule: RiskRule) -> None:
        """Add a risk rule."""
        self.rules[rule.name] = rule
        logger.info(f"Added risk rule: {rule.name}")
    
    def remove_rule(self, rule_name: str) -> bool:
        """Remove a risk rule."""
        if rule_name in self.rules:
            del self.rules[rule_name]
            logger.info(f"Removed risk rule: {rule_name}")
            return True
        return False
    
    def enable_rule(self, rule_name: str) -> bool:
        """Enable a risk rule."""
        if rule_name in self.rules:
            self.rules[rule_name].enabled = True
            logger.info(f"Enabled risk rule: {rule_name}")
            return True
        return False
    
    def disable_rule(self, rule_name: str) -> bool:
        """Disable a risk rule."""
        if rule_name in self.rules:
            self.rules[rule_name].enabled = False
            logger.info(f"Disabled risk rule: {rule_name}")
            return True
        return False
    
    def update_rule_params(self, rule_name: str, params: Dict[str, Any]) -> bool:
        """Update parameters for a risk rule."""
        if rule_name in self.rules:
            self.rules[rule_name].params.update(params)
            logger.info(f"Updated risk rule parameters: {rule_name}")
            return True
        return False
    
    def add_risk_event_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Add a callback for risk events."""
        self._risk_event_callbacks.append(callback)
    
    def update_portfolio(self, portfolio_data: Dict[str, Any]) -> None:
        """Update portfolio data."""
        self.portfolio.update(portfolio_data)
        
        # Check drawdown rule
        if "max_drawdown" in self.rules:
            drawdown_rule = self.rules["max_drawdown"]
            result = drawdown_rule.check(
                exchange_id="",
                symbol="",
                portfolio=self.portfolio
            )
            
            if not result["allowed"]:
                self._notify_risk_event({
                    "rule": "max_drawdown",
                    "severity": "high",
                    "message": result["reason"],
                    "suggestions": result.get("suggestions", {})
                })
    
    def check_order(
        self, 
        exchange_id: str, 
        symbol: str, 
        order: Order,
        position: Optional[Position] = None,
        market_data: Optional[MarketData] = None
    ) -> Dict[str, Any]:
        """
        Check if an order is allowed by all risk rules.
        
        Args:
            exchange_id: ID of the exchange
            symbol: Trading pair symbol
            order: Order to check
            position: Current position (optional)
            market_data: Market data (optional)
            
        Returns:
            Dict with:
                'allowed': bool - whether the order is allowed
                'reason': str - reason if not allowed
                'rule': str - name of the rule that blocked the order
                'suggestions': Dict - suggested modifications to comply with the rules
        """
        if not self.trading_enabled:
            return {
                "allowed": False,
                "reason": "Trading is disabled",
                "rule": "global",
                "suggestions": {}
            }
        
        for rule_name, rule in self.rules.items():
            if not rule.enabled:
                continue
                
            result = rule.check(
                exchange_id=exchange_id,
                symbol=symbol,
                order=order,
                position=position,
                market_data=market_data,
                portfolio=self.portfolio
            )
            
            if not result["allowed"]:
                self._notify_risk_event({
                    "rule": rule_name,
                    "severity": "medium",
                    "message": result["reason"],
                    "suggestions": result.get("suggestions", {})
                })
                
                return {
                    "allowed": False,
                    "reason": result["reason"],
                    "rule": rule_name,
                    "suggestions": result.get("suggestions", {})
                }
        
        return {"allowed": True}
    
    def _notify_risk_event(self, event: Dict[str, Any]) -> None:
        """Notify all callbacks about a risk event."""
        event["timestamp"] = int(time.time() * 1000)
        
        for callback in self._risk_event_callbacks:
            try:
                asyncio.create_task(callback(event))
            except Exception as e:
                logger.error(f"Error in risk event callback: {e}")

    # ElizaOS Integration Methods
    
    async def process_eliza_request(self, message: ElizaMessage) -> Optional[ElizaMessage]:
        """Process a request from an ElizaOS agent."""
        if message.message_type != MessageType.COMMAND:
            return None
            
        command = message.content.get("command", "")
        
        if command == "get_risk_rules":
            rules_data = {}
            for name, rule in self.rules.items():
                rules_data[name] = rule.to_dict()
                
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"rules": rules_data},
                sender="risk_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        elif command == "update_risk_rule":
            rule_name = message.content.get("rule_name")
            params = message.content.get("params", {})
            enabled = message.content.get("enabled")
            
            if not rule_name or rule_name not in self.rules:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": f"Rule {rule_name} not found"},
                    sender="risk_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            if params:
                self.update_rule_params(rule_name, params)
                
            if enabled is not None:
                if enabled:
                    self.enable_rule(rule_name)
                else:
                    self.disable_rule(rule_name)
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"success": True, "rule": self.rules[rule_name].to_dict()},
                sender="risk_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        elif command == "toggle_trading":
            enabled = message.content.get("enabled")
            
            if enabled is None:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": "Missing 'enabled' parameter"},
                    sender="risk_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            self.trading_enabled = enabled
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"success": True, "trading_enabled": self.trading_enabled},
                sender="risk_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        elif command == "check_order":
            exchange_id = message.content.get("exchange")
            symbol = message.content.get("symbol")
            order_data = message.content.get("order")
            
            if not exchange_id or not symbol or not order_data:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": "Missing required parameters"},
                    sender="risk_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            # Create Order object from data
            order = Order(
                id=order_data.get("id", ""),
                symbol=symbol,
                exchange=exchange_id,
                side=OrderSide.BUY if order_data.get("side") == "buy" else OrderSide.SELL,
                type=OrderType.MARKET if order_data.get("type") == "market" else OrderType.LIMIT,
                price=float(order_data.get("price", 0)),
                amount=float(order_data.get("amount", 0)),
                status=OrderStatus.NEW
            )
            
            result = self.check_order(
                exchange_id=exchange_id,
                symbol=symbol,
                order=order
            )
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content=result,
                sender="risk_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        elif command == "get_portfolio_risk":
            # Calculate and return portfolio risk metrics
            risk_metrics = self._calculate_portfolio_risk_metrics()
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"risk_metrics": risk_metrics},
                sender="risk_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        return ElizaMessage(
            message_type=MessageType.ERROR,
            content={"error": f"Unknown command: {command}"},
            sender="risk_manager",
            recipient=message.sender,
            timestamp=int(time.time() * 1000),
            in_response_to=message.id
        )
    
    def _calculate_portfolio_risk_metrics(self) -> Dict[str, Any]:
        """Calculate portfolio risk metrics."""
        # In a real implementation, this would calculate various risk metrics
        portfolio_value = self.portfolio.get("total_value", 0)
        
        # Get drawdown value from drawdown rule
        drawdown = 0.0
        if "max_drawdown" in self.rules:
            drawdown_rule = self.rules["max_drawdown"]
            high_water_mark = drawdown_rule.params.get("high_water_mark", portfolio_value)
            if high_water_mark > 0:
                drawdown = ((high_water_mark - portfolio_value) / high_water_mark) * 100
        
        # Calculate exposure by exchange
        exposure_by_exchange = {}
        for pos in self.portfolio.get("positions", []):
            exchange = pos.exchange
            if exchange not in exposure_by_exchange:
                exposure_by_exchange[exchange] = 0
                
            position_value = self.portfolio.get("position_values", {}).get(pos.symbol, 0)
            exposure_by_exchange[exchange] += position_value
        
        # Calculate exposure percentages
        exposure_pct_by_exchange = {}
        if portfolio_value > 0:
            for exchange, value in exposure_by_exchange.items():
                exposure_pct_by_exchange[exchange] = (value / portfolio_value) * 100
        
        return {
            "drawdown_pct": drawdown,
            "max_position_pct": self._get_max_position_pct(),
            "exposure_by_exchange": exposure_pct_by_exchange,
            "risk_score": self._calculate_risk_score(drawdown)
        }
    
    def _get_max_position_pct(self) -> float:
        """Get the percentage of the largest position."""
        portfolio_value = self.portfolio.get("total_value", 0)
        if portfolio_value <= 0:
            return 0.0
            
        position_values = self.portfolio.get("position_values", {})
        if not position_values:
            return 0.0
            
        max_position_value = max(position_values.values()) if position_values else 0
        return (max_position_value / portfolio_value) * 100
    
    def _calculate_risk_score(self, drawdown: float) -> int:
        """Calculate a risk score from 1 (low risk) to 10 (high risk)."""
        # This is a simple scoring method that could be enhanced with more factors
        score = 1
        
        # Factor in drawdown
        if drawdown > 20:
            score += 4
        elif drawdown > 10:
            score += 3
        elif drawdown > 5:
            score += 2
        elif drawdown > 2:
            score += 1
        
        # Factor in position concentration
        max_position_pct = self._get_max_position_pct()
        if max_position_pct > 30:
            score += 4
        elif max_position_pct > 20:
            score += 3
        elif max_position_pct > 10:
            score += 2
        elif max_position_pct > 5:
            score += 1
        
        # Factor in number of positions
        num_positions = len(self.portfolio.get("positions", []))
        if num_positions <= 1:
            score += 2
        elif num_positions <= 3:
            score += 1
        
        return min(score, 10)  # Cap at 10
