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
from src.config.config import (
    HYPERLIQUID_API_URL, HYPERLIQUID_WEBSOCKET_URL,
    HYPERLIQUID_TESTNET_API_URL, HYPERLIQUID_TESTNET_WEBSOCKET_URL
)

logger = logging.getLogger(__name__)

class HyperliquidClient(ExchangeInterface):
    """Hyperliquid API integration for Arbitrum perpetual futures trading."""
    
    def __init__(
        self, 
        private_key: str,
        wallet_address: str,
        testnet: bool = False
    ):
        # Pass empty api_key and api_secret to match ExchangeInterface signature
        # Hyperliquid uses private key signing instead of API keys
        super().__init__(api_key="", api_secret="", testnet=testnet)
        
        # Select the appropriate URLs based on testnet flag
        if testnet:
            self.api_url = HYPERLIQUID_TESTNET_API_URL
            self.ws_url = HYPERLIQUID_TESTNET_WEBSOCKET_URL
            logger.info("Using Hyperliquid testnet endpoints")
        else:
            self.api_url = HYPERLIQUID_API_URL
            self.ws_url = HYPERLIQUID_WEBSOCKET_URL
            
        self.private_key = private_key
        self.wallet_address = wallet_address
        self.session = None
        self.ws_connections = {}
        self.active_subscriptions = {}

    async def initialize(self):
        """Initialize the session."""
        if not self.session:
            self.session = aiohttp.ClientSession()
        logger.info("Hyperliquid client initialized")
        return True

    async def get_available_assets(self):
        """
        Get available assets/coins on Hyperliquid.
        
        Returns:
            list: List of available assets
        """
        try:
            endpoint = "/info"
            url = f"{self.api_url}{endpoint}"
            
            async with self.session.get(url) as response:
                response.raise_for_status()
                data = await response.json()
                return data
        except Exception as e:
            logger.error(f"Error retrieving available assets: {e}")
            raise

    async def _sign_request(self, endpoint: str, method: str, data: Dict[str, Any]) -> Dict[str, str]:
        """Sign a request to the Hyperliquid API."""
        timestamp = int(time.time() * 1000)
        payload = {
            "timestamp": timestamp,
            "method": method,
            "path": endpoint,
            "body": data
        }
        
        payload_str = json.dumps(payload, separators=(',', ':'))
        signature = hmac.new(
            self.private_key.encode(), 
            payload_str.encode(), 
            hashlib.sha256
        ).hexdigest()
        
        return {
            "X-HL-Timestamp": str(timestamp),
            "X-HL-Signature": signature,
            "X-HL-Wallet-Address": self.wallet_address
        }

    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None, 
        auth: bool = True
    ) -> Dict[str, Any]:
        """Make a request to the Hyperliquid API."""
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
                        logger.error(f"Error in Hyperliquid API request: {error_text}")
                        response.raise_for_status()
                    return await response.json()
            elif method == "POST":
                async with self.session.post(url, headers=headers, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error in Hyperliquid API request: {error_text}")
                        response.raise_for_status()
                    return await response.json()
        except Exception as e:
            logger.error(f"Error making Hyperliquid API request: {e}")
            raise
    
    async def get_account_balance(self) -> Dict[str, float]:
        """Get account balance from Hyperliquid."""
        response = await self._make_request(
            "GET", 
            "/exchange/v1/account/balance", 
            auth=True
        )
        
        balances = {}
        for asset in response.get("assets", []):
            balances[asset["asset"]] = float(asset["free"])
        
        return balances
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol."""
        response = await self._make_request(
            "GET", 
            "/exchange/v1/market/ticker", 
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
        """
        Get order book for a symbol.
        
        Args:
            symbol: The trading symbol
            limit: Number of levels to retrieve
            
        Returns:
            OrderBook: Order book with bids and asks
        """
        try:
            # Hyperliquid uses a different endpoint structure than traditional exchanges
            endpoint = "/info/l2Book"
            url = f"{self.api_url}{endpoint}"
            
            params = {"coin": symbol, "coinPair": "USD"}
            
            async with self.session.get(url, params=params) as response:
                response.raise_for_status()
                data = await response.json()
                
                # Format the response to match our OrderBook structure
                bids = [{"price": float(item[0]), "quantity": float(item[1])} for item in data.get("bids", [])]
                asks = [{"price": float(item[0]), "quantity": float(item[1])} for item in data.get("asks", [])]
                
                return OrderBook(
                    symbol=symbol,
                    bids=bids[:limit],
                    asks=asks[:limit],
                    timestamp=time.time()
                )
        except Exception as e:
            logger.error(f"Error in Hyperliquid API request: ")
            logger.error(f"Error making Hyperliquid API request: {e}")
            raise
    
    async def create_order(self, order: Order) -> Dict[str, Any]:
        """Create a new order on Hyperliquid."""
        payload = {
            "symbol": order.symbol,
            "side": order.side.value,
            "type": order.order_type.value,
            "quantity": str(order.quantity),
            "timeInForce": order.time_in_force.value
        }
        
        if order.price is not None:
            payload["price"] = str(order.price)
        
        if order.stop_price is not None:
            payload["stopPrice"] = str(order.stop_price)
        
        if order.client_order_id:
            payload["newClientOrderId"] = order.client_order_id
        
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
            "/exchange/v1/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def cancel_order(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order on Hyperliquid."""
        payload = {
            "symbol": symbol,
            "orderId": order_id
        }
        
        response = await self._make_request(
            "DELETE", 
            "/exchange/v1/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all open orders on Hyperliquid."""
        payload = {}
        if symbol:
            payload["symbol"] = symbol
        
        response = await self._make_request(
            "GET", 
            "/exchange/v1/openOrders", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_order_status(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Get status of a specific order on Hyperliquid."""
        payload = {
            "symbol": symbol,
            "orderId": order_id
        }
        
        response = await self._make_request(
            "GET", 
            "/exchange/v1/order", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_positions(self, symbol: Optional[str] = None) -> List[Position]:
        """Get all open positions on Hyperliquid."""
        payload = {}
        if symbol:
            payload["symbol"] = symbol
        
        response = await self._make_request(
            "GET", 
            "/exchange/v1/positions", 
            payload, 
            auth=True
        )
        
        positions = []
        for pos in response:
            side = OrderSide.BUY if float(pos.get("positionAmount", 0)) > 0 else OrderSide.SELL
            quantity = abs(float(pos.get("positionAmount", 0)))
            
            positions.append(Position(
                symbol=pos.get("symbol", ""),
                side=side,
                quantity=quantity,
                entry_price=float(pos.get("entryPrice", 0)),
                leverage=float(pos.get("leverage", 1)),
                unrealized_pnl=float(pos.get("unrealizedProfit", 0)),
                realized_pnl=float(pos.get("realizedProfit", 0)),
                liquidation_price=float(pos.get("liquidationPrice", 0)),
                margin=float(pos.get("isolatedMargin", 0))
            ))
        
        return positions
    
    async def set_leverage(self, symbol: str, leverage: float) -> Dict[str, Any]:
        """Set leverage for a symbol on Hyperliquid."""
        payload = {
            "symbol": symbol,
            "leverage": str(leverage)
        }
        
        response = await self._make_request(
            "POST", 
            "/exchange/v1/leverage", 
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
        """Get historical klines/candlesticks from Hyperliquid."""
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
            "/exchange/v1/klines", 
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
    
    async def subscribe_to_ticker(self, symbol: str, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to real-time ticker updates from Hyperliquid."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"ticker_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to ticker for {symbol}")
            return
        
        async def _ticker_handler():
            async with websockets.connect(f"{self.ws_url}/ws/{symbol.lower()}@ticker") as ws:
                self.ws_connections[subscription_id] = ws
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        ticker_data = {
                            "symbol": symbol,
                            "price": float(data.get("p", 0)),
                            "volume_24h": float(data.get("v", 0)),
                            "timestamp": int(data.get("E", 0))
                        }
                        await callback(ticker_data)
                    except Exception as e:
                        logger.error(f"Error in ticker subscription: {e}")
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_ticker_handler())
    
    async def subscribe_to_order_book(self, symbol: str, callback: Callable[[OrderBook], None]):
        """Subscribe to real-time order book updates from Hyperliquid."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"orderbook_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to order book for {symbol}")
            return
        
        async def _orderbook_handler():
            async with websockets.connect(f"{self.ws_url}/ws/{symbol.lower()}@depth") as ws:
                self.ws_connections[subscription_id] = ws
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        
                        bids = [{"price": float(b[0]), "quantity": float(b[1])} for b in data.get("b", [])]
                        asks = [{"price": float(a[0]), "quantity": float(a[1])} for a in data.get("a", [])]
                        timestamp = int(data.get("E", 0))
                        
                        order_book = OrderBook(symbol, bids, asks, timestamp)
                        await callback(order_book)
                    except Exception as e:
                        logger.error(f"Error in order book subscription: {e}")
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_orderbook_handler())
    
    async def subscribe_to_trades(self, symbol: str, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to real-time trade updates from Hyperliquid."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"trades_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to trades for {symbol}")
            return
        
        async def _trades_handler():
            async with websockets.connect(f"{self.ws_url}/ws/{symbol.lower()}@trade") as ws:
                self.ws_connections[subscription_id] = ws
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        
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
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_trades_handler())
    
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
