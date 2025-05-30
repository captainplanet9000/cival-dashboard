"""
Kraken Exchange Module

Implements the Exchange interface for Kraken cryptocurrency exchange.
Provides functionality for market data, account information, and trading.
"""

import time
import hmac
import hashlib
import base64
import logging
import json
import urllib.parse
from typing import Dict, List, Optional, Any, Tuple
import aiohttp

from .exchange_base import (
    Exchange, ExchangeCredentials, OrderType, OrderSide,
    TimeInForce, OrderStatus, OrderBook, AccountBalance
)
from .rate_limiter import RateLimiter


class KrakenExchange(Exchange):
    """
    Kraken exchange implementation.
    
    Implements the Exchange interface for the Kraken cryptocurrency exchange.
    """
    
    # Exchange identifier
    EXCHANGE_NAME = "kraken"
    
    # API endpoints
    BASE_URL = "https://api.kraken.com"
    
    # Mapping from standard order types to Kraken-specific types
    ORDER_TYPE_MAP = {
        OrderType.MARKET: "market",
        OrderType.LIMIT: "limit",
        OrderType.STOP_LOSS: "stop-loss",
        OrderType.TAKE_PROFIT: "take-profit",
        OrderType.STOP_LIMIT: "stop-limit",
    }
    
    # Mapping from standard order sides to Kraken-specific sides
    ORDER_SIDE_MAP = {
        OrderSide.BUY: "buy",
        OrderSide.SELL: "sell",
    }
    
    # Mapping from standard time in force to Kraken-specific values
    TIME_IN_FORCE_MAP = {
        TimeInForce.GTC: "GTC",  # Good til canceled
        TimeInForce.IOC: "IOC",  # Immediate or cancel
        TimeInForce.FOK: "FOK",  # Fill or kill
    }
    
    def __init__(
        self,
        name: str = EXCHANGE_NAME,
        credentials: Optional[ExchangeCredentials] = None,
        testnet: bool = False,
        rate_limiter: Optional[RateLimiter] = None,
        session: Optional[aiohttp.ClientSession] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialize the Kraken exchange.
        
        Args:
            name: Exchange name identifier
            credentials: Optional API credentials
            testnet: Whether to use the testnet/sandbox (not available for Kraken)
            rate_limiter: Optional rate limiter
            session: Optional aiohttp session
            logger: Optional logger
        """
        super().__init__(
            name=name,
            credentials=credentials,
            testnet=testnet,
            rate_limiter=rate_limiter,
            session=session,
            logger=logger or logging.getLogger(f"exchange.{name}")
        )
        
        # Warn if testnet is set, as Kraken does not have a public testnet
        if testnet:
            self.logger.warning(
                "Kraken does not provide a public testnet. "
                "Using the production API. Be cautious with real funds."
            )
        
        # Cache for asset pairs info
        self._asset_pairs = None
        self._asset_pairs_timestamp = 0
        self._asset_pairs_ttl = 3600  # 1 hour
    
    def _get_url(self, endpoint: str, public: bool = False) -> str:
        """
        Get the full URL for an API endpoint.
        
        Args:
            endpoint: API endpoint
            public: Whether this is a public API endpoint
            
        Returns:
            Full URL
        """
        path = "/0/public/" if public else "/0/private/"
        return f"{self.BASE_URL}{path}{endpoint}"
    
    def _get_nonce(self) -> int:
        """
        Generate a nonce for API requests.
        
        Returns:
            Nonce value
        """
        return int(time.time() * 1000)
    
    def _sign_request(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, str]:
        """
        Sign a request with the API secret.
        
        Args:
            endpoint: API endpoint
            data: Request data
            
        Returns:
            Headers with API key and signature
        """
        if not self.credentials:
            raise ValueError("API credentials required")
        
        # Extract API key and secret
        api_key = self.credentials.get_api_key()
        api_secret = self.credentials.get_api_secret()
        
        # Add nonce to data
        data["nonce"] = self._get_nonce()
        
        # Create signature
        postdata = urllib.parse.urlencode(data)
        encoded = (str(data["nonce"]) + postdata).encode()
        message = endpoint.encode() + hashlib.sha256(encoded).digest()
        
        # Using API secret as base64 key for HMAC
        try:
            secret_decoded = base64.b64decode(api_secret)
        except Exception:
            raise ValueError("Invalid API secret format")
        
        signature = base64.b64encode(
            hmac.new(secret_decoded, message, hashlib.sha512).digest()
        ).decode()
        
        return {
            "API-Key": api_key,
            "API-Sign": signature,
        }
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        public: bool = False,
        signed: bool = False,
        rate_limit_key: Optional[str] = None
    ) -> Any:
        """
        Send a request to the Kraken API.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Optional query parameters
            data: Optional request data
            headers: Optional request headers
            public: Whether this is a public API endpoint
            signed: Whether this request needs to be signed
            rate_limit_key: Optional key for rate limiting
            
        Returns:
            Response data
        """
        url = self._get_url(endpoint, public)
        request_headers = headers or {}
        
        if not public and signed:
            if not self.credentials:
                raise ValueError("API credentials required for authenticated request")
            
            request_data = data or {}
            request_headers.update(self._sign_request(f"/0/private/{endpoint}", request_data))
        
        # Apply rate limiting if specified
        if rate_limit_key and self.rate_limiter:
            try:
                await self.rate_limiter.acquire(rate_limit_key)
            except Exception as e:
                self.logger.error(f"Rate limit error for {rate_limit_key}: {str(e)}")
                raise
        
        # Use the session or create a new one for the request
        session = self.session or aiohttp.ClientSession()
        created_session = self.session is None
        
        try:
            self.logger.debug(f"Sending {method} request to {url}")
            
            async with session.request(
                method=method,
                url=url,
                params=params,
                data=data,
                headers=request_headers,
                timeout=self.request_timeout
            ) as response:
                response_text = await response.text()
                
                # Parse JSON response
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    self.logger.error(f"Invalid JSON response: {response_text}")
                    raise ValueError(f"Invalid JSON response from Kraken API: {response_text}")
                
                # Check for Kraken API errors
                if "error" in response_data and response_data["error"]:
                    error_messages = response_data["error"]
                    error_str = ", ".join(error_messages)
                    self.logger.error(f"Kraken API error: {error_str}")
                    raise ValueError(f"Kraken API error: {error_str}")
                
                # Return the result data
                if "result" in response_data:
                    return response_data["result"]
                else:
                    return response_data
                
        except aiohttp.ClientError as e:
            self.logger.error(f"HTTP error: {str(e)}")
            raise
        finally:
            if created_session:
                await session.close()
    
    async def get_time(self) -> Dict[str, Any]:
        """
        Get the server time.
        
        Returns:
            Server time information
        """
        return await self._request(
            method="GET",
            endpoint="Time",
            public=True,
            rate_limit_key="get_time"
        )
    
    async def get_assets(self) -> Dict[str, Any]:
        """
        Get information about all assets.
        
        Returns:
            Asset information
        """
        return await self._request(
            method="GET",
            endpoint="Assets",
            public=True,
            rate_limit_key="get_assets"
        )
    
    async def get_asset_pairs(self, refresh: bool = False) -> Dict[str, Any]:
        """
        Get information about all tradable asset pairs.
        
        Args:
            refresh: Force refresh the cache
            
        Returns:
            Asset pair information
        """
        # Check if cached data is still valid
        current_time = time.time()
        if (not refresh and self._asset_pairs and 
            current_time - self._asset_pairs_timestamp < self._asset_pairs_ttl):
            return self._asset_pairs
        
        # Get fresh asset pairs data
        result = await self._request(
            method="GET",
            endpoint="AssetPairs",
            public=True,
            rate_limit_key="get_asset_pairs"
        )
        
        # Cache the result
        self._asset_pairs = result
        self._asset_pairs_timestamp = current_time
        
        return result
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get ticker information for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Ticker data
        """
        params = {"pair": symbol}
        
        return await self._request(
            method="GET",
            endpoint="Ticker",
            params=params,
            public=True,
            rate_limit_key="get_ticker"
        )
    
    async def get_order_book(self, symbol: str, count: int = 100) -> OrderBook:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            count: Maximum number of asks/bids (default: 100)
            
        Returns:
            OrderBook object
        """
        params = {
            "pair": symbol,
            "count": min(count, 500)  # Kraken limit is 500
        }
        
        result = await self._request(
            method="GET",
            endpoint="Depth",
            params=params,
            public=True,
            rate_limit_key="get_order_book"
        )
        
        # Kraken returns data indexed by the pair name
        pair_data = result.get(symbol, list(result.values())[0] if result else {})
        
        # Parse order book data
        asks = [(float(price), float(volume)) for price, volume, _ in pair_data.get("asks", [])]
        bids = [(float(price), float(volume)) for price, volume, _ in pair_data.get("bids", [])]
        
        return OrderBook(
            symbol=symbol,
            asks=asks,
            bids=bids,
            timestamp=int(time.time() * 1000)  # Kraken doesn't provide a timestamp for order book
        )
    
    async def get_recent_trades(self, symbol: str, since: Optional[str] = None) -> Dict[str, Any]:
        """
        Get recent trades for a symbol.
        
        Args:
            symbol: Trading pair symbol
            since: Optional timestamp to get trades since (exclusive)
            
        Returns:
            Trade data
        """
        params = {"pair": symbol}
        if since:
            params["since"] = since
        
        return await self._request(
            method="GET",
            endpoint="Trades",
            params=params,
            public=True,
            rate_limit_key="get_recent_trades"
        )
    
    async def get_ohlc(
        self,
        symbol: str,
        interval: int = 1,
        since: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get OHLC (candle) data for a symbol.
        
        Args:
            symbol: Trading pair symbol
            interval: Time frame interval in minutes (1, 5, 15, 30, 60, 240, 1440, 10080, 21600)
            since: Optional timestamp to get data since (inclusive)
            
        Returns:
            OHLC data
        """
        # Validate interval
        valid_intervals = [1, 5, 15, 30, 60, 240, 1440, 10080, 21600]
        if interval not in valid_intervals:
            raise ValueError(f"Invalid interval: {interval}. Must be one of {valid_intervals}")
        
        params = {
            "pair": symbol,
            "interval": interval
        }
        
        if since:
            params["since"] = since
        
        return await self._request(
            method="GET",
            endpoint="OHLC",
            params=params,
            public=True,
            rate_limit_key="get_ohlc"
        )
    
    async def get_account_balance(self) -> AccountBalance:
        """
        Get account balances.
        
        Returns:
            AccountBalance object
        """
        # This requires authentication
        result = await self._request(
            method="POST",
            endpoint="Balance",
            data={},
            signed=True,
            rate_limit_key="get_account_balance"
        )
        
        # Process balance data
        balances = {}
        for asset, balance in result.items():
            try:
                balances[asset] = {
                    "free": float(balance),
                    "locked": 0.0  # Kraken doesn't provide locked balance in this endpoint
                }
            except (ValueError, TypeError):
                self.logger.warning(f"Invalid balance value for {asset}: {balance}")
        
        return AccountBalance(
            exchange=self.name,
            balances=balances,
            timestamp=int(time.time() * 1000)
        )
    
    async def get_trade_balance(self, asset: str = "ZUSD") -> Dict[str, Any]:
        """
        Get trade balance information.
        
        Args:
            asset: Asset to show balance in
            
        Returns:
            Trade balance information
        """
        data = {"asset": asset}
        
        return await self._request(
            method="POST",
            endpoint="TradeBalance",
            data=data,
            signed=True,
            rate_limit_key="get_trade_balance"
        )
    
    async def create_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        volume: float,
        price: Optional[float] = None,
        time_in_force: Optional[TimeInForce] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new order.
        
        Args:
            symbol: Trading pair symbol
            side: Order side (BUY or SELL)
            order_type: Order type (MARKET, LIMIT, etc.)
            volume: Order volume/quantity
            price: Optional price (required for limit orders)
            time_in_force: Optional time in force
            **kwargs: Additional Kraken-specific parameters
            
        Returns:
            Order result
        """
        # Validate inputs
        if not isinstance(side, OrderSide):
            raise ValueError(f"Invalid order side: {side}")
        
        if not isinstance(order_type, OrderType):
            raise ValueError(f"Invalid order type: {order_type}")
        
        # Map to Kraken-specific values
        kraken_side = self.ORDER_SIDE_MAP.get(side)
        if not kraken_side:
            raise ValueError(f"Unsupported order side: {side}")
        
        kraken_type = self.ORDER_TYPE_MAP.get(order_type)
        if not kraken_type:
            raise ValueError(f"Unsupported order type: {order_type}")
        
        # Prepare order data
        data = {
            "pair": symbol,
            "type": kraken_side,
            "ordertype": kraken_type,
            "volume": str(volume)
        }
        
        # Add price for limit orders
        if order_type == OrderType.LIMIT and price is not None:
            data["price"] = str(price)
        
        # Add time in force if specified
        if time_in_force is not None:
            kraken_tif = self.TIME_IN_FORCE_MAP.get(time_in_force)
            if kraken_tif:
                data["timeinforce"] = kraken_tif
        
        # Add any additional parameters
        data.update(kwargs)
        
        # Send the order
        return await self._request(
            method="POST",
            endpoint="AddOrder",
            data=data,
            signed=True,
            rate_limit_key="create_order"
        )
    
    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """
        Cancel an open order.
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            Cancellation result
        """
        data = {"txid": order_id}
        
        return await self._request(
            method="POST",
            endpoint="CancelOrder",
            data=data,
            signed=True,
            rate_limit_key="cancel_order"
        )
    
    async def cancel_all_orders(self) -> Dict[str, Any]:
        """
        Cancel all open orders.
        
        Returns:
            Cancellation result
        """
        return await self._request(
            method="POST",
            endpoint="CancelAll",
            data={},
            signed=True,
            rate_limit_key="cancel_all_orders"
        )
    
    async def get_open_orders(self, trades: bool = False) -> Dict[str, Any]:
        """
        Get open orders.
        
        Args:
            trades: Whether to include trades in output
            
        Returns:
            Open orders information
        """
        data = {"trades": trades}
        
        return await self._request(
            method="POST",
            endpoint="OpenOrders",
            data=data,
            signed=True,
            rate_limit_key="get_open_orders"
        )
    
    async def get_closed_orders(
        self,
        trades: bool = False,
        start: Optional[int] = None,
        end: Optional[int] = None,
        offset: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get closed orders.
        
        Args:
            trades: Whether to include trades in output
            start: Starting unix timestamp
            end: Ending unix timestamp
            offset: Result offset
            
        Returns:
            Closed orders information
        """
        data = {"trades": trades}
        
        if start is not None:
            data["start"] = start
        
        if end is not None:
            data["end"] = end
        
        if offset is not None:
            data["ofs"] = offset
        
        return await self._request(
            method="POST",
            endpoint="ClosedOrders",
            data=data,
            signed=True,
            rate_limit_key="get_closed_orders"
        )
    
    async def get_orders_info(
        self,
        order_ids: List[str],
        trades: bool = False
    ) -> Dict[str, Any]:
        """
        Get information about specific orders.
        
        Args:
            order_ids: List of order IDs
            trades: Whether to include trades
            
        Returns:
            Order information
        """
        data = {
            "txid": ",".join(order_ids),
            "trades": trades
        }
        
        return await self._request(
            method="POST",
            endpoint="QueryOrders",
            data=data,
            signed=True,
            rate_limit_key="get_orders_info"
        )
    
    async def get_deposit_methods(self, asset: str) -> List[Dict[str, Any]]:
        """
        Get deposit methods for an asset.
        
        Args:
            asset: Asset to get deposit methods for
            
        Returns:
            List of deposit methods
        """
        data = {"asset": asset}
        
        return await self._request(
            method="POST",
            endpoint="DepositMethods",
            data=data,
            signed=True,
            rate_limit_key="get_deposit_methods"
        )
    
    async def get_deposit_addresses(
        self,
        asset: str,
        method: str,
        new: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get deposit addresses for an asset.
        
        Args:
            asset: Asset to get deposit address for
            method: Deposit method name
            new: Whether to generate a new address
            
        Returns:
            List of deposit addresses
        """
        data = {
            "asset": asset,
            "method": method,
            "new": new
        }
        
        return await self._request(
            method="POST",
            endpoint="DepositAddresses",
            data=data,
            signed=True,
            rate_limit_key="get_deposit_addresses"
        )
    
    async def get_withdrawal_info(
        self,
        asset: str,
        key: str,
        amount: float
    ) -> Dict[str, Any]:
        """
        Get withdrawal information.
        
        Args:
            asset: Asset being withdrawn
            key: Withdrawal key name
            amount: Amount to withdraw
            
        Returns:
            Withdrawal information
        """
        data = {
            "asset": asset,
            "key": key,
            "amount": str(amount)
        }
        
        return await self._request(
            method="POST",
            endpoint="WithdrawInfo",
            data=data,
            signed=True,
            rate_limit_key="get_withdrawal_info"
        )
    
    async def withdraw(
        self,
        asset: str,
        key: str,
        amount: float
    ) -> Dict[str, Any]:
        """
        Make a withdrawal.
        
        IMPORTANT: This is a sensitive operation that should be
        protected by additional security measures.
        
        Args:
            asset: Asset being withdrawn
            key: Withdrawal key name
            amount: Amount to withdraw
            
        Returns:
            Withdrawal result
        """
        # Ensure this is not being called accidentally
        if not hasattr(self, '_withdrawal_confirmed') or not self._withdrawal_confirmed:
            raise SecurityError(
                "Withdrawal functionality requires explicit confirmation. "
                "This is a security measure to prevent accidental withdrawals."
            )
        
        data = {
            "asset": asset,
            "key": key,
            "amount": str(amount)
        }
        
        return await self._request(
            method="POST",
            endpoint="Withdraw",
            data=data,
            signed=True,
            rate_limit_key="withdraw"
        )
    
    async def enable_withdrawals(self, confirm: bool = False) -> bool:
        """
        Enable withdrawal functionality.
        
        This is a security measure to prevent accidental withdrawals.
        It must be explicitly called before making withdrawals.
        
        Args:
            confirm: Confirmation flag
            
        Returns:
            True if enabled, False otherwise
        """
        if not confirm:
            self.logger.warning(
                "Withdrawal functionality was not enabled. "
                "Pass confirm=True to enable."
            )
            return False
        
        self._withdrawal_confirmed = True
        self.logger.warning("Withdrawal functionality has been enabled!")
        return True
    
    async def disable_withdrawals(self) -> None:
        """Disable withdrawal functionality."""
        self._withdrawal_confirmed = False
        self.logger.info("Withdrawal functionality has been disabled.")


class SecurityError(Exception):
    """Exception raised for security-related errors."""
    pass
