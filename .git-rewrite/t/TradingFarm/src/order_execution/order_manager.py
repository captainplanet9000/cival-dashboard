"""
Order Manager for the TradingFarm platform.
Manages order execution across multiple exchanges.
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field

from ..exchanges.base import (
    ExchangeClient, 
    Order, 
    OrderSide, 
    OrderType, 
    OrderStatus,
    OrderTimeInForce
)
from ..agents.eliza_protocol import ElizaMessage, MessageType

logger = logging.getLogger(__name__)

@dataclass
class OrderExecutionStrategy:
    """Base class for order execution strategies."""
    name: str
    params: Dict[str, Any] = field(default_factory=dict)
    
    async def execute(
        self, 
        exchange: ExchangeClient, 
        symbol: str, 
        side: OrderSide, 
        amount: float, 
        price: Optional[float] = None,
        **kwargs
    ) -> List[Order]:
        """Execute the strategy and return resulting orders."""
        raise NotImplementedError("Execution strategy not implemented")

@dataclass
class BasicExecution(OrderExecutionStrategy):
    """Simple order execution strategy (market or limit)."""
    
    def __init__(self, **kwargs):
        super().__init__(name="basic", params=kwargs)
    
    async def execute(
        self, 
        exchange: ExchangeClient, 
        symbol: str, 
        side: OrderSide, 
        amount: float, 
        price: Optional[float] = None,
        **kwargs
    ) -> List[Order]:
        """Execute a simple market or limit order."""
        order_type = kwargs.get("order_type", OrderType.MARKET if price is None else OrderType.LIMIT)
        
        order = await exchange.create_order(
            symbol=symbol,
            side=side,
            order_type=order_type,
            amount=amount,
            price=price,
            params=kwargs
        )
        
        return [order]

@dataclass
class TWAPExecution(OrderExecutionStrategy):
    """Time-Weighted Average Price execution."""
    
    def __init__(self, num_slices: int = 5, interval_seconds: int = 60, **kwargs):
        super().__init__(
            name="twap", 
            params={
                "num_slices": num_slices,
                "interval_seconds": interval_seconds,
                **kwargs
            }
        )
    
    async def execute(
        self, 
        exchange: ExchangeClient, 
        symbol: str, 
        side: OrderSide, 
        amount: float, 
        price: Optional[float] = None,
        **kwargs
    ) -> List[Order]:
        """Execute a TWAP order by splitting into multiple slices over time."""
        num_slices = self.params["num_slices"]
        interval = self.params["interval_seconds"]
        
        # Calculate slice size (rounding to exchange precision would be added in production)
        slice_size = amount / num_slices
        
        orders = []
        order_type = kwargs.get("order_type", OrderType.MARKET if price is None else OrderType.LIMIT)
        
        for i in range(num_slices):
            try:
                # Place a single slice order
                order = await exchange.create_order(
                    symbol=symbol,
                    side=side,
                    order_type=order_type,
                    amount=slice_size,
                    price=price,
                    params=kwargs
                )
                
                orders.append(order)
                
                # Wait before placing the next slice (except for the last one)
                if i < num_slices - 1:
                    await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error executing TWAP slice {i+1}/{num_slices}: {e}")
                # Continue with remaining slices even if one fails
        
        return orders

class OrderManager:
    """
    Central order manager for the TradingFarm platform.
    
    Responsibilities:
    1. Execute orders across multiple exchanges
    2. Implement various execution strategies (TWAP, VWAP, etc.)
    3. Track order status and history
    4. Integrate with risk management system
    5. Integrate with ElizaOS for AI-driven order execution
    """
    
    def __init__(self):
        self.exchanges: Dict[str, ExchangeClient] = {}
        self.active_orders: Dict[str, Order] = {}
        self.order_history: Dict[str, List[Order]] = {}
        self.execution_strategies: Dict[str, OrderExecutionStrategy] = {
            "basic": BasicExecution(),
            "twap": TWAPExecution()
        }
        
        # Status tracking
        self._running = False
        self._tasks = set()
        
        # Order update callbacks
        self._order_update_callbacks: List[Callable[[Order], None]] = []
    
    def register_exchange(self, exchange: ExchangeClient) -> None:
        """Register an exchange client with the order manager."""
        exchange_id = exchange.exchange_id
        
        if exchange_id in self.exchanges:
            logger.warning(f"Exchange {exchange_id} already registered, replacing with new instance")
        
        self.exchanges[exchange_id] = exchange
        
        # Register order update callbacks
        exchange.add_order_update_callback(self._on_order_update)
        
        logger.info(f"Registered exchange: {exchange_id}")
    
    def unregister_exchange(self, exchange_id: str) -> None:
        """Unregister an exchange client."""
        if exchange_id not in self.exchanges:
            logger.warning(f"Exchange {exchange_id} not registered")
            return
        
        # Remove exchange
        del self.exchanges[exchange_id]
        logger.info(f"Unregistered exchange: {exchange_id}")
    
    def register_execution_strategy(self, strategy: OrderExecutionStrategy) -> None:
        """Register a custom execution strategy."""
        self.execution_strategies[strategy.name] = strategy
        logger.info(f"Registered execution strategy: {strategy.name}")
    
    def add_order_update_callback(self, callback: Callable[[Order], None]) -> None:
        """Add a callback for order updates."""
        self._order_update_callbacks.append(callback)
    
    async def start(self) -> None:
        """Start the order manager."""
        if self._running:
            logger.warning("Order manager already running")
            return
        
        logger.info("Starting order manager")
        self._running = True
        
        # Start order status polling
        self._tasks.add(asyncio.create_task(self._poll_order_status()))
        
        logger.info("Order manager started")
    
    async def stop(self) -> None:
        """Stop the order manager."""
        if not self._running:
            logger.warning("Order manager not running")
            return
        
        logger.info("Stopping order manager")
        self._running = False
        
        # Cancel all tasks
        for task in self._tasks:
            task.cancel()
        
        self._tasks.clear()
        
        logger.info("Order manager stopped")
    
    async def execute_order(
        self,
        exchange_id: str,
        symbol: str,
        side: OrderSide,
        amount: float,
        price: Optional[float] = None,
        order_type: OrderType = None,
        strategy_name: str = "basic",
        strategy_params: Dict[str, Any] = None,
        **kwargs
    ) -> List[Order]:
        """
        Execute an order using the specified strategy.
        
        Args:
            exchange_id: ID of the exchange
            symbol: Trading pair symbol
            side: Order side (BUY/SELL)
            amount: Order amount
            price: Order price (optional, depends on order type)
            order_type: Order type (limit, market, etc.)
            strategy_name: Execution strategy to use
            strategy_params: Parameters for the execution strategy
            **kwargs: Additional parameters
            
        Returns:
            List of executed orders
        """
        if exchange_id not in self.exchanges:
            raise ValueError(f"Exchange {exchange_id} not registered")
        
        exchange = self.exchanges[exchange_id]
        
        # Set order type if not specified
        if order_type is None:
            order_type = OrderType.MARKET if price is None else OrderType.LIMIT
        
        # Get execution strategy
        if strategy_name not in self.execution_strategies:
            raise ValueError(f"Execution strategy {strategy_name} not found")
        
        strategy = self.execution_strategies[strategy_name]
        
        # Update strategy params if provided
        if strategy_params:
            strategy_params_copy = strategy.params.copy()
            strategy_params_copy.update(strategy_params)
            strategy.params = strategy_params_copy
        
        # Include order_type in kwargs
        kwargs["order_type"] = order_type
        
        # Execute order using strategy
        orders = await strategy.execute(
            exchange=exchange,
            symbol=symbol,
            side=side,
            amount=amount,
            price=price,
            **kwargs
        )
        
        # Track orders
        for order in orders:
            self.active_orders[order.id] = order
            
            if order.symbol not in self.order_history:
                self.order_history[order.symbol] = []
            
            self.order_history[order.symbol].append(order)
        
        return orders
    
    async def cancel_order(self, order_id: str, exchange_id: str = None) -> bool:
        """
        Cancel an order.
        
        Args:
            order_id: ID of the order to cancel
            exchange_id: ID of the exchange (optional if order is tracked)
            
        Returns:
            True if successful, False otherwise
        """
        # If order is tracked, get exchange from there
        if order_id in self.active_orders:
            exchange_id = self.active_orders[order_id].exchange
        
        if not exchange_id:
            logger.error(f"Exchange ID not provided and order {order_id} not tracked")
            return False
        
        if exchange_id not in self.exchanges:
            logger.error(f"Exchange {exchange_id} not registered")
            return False
        
        exchange = self.exchanges[exchange_id]
        
        try:
            success = await exchange.cancel_order(order_id)
            
            if success and order_id in self.active_orders:
                # Update order status
                self.active_orders[order_id].status = OrderStatus.CANCELED
            
            return success
            
        except Exception as e:
            logger.error(f"Error canceling order {order_id}: {e}")
            return False
    
    async def get_order(self, order_id: str, exchange_id: str = None) -> Optional[Order]:
        """
        Get an order by ID.
        
        Args:
            order_id: ID of the order
            exchange_id: ID of the exchange (optional if order is tracked)
            
        Returns:
            Order object or None if not found
        """
        # Check if order is tracked
        if order_id in self.active_orders:
            # If tracked but canceled or filled, return from cache
            if self.active_orders[order_id].status in [OrderStatus.CANCELED, OrderStatus.FILLED]:
                return self.active_orders[order_id]
            
            # Otherwise, get exchange from tracked order
            exchange_id = self.active_orders[order_id].exchange
        
        if not exchange_id:
            logger.error(f"Exchange ID not provided and order {order_id} not tracked")
            return None
        
        if exchange_id not in self.exchanges:
            logger.error(f"Exchange {exchange_id} not registered")
            return None
        
        exchange = self.exchanges[exchange_id]
        
        try:
            order = await exchange.fetch_order(order_id)
            
            if order and order_id in self.active_orders:
                # Update tracked order
                self.active_orders[order_id] = order
                
                # Update order history
                if order.symbol in self.order_history:
                    for i, hist_order in enumerate(self.order_history[order.symbol]):
                        if hist_order.id == order_id:
                            self.order_history[order.symbol][i] = order
                            break
                
                # If order is done, remove from active orders
                if order.status in [OrderStatus.FILLED, OrderStatus.CANCELED]:
                    self.active_orders.pop(order_id, None)
            
            return order
            
        except Exception as e:
            logger.error(f"Error fetching order {order_id}: {e}")
            return None
    
    async def get_open_orders(self, exchange_id: str, symbol: str = None) -> List[Order]:
        """
        Get open orders for an exchange.
        
        Args:
            exchange_id: ID of the exchange
            symbol: Trading pair symbol (optional)
            
        Returns:
            List of open orders
        """
        if exchange_id not in self.exchanges:
            logger.error(f"Exchange {exchange_id} not registered")
            return []
        
        exchange = self.exchanges[exchange_id]
        
        try:
            orders = await exchange.fetch_open_orders(symbol)
            
            # Update tracked orders
            for order in orders:
                self.active_orders[order.id] = order
            
            return orders
            
        except Exception as e:
            logger.error(f"Error fetching open orders for {exchange_id}: {e}")
            return []
    
    async def _poll_order_status(self) -> None:
        """Periodically poll for order status updates."""
        while self._running:
            try:
                # Process active orders in batches per exchange
                orders_by_exchange = {}
                for order_id, order in list(self.active_orders.items()):
                    if order.exchange not in orders_by_exchange:
                        orders_by_exchange[order.exchange] = []
                    orders_by_exchange[order.exchange].append(order)
                
                # Fetch updates for each exchange
                for exchange_id, orders in orders_by_exchange.items():
                    if exchange_id not in self.exchanges:
                        continue
                        
                    exchange = self.exchanges[exchange_id]
                    
                    # Group orders by symbol for efficiency
                    orders_by_symbol = {}
                    for order in orders:
                        if order.symbol not in orders_by_symbol:
                            orders_by_symbol[order.symbol] = []
                        orders_by_symbol[order.symbol].append(order)
                    
                    # Fetch open orders by symbol
                    for symbol, symbol_orders in orders_by_symbol.items():
                        try:
                            open_orders = await exchange.fetch_open_orders(symbol)
                            
                            # Create map of open orders by ID
                            open_order_map = {order.id: order for order in open_orders}
                            
                            # Check status of each tracked order
                            for order in symbol_orders:
                                if order.id in open_order_map:
                                    # Order is still open, update with latest data
                                    self.active_orders[order.id] = open_order_map[order.id]
                                else:
                                    # Order is no longer open, fetch individual status
                                    await self.get_order(order.id, exchange_id)
                        
                        except Exception as e:
                            logger.error(f"Error polling orders for {exchange_id}:{symbol}: {e}")
                
                # Sleep before next poll
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in order status polling: {e}")
                await asyncio.sleep(10)  # Longer sleep on error
    
    def _on_order_update(self, order: Order) -> None:
        """Handle order updates from exchanges."""
        # Update tracked order
        if order.id in self.active_orders:
            self.active_orders[order.id] = order
            
            # Update order history
            if order.symbol in self.order_history:
                for i, hist_order in enumerate(self.order_history[order.symbol]):
                    if hist_order.id == order.id:
                        self.order_history[order.symbol][i] = order
                        break
            
            # If order is done, remove from active orders
            if order.status in [OrderStatus.FILLED, OrderStatus.CANCELED]:
                self.active_orders.pop(order.id, None)
        
        # Notify callbacks
        for callback in self._order_update_callbacks:
            try:
                asyncio.create_task(callback(order))
            except Exception as e:
                logger.error(f"Error in order update callback: {e}")
    
    # ElizaOS Integration Methods
    
    def to_eliza_message(self, order: Order) -> ElizaMessage:
        """Convert order data to an ElizaOS-compatible message format."""
        message_data = {
            "order": order.to_dict(),
            "timestamp": order.timestamp,
            "exchange": order.exchange,
            "symbol": order.symbol
        }
        
        return ElizaMessage(
            message_type=MessageType.ORDER_UPDATE,
            content=message_data,
            sender="order_manager",
            timestamp=order.timestamp
        )
    
    async def process_eliza_request(self, message: ElizaMessage) -> Optional[ElizaMessage]:
        """Process a request from an ElizaOS agent."""
        if message.message_type != MessageType.COMMAND:
            return None
            
        command = message.content.get("command", "")
        
        if command == "place_order":
            try:
                # Extract order parameters
                exchange_id = message.content.get("exchange")
                symbol = message.content.get("symbol")
                side_str = message.content.get("side", "").upper()
                amount = float(message.content.get("amount", 0))
                price = message.content.get("price")
                
                if price is not None:
                    price = float(price)
                
                if not exchange_id or not symbol or not side_str or amount <= 0:
                    return ElizaMessage(
                        message_type=MessageType.ERROR,
                        content={"error": "Missing or invalid order parameters"},
                        sender="order_manager",
                        recipient=message.sender,
                        timestamp=int(time.time() * 1000),
                        in_response_to=message.id
                    )
                
                # Convert side string to enum
                side = OrderSide.BUY if side_str == "BUY" else OrderSide.SELL
                
                # Get additional parameters
                order_type_str = message.content.get("order_type", "MARKET" if price is None else "LIMIT").upper()
                order_type = OrderType.MARKET if order_type_str == "MARKET" else OrderType.LIMIT
                
                strategy_name = message.content.get("strategy", "basic")
                strategy_params = message.content.get("strategy_params", {})
                
                # Execute order
                orders = await self.execute_order(
                    exchange_id=exchange_id,
                    symbol=symbol,
                    side=side,
                    amount=amount,
                    price=price,
                    order_type=order_type,
                    strategy_name=strategy_name,
                    strategy_params=strategy_params
                )
                
                # Return order details
                return ElizaMessage(
                    message_type=MessageType.RESPONSE,
                    content={
                        "order_ids": [order.id for order in orders],
                        "orders": [order.to_dict() for order in orders]
                    },
                    sender="order_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
                
            except Exception as e:
                logger.error(f"Error processing place_order command: {e}")
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": f"Order execution error: {str(e)}"},
                    sender="order_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
                
        elif command == "cancel_order":
            order_id = message.content.get("order_id")
            exchange_id = message.content.get("exchange")
            
            if not order_id:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": "Missing order_id"},
                    sender="order_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            success = await self.cancel_order(order_id, exchange_id)
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"success": success},
                sender="order_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        elif command == "get_order":
            order_id = message.content.get("order_id")
            exchange_id = message.content.get("exchange")
            
            if not order_id:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": "Missing order_id"},
                    sender="order_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            order = await self.get_order(order_id, exchange_id)
            
            if not order:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": f"Order {order_id} not found"},
                    sender="order_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"order": order.to_dict()},
                sender="order_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        elif command == "get_open_orders":
            exchange_id = message.content.get("exchange")
            symbol = message.content.get("symbol")
            
            if not exchange_id:
                return ElizaMessage(
                    message_type=MessageType.ERROR,
                    content={"error": "Missing exchange_id"},
                    sender="order_manager",
                    recipient=message.sender,
                    timestamp=int(time.time() * 1000),
                    in_response_to=message.id
                )
            
            orders = await self.get_open_orders(exchange_id, symbol)
            
            return ElizaMessage(
                message_type=MessageType.RESPONSE,
                content={"orders": [order.to_dict() for order in orders]},
                sender="order_manager",
                recipient=message.sender,
                timestamp=int(time.time() * 1000),
                in_response_to=message.id
            )
            
        return ElizaMessage(
            message_type=MessageType.ERROR,
            content={"error": f"Unknown command: {command}"},
            sender="order_manager",
            recipient=message.sender,
            timestamp=int(time.time() * 1000),
            in_response_to=message.id
        )
