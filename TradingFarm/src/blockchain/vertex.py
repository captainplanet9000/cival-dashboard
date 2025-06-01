import asyncio
import json
import time
import logging
import hmac
import hashlib
import base64
from typing import Dict, List, Optional, Any, Callable
import websockets
import aiohttp
from datetime import datetime, timezone

from ..blockchain.base import (
    ExchangeInterface, Order, OrderBook, Position, 
    OrderType, OrderSide, TimeInForce
)
from ...config.config import VERTEX_API_URL

logger = logging.getLogger(__name__)

class VertexClient(ExchangeInterface):
    """Vertex integration for cross-chain trading and cross-margining."""
    
    def __init__(
        self, 
        api_key: str, 
        api_secret: str,
        wallet_address: str,
        testnet: bool = False
    ):
        super().__init__(api_key, api_secret, testnet)
        self.api_url = VERTEX_API_URL
        self.wallet_address = wallet_address
        self.session = None
        self.ws_connections = {}
        self.active_subscriptions = {}

    async def initialize(self) -> None:
        """Initialize the Vertex connection."""
        self.session = aiohttp.ClientSession(
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key
            }
        )
        logger.info("Vertex client initialized")

    async def _sign_request(self, endpoint: str, method: str, data: Dict[str, Any]) -> Dict[str, str]:
        """Sign a request to the Vertex API."""
        timestamp = int(time.time() * 1000)
        payload = {
            "timestamp": timestamp,
            "method": method,
            "path": endpoint,
            "body": data
        }
        
        payload_str = json.dumps(payload, separators=(',', ':'))
        signature = hmac.new(
            self.api_secret.encode(), 
            payload_str.encode(), 
            hashlib.sha256
        ).hexdigest()
        
        return {
            "X-VERTEX-Timestamp": str(timestamp),
            "X-VERTEX-Signature": signature,
            "X-VERTEX-API-Key": self.api_key
        }

    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None, 
        auth: bool = True
    ) -> Dict[str, Any]:
        """Make a request to the Vertex API."""
        if self.session is None:
            await self.initialize()
        
        url = f"{self.api_url}{endpoint}"
        headers = {}
        
        if auth:
            headers.update(await self._sign_request(endpoint, method, data or {}))
        
        try:
            if method == "GET":
                async with self.session.get(url, headers=headers, params=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error in Vertex API request: {error_text}")
                        response.raise_for_status()
                    return await response.json()
            elif method == "POST":
                async with self.session.post(url, headers=headers, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error in Vertex API request: {error_text}")
                        response.raise_for_status()
                    return await response.json()
        except Exception as e:
            logger.error(f"Error making Vertex API request: {e}")
            raise
    
    async def get_account_balance(self) -> Dict[str, float]:
        """Get account balance from Vertex."""
        response = await self._make_request(
            "GET", 
            "/api/v1/account/balances", 
            auth=True
        )
        
        balances = {}
        for asset in response.get("balances", []):
            balances[asset["asset"]] = float(asset["available"])
        
        return balances
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol."""
        response = await self._make_request(
            "GET", 
            "/api/v1/ticker", 
            {"symbol": symbol}, 
            auth=False
        )
        
        return {
            "symbol": symbol,
            "price": float(response.get("price", 0)),
            "volume_24h": float(response.get("volume", 0)),
            "high_24h": float(response.get("high", 0)),
            "low_24h": float(response.get("low", 0)),
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        }
    
    async def get_order_book(self, symbol: str, limit: int = 20) -> OrderBook:
        """Get order book for a symbol."""
        response = await self._make_request(
            "GET", 
            "/api/v1/orderbook", 
            {"symbol": symbol, "limit": limit}, 
            auth=False
        )
        
        bids = [{"price": float(b["price"]), "quantity": float(b["quantity"])} for b in response.get("bids", [])]
        asks = [{"price": float(a["price"]), "quantity": float(a["quantity"])} for a in response.get("asks", [])]
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        return OrderBook(symbol, bids, asks, timestamp)
    
    async def create_order(self, order: Order) -> Dict[str, Any]:
        """Create a new order on Vertex."""
        payload = {
            "symbol": order.symbol,
            "side": order.side.value,
            "orderType": order.order_type.value,
            "quantity": str(order.quantity),
            "timeInForce": order.time_in_force.value
        }
        
        if order.price is not None:
            payload["price"] = str(order.price)
        
        if order.stop_price is not None:
            payload["stopPrice"] = str(order.stop_price)
        
        if order.client_order_id:
            payload["clientOrderId"] = order.client_order_id
        
        if order.leverage is not None:
            await self.set_leverage(order.symbol, order.leverage)
        
        if order.reduce_only:
            payload["reduceOnly"] = True
        
        if order.post_only:
            payload["postOnly"] = True
        
        # Add any extra parameters
        for key, value in order.extra_params.items():
            payload[key] = value
        
        response = await self._make_request(
            "POST", 
            "/api/v1/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def cancel_order(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order on Vertex."""
        payload = {
            "symbol": symbol,
            "orderId": order_id
        }
        
        response = await self._make_request(
            "DELETE", 
            "/api/v1/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all open orders on Vertex."""
        payload = {}
        if symbol:
            payload["symbol"] = symbol
        
        response = await self._make_request(
            "GET", 
            "/api/v1/openOrders", 
            payload, 
            auth=True
        )
        
        return response.get("orders", [])
    
    async def get_order_status(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Get status of a specific order on Vertex."""
        payload = {
            "symbol": symbol,
            "orderId": order_id
        }
        
        response = await self._make_request(
            "GET", 
            "/api/v1/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_positions(self, symbol: Optional[str] = None) -> List[Position]:
        """Get all open positions on Vertex."""
        payload = {}
        if symbol:
            payload["symbol"] = symbol
        
        response = await self._make_request(
            "GET", 
            "/api/v1/positions", 
            payload, 
            auth=True
        )
        
        positions = []
        for pos in response.get("positions", []):
            side = OrderSide.BUY if float(pos.get("quantity", 0)) > 0 else OrderSide.SELL
            quantity = abs(float(pos.get("quantity", 0)))
            
            positions.append(Position(
                symbol=pos.get("symbol", ""),
                side=side,
                quantity=quantity,
                entry_price=float(pos.get("entryPrice", 0)),
                leverage=float(pos.get("leverage", 1)),
                unrealized_pnl=float(pos.get("unrealizedPnl", 0)),
                realized_pnl=float(pos.get("realizedPnl", 0)),
                liquidation_price=float(pos.get("liquidationPrice", 0)) if "liquidationPrice" in pos else None,
                margin=float(pos.get("margin", 0)) if "margin" in pos else None
            ))
        
        return positions
    
    async def set_leverage(self, symbol: str, leverage: float) -> Dict[str, Any]:
        """Set leverage for a symbol on Vertex."""
        payload = {
            "symbol": symbol,
            "leverage": str(leverage)
        }
        
        response = await self._make_request(
            "POST", 
            "/api/v1/leverage", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_historical_klines(
        self, 
        symbol: str, 
        interval: str, 
        start_time: Optional[int] = None, 
        end_time: Optional[int] = None, 
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get historical klines/candlesticks from Vertex."""
        payload = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        
        if start_time:
            payload["startTime"] = start_time
        
        if end_time:
            payload["endTime"] = end_time
        
        response = await self._make_request(
            "GET", 
            "/api/v1/klines", 
            payload, 
            auth=False
        )
        
        klines = []
        for kline in response:
            klines.append({
                "timestamp": int(kline[0]),
                "open": float(kline[1]),
                "high": float(kline[2]),
                "low": float(kline[3]),
                "close": float(kline[4]),
                "volume": float(kline[5])
            })
        
        return klines
    
    async def set_cross_margin_mode(self, enabled: bool) -> Dict[str, Any]:
        """Enable or disable cross-margin mode for efficient capital utilization."""
        payload = {
            "crossMargin": enabled
        }
        
        response = await self._make_request(
            "POST", 
            "/api/v1/account/crossMargin", 
            payload, 
            auth=True
        )
        
        return response
    
    async def route_order_to_exchange(
        self, 
        order: Order, 
        exchange: str
    ) -> Dict[str, Any]:
        """Route an order to a specific exchange through Vertex."""
        payload = {
            "symbol": order.symbol,
            "side": order.side.value,
            "orderType": order.order_type.value,
            "quantity": str(order.quantity),
            "timeInForce": order.time_in_force.value,
            "exchange": exchange
        }
        
        if order.price is not None:
            payload["price"] = str(order.price)
        
        if order.stop_price is not None:
            payload["stopPrice"] = str(order.stop_price)
        
        if order.client_order_id:
            payload["clientOrderId"] = order.client_order_id
        
        # Add any extra parameters
        for key, value in order.extra_params.items():
            payload[key] = value
        
        response = await self._make_request(
            "POST", 
            "/api/v1/route/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def subscribe_to_ticker(self, symbol: str, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to real-time ticker updates from Vertex."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"ticker_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to ticker for {symbol}")
            return
        
        ws_url = f"{self.api_url.replace('http', 'ws')}/ws"
        
        async def _ticker_handler():
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                
                # Subscribe to ticker stream
                await ws.send(json.dumps({
                    "method": "SUBSCRIBE",
                    "params": [f"{symbol.lower()}@ticker"],
                    "id": int(time.time() * 1000)
                }))
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        
                        # Skip subscription confirmation messages
                        if "result" in data or "id" in data:
                            continue
                        
                        if data.get("e") == "24hrTicker" and data.get("s") == symbol:
                            ticker_data = {
                                "symbol": symbol,
                                "price": float(data.get("c", 0)),
                                "volume_24h": float(data.get("v", 0)),
                                "high_24h": float(data.get("h", 0)),
                                "low_24h": float(data.get("l", 0)),
                                "timestamp": int(data.get("E", 0))
                            }
                            await callback(ticker_data)
                    except Exception as e:
                        logger.error(f"Error in ticker subscription: {e}")
                        # Try to reconnect
                        await asyncio.sleep(5)
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_ticker_handler())
    
    async def subscribe_to_order_book(self, symbol: str, callback: Callable[[OrderBook], None]):
        """Subscribe to real-time order book updates from Vertex."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"orderbook_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to order book for {symbol}")
            return
        
        ws_url = f"{self.api_url.replace('http', 'ws')}/ws"
        
        async def _orderbook_handler():
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                
                # Subscribe to order book stream
                await ws.send(json.dumps({
                    "method": "SUBSCRIBE",
                    "params": [f"{symbol.lower()}@depth"],
                    "id": int(time.time() * 1000)
                }))
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        
                        # Skip subscription confirmation messages
                        if "result" in data or "id" in data:
                            continue
                        
                        if data.get("e") == "depthUpdate" and data.get("s") == symbol:
                            # Process order book updates
                            bids = [{"price": float(b[0]), "quantity": float(b[1])} for b in data.get("b", [])]
                            asks = [{"price": float(a[0]), "quantity": float(a[1])} for a in data.get("a", [])]
                            timestamp = int(data.get("E", 0))
                            
                            order_book = OrderBook(symbol, bids, asks, timestamp)
                            await callback(order_book)
                    except Exception as e:
                        logger.error(f"Error in order book subscription: {e}")
                        # Try to reconnect
                        await asyncio.sleep(5)
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_orderbook_handler())
    
    async def subscribe_to_trades(self, symbol: str, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to real-time trade updates from Vertex."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"trades_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to trades for {symbol}")
            return
        
        ws_url = f"{self.api_url.replace('http', 'ws')}/ws"
        
        async def _trades_handler():
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                
                # Subscribe to trades stream
                await ws.send(json.dumps({
                    "method": "SUBSCRIBE",
                    "params": [f"{symbol.lower()}@trade"],
                    "id": int(time.time() * 1000)
                }))
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        
                        # Skip subscription confirmation messages
                        if "result" in data or "id" in data:
                            continue
                        
                        if data.get("e") == "trade" and data.get("s") == symbol:
                            trade_data = {
                                "symbol": symbol,
                                "id": data.get("t", 0),
                                "price": float(data.get("p", 0)),
                                "quantity": float(data.get("q", 0)),
                                "side": OrderSide.BUY if data.get("m", False) else OrderSide.SELL,
                                "timestamp": int(data.get("E", 0))
                            }
                            
                            await callback(trade_data)
                    except Exception as e:
                        logger.error(f"Error in trades subscription: {e}")
                        # Try to reconnect
                        await asyncio.sleep(5)
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_trades_handler())
    
    async def subscribe_to_user_data(self, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to user data stream (account updates, order updates)."""
        if not self.session:
            await self.initialize()
        
        subscription_id = "user_data"
        if subscription_id in self.active_subscriptions:
            logger.warning("Already subscribed to user data")
            return
        
        # First get a listen key for user data stream
        response = await self._make_request(
            "POST",
            "/api/v1/userDataStream",
            auth=True
        )
        
        listen_key = response.get("listenKey")
        if not listen_key:
            logger.error("Failed to get listen key for user data stream")
            return
        
        ws_url = f"{self.api_url.replace('http', 'ws')}/ws/{listen_key}"
        
        # Keep-alive task for listen key
        async def _keep_alive():
            while True:
                try:
                    await asyncio.sleep(30 * 60)  # 30 minutes
                    await self._make_request(
                        "PUT",
                        "/api/v1/userDataStream",
                        {"listenKey": listen_key},
                        auth=True
                    )
                except Exception as e:
                    logger.error(f"Error in listen key keep-alive: {e}")
                    break
        
        keep_alive_task = asyncio.create_task(_keep_alive())
        
        async def _user_data_handler():
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        
                        # Process different types of user data events
                        await callback(data)
                    except Exception as e:
                        logger.error(f"Error in user data subscription: {e}")
                        # Try to reconnect
                        await asyncio.sleep(5)
                        break
            
            # Cancel keep-alive task when user data stream disconnects
            keep_alive_task.cancel()
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_user_data_handler())
    
    async def close(self):
        """Close all connections."""
        for subscription_id, task in self.active_subscriptions.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        for subscription_id, ws in self.ws_connections.items():
            await ws.close()
        
        if self.session:
            await self.session.close()
        
        self.active_subscriptions = {}
        self.ws_connections = {}
        self.session = None
