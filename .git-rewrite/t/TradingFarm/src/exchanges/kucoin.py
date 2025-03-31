"""
KuCoin Exchange Module

Implements the Exchange interface for KuCoin cryptocurrency exchange.
Provides functionality for market data, account information, and trading.
"""

import time
import hmac
import hashlib
import base64
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
import aiohttp

from .exchange_base import (
    Exchange, ExchangeCredentials, OrderType, OrderSide,
    TimeInForce, OrderStatus, OrderBook, AccountBalance
)
from .rate_limiter import RateLimiter


class KuCoinExchange(Exchange):
    """
    KuCoin exchange implementation.
    
    Implements the Exchange interface for the KuCoin cryptocurrency exchange.
    """
    
    # Exchange identifier
    EXCHANGE_NAME = "kucoin"
    
    # API endpoints
    BASE_URL = "https://api.kucoin.com"
    BASE_URL_SANDBOX = "https://openapi-sandbox.kucoin.com"
    
    # Mapping from standard order types to KuCoin-specific types
    ORDER_TYPE_MAP = {
        OrderType.MARKET: "market",
        OrderType.LIMIT: "limit",
        OrderType.STOP_LOSS: "stop",
        OrderType.STOP_LIMIT: "stop_limit",
    }
    
    # Mapping from standard order sides to KuCoin-specific sides
    ORDER_SIDE_MAP = {
        OrderSide.BUY: "buy",
        OrderSide.SELL: "sell",
    }
    
    # Mapping from standard time in force to KuCoin-specific values
    TIME_IN_FORCE_MAP = {
        TimeInForce.GTC: "GTC",  # Good till canceled
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
        Initialize the KuCoin exchange.
        
        Args:
            name: Exchange name identifier
            credentials: Optional API credentials
            testnet: Whether to use the sandbox environment
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
        
        # Token cache for KuCoin API
        self._api_token = None
        self._api_token_expiry = 0
        
        # Cache for market data
        self._symbols_info = None
        self._symbols_timestamp = 0
        self._symbols_ttl = 3600  # 1 hour
    
    def _get_url(self, endpoint: str) -> str:
        """
        Get the full URL for an API endpoint.
        
        Args:
            endpoint: API endpoint
            
        Returns:
            Full URL
        """
        base = self.BASE_URL_SANDBOX if self.testnet else self.BASE_URL
        return f"{base}{endpoint}"
    
    def _sign_request(
        self,
        method: str,
        endpoint: str,
        query_params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Sign a request with the API secret.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            query_params: Optional query parameters
            data: Optional request data
            
        Returns:
            Headers with API key and signature
        """
        if not self.credentials:
            raise ValueError("API credentials required")
        
        # Get credentials
        api_key = self.credentials.get_api_key()
        api_secret = self.credentials.get_api_secret()
        passphrase = self.credentials.get_passphrase()
        
        if not passphrase:
            raise ValueError("Passphrase is required for KuCoin API")
        
        # Generate timestamp and format query string
        timestamp = int(time.time() * 1000)
        
        # Build query string
        query_string = ""
        if query_params:
            query_items = []
            for k, v in sorted(query_params.items()):
                query_items.append(f"{k}={v}")
            if query_items:
                query_string = "&".join(query_items)
        
        # Build string to sign
        data_str = ""
        if data:
            data_str = json.dumps(data)
        
        # Create signature string
        endpoint_with_query = endpoint
        if query_string:
            endpoint_with_query = f"{endpoint}?{query_string}"
        
        str_to_sign = f"{timestamp}{method}{endpoint_with_query}{data_str}"
        
        # Create signature
        signature = base64.b64encode(
            hmac.new(
                api_secret.encode('utf-8'),
                str_to_sign.encode('utf-8'),
                hashlib.sha256
            ).digest()
        ).decode()
        
        # Create encrypted passphrase
        passphrase_hash = base64.b64encode(
            hmac.new(
                api_secret.encode('utf-8'),
                passphrase.encode('utf-8'),
                hashlib.sha256
            ).digest()
        ).decode()
        
        # Return headers
        return {
            "KC-API-KEY": api_key,
            "KC-API-SIGN": signature,
            "KC-API-TIMESTAMP": str(timestamp),
            "KC-API-PASSPHRASE": passphrase_hash,
            "KC-API-KEY-VERSION": "2",  # Use API v2 signature
            "Content-Type": "application/json",
        }
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        auth: bool = False,
        rate_limit_key: Optional[str] = None
    ) -> Any:
        """
        Send a request to the KuCoin API.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Optional query parameters
            data: Optional request data
            headers: Optional request headers
            auth: Whether authentication is required
            rate_limit_key: Optional key for rate limiting
            
        Returns:
            Response data
        """
        url = self._get_url(endpoint)
        request_headers = headers or {}
        
        # Add authentication headers if required
        if auth:
            if not self.credentials:
                raise ValueError("API credentials required for authenticated request")
            
            # Add API token if available, otherwise sign the request
            if self._api_token and time.time() < self._api_token_expiry:
                request_headers["KC-API-KEY"] = self.credentials.get_api_key()
                request_headers["KC-API-SIGN"] = self._api_token["instanceServers"][0]["endpoint"]
                request_headers["KC-API-PASSPHRASE"] = self.credentials.get_passphrase()
            else:
                request_headers.update(self._sign_request(method, endpoint, params, data))
        
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
            
            json_data = json.dumps(data) if data else None
            
            async with session.request(
                method=method,
                url=url,
                params=params,
                data=json_data,
                headers=request_headers,
                timeout=self.request_timeout
            ) as response:
                response_text = await response.text()
                
                # Parse JSON response
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    self.logger.error(f"Invalid JSON response: {response_text}")
                    raise ValueError(f"Invalid JSON response from KuCoin API: {response_text}")
                
                # Check for KuCoin API errors
                if "code" in response_data and response_data["code"] != "200000":
                    error_msg = response_data.get("msg", "Unknown error")
                    self.logger.error(f"KuCoin API error: {error_msg}")
                    raise ValueError(f"KuCoin API error: {error_msg}")
                
                # Return the data
                return response_data.get("data")
                
        except aiohttp.ClientError as e:
            self.logger.error(f"HTTP error: {str(e)}")
            raise
        finally:
            if created_session:
                await session.close()
    
    async def _get_api_token(self) -> Dict[str, Any]:
        """
        Get an API token for WebSocket connections.
        
        Returns:
            API token data
        """
        # Check if we have a valid token
        if self._api_token and time.time() < self._api_token_expiry:
            return self._api_token
        
        # Get a new token
        endpoint = "/api/v1/bullet-private" if self.credentials else "/api/v1/bullet-public"
        method = "POST" if self.credentials else "GET"
        auth = self.credentials is not None
        
        result = await self._request(
            method=method,
            endpoint=endpoint,
            auth=auth,
            rate_limit_key="get_api_token"
        )
        
        # Update token cache
        self._api_token = result
        self._api_token_expiry = time.time() + (result.get("expire", 24) * 3600)
        
        return result
    
    async def get_server_time(self) -> Dict[str, Any]:
        """
        Get the KuCoin server time.
        
        Returns:
            Server time information
        """
        return await self._request(
            method="GET",
            endpoint="/api/v1/timestamp",
            rate_limit_key="get_server_time"
        )
    
    async def get_symbols(self, refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Get information about all trading symbols.
        
        Args:
            refresh: Force refresh the cache
            
        Returns:
            Symbol information
        """
        # Check if cached data is still valid
        current_time = time.time()
        if (not refresh and self._symbols_info and 
            current_time - self._symbols_timestamp < self._symbols_ttl):
            return self._symbols_info
        
        # Get fresh symbols data
        result = await self._request(
            method="GET",
            endpoint="/api/v1/symbols",
            rate_limit_key="get_symbols"
        )
        
        # Cache the result
        self._symbols_info = result
        self._symbols_timestamp = current_time
        
        return result
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get ticker information for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Ticker data
        """
        params = {"symbol": symbol}
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/market/orderbook/level1",
            params=params,
            rate_limit_key="get_ticker"
        )
    
    async def get_order_book(self, symbol: str, level: int = 2) -> OrderBook:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            level: Order book level (1=best bid/ask, 2=aggregated, 3=full)
            
        Returns:
            OrderBook object
        """
        params = {
            "symbol": symbol,
            "level": level
        }
        
        result = await self._request(
            method="GET",
            endpoint="/api/v1/market/orderbook/level2_20",
            params=params,
            rate_limit_key="get_order_book"
        )
        
        # Parse order book data
        asks = [(float(item[0]), float(item[1])) for item in result.get("asks", [])]
        bids = [(float(item[0]), float(item[1])) for item in result.get("bids", [])]
        
        return OrderBook(
            symbol=symbol,
            asks=asks,
            bids=bids,
            timestamp=int(result.get("time", time.time() * 1000))
        )
    
    async def get_recent_trades(self, symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent trades for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of trades to return
            
        Returns:
            List of recent trades
        """
        params = {
            "symbol": symbol
        }
        
        # Adjust limit if needed
        if limit:
            params["limit"] = min(limit, 100)  # KuCoin limit is 100
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/market/histories",
            params=params,
            rate_limit_key="get_recent_trades"
        )
    
    async def get_klines(
        self,
        symbol: str,
        kline_type: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 100
    ) -> List[List[Any]]:
        """
        Get klines/candlesticks for a symbol.
        
        Args:
            symbol: Trading pair symbol
            kline_type: Kline type (e.g., "1min", "1hour", "1day")
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of klines to return
            
        Returns:
            List of klines
        """
        params = {
            "symbol": symbol,
            "type": kline_type
        }
        
        # Add optional parameters
        if start_time:
            params["startAt"] = start_time
        
        if end_time:
            params["endAt"] = end_time
        
        # Adjust limit if needed
        if limit:
            params["pageSize"] = min(limit, 1500)  # KuCoin limit is 1500
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/market/candles",
            params=params,
            rate_limit_key="get_klines"
        )
    
    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get account information.
        
        Returns:
            Account information
        """
        return await self._request(
            method="GET",
            endpoint="/api/v1/accounts",
            auth=True,
            rate_limit_key="get_account_info"
        )
    
    async def get_account_balance(self) -> AccountBalance:
        """
        Get account balances.
        
        Returns:
            AccountBalance object
        """
        # Get all accounts
        accounts = await self.get_account_info()
        
        # Process balance data
        balances = {}
        for account in accounts:
            currency = account.get("currency")
            balance_type = account.get("type")  # main, trade, margin
            balance = float(account.get("balance", 0))
            available = float(account.get("available", 0))
            holds = float(account.get("holds", 0))
            
            # Initialize currency entry if not exists
            if currency not in balances:
                balances[currency] = {
                    "free": 0.0,
                    "locked": 0.0
                }
            
            # Update balances
            balances[currency]["free"] += available
            balances[currency]["locked"] += holds
        
        return AccountBalance(
            exchange=self.name,
            balances=balances,
            timestamp=int(time.time() * 1000)
        )
    
    async def create_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        size: float,
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
            size: Order size/quantity
            price: Optional price (required for limit orders)
            time_in_force: Optional time in force
            **kwargs: Additional KuCoin-specific parameters
            
        Returns:
            Order result
        """
        # Validate inputs
        if not isinstance(side, OrderSide):
            raise ValueError(f"Invalid order side: {side}")
        
        if not isinstance(order_type, OrderType):
            raise ValueError(f"Invalid order type: {order_type}")
        
        # Map to KuCoin-specific values
        kucoin_side = self.ORDER_SIDE_MAP.get(side)
        if not kucoin_side:
            raise ValueError(f"Unsupported order side: {side}")
        
        kucoin_type = self.ORDER_TYPE_MAP.get(order_type)
        if not kucoin_type:
            raise ValueError(f"Unsupported order type: {order_type}")
        
        # Prepare order data
        data = {
            "clientOid": f"tf_{int(time.time() * 1000)}",  # Client-side order ID
            "symbol": symbol,
            "side": kucoin_side,
            "type": kucoin_type,
            "size": str(size)
        }
        
        # Add price for limit orders
        if order_type == OrderType.LIMIT and price is not None:
            data["price"] = str(price)
        
        # Add time in force if specified
        if time_in_force is not None:
            kucoin_tif = self.TIME_IN_FORCE_MAP.get(time_in_force)
            if kucoin_tif:
                data["timeInForce"] = kucoin_tif
        
        # Add any additional parameters
        data.update(kwargs)
        
        # Send the order
        return await self._request(
            method="POST",
            endpoint="/api/v1/orders",
            data=data,
            auth=True,
            rate_limit_key="create_order"
        )
    
    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """
        Cancel an order.
        
        Args:
            order_id: Order ID to cancel
            
        Returns:
            Cancellation result
        """
        return await self._request(
            method="DELETE",
            endpoint=f"/api/v1/orders/{order_id}",
            auth=True,
            rate_limit_key="cancel_order"
        )
    
    async def cancel_all_orders(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """
        Cancel all orders for a symbol or all symbols.
        
        Args:
            symbol: Optional trading pair symbol
            
        Returns:
            Cancellation result
        """
        params = {}
        if symbol:
            params["symbol"] = symbol
        
        return await self._request(
            method="DELETE",
            endpoint="/api/v1/orders",
            params=params,
            auth=True,
            rate_limit_key="cancel_all_orders"
        )
    
    async def get_order(self, order_id: str) -> Dict[str, Any]:
        """
        Get order information.
        
        Args:
            order_id: Order ID
            
        Returns:
            Order information
        """
        return await self._request(
            method="GET",
            endpoint=f"/api/v1/orders/{order_id}",
            auth=True,
            rate_limit_key="get_order"
        )
    
    async def get_order_by_client_id(self, client_oid: str) -> Dict[str, Any]:
        """
        Get order information by client order ID.
        
        Args:
            client_oid: Client order ID
            
        Returns:
            Order information
        """
        return await self._request(
            method="GET",
            endpoint=f"/api/v1/order/client-order/{client_oid}",
            auth=True,
            rate_limit_key="get_order_by_client_id"
        )
    
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get open orders.
        
        Args:
            symbol: Optional trading pair symbol
            
        Returns:
            List of open orders
        """
        params = {}
        if symbol:
            params["symbol"] = symbol
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/orders",
            params=params,
            auth=True,
            rate_limit_key="get_open_orders"
        )
    
    async def get_order_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        side: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Get order history.
        
        Args:
            symbol: Optional trading pair symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            side: Optional order side ("buy" or "sell")
            page: Page number
            page_size: Page size
            
        Returns:
            Order history
        """
        params = {
            "currentPage": page,
            "pageSize": min(page_size, 500)  # KuCoin limit is 500
        }
        
        if symbol:
            params["symbol"] = symbol
        
        if start_time:
            params["startAt"] = start_time
        
        if end_time:
            params["endAt"] = end_time
        
        if side:
            params["side"] = side
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/orders/history",
            params=params,
            auth=True,
            rate_limit_key="get_order_history"
        )
    
    async def get_fills(
        self,
        order_id: Optional[str] = None,
        symbol: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Get fills/trades.
        
        Args:
            order_id: Optional order ID
            symbol: Optional trading pair symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            page: Page number
            page_size: Page size
            
        Returns:
            Fills/trades
        """
        params = {
            "currentPage": page,
            "pageSize": min(page_size, 500)  # KuCoin limit is 500
        }
        
        if order_id:
            params["orderId"] = order_id
        
        if symbol:
            params["symbol"] = symbol
        
        if start_time:
            params["startAt"] = start_time
        
        if end_time:
            params["endAt"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/fills",
            params=params,
            auth=True,
            rate_limit_key="get_fills"
        )
    
    async def withdraw(
        self,
        currency: str,
        address: str,
        amount: float,
        memo: Optional[str] = None,
        remark: Optional[str] = None,
        chain: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make a withdrawal.
        
        IMPORTANT: This is a sensitive operation that should be
        protected by additional security measures.
        
        Args:
            currency: Currency code
            address: Withdrawal address
            amount: Withdrawal amount
            memo: Optional memo for currencies that require it
            remark: Optional remark
            chain: Optional chain for currencies with multiple networks
            **kwargs: Additional parameters
            
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
            "currency": currency,
            "address": address,
            "amount": amount
        }
        
        if memo:
            data["memo"] = memo
        
        if remark:
            data["remark"] = remark
        
        if chain:
            data["chain"] = chain
        
        # Add any additional parameters
        data.update(kwargs)
        
        return await self._request(
            method="POST",
            endpoint="/api/v1/withdrawals",
            data=data,
            auth=True,
            rate_limit_key="withdraw"
        )
    
    async def get_deposit_address(
        self,
        currency: str,
        chain: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get deposit address for a currency.
        
        Args:
            currency: Currency code
            chain: Optional chain for currencies with multiple networks
            
        Returns:
            Deposit address information
        """
        params = {"currency": currency}
        
        if chain:
            params["chain"] = chain
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/deposit-addresses",
            params=params,
            auth=True,
            rate_limit_key="get_deposit_address"
        )
    
    async def get_deposit_history(
        self,
        currency: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Get deposit history.
        
        Args:
            currency: Optional currency code
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            status: Optional status
            page: Page number
            page_size: Page size
            
        Returns:
            Deposit history
        """
        params = {
            "currentPage": page,
            "pageSize": min(page_size, 500)  # KuCoin limit is 500
        }
        
        if currency:
            params["currency"] = currency
        
        if start_time:
            params["startAt"] = start_time
        
        if end_time:
            params["endAt"] = end_time
        
        if status:
            params["status"] = status
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/deposits",
            params=params,
            auth=True,
            rate_limit_key="get_deposit_history"
        )
    
    async def get_withdrawal_history(
        self,
        currency: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """
        Get withdrawal history.
        
        Args:
            currency: Optional currency code
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            status: Optional status
            page: Page number
            page_size: Page size
            
        Returns:
            Withdrawal history
        """
        params = {
            "currentPage": page,
            "pageSize": min(page_size, 500)  # KuCoin limit is 500
        }
        
        if currency:
            params["currency"] = currency
        
        if start_time:
            params["startAt"] = start_time
        
        if end_time:
            params["endAt"] = end_time
        
        if status:
            params["status"] = status
        
        return await self._request(
            method="GET",
            endpoint="/api/v1/withdrawals",
            params=params,
            auth=True,
            rate_limit_key="get_withdrawal_history"
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
