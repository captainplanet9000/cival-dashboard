"""
Vertex Protocol Agent Module for TradingFarm

This module provides agent classes for trading on Vertex Protocol through ElizaOS.
Agents can monitor markets, execute trades, and manage positions automatically.
"""

import os
import json
import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union
from decimal import Decimal

from ..blockchain.vertex_integration import VertexClient
from .base_agent import BaseAgent
from .eliza_bridge import ElizaAgentBridge

# Set up logging
logger = logging.getLogger(__name__)

class VertexAgent(BaseAgent):
    """
    Agent for trading on Vertex Protocol
    """
    
    def __init__(self, agent_id: str, name: str, private_key: str = None, 
                 address: str = None, use_testnet: bool = True, eliza_bridge=None,
                 config: Dict[str, Any] = None):
        """
        Initialize the Vertex Protocol agent
        
        Args:
            agent_id: Unique identifier for the agent
            name: Human-readable name for the agent
            private_key: Ethereum private key for signing transactions
            address: Ethereum address if private_key is not provided
            use_testnet: Whether to use testnet or mainnet
            eliza_bridge: ElizaOS bridge for agent communication
            config: Additional configuration parameters
        """
        super().__init__(agent_id, name, eliza_bridge)
        
        self.agent_type = "vertex"
        self.private_key = private_key
        self.address = address
        self.use_testnet = use_testnet
        self.config = config or {}
        
        # Initialize client
        self.client = VertexClient(
            private_key=private_key,
            address=address,
            use_testnet=use_testnet
        )
        
        # Trading state
        self.active_symbols = self.config.get("active_symbols", ["ETH-PERP", "BTC-PERP"])
        self.position_limits = self.config.get("position_limits", {})
        self.active_orders = {}
        self.positions = {}
        self.market_data = {}
        
        # Monitoring settings
        self.monitor_interval = self.config.get("monitor_interval", 60)  # seconds
        self.is_monitoring = False
        self.monitor_task = None
        
        # Strategy settings
        self.strategies = {}
        self.risk_management = self.config.get("risk_management", {
            "max_position_size": 1.0,  # In base units
            "max_leverage": 3.0,
            "stop_loss_pct": 0.05,     # 5% stop loss
            "take_profit_pct": 0.1     # 10% take profit
        })
        
        logger.info(f"Initialized Vertex agent: {name} ({agent_id})")
    
    async def start(self):
        """
        Start the agent and initialize monitoring
        """
        logger.info(f"Starting Vertex agent: {self.name}")
        
        # Load initial market data
        await self.update_market_data()
        
        # Load positions
        await self.update_positions()
        
        # Start monitoring
        self.start_monitoring()
        
        # Notify ElizaOS
        await self.send_status_update("started")
    
    async def stop(self):
        """
        Stop the agent and cleanup resources
        """
        logger.info(f"Stopping Vertex agent: {self.name}")
        
        # Stop monitoring
        self.stop_monitoring()
        
        # Cancel all orders
        await self.cancel_all_orders()
        
        # Notify ElizaOS
        await self.send_status_update("stopped")
    
    def start_monitoring(self):
        """
        Start monitoring markets and positions
        """
        if self.is_monitoring:
            logger.warning(f"Monitoring already started for agent: {self.name}")
            return
        
        self.is_monitoring = True
        self.monitor_task = asyncio.create_task(self.monitor_loop())
        logger.info(f"Started monitoring for agent: {self.name}")
    
    def stop_monitoring(self):
        """
        Stop monitoring markets and positions
        """
        if not self.is_monitoring:
            logger.warning(f"Monitoring already stopped for agent: {self.name}")
            return
        
        self.is_monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            self.monitor_task = None
        
        logger.info(f"Stopped monitoring for agent: {self.name}")
    
    async def monitor_loop(self):
        """
        Main monitoring loop for markets and positions
        """
        logger.info(f"Monitor loop started for agent: {self.name}")
        
        try:
            while self.is_monitoring:
                try:
                    # Update market data
                    await self.update_market_data()
                    
                    # Update positions
                    await self.update_positions()
                    
                    # Update orders
                    await self.update_orders()
                    
                    # Run strategies
                    await self.run_strategies()
                    
                    # Apply risk management
                    await self.apply_risk_management()
                    
                    # Send status update to ElizaOS
                    await self.send_status_update("monitoring")
                    
                except Exception as e:
                    logger.error(f"Error in monitor loop: {str(e)}")
                
                # Wait for next iteration
                await asyncio.sleep(self.monitor_interval)
        except asyncio.CancelledError:
            logger.info(f"Monitor loop cancelled for agent: {self.name}")
        except Exception as e:
            logger.error(f"Unexpected error in monitor loop: {str(e)}")
            
            # Notify ElizaOS
            await self.send_status_update("error", {
                "error": str(e),
                "timestamp": time.time()
            })
    
    async def update_market_data(self):
        """
        Update market data for all active symbols
        """
        logger.debug(f"Updating market data for agent: {self.name}")
        
        for symbol in self.active_symbols:
            try:
                # Get product ID from symbol
                product_id = await self.client.get_product_id_by_symbol(symbol)
                
                if not product_id:
                    logger.warning(f"Product ID not found for symbol: {symbol}")
                    continue
                
                # Get market data
                market_data = await self.client.get_market_data(product_id)
                
                # Get orderbook
                orderbook = await self.client.get_orderbook(product_id)
                
                # Store combined data
                self.market_data[symbol] = {
                    "product_id": product_id,
                    "market_data": market_data,
                    "orderbook": orderbook,
                    "timestamp": time.time()
                }
                
                logger.debug(f"Updated market data for {symbol}")
            except Exception as e:
                logger.error(f"Error updating market data for {symbol}: {str(e)}")
    
    async def update_positions(self):
        """
        Update current positions
        """
        logger.debug(f"Updating positions for agent: {self.name}")
        
        try:
            # Get positions from client
            positions_data = await self.client.get_positions()
            
            # Process and store positions
            self.positions = {}
            
            for position in positions_data:
                product_id = position.get("productId")
                
                # Find symbol for product ID
                symbol = None
                for active_symbol in self.active_symbols:
                    pid = await self.client.get_product_id_by_symbol(active_symbol)
                    if pid == product_id:
                        symbol = active_symbol
                        break
                
                if not symbol:
                    logger.warning(f"Symbol not found for product ID: {product_id}")
                    continue
                
                # Store position
                self.positions[symbol] = position
            
            logger.debug(f"Updated positions: {len(self.positions)} active positions")
        except Exception as e:
            logger.error(f"Error updating positions: {str(e)}")
    
    async def update_orders(self):
        """
        Update current orders
        """
        logger.debug(f"Updating orders for agent: {self.name}")
        
        try:
            # Get orders from client
            orders_data = await self.client.get_orders()
            
            # Process and store orders
            self.active_orders = {}
            
            for order in orders_data:
                order_id = order.get("orderId")
                product_id = order.get("productId")
                
                # Find symbol for product ID
                symbol = None
                for active_symbol in self.active_symbols:
                    pid = await self.client.get_product_id_by_symbol(active_symbol)
                    if pid == product_id:
                        symbol = active_symbol
                        break
                
                if not symbol:
                    logger.warning(f"Symbol not found for product ID: {product_id}")
                    continue
                
                # Store order
                if symbol not in self.active_orders:
                    self.active_orders[symbol] = []
                
                self.active_orders[symbol].append(order)
            
            logger.debug(f"Updated orders: {sum(len(orders) for orders in self.active_orders.values())} active orders")
        except Exception as e:
            logger.error(f"Error updating orders: {str(e)}")
    
    async def run_strategies(self):
        """
        Run active trading strategies
        """
        logger.debug(f"Running strategies for agent: {self.name}")
        
        for symbol, strategy in self.strategies.items():
            if symbol not in self.active_symbols:
                continue
            
            try:
                # Get market data for symbol
                market_data = self.market_data.get(symbol)
                
                if not market_data:
                    logger.warning(f"No market data available for symbol: {symbol}")
                    continue
                
                # Run strategy
                signals = strategy.generate_signals(market_data)
                
                # Process signals
                for signal in signals:
                    await self.process_trading_signal(symbol, signal)
            except Exception as e:
                logger.error(f"Error running strategy for {symbol}: {str(e)}")
    
    async def apply_risk_management(self):
        """
        Apply risk management rules to positions
        """
        logger.debug(f"Applying risk management for agent: {self.name}")
        
        for symbol, position in self.positions.items():
            try:
                # Skip if no position
                if float(position.get("size", 0)) == 0:
                    continue
                
                # Get market data
                market_data = self.market_data.get(symbol)
                
                if not market_data:
                    logger.warning(f"No market data available for symbol: {symbol}")
                    continue
                
                # Check for stop loss
                entry_price = float(position.get("entryPrice", 0))
                size = float(position.get("size", 0))
                is_long = size > 0
                
                # Get current price
                current_price = 0
                
                if is_long:
                    # For long positions, use best bid price
                    bids = market_data["orderbook"].get("bids", [])
                    if bids:
                        current_price = float(bids[0]["px"])
                else:
                    # For short positions, use best ask price
                    asks = market_data["orderbook"].get("asks", [])
                    if asks:
                        current_price = float(asks[0]["px"])
                
                if current_price == 0:
                    logger.warning(f"Could not determine current price for {symbol}")
                    continue
                
                # Calculate price change percentage
                price_change_pct = (current_price - entry_price) / entry_price
                
                # For short positions, negate the percentage
                if not is_long:
                    price_change_pct = -price_change_pct
                
                # Check stop loss
                if price_change_pct <= -self.risk_management["stop_loss_pct"]:
                    logger.info(f"Stop loss triggered for {symbol}: {price_change_pct:.2%}")
                    
                    # Close position
                    await self.close_position(symbol)
                
                # Check take profit
                if price_change_pct >= self.risk_management["take_profit_pct"]:
                    logger.info(f"Take profit triggered for {symbol}: {price_change_pct:.2%}")
                    
                    # Close position
                    await self.close_position(symbol)
            except Exception as e:
                logger.error(f"Error applying risk management for {symbol}: {str(e)}")
    
    async def process_trading_signal(self, symbol: str, signal: Dict[str, Any]):
        """
        Process a trading signal from a strategy
        
        Args:
            symbol: Trading symbol
            signal: Trading signal
        """
        logger.info(f"Processing trading signal for {symbol}: {signal}")
        
        # Extract signal details
        action = signal.get("action")
        size = signal.get("size", 0)
        price = signal.get("price")
        reduce_only = signal.get("reduce_only", False)
        
        # Validate signal
        if not action or size == 0:
            logger.warning(f"Invalid signal for {symbol}: {signal}")
            return
        
        # Process based on action
        if action == "buy":
            await self.open_long_position(symbol, size, price, reduce_only)
        elif action == "sell":
            await self.open_short_position(symbol, size, price, reduce_only)
        elif action == "close":
            await self.close_position(symbol)
        else:
            logger.warning(f"Unknown action in signal for {symbol}: {action}")
    
    async def open_long_position(self, symbol: str, size: float, price: float = None, reduce_only: bool = False):
        """
        Open a long position
        
        Args:
            symbol: Trading symbol
            size: Position size
            price: Limit price (None for market order)
            reduce_only: Whether the order should be reduce-only
        
        Returns:
            Order response
        """
        logger.info(f"Opening long position for {symbol}: size={size}, price={price}, reduce_only={reduce_only}")
        
        try:
            # Get product ID
            product_id = await self.client.get_product_id_by_symbol(symbol)
            
            if not product_id:
                logger.error(f"Product ID not found for symbol: {symbol}")
                return None
            
            # Apply position size limits
            max_size = self.position_limits.get(symbol, {}).get("max_size", self.risk_management["max_position_size"])
            size = min(size, max_size)
            
            # Place order
            if price:
                # Limit order
                response = await self.client.place_order(
                    product_id=product_id,
                    is_buy=True,
                    price=price,
                    amount=size,
                    reduce_only=reduce_only
                )
            else:
                # Market order
                response = await self.client.place_market_order(
                    product_id=product_id,
                    is_buy=True,
                    amount=size
                )
            
            # Log response
            logger.info(f"Opened long position for {symbol}: {response}")
            
            # Notify ElizaOS
            await self.send_status_update("trade", {
                "symbol": symbol,
                "action": "open_long",
                "size": size,
                "price": price,
                "order_id": response.get("orderId"),
                "timestamp": time.time()
            })
            
            return response
        except Exception as e:
            logger.error(f"Error opening long position for {symbol}: {str(e)}")
            return None
    
    async def open_short_position(self, symbol: str, size: float, price: float = None, reduce_only: bool = False):
        """
        Open a short position
        
        Args:
            symbol: Trading symbol
            size: Position size
            price: Limit price (None for market order)
            reduce_only: Whether the order should be reduce-only
        
        Returns:
            Order response
        """
        logger.info(f"Opening short position for {symbol}: size={size}, price={price}, reduce_only={reduce_only}")
        
        try:
            # Get product ID
            product_id = await self.client.get_product_id_by_symbol(symbol)
            
            if not product_id:
                logger.error(f"Product ID not found for symbol: {symbol}")
                return None
            
            # Apply position size limits
            max_size = self.position_limits.get(symbol, {}).get("max_size", self.risk_management["max_position_size"])
            size = min(size, max_size)
            
            # Place order
            if price:
                # Limit order
                response = await self.client.place_order(
                    product_id=product_id,
                    is_buy=False,
                    price=price,
                    amount=size,
                    reduce_only=reduce_only
                )
            else:
                # Market order
                response = await self.client.place_market_order(
                    product_id=product_id,
                    is_buy=False,
                    amount=size
                )
            
            # Log response
            logger.info(f"Opened short position for {symbol}: {response}")
            
            # Notify ElizaOS
            await self.send_status_update("trade", {
                "symbol": symbol,
                "action": "open_short",
                "size": size,
                "price": price,
                "order_id": response.get("orderId"),
                "timestamp": time.time()
            })
            
            return response
        except Exception as e:
            logger.error(f"Error opening short position for {symbol}: {str(e)}")
            return None
    
    async def close_position(self, symbol: str):
        """
        Close an existing position
        
        Args:
            symbol: Trading symbol
        
        Returns:
            Order response
        """
        logger.info(f"Closing position for {symbol}")
        
        try:
            # Get position
            position = self.positions.get(symbol)
            
            if not position or float(position.get("size", 0)) == 0:
                logger.warning(f"No position to close for {symbol}")
                return None
            
            # Get product ID
            product_id = await self.client.get_product_id_by_symbol(symbol)
            
            if not product_id:
                logger.error(f"Product ID not found for symbol: {symbol}")
                return None
            
            # Determine order direction
            size = float(position.get("size", 0))
            is_buy = size < 0  # Buy to close a short position, sell to close a long position
            
            # Place market order to close
            response = await self.client.place_market_order(
                product_id=product_id,
                is_buy=is_buy,
                amount=abs(size)
            )
            
            # Log response
            logger.info(f"Closed position for {symbol}: {response}")
            
            # Notify ElizaOS
            await self.send_status_update("trade", {
                "symbol": symbol,
                "action": "close",
                "size": abs(size),
                "order_id": response.get("orderId"),
                "timestamp": time.time()
            })
            
            return response
        except Exception as e:
            logger.error(f"Error closing position for {symbol}: {str(e)}")
            return None
    
    async def cancel_all_orders(self):
        """
        Cancel all active orders
        
        Returns:
            List of cancellation responses
        """
        logger.info(f"Cancelling all orders for agent: {self.name}")
        
        responses = []
        
        # Update orders first
        await self.update_orders()
        
        # Cancel each order
        for symbol, orders in self.active_orders.items():
            for order in orders:
                order_id = order.get("orderId")
                
                if not order_id:
                    continue
                
                try:
                    response = await self.client.cancel_order(order_id)
                    responses.append(response)
                    
                    logger.info(f"Cancelled order {order_id} for {symbol}: {response}")
                except Exception as e:
                    logger.error(f"Error cancelling order {order_id} for {symbol}: {str(e)}")
        
        return responses
    
    async def send_status_update(self, status_type: str, data: Dict[str, Any] = None):
        """
        Send a status update to ElizaOS
        
        Args:
            status_type: Type of status update
            data: Additional data for the update
        """
        if not self.eliza_bridge:
            return
        
        status_data = {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "agent_type": self.agent_type,
            "status_type": status_type,
            "timestamp": time.time()
        }
        
        if data:
            status_data.update(data)
        
        try:
            await self.eliza_bridge.send_agent_status(status_data)
        except Exception as e:
            logger.error(f"Error sending status update: {str(e)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert agent to dictionary representation
        
        Returns:
            Dictionary representation of the agent
        """
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "agent_type": self.agent_type,
            "address": self.address,
            "use_testnet": self.use_testnet,
            "active_symbols": self.active_symbols,
            "is_monitoring": self.is_monitoring,
            "positions": self.positions,
            "active_orders": self.active_orders,
            "config": self.config,
            "risk_management": self.risk_management,
            "last_updated": time.time()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any], eliza_bridge=None):
        """
        Create agent from dictionary representation
        
        Args:
            data: Dictionary representation of the agent
            eliza_bridge: ElizaOS bridge for agent communication
            
        Returns:
            Agent instance
        """
        agent = cls(
            agent_id=data.get("agent_id"),
            name=data.get("name"),
            private_key=None,  # Do not store private key in dictionary
            address=data.get("address"),
            use_testnet=data.get("use_testnet", True),
            eliza_bridge=eliza_bridge,
            config=data.get("config", {})
        )
        
        agent.active_symbols = data.get("active_symbols", ["ETH-PERP", "BTC-PERP"])
        agent.risk_management = data.get("risk_management", agent.risk_management)
        
        return agent
