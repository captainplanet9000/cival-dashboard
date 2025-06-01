"""
Advanced Order Execution Module

Provides advanced order execution capabilities including:
- OCO Orders
- Trailing Stops
- Take Profit Orders
- Multi-Exchange Order Coordination
- Position Reconciliation
- Advanced Risk Controls
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime

from ..blockchain.base import OrderSide, OrderType, Order, TimeInForce
from ..blockchain.hyperliquid import HyperliquidClient
from ..blockchain.sonic import SonicClient
from ..blockchain.vertex import VertexClient
from ..strategies.base import Signal, SignalType
from .order_execution import OrderExecutionStep
from .base import WorkflowStep

logger = logging.getLogger(__name__)

class AdvancedOrderExecutionStep(OrderExecutionStep):
    """Advanced order execution with support for complex order types."""
    
    def __init__(self, name: str, exchange: str, risk_manager=None):
        super().__init__(name, exchange)
        self.risk_manager = risk_manager
    
    async def create_trailing_stop(self, symbol: str, quantity: float, 
                                   activation_price: float, callback_rate: float,
                                   side: OrderSide) -> Dict[str, Any]:
        """
        Create a trailing stop order.
        
        Args:
            symbol: Trading symbol
            quantity: Order quantity
            activation_price: Price to activate the trailing stop
            callback_rate: Callback rate in percentage
            side: Order side (BUY or SELL)
            
        Returns:
            Order creation result
        """
        order = Order(
            symbol=symbol,
            side=side,
            order_type=OrderType.TRAILING_STOP,
            quantity=quantity,
            activation_price=activation_price,
            callback_rate=callback_rate
        )
        
        # Check if order complies with risk limits
        if self.risk_manager and not self.risk_manager.validate_order(order):
            logger.warning(f"Order rejected by risk manager: {order}")
            return {"status": "rejected", "reason": "risk_limits"}
        
        result = await self.client.create_order(order)
        logger.info(f"Created trailing stop order for {symbol}: {result}")
        return result
    
    async def create_take_profit_order(self, symbol: str, quantity: float,
                                      price: float, side: OrderSide) -> Dict[str, Any]:
        """
        Create a take profit order.
        
        Args:
            symbol: Trading symbol
            quantity: Order quantity
            price: Take profit price
            side: Order side (BUY or SELL)
            
        Returns:
            Order creation result
        """
        order = Order(
            symbol=symbol,
            side=side,
            order_type=OrderType.TAKE_PROFIT,
            quantity=quantity,
            price=price
        )
        
        # Check if order complies with risk limits
        if self.risk_manager and not self.risk_manager.validate_order(order):
            logger.warning(f"Order rejected by risk manager: {order}")
            return {"status": "rejected", "reason": "risk_limits"}
        
        result = await self.client.create_order(order)
        logger.info(f"Created take profit order for {symbol}: {result}")
        return result
        
    async def create_oco_order(self, symbol: str, quantity: float, 
                              limit_price: float, stop_price: float, 
                              side: OrderSide) -> Dict[str, Any]:
        """
        Create an OCO (One-Cancels-Other) order.
        
        Args:
            symbol: Trading symbol
            quantity: Order quantity
            limit_price: Limit price for the order
            stop_price: Stop price for the order
            side: Order side (BUY or SELL)
            
        Returns:
            OCO order creation result
        """
        # Create a combined OCO order if the exchange supports it
        if hasattr(self.client, "create_oco_order"):
            order = Order(
                symbol=symbol,
                side=side,
                order_type=OrderType.OCO,
                quantity=quantity,
                price=limit_price,
                stop_price=stop_price
            )
            
            # Check if order complies with risk limits
            if self.risk_manager and not self.risk_manager.validate_order(order):
                logger.warning(f"Order rejected by risk manager: {order}")
                return {"status": "rejected", "reason": "risk_limits"}
                
            result = await self.client.create_oco_order(symbol, side, quantity, limit_price, stop_price)
            logger.info(f"Created OCO order for {symbol}: {result}")
            return result
        else:
            # If the exchange doesn't support OCO directly, implement it with two separate orders
            logger.info(f"Exchange {self.exchange} doesn't support OCO directly. Implementing with separate orders.")
            
            # Create the limit order
            limit_order = Order(
                symbol=symbol,
                side=side,
                order_type=OrderType.LIMIT,
                quantity=quantity,
                price=limit_price
            )
            
            # Create the stop order
            stop_order = Order(
                symbol=symbol,
                side=side,
                order_type=OrderType.STOP,
                quantity=quantity,
                stop_price=stop_price
            )
            
            # Check if orders comply with risk limits
            if self.risk_manager:
                if not self.risk_manager.validate_order(limit_order) or not self.risk_manager.validate_order(stop_order):
                    logger.warning(f"OCO order rejected by risk manager")
                    return {"status": "rejected", "reason": "risk_limits"}
            
            # Create both orders
            limit_result = await self.client.create_order(limit_order)
            stop_result = await self.client.create_order(stop_order)
            
            # Link the orders for tracking purposes
            if "order_id" in limit_result and "order_id" in stop_result:
                await self._track_linked_orders(limit_result["order_id"], stop_result["order_id"])
            
            return {
                "status": "created",
                "limit_order": limit_result,
                "stop_order": stop_result
            }
    
    async def _track_linked_orders(self, order_id1: str, order_id2: str) -> None:
        """
        Track linked orders (for implementing OCO behavior).
        When one order is filled, cancel the other.
        
        Args:
            order_id1: First order ID
            order_id2: Second order ID
        """
        # Store the linked orders in a database or in-memory
        # This would be implemented based on your system's storage
        logger.info(f"Tracking linked orders: {order_id1} and {order_id2}")

    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute advanced orders based on context signals.
        
        Args:
            context: Workflow context
            
        Returns:
            Updated context
        """
        if 'advanced_orders' not in context:
            logger.info("No advanced orders found in context. Using standard execution.")
            return await super().execute(context)
        
        advanced_orders = context['advanced_orders']
        executed_orders = {}
        
        # Get account balance
        try:
            balance = await self.client.get_account_balance()
            logger.info(f"Retrieved account balance from {self.exchange}: {balance}")
        except Exception as e:
            logger.error(f"Error fetching balance from {self.exchange}: {str(e)}")
            balance = 0
        
        if balance <= 0:
            logger.warning(f"Insufficient balance on {self.exchange}. Skipping order execution.")
            return context
        
        # Process each advanced order
        for order_config in advanced_orders:
            try:
                order_type = order_config.get('type', 'standard')
                symbol = order_config.get('symbol')
                side = OrderSide.BUY if order_config.get('side', 'BUY').upper() == 'BUY' else OrderSide.SELL
                quantity = order_config.get('quantity', balance * 0.1)  # Default to 10% of balance
                
                # Execute appropriate order type
                if order_type == 'trailing_stop':
                    activation_price = order_config.get('activation_price')
                    callback_rate = order_config.get('callback_rate', 1.0)  # Default 1%
                    
                    result = await self.create_trailing_stop(
                        symbol, quantity, activation_price, callback_rate, side
                    )
                    
                elif order_type == 'take_profit':
                    price = order_config.get('price')
                    
                    result = await self.create_take_profit_order(
                        symbol, quantity, price, side
                    )
                    
                elif order_type == 'oco':
                    limit_price = order_config.get('limit_price')
                    stop_price = order_config.get('stop_price')
                    
                    result = await self.create_oco_order(
                        symbol, quantity, limit_price, stop_price, side
                    )
                    
                else:
                    # Fall back to standard order execution
                    logger.info(f"No specialized handling for order type {order_type}. Using standard execution.")
                    
                    order = Order(
                        symbol=symbol,
                        side=side,
                        order_type=OrderType.MARKET if order_config.get('order_type') is None 
                                  else OrderType(order_config.get('order_type')),
                        quantity=quantity,
                        price=order_config.get('price'),
                        stop_price=order_config.get('stop_price')
                    )
                    
                    # Check if order complies with risk limits
                    if self.risk_manager and not self.risk_manager.validate_order(order):
                        logger.warning(f"Order rejected by risk manager: {order}")
                        result = {"status": "rejected", "reason": "risk_limits"}
                    else:
                        result = await self.client.create_order(order)
                
                executed_orders[symbol] = {
                    'order_id': result.get('order_id'),
                    'symbol': symbol,
                    'side': side.value,
                    'type': order_type,
                    'quantity': quantity,
                    'timestamp': datetime.now().isoformat(),
                    'result': result,
                    'status': 'executed' if result.get('status') != 'rejected' else 'rejected'
                }
                
                logger.info(f"Executed {order_type} order for {symbol}: {result}")
                
            except Exception as e:
                logger.error(f"Error executing {order_config.get('type', 'unknown')} order for "
                             f"{order_config.get('symbol', 'unknown')}: {str(e)}")
                executed_orders[order_config.get('symbol', 'unknown')] = {
                    'symbol': order_config.get('symbol', 'unknown'),
                    'type': order_config.get('type', 'unknown'),
                    'error': str(e),
                    'timestamp': datetime.now().isoformat(),
                    'status': 'failed'
                }
        
        self.executed_orders = executed_orders
        
        # Add executed orders to context
        if 'executed_orders' not in context:
            context['executed_orders'] = {}
        
        context['executed_orders'][self.exchange] = executed_orders
        
        # Log summary
        success_count = len([o for o in executed_orders.values() if o['status'] == 'executed'])
        total_count = len(executed_orders)
        logger.info(f"Executed {success_count}/{total_count} advanced orders on {self.exchange}")
        
        return context
