"""
Coinbase exchange client implementation for the TradingFarm platform.
"""

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Dict, List, Optional, Any, Tuple, Union
import uuid

import aiohttp

from .base import (
    ExchangeClient, 
    MarketData, 
    Order, 
    Position, 
    OrderSide, 
    OrderType, 
    OrderStatus,
    OrderTimeInForce,
    MarketType,
    ExchangeConnectionStatus
)

logger = logging.getLogger(__name__)

class CoinbaseExchangeClient(ExchangeClient):
    """
    Client for Coinbase Advanced Trade API.
    Implements the ExchangeClient interface for Coinbase.
    """
    
    def __init__(
        self,
        api_key: str = None,
        api_secret: str = None,
        testnet: bool = False,
        timeout: int = 30000,
        rate_limit_retry: bool = True,
        rate_limit_retry_attempts: int = 3,
        throttle_rate: float = 0.2,  # 5 requests per second
    ):
        super().__init__(
            exchange_id="coinbase",
            api_key=api_key,
            api_secret=api_secret,
            testnet=testnet,
            timeout=timeout,
            rate_limit_retry=rate_limit_retry,
            rate_limit_retry_attempts=rate_limit_retry_attempts,
            throttle_rate=throttle_rate
        )
        
        self.base_url = "https://api.exchange.coinbase.com"
        if testnet:
            self.base_url = "https://api-public.sandbox.exchange.coinbase.com"
            
        # Track subscribed channels and symbols
        self._subscribed_market_data_symbols = set()
        self._has_private_feed = False
        self._ws = None
        self._ws_connected = False
        self._ws_task = None
        
    def _get_auth_headers(self, method: str, endpoint: str, body: str = "") -> Dict[str, str]:
        """Generate authentication headers for Coinbase API requests."""
        timestamp = str(int(time.time()))
        message = timestamp + method + endpoint + body
        signature = hmac.new(
            base64.b64decode(self.api_secret),
            message.encode('utf-8'),
            digestmod=hashlib.sha256
        )
        signature_b64 = base64.b64encode(signature.digest()).decode('utf-8')
        
        return {
            'CB-ACCESS-KEY': self.api_key,
            'CB-ACCESS-SIGN': signature_b64,
            'CB-ACCESS-TIMESTAMP': timestamp,
            'CB-ACCESS-PASSPHRASE': self.passphrase,
            'Content-Type': 'application/json'
        }
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Dict = None, 
        data: Dict = None,
        auth: bool = False
    ) -> Dict:
        """Make a request to the Coinbase API."""
        url = f"{self.base_url}{endpoint}"
        
        headers = {}
        body = ""
        
        if data:
            body = json.dumps(data)
        
        if auth:
            headers = self._get_auth_headers(method, endpoint, body)
        
        return await super()._make_request(method, url, params, data, headers)
    
    async def fetch_markets(self) -> List[Dict[str, Any]]:
        """Fetch all available markets from Coinbase."""
        response = await self._make_request("GET", "/products")
        markets = []
        
        for product in response:
            markets.append({
                "id": product["id"],
                "symbol": product["id"],
                "base": product["base_currency"],
                "quote": product["quote_currency"],
                "baseMinSize": float(product["base_min_size"]),
                "baseMaxSize": float(product.get("base_max_size", 1000000)),
                "quoteIncrement": float(product["quote_increment"]),
                "status": product["status"],
                "type": MarketType.SPOT.value
            })
        
        return markets
    
    async def fetch_ticker(self, symbol: str) -> MarketData:
        """Fetch ticker data for a symbol."""
        response = await self._make_request("GET", f"/products/{symbol}/ticker")
        
        return MarketData(
            symbol=symbol,
            exchange=self.exchange_id,
            timestamp=int(time.time() * 1000),
            bid=float(response.get("bid", 0)),
            ask=float(response.get("ask", 0)),
            last=float(response.get("price", 0)),
            volume_24h=float(response.get("volume", 0)),
            market_type=MarketType.SPOT
        )
    
    async def fetch_order_book(self, symbol: str, limit: int = 100) -> Dict[str, Any]:
        """Fetch order book for a symbol."""
        response = await self._make_request("GET", f"/products/{symbol}/book", params={"level": 2})
        
        result = {
            "symbol": symbol,
            "timestamp": int(time.time() * 1000),
            "bids": [[float(price), float(size)] for price, size, _ in response.get("bids", [])[:limit]],
            "asks": [[float(price), float(size)] for price, size, _ in response.get("asks", [])[:limit]]
        }
        
        return result
    
    async def fetch_balance(self) -> Dict[str, Any]:
        """Fetch account balance."""
        response = await self._make_request("GET", "/accounts", auth=True)
        
        result = {"total": {}, "free": {}, "used": {}}
        
        for account in response:
            currency = account["currency"]
            balance = float(account["balance"])
            available = float(account["available"])
            hold = float(account["hold"])
            
            result["total"][currency] = balance
            result["free"][currency] = available
            result["used"][currency] = hold
        
        return result
    
    async def create_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        amount: float,
        price: float = None,
        params: Dict[str, Any] = None
    ) -> Order:
        """Create a new order on Coinbase."""
        params = params or {}
        
        data = {
            "product_id": symbol,
            "side": side.value,
            "size": str(amount),
            "client_oid": params.get("client_order_id", str(uuid.uuid4()))
        }
        
        if order_type == OrderType.LIMIT:
            data["type"] = "limit"
            data["price"] = str(price)
            data["post_only"] = params.get("post_only", True)
            
            # Set time in force parameter
            time_in_force = params.get("time_in_force", OrderTimeInForce.GTC.value)
            if time_in_force == OrderTimeInForce.GTC.value:
                data["time_in_force"] = "GTC"
            elif time_in_force == OrderTimeInForce.IOC.value:
                data["time_in_force"] = "IOC"
            elif time_in_force == OrderTimeInForce.FOK.value:
                data["time_in_force"] = "FOK"
        else:
            data["type"] = "market"
        
        response = await self._make_request("POST", "/orders", data=data, auth=True)
        
        return Order(
            id=response["id"],
            symbol=symbol,
            exchange=self.exchange_id,
            side=side,
            type=order_type,
            price=price,
            amount=amount,
            status=OrderStatus.NEW,
            timestamp=int(time.time() * 1000),
            client_order_id=data["client_oid"]
        )
    
    async def cancel_order(self, id: str, symbol: str = None) -> bool:
        """Cancel an existing order."""
        try:
            await self._make_request("DELETE", f"/orders/{id}", auth=True)
            return True
        except Exception as e:
            logger.error(f"Failed to cancel order {id}: {e}")
            return False
    
    async def fetch_order(self, id: str, symbol: str = None) -> Order:
        """Fetch an order by ID."""
        response = await self._make_request("GET", f"/orders/{id}", auth=True)
        
        return self._parse_order(response)
    
    async def fetch_orders(self, symbol: str = None, since: int = None, limit: int = None) -> List[Order]:
        """Fetch all orders."""
        params = {}
        
        if symbol:
            params["product_id"] = symbol
            
        if since:
            params["after"] = since
            
        if limit:
            params["limit"] = limit
        
        response = await self._make_request("GET", "/orders", params=params, auth=True)
        
        return [self._parse_order(order) for order in response]
    
    async def fetch_open_orders(self, symbol: str = None, since: int = None, limit: int = None) -> List[Order]:
        """Fetch open orders."""
        params = {"status": "open"}
        
        if symbol:
            params["product_id"] = symbol
            
        if since:
            params["after"] = since
            
        if limit:
            params["limit"] = limit
        
        response = await self._make_request("GET", "/orders", params=params, auth=True)
        
        return [self._parse_order(order) for order in response]
    
    async def fetch_closed_orders(self, symbol: str = None, since: int = None, limit: int = None) -> List[Order]:
        """Fetch closed orders."""
        params = {"status": "done"}
        
        if symbol:
            params["product_id"] = symbol
            
        if since:
            params["after"] = since
            
        if limit:
            params["limit"] = limit
        
        response = await self._make_request("GET", "/orders", params=params, auth=True)
        
        return [self._parse_order(order) for order in response]
    
    def _parse_order(self, order_data: Dict[str, Any]) -> Order:
        """Parse order data from Coinbase into a unified Order object."""
        symbol = order_data["product_id"]
        
        # Determine order type
        order_type = OrderType.MARKET
        if order_data.get("type") == "limit":
            order_type = OrderType.LIMIT
        
        # Determine order side
        side = OrderSide.BUY if order_data["side"] == "buy" else OrderSide.SELL
        
        # Determine order status
        status = OrderStatus.NEW
        if order_data["status"] == "done":
            if order_data.get("done_reason") == "filled":
                status = OrderStatus.FILLED
            else:
                status = OrderStatus.CANCELED
        elif order_data["status"] == "open":
            if float(order_data.get("filled_size", 0)) > 0:
                status = OrderStatus.PARTIALLY_FILLED
        
        return Order(
            id=order_data["id"],
            symbol=symbol,
            exchange=self.exchange_id,
            side=side,
            type=order_type,
            price=float(order_data.get("price", 0)),
            amount=float(order_data.get("size", 0)),
            filled_amount=float(order_data.get("filled_size", 0)),
            status=status,
            timestamp=int(time.parse(order_data["created_at"]).timestamp() * 1000),
            client_order_id=order_data.get("client_oid")
        )
    
    async def fetch_positions(self, symbols: List[str] = None) -> List[Position]:
        """Fetch positions - Coinbase spot exchange doesn't have positions in the futures sense."""
        # For spot exchanges, positions are derived from account balances
        balances = await self.fetch_balance()
        positions = []
        
        # Only include symbols requested, or all if None
        currencies = set()
        if symbols:
            for symbol in symbols:
                # Extract base currency from symbol (e.g. "BTC-USD" -> "BTC")
                parts = symbol.split("-")
                if len(parts) >= 1:
                    currencies.add(parts[0])
        
        for currency, amount in balances["total"].items():
            if symbols and currency not in currencies:
                continue
                
            if amount > 0:
                positions.append(
                    Position(
                        symbol=f"{currency}-USD",  # Estimated symbol format
                        exchange=self.exchange_id,
                        side=OrderSide.BUY,  # Spot positions are always "long"
                        amount=amount,
                        entry_price=0.0,  # Not applicable for spot
                        timestamp=int(time.time() * 1000)
                    )
                )
        
        return positions
