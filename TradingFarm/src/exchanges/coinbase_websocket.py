"""
Coinbase websocket client for real-time market data and order updates.
"""

import asyncio
import base64
import hmac
import hashlib
import json
import logging
import time
from typing import Dict, List, Any, Callable, Optional, Set, Union

import aiohttp

from .base import MarketData, Order, Position, OrderSide, OrderStatus, MarketType

logger = logging.getLogger(__name__)

class CoinbaseWebsocketClient:
    """
    Websocket client for Coinbase exchange.
    Handles real-time market data, order updates, and more.
    """
    
    def __init__(
        self,
        api_key: str = None,
        api_secret: str = None,
        testnet: bool = False
    ):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        
        self.ws_url = "wss://ws-feed.exchange.coinbase.com"
        if testnet:
            self.ws_url = "wss://ws-feed-public.sandbox.exchange.coinbase.com"
        
        self._ws = None
        self._ws_connected = False
        self._ws_task = None
        self._subscribed_channels = set()
        self._subscribed_products = set()
        
        # Callbacks
        self._ticker_callbacks = []
        self._orderbook_callbacks = []
        self._trades_callbacks = []
        self._order_callbacks = []
        self._error_callbacks = []
        
        # Heartbeat
        self._last_heartbeat = 0
        self._heartbeat_interval = 30  # seconds
    
    def add_ticker_callback(self, callback: Callable[[MarketData], None]) -> None:
        """Add callback for ticker updates."""
        self._ticker_callbacks.append(callback)
    
    def add_orderbook_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Add callback for orderbook updates."""
        self._orderbook_callbacks.append(callback)
    
    def add_trades_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Add callback for trade updates."""
        self._trades_callbacks.append(callback)
    
    def add_order_callback(self, callback: Callable[[Order], None]) -> None:
        """Add callback for order updates."""
        self._order_callbacks.append(callback)
    
    def add_error_callback(self, callback: Callable[[str], None]) -> None:
        """Add callback for error notifications."""
        self._error_callbacks.append(callback)
    
    def _generate_signature(self, timestamp: str, method: str, request_path: str, body: str) -> str:
        """Generate signature for authentication."""
        message = timestamp + method + request_path + body
        hmac_key = base64.b64decode(self.api_secret)
        signature = hmac.new(hmac_key, message.encode('utf-8'), hashlib.sha256)
        return base64.b64encode(signature.digest()).decode('utf-8')
    
    async def connect(self) -> None:
        """Connect to the Coinbase websocket."""
        if self._ws_connected:
            logger.info("Already connected to Coinbase websocket")
            return
        
        logger.info(f"Connecting to Coinbase websocket: {self.ws_url}")
        
        try:
            session = aiohttp.ClientSession()
            self._ws = await session.ws_connect(self.ws_url)
            self._ws_connected = True
            
            logger.info("Connected to Coinbase websocket")
            
            # Start the message handler
            self._ws_task = asyncio.create_task(self._message_handler())
            
            # Subscribe to channels if any were requested before connection
            if self._subscribed_channels and self._subscribed_products:
                await self._send_subscribe_message(
                    list(self._subscribed_channels),
                    list(self._subscribed_products)
                )
                
            # Start heartbeat
            asyncio.create_task(self._heartbeat_loop())
                
        except Exception as e:
            logger.error(f"Failed to connect to Coinbase websocket: {e}")
            self._ws_connected = False
            self._notify_error(f"Websocket connection error: {e}")
    
    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats to keep the connection alive."""
        while self._ws_connected:
            try:
                current_time = time.time()
                if current_time - self._last_heartbeat > self._heartbeat_interval:
                    if self._ws and not self._ws.closed:
                        await self._ws.send_json({"type": "heartbeat"})
                        self._last_heartbeat = current_time
                await asyncio.sleep(5)  # Check every 5 seconds
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                await asyncio.sleep(5)  # Try again in 5 seconds
    
    async def _message_handler(self) -> None:
        """Handle incoming websocket messages."""
        try:
            async for msg in self._ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    await self._process_message(msg.data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"Websocket error: {msg.data}")
                    self._notify_error(f"Websocket error: {msg.data}")
                    break
                elif msg.type == aiohttp.WSMsgType.CLOSED:
                    logger.info("Websocket connection closed")
                    break
                    
            # If we get here, the connection was closed
            self._ws_connected = False
            
            # Try to reconnect after a delay
            await asyncio.sleep(5)
            asyncio.create_task(self.connect())
            
        except Exception as e:
            logger.error(f"Error in message handler: {e}")
            self._ws_connected = False
            self._notify_error(f"Message handler error: {e}")
            
            # Try to reconnect after a delay
            await asyncio.sleep(5)
            asyncio.create_task(self.connect())
    
    async def _process_message(self, message_data: str) -> None:
        """Process a websocket message."""
        try:
            message = json.loads(message_data)
            message_type = message.get("type")
            
            if message_type == "heartbeat":
                self._last_heartbeat = time.time()
                return
                
            elif message_type == "error":
                logger.error(f"Websocket error: {message.get('message')}")
                self._notify_error(f"Websocket error: {message.get('message')}")
                return
                
            elif message_type == "subscriptions":
                logger.info(f"Subscription update: {message}")
                return
                
            elif message_type == "ticker":
                await self._handle_ticker(message)
                
            elif message_type == "snapshot":
                await self._handle_orderbook_snapshot(message)
                
            elif message_type == "l2update":
                await self._handle_orderbook_update(message)
                
            elif message_type == "match":
                await self._handle_trade(message)
                
            elif message_type in ["open", "done", "match", "change", "received"]:
                await self._handle_order_update(message)
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            self._notify_error(f"Message processing error: {e}")
    
    async def _handle_ticker(self, message: Dict[str, Any]) -> None:
        """Handle ticker updates."""
        try:
            product_id = message.get("product_id")
            best_bid = float(message.get("best_bid", 0))
            best_ask = float(message.get("best_ask", 0))
            price = float(message.get("price", 0))
            
            market_data = MarketData(
                symbol=product_id,
                exchange="coinbase",
                timestamp=int(time.time() * 1000),
                bid=best_bid,
                ask=best_ask,
                last=price,
                volume_24h=float(message.get("volume_24h", 0)),
                market_type=MarketType.SPOT,
                extra=message
            )
            
            for callback in self._ticker_callbacks:
                asyncio.create_task(callback(market_data))
                
        except Exception as e:
            logger.error(f"Error handling ticker update: {e}")
    
    async def _handle_orderbook_snapshot(self, message: Dict[str, Any]) -> None:
        """Handle orderbook snapshot."""
        try:
            product_id = message.get("product_id")
            
            orderbook_data = {
                "symbol": product_id,
                "timestamp": int(time.time() * 1000),
                "bids": [[float(price), float(size)] for price, size in message.get("bids", [])],
                "asks": [[float(price), float(size)] for price, size in message.get("asks", [])],
                "type": "snapshot"
            }
            
            for callback in self._orderbook_callbacks:
                asyncio.create_task(callback(orderbook_data))
                
        except Exception as e:
            logger.error(f"Error handling orderbook snapshot: {e}")
    
    async def _handle_orderbook_update(self, message: Dict[str, Any]) -> None:
        """Handle orderbook updates."""
        try:
            product_id = message.get("product_id")
            
            orderbook_data = {
                "symbol": product_id,
                "timestamp": int(time.time() * 1000),
                "changes": message.get("changes", []),
                "type": "update"
            }
            
            for callback in self._orderbook_callbacks:
                asyncio.create_task(callback(orderbook_data))
                
        except Exception as e:
            logger.error(f"Error handling orderbook update: {e}")
    
    async def _handle_trade(self, message: Dict[str, Any]) -> None:
        """Handle trade updates."""
        try:
            product_id = message.get("product_id")
            
            trade_data = {
                "symbol": product_id,
                "timestamp": int(time.time() * 1000),
                "trade_id": message.get("trade_id"),
                "price": float(message.get("price", 0)),
                "size": float(message.get("size", 0)),
                "side": message.get("side"),
                "type": "trade"
            }
            
            for callback in self._trades_callbacks:
                asyncio.create_task(callback(trade_data))
                
        except Exception as e:
            logger.error(f"Error handling trade update: {e}")
    
    async def _handle_order_update(self, message: Dict[str, Any]) -> None:
        """Handle order updates."""
        # Only process if we have authenticated and this is our order
        if not self.api_key:
            return
            
        try:
            # Parse order from message
            order_type = message.get("type")
            product_id = message.get("product_id")
            order_id = message.get("order_id")
            
            # Skip if we don't have essential information
            if not order_id or not product_id:
                return
                
            # Determine order status based on message type
            status = OrderStatus.NEW
            if order_type == "done":
                if message.get("reason") == "filled":
                    status = OrderStatus.FILLED
                else:
                    status = OrderStatus.CANCELED
            elif order_type == "match":
                status = OrderStatus.PARTIALLY_FILLED
                
            # Create order object with available information
            order = Order(
                id=order_id,
                symbol=product_id,
                exchange="coinbase",
                side=OrderSide.BUY if message.get("side") == "buy" else OrderSide.SELL,
                type=None,  # Not enough information to determine
                price=float(message.get("price", 0)),
                amount=float(message.get("size", 0)),
                filled_amount=float(message.get("filled_size", 0)),
                status=status,
                timestamp=int(time.time() * 1000),
                client_order_id=message.get("client_oid"),
                extra=message
            )
            
            for callback in self._order_callbacks:
                asyncio.create_task(callback(order))
                
        except Exception as e:
            logger.error(f"Error handling order update: {e}")
    
    def _notify_error(self, error_message: str) -> None:
        """Notify all registered callbacks about errors."""
        for callback in self._error_callbacks:
            try:
                asyncio.create_task(callback(error_message))
            except Exception as e:
                logger.error(f"Error in error callback: {e}")
    
    async def subscribe(self, channels: List[str], products: List[str]) -> bool:
        """Subscribe to channels for specific products."""
        if not channels or not products:
            logger.warning("No channels or products specified for subscription")
            return False
            
        # Store subscription info
        self._subscribed_channels.update(channels)
        self._subscribed_products.update(products)
        
        # If not connected, the subscription will be sent when we connect
        if not self._ws_connected:
            logger.info("Not connected yet, subscription will be sent when connected")
            return True
            
        return await self._send_subscribe_message(channels, products)
    
    async def _send_subscribe_message(self, channels: List[str], products: List[str]) -> bool:
        """Send the subscription message."""
        try:
            subscription = {
                "type": "subscribe",
                "product_ids": products,
                "channels": channels
            }
            
            # Add authentication if we have API credentials
            if self.api_key and self.api_secret:
                timestamp = str(int(time.time()))
                subscription["signature"] = self._generate_signature(
                    timestamp,
                    "GET",
                    "/users/self/verify",
                    ""
                )
                subscription["key"] = self.api_key
                subscription["passphrase"] = ""  # Not used in websocket auth
                subscription["timestamp"] = timestamp
            
            await self._ws.send_json(subscription)
            logger.info(f"Subscribed to {channels} for {products}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe: {e}")
            self._notify_error(f"Subscription error: {e}")
            return False
    
    async def unsubscribe(self, channels: List[str], products: List[str]) -> bool:
        """Unsubscribe from channels for specific products."""
        if not self._ws_connected:
            logger.warning("Not connected, cannot unsubscribe")
            
            # Still remove from our tracking
            for channel in channels:
                self._subscribed_channels.discard(channel)
            for product in products:
                self._subscribed_products.discard(product)
                
            return False
        
        try:
            unsubscription = {
                "type": "unsubscribe",
                "product_ids": products,
                "channels": channels
            }
            
            await self._ws.send_json(unsubscription)
            
            # Update our tracking
            for channel in channels:
                self._subscribed_channels.discard(channel)
            for product in products:
                self._subscribed_products.discard(product)
                
            logger.info(f"Unsubscribed from {channels} for {products}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe: {e}")
            self._notify_error(f"Unsubscription error: {e}")
            return False
    
    async def close(self) -> None:
        """Close the websocket connection."""
        if self._ws_connected and self._ws:
            try:
                await self._ws.close()
                
                # Cancel the message handler task
                if self._ws_task:
                    self._ws_task.cancel()
                    
                logger.info("Closed Coinbase websocket connection")
                
            except Exception as e:
                logger.error(f"Error closing websocket: {e}")
                
            finally:
                self._ws_connected = False
                self._ws = None
                self._ws_task = None
