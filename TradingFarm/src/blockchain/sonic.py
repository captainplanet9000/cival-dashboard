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
from ...config.config import SONIC_API_URL, SONIC_GATEWAY_URL

logger = logging.getLogger(__name__)

class SonicClient(ExchangeInterface):
    """Sonic blockchain integration for spot trading and liquidity management."""
    
    def __init__(
        self, 
        api_key: str, 
        api_secret: str,
        wallet_address: str,
        testnet: bool = False
    ):
        super().__init__(api_key, api_secret, testnet)
        self.api_url = SONIC_API_URL
        self.gateway_url = SONIC_GATEWAY_URL
        self.wallet_address = wallet_address
        self.session = None
        self.ws_connections = {}
        self.active_subscriptions = {}

    async def initialize(self) -> None:
        """Initialize the Sonic blockchain connection."""
        self.session = aiohttp.ClientSession(
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key
            }
        )
        logger.info("Sonic blockchain client initialized")

    async def _sign_request(self, endpoint: str, method: str, data: Dict[str, Any]) -> Dict[str, str]:
        """Sign a request to the Sonic API."""
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
            "X-SONIC-Timestamp": str(timestamp),
            "X-SONIC-Signature": signature,
            "X-SONIC-API-Key": self.api_key
        }

    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict[str, Any]] = None, 
        auth: bool = True,
        use_gateway: bool = False
    ) -> Dict[str, Any]:
        """Make a request to the Sonic API."""
        if self.session is None:
            await self.initialize()
        
        base_url = self.gateway_url if use_gateway else self.api_url
        url = f"{base_url}{endpoint}"
        headers = {}
        
        if auth:
            headers.update(await self._sign_request(endpoint, method, data or {}))
        
        try:
            if method == "GET":
                async with self.session.get(url, headers=headers, params=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error in Sonic API request: {error_text}")
                        response.raise_for_status()
                    return await response.json()
            elif method == "POST":
                async with self.session.post(url, headers=headers, json=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error in Sonic API request: {error_text}")
                        response.raise_for_status()
                    return await response.json()
        except Exception as e:
            logger.error(f"Error making Sonic API request: {e}")
            raise
    
    async def get_account_balance(self) -> Dict[str, float]:
        """Get account balance from Sonic."""
        response = await self._make_request(
            "GET", 
            "/api/v1/account/balances", 
            auth=True
        )
        
        balances = {}
        for asset in response.get("balances", []):
            balances[asset["asset"]] = float(asset["free"])
        
        return balances
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol."""
        response = await self._make_request(
            "GET", 
            "/api/v1/ticker/24hr", 
            {"symbol": symbol}, 
            auth=False
        )
        
        return {
            "symbol": symbol,
            "price": float(response.get("lastPrice", 0)),
            "volume_24h": float(response.get("volume", 0)),
            "high_24h": float(response.get("highPrice", 0)),
            "low_24h": float(response.get("lowPrice", 0)),
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        }
    
    async def get_order_book(self, symbol: str, limit: int = 20) -> OrderBook:
        """Get order book for a symbol."""
        response = await self._make_request(
            "GET", 
            "/api/v1/depth", 
            {"symbol": symbol, "limit": limit}, 
            auth=False
        )
        
        bids = [{"price": float(b[0]), "quantity": float(b[1])} for b in response.get("bids", [])]
        asks = [{"price": float(a[0]), "quantity": float(a[1])} for a in response.get("asks", [])]
        timestamp = response.get("timestamp", int(datetime.now(timezone.utc).timestamp() * 1000))
        
        return OrderBook(symbol, bids, asks, timestamp)
    
    async def create_order(self, order: Order) -> Dict[str, Any]:
        """Create a new order on Sonic."""
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
        """Cancel an existing order on Sonic."""
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
        """Get all open orders on Sonic."""
        payload = {}
        if symbol:
            payload["symbol"] = symbol
        
        response = await self._make_request(
            "GET", 
            "/api/v1/openOrders", 
            payload, 
            auth=True
        )
        
        return response
    
    async def get_order_status(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Get status of a specific order on Sonic."""
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
        """Get all open positions on Sonic (for spot, we consider balances as positions)."""
        balances = await self.get_account_balance()
        
        positions = []
        for asset, amount in balances.items():
            if amount > 0:
                positions.append(Position(
                    symbol=f"{asset}/USDC",
                    side=OrderSide.BUY,
                    quantity=amount,
                    entry_price=0,  # Not applicable for spot
                    leverage=1,     # No leverage in spot
                    unrealized_pnl=0,  # Not applicable for spot
                    realized_pnl=0,     # Not applicable for spot
                    liquidation_price=None,  # Not applicable for spot
                    margin=None            # Not applicable for spot
                ))
        
        return positions if not symbol else [p for p in positions if p.symbol == symbol]
    
    async def set_leverage(self, symbol: str, leverage: float) -> Dict[str, Any]:
        """Set leverage for a symbol on Sonic (not applicable for spot trading)."""
        logger.warning("Leverage setting is not applicable for Sonic spot trading")
        return {"message": "Leverage setting is not applicable for spot trading"}
    
    async def get_historical_klines(
        self, 
        symbol: str, 
        interval: str, 
        start_time: Optional[int] = None, 
        end_time: Optional[int] = None, 
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get historical klines/candlesticks from Sonic."""
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
    
    async def bridge_assets(
        self,
        asset: str,
        amount: float,
        source_chain: str,
        destination_chain: str
    ) -> Dict[str, Any]:
        """Bridge assets between different chains using Sonic Gateway."""
        payload = {
            "asset": asset,
            "amount": str(amount),
            "sourceChain": source_chain,
            "destinationChain": destination_chain,
            "walletAddress": self.wallet_address
        }
        
        response = await self._make_request(
            "POST", 
            "/gateway/v1/bridge", 
            payload, 
            auth=True,
            use_gateway=True
        )
        
        return response
    
    async def get_bridge_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """Get the status of a bridging transaction."""
        payload = {
            "txHash": tx_hash
        }
        
        response = await self._make_request(
            "GET", 
            "/gateway/v1/transaction", 
            payload, 
            auth=True,
            use_gateway=True
        )
        
        return response
    
    async def get_bridge_fee(
        self,
        asset: str,
        amount: float,
        source_chain: str,
        destination_chain: str
    ) -> Dict[str, Any]:
        """Get bridge fee for a specific asset transfer."""
        payload = {
            "asset": asset,
            "amount": str(amount),
            "sourceChain": source_chain,
            "destinationChain": destination_chain
        }
        
        response = await self._make_request(
            "GET", 
            "/gateway/v1/fee", 
            payload, 
            auth=False,
            use_gateway=True
        )
        
        return response
    
    async def subscribe_to_ticker(self, symbol: str, callback: Callable[[Dict[str, Any]], None]):
        """Subscribe to real-time ticker updates from Sonic."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"ticker_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to ticker for {symbol}")
            return
        
        async def _ticker_handler():
            ws_url = f"{self.api_url.replace('http', 'ws')}/ws/{symbol.lower()}@ticker"
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                await ws.send(json.dumps({
                    "method": "SUBSCRIBE",
                    "params": [f"{symbol.lower()}@ticker"],
                    "id": int(time.time() * 1000)
                }))
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        if "result" in data:
                            continue  # Skip subscription confirmation
                        
                        ticker_data = {
                            "symbol": symbol,
                            "price": float(data.get("c", 0)),
                            "volume_24h": float(data.get("v", 0)),
                            "timestamp": int(data.get("E", 0))
                        }
                        await callback(ticker_data)
                    except Exception as e:
                        logger.error(f"Error in ticker subscription: {e}")
                        break
        
        self.active_subscriptions[subscription_id] = asyncio.create_task(_ticker_handler())
    
    async def subscribe_to_order_book(self, symbol: str, callback: Callable[[OrderBook], None]):
        """Subscribe to real-time order book updates from Sonic."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"orderbook_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to order book for {symbol}")
            return
        
        async def _orderbook_handler():
            ws_url = f"{self.api_url.replace('http', 'ws')}/ws/{symbol.lower()}@depth"
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                await ws.send(json.dumps({
                    "method": "SUBSCRIBE",
                    "params": [f"{symbol.lower()}@depth"],
                    "id": int(time.time() * 1000)
                }))
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        if "result" in data:
                            continue  # Skip subscription confirmation
                        
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
        """Subscribe to real-time trade updates from Sonic."""
        if not self.session:
            await self.initialize()
        
        subscription_id = f"trades_{symbol}"
        if subscription_id in self.active_subscriptions:
            logger.warning(f"Already subscribed to trades for {symbol}")
            return
        
        async def _trades_handler():
            ws_url = f"{self.api_url.replace('http', 'ws')}/ws/{symbol.lower()}@trade"
            async with websockets.connect(ws_url) as ws:
                self.ws_connections[subscription_id] = ws
                await ws.send(json.dumps({
                    "method": "SUBSCRIBE",
                    "params": [f"{symbol.lower()}@trade"],
                    "id": int(time.time() * 1000)
                }))
                
                while True:
                    try:
                        message = await ws.recv()
                        data = json.loads(message)
                        if "result" in data:
                            continue  # Skip subscription confirmation
                        
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
