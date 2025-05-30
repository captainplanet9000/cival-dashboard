"""
Bybit Exchange Module

Implements the Exchange interface for Bybit cryptocurrency exchange.
Provides functionality for market data, account information, and trading.
"""

import time
import hmac
import hashlib
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
import aiohttp

from .exchange_base import (
    Exchange, ExchangeCredentials, OrderType, OrderSide,
    TimeInForce, OrderStatus, OrderBook, AccountBalance
)
from .rate_limiter import RateLimiter


class BybitExchange(Exchange):
    """
    Bybit exchange implementation.
    
    Implements the Exchange interface for the Bybit cryptocurrency exchange.
    """
    
    # Exchange identifier
    EXCHANGE_NAME = "bybit"
    
    # API endpoints
    BASE_URL = "https://api.bybit.com"
    BASE_URL_TESTNET = "https://api-testnet.bybit.com"
    
    # Mapping from standard order types to Bybit-specific types
    ORDER_TYPE_MAP = {
        OrderType.MARKET: "Market",
        OrderType.LIMIT: "Limit",
    }
    
    # Mapping from standard order sides to Bybit-specific sides
    ORDER_SIDE_MAP = {
        OrderSide.BUY: "Buy",
        OrderSide.SELL: "Sell",
    }
    
    # Mapping from standard time in force to Bybit-specific values
    TIME_IN_FORCE_MAP = {
        TimeInForce.GTC: "GoodTillCancel",
        TimeInForce.IOC: "ImmediateOrCancel",
        TimeInForce.FOK: "FillOrKill",
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
        Initialize the Bybit exchange.
        
        Args:
            name: Exchange name identifier
            credentials: Optional API credentials
            testnet: Whether to use the testnet/sandbox
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
        base = self.BASE_URL_TESTNET if self.testnet else self.BASE_URL
        return f"{base}{endpoint}"
    
    def _get_signature(
        self,
        params: Dict[str, Any],
        timestamp: int
    ) -> str:
        """
        Generate signature for authenticated requests.
        
        Args:
            params: Request parameters
            timestamp: Request timestamp
            
        Returns:
            Request signature
        """
        if not self.credentials:
            raise ValueError("API credentials required")
        
        api_secret = self.credentials.get_api_secret()
        
        # Sort parameters by key
        sorted_params = dict(sorted(params.items()))
        
        # Create signature string
        param_str = ""
        for key, value in sorted_params.items():
            param_str += f"{key}={value}&"
        
        param_str += f"timestamp={timestamp}"
        
        # Generate HMAC signature
        signature = hmac.new(
            api_secret.encode('utf-8'),
            param_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        api_auth: bool = False,
        rate_limit_key: Optional[str] = None
    ) -> Any:
        """
        Send a request to the Bybit API.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Optional query parameters
            data: Optional request data
            headers: Optional request headers
            api_auth: Whether to add API authentication
            rate_limit_key: Optional key for rate limiting
            
        Returns:
            Response data
        """
        url = self._get_url(endpoint)
        request_params = params or {}
        request_headers = headers or {}
        
        # Add API authentication if required
        if api_auth:
            if not self.credentials:
                raise ValueError("API credentials required for authenticated request")
            
            timestamp = int(time.time() * 1000)
            
            # Add API key to parameters
            request_params["api_key"] = self.credentials.get_api_key()
            request_params["timestamp"] = timestamp
            
            # Generate signature
            signature = self._get_signature(request_params, timestamp)
            request_params["sign"] = signature
        
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
            
            # For POST requests, move parameters to data
            if method == "POST" and request_params:
                request_data = json.dumps(request_params)
                request_params = {}
            else:
                request_data = json.dumps(data) if data else None
            
            async with session.request(
                method=method,
                url=url,
                params=request_params,
                data=request_data,
                headers=request_headers,
                timeout=self.request_timeout
            ) as response:
                response_text = await response.text()
                
                # Parse JSON response
                try:
                    response_data = json.loads(response_text)
                except json.JSONDecodeError:
                    self.logger.error(f"Invalid JSON response: {response_text}")
                    raise ValueError(f"Invalid JSON response from Bybit API: {response_text}")
                
                # Check for Bybit API errors
                if response_data.get("ret_code") != 0:
                    error_msg = response_data.get("ret_msg", "Unknown error")
                    self.logger.error(f"Bybit API error: {error_msg}")
                    raise ValueError(f"Bybit API error: {error_msg}")
                
                # Return the result data
                return response_data.get("result")
                
        except aiohttp.ClientError as e:
            self.logger.error(f"HTTP error: {str(e)}")
            raise
        finally:
            if created_session:
                await session.close()
    
    async def get_server_time(self) -> Dict[str, Any]:
        """
        Get server time.
        
        Returns:
            Server time information
        """
        response = await self._request(
            method="GET",
            endpoint="/v2/public/time",
            rate_limit_key="get_server_time"
        )
        
        return {"server_time": response}
    
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
            endpoint="/v2/public/symbols",
            rate_limit_key="get_symbols"
        )
        
        # Cache the result
        self._symbols_info = result
        self._symbols_timestamp = current_time
        
        return result
    
    async def get_order_book(self, symbol: str, limit: int = 25) -> OrderBook:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of bids/asks (default: 25)
            
        Returns:
            OrderBook object
        """
        # Adjust limit if needed
        valid_limits = [1, 5, 10, 25, 50, 100, 200, 500]
        if limit not in valid_limits:
            # Find the closest valid limit
            limit = min(valid_limits, key=lambda x: abs(x - limit))
        
        params = {
            "symbol": symbol,
            "limit": limit
        }
        
        result = await self._request(
            method="GET",
            endpoint="/v2/public/orderBook/L2",
            params=params,
            rate_limit_key="get_order_book"
        )
        
        # Parse order book data
        asks = []
        bids = []
        
        for item in result:
            price = float(item["price"])
            size = float(item["size"])
            side = item["side"]
            
            if side == "Buy":
                bids.append((price, size))
            else:
                asks.append((price, size))
        
        # Sort asks in ascending price order
        asks.sort(key=lambda x: x[0])
        
        # Sort bids in descending price order
        bids.sort(key=lambda x: x[0], reverse=True)
        
        return OrderBook(
            symbol=symbol,
            asks=asks,
            bids=bids,
            timestamp=int(time.time() * 1000)  # Bybit doesn't provide a timestamp for order book
        )
    
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
            endpoint="/v2/public/tickers",
            params=params,
            rate_limit_key="get_ticker"
        )
    
    async def get_recent_trades(self, symbol: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent trades for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of trades to return
            
        Returns:
            List of recent trades
        """
        params = {
            "symbol": symbol,
            "limit": min(limit, 1000)  # Bybit limit is 1000
        }
        
        return await self._request(
            method="GET",
            endpoint="/v2/public/trading-records",
            params=params,
            rate_limit_key="get_recent_trades"
        )
    
    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Get klines/candlesticks for a symbol.
        
        Args:
            symbol: Trading pair symbol
            interval: Kline interval (1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M)
            start_time: Optional start time in seconds
            end_time: Optional end time in seconds
            limit: Maximum number of klines to return
            
        Returns:
            List of klines
        """
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": min(limit, 200)  # Bybit limit is 200
        }
        
        if start_time:
            params["from"] = start_time
        
        if end_time:
            params["to"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/v2/public/kline/list",
            params=params,
            rate_limit_key="get_klines"
        )
    
    async def get_wallet_balance(self, coin: Optional[str] = None) -> Dict[str, Any]:
        """
        Get wallet balance.
        
        Args:
            coin: Optional coin to get balance for
            
        Returns:
            Wallet balance information
        """
        params = {}
        if coin:
            params["coin"] = coin
        
        return await self._request(
            method="GET",
            endpoint="/v2/private/wallet/balance",
            params=params,
            api_auth=True,
            rate_limit_key="get_wallet_balance"
        )
    
    async def get_account_balance(self) -> AccountBalance:
        """
        Get account balances.
        
        Returns:
            AccountBalance object
        """
        # Get wallet balance data
        wallet_data = await self.get_wallet_balance()
        
        # Process balance data
        balances = {}
        for coin, balance_data in wallet_data.items():
            wallet_balance = balance_data.get("wallet_balance", 0)
            available_balance = balance_data.get("available_balance", 0)
            
            balances[coin] = {
                "free": float(available_balance),
                "locked": float(wallet_balance) - float(available_balance)
            }
        
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
        qty: float,
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
            qty: Order quantity
            price: Optional price (required for limit orders)
            time_in_force: Optional time in force
            **kwargs: Additional Bybit-specific parameters
            
        Returns:
            Order result
        """
        # Validate inputs
        if not isinstance(side, OrderSide):
            raise ValueError(f"Invalid order side: {side}")
        
        if not isinstance(order_type, OrderType):
            raise ValueError(f"Invalid order type: {order_type}")
        
        # Map to Bybit-specific values
        bybit_side = self.ORDER_SIDE_MAP.get(side)
        if not bybit_side:
            raise ValueError(f"Unsupported order side: {side}")
        
        bybit_type = self.ORDER_TYPE_MAP.get(order_type)
        if not bybit_type:
            raise ValueError(f"Unsupported order type: {order_type}")
        
        # Prepare order data
        params = {
            "symbol": symbol,
            "side": bybit_side,
            "order_type": bybit_type,
            "qty": str(qty)
        }
        
        # Add price for limit orders
        if order_type == OrderType.LIMIT and price is not None:
            params["price"] = str(price)
        
        # Add time in force if specified
        if time_in_force is not None:
            bybit_tif = self.TIME_IN_FORCE_MAP.get(time_in_force)
            if bybit_tif:
                params["time_in_force"] = bybit_tif
        
        # Add any additional parameters
        params.update(kwargs)
        
        # Send the order
        return await self._request(
            method="POST",
            endpoint="/v2/private/order/create",
            params=params,
            api_auth=True,
            rate_limit_key="create_order"
        )
    
    async def cancel_order(self, symbol: str, order_id: Optional[str] = None, order_link_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Cancel an order.
        
        Args:
            symbol: Trading pair symbol
            order_id: Optional order ID
            order_link_id: Optional order link ID
            
        Returns:
            Cancellation result
        """
        if not order_id and not order_link_id:
            raise ValueError("Either order_id or order_link_id must be provided")
        
        params = {"symbol": symbol}
        
        if order_id:
            params["order_id"] = order_id
        
        if order_link_id:
            params["order_link_id"] = order_link_id
        
        return await self._request(
            method="POST",
            endpoint="/v2/private/order/cancel",
            params=params,
            api_auth=True,
            rate_limit_key="cancel_order"
        )
    
    async def cancel_all_orders(self, symbol: str) -> Dict[str, Any]:
        """
        Cancel all active orders for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Cancellation result
        """
        params = {"symbol": symbol}
        
        return await self._request(
            method="POST",
            endpoint="/v2/private/order/cancelAll",
            params=params,
            api_auth=True,
            rate_limit_key="cancel_all_orders"
        )
    
    async def get_order(
        self,
        symbol: str,
        order_id: Optional[str] = None,
        order_link_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get order information.
        
        Args:
            symbol: Trading pair symbol
            order_id: Optional order ID
            order_link_id: Optional order link ID
            
        Returns:
            Order information
        """
        if not order_id and not order_link_id:
            raise ValueError("Either order_id or order_link_id must be provided")
        
        params = {"symbol": symbol}
        
        if order_id:
            params["order_id"] = order_id
        
        if order_link_id:
            params["order_link_id"] = order_link_id
        
        return await self._request(
            method="GET",
            endpoint="/v2/private/order",
            params=params,
            api_auth=True,
            rate_limit_key="get_order"
        )
    
    async def get_open_orders(self, symbol: str) -> List[Dict[str, Any]]:
        """
        Get open orders for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            List of open orders
        """
        params = {"symbol": symbol}
        
        return await self._request(
            method="GET",
            endpoint="/v2/private/order/list",
            params=params,
            api_auth=True,
            rate_limit_key="get_open_orders"
        )
    
    async def get_order_history(
        self,
        symbol: str,
        limit: int = 50,
        page: int = 1
    ) -> Dict[str, Any]:
        """
        Get order history.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of orders to return
            page: Page number
            
        Returns:
            Order history
        """
        params = {
            "symbol": symbol,
            "limit": min(limit, 50),  # Bybit limit is 50
            "page": page
        }
        
        return await self._request(
            method="GET",
            endpoint="/v2/private/order/list",
            params=params,
            api_auth=True,
            rate_limit_key="get_order_history"
        )
    
    async def get_trade_history(
        self,
        symbol: str,
        limit: int = 50,
        page: int = 1
    ) -> Dict[str, Any]:
        """
        Get trade/execution history.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of trades to return
            page: Page number
            
        Returns:
            Trade history
        """
        params = {
            "symbol": symbol,
            "limit": min(limit, 50),  # Bybit limit is 50
            "page": page
        }
        
        return await self._request(
            method="GET",
            endpoint="/v2/private/execution/list",
            params=params,
            api_auth=True,
            rate_limit_key="get_trade_history"
        )
    
    async def withdraw(
        self,
        coin: str,
        address: str,
        amount: float,
        tag: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make a withdrawal.
        
        IMPORTANT: This is a sensitive operation that should be
        protected by additional security measures.
        
        Args:
            coin: Coin being withdrawn
            address: Withdrawal address
            amount: Amount to withdraw
            tag: Optional address tag
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
        
        params = {
            "coin": coin,
            "address": address,
            "amount": str(amount)
        }
        
        if tag:
            params["tag"] = tag
        
        # Add any additional parameters
        params.update(kwargs)
        
        return await self._request(
            method="POST",
            endpoint="/v2/private/wallet/withdraw/apply",
            params=params,
            api_auth=True,
            rate_limit_key="withdraw"
        )
    
    async def get_withdraw_history(
        self,
        coin: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get withdrawal history.
        
        Args:
            coin: Optional coin filter
            start_time: Optional start time in seconds
            end_time: Optional end time in seconds
            limit: Maximum number of records to return
            
        Returns:
            Withdrawal history
        """
        params = {"limit": min(limit, 50)}  # Bybit limit is 50
        
        if coin:
            params["coin"] = coin
        
        if start_time:
            params["start_time"] = start_time
        
        if end_time:
            params["end_time"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/v2/private/wallet/withdraw/list",
            params=params,
            api_auth=True,
            rate_limit_key="get_withdraw_history"
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
