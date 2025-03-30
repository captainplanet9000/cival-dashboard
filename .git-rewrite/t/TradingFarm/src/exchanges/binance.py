"""
Binance Exchange Module

Implements the Exchange interface for Binance cryptocurrency exchange.
Provides functionality for market data, account information, and trading.
"""

import time
import hmac
import hashlib
import json
import logging
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from urllib.parse import urlencode
import aiohttp

from .exchange_base import (
    Exchange, ExchangeCredentials, OrderType, OrderSide,
    TimeInForce, OrderStatus, OrderBook, AccountBalance
)
from .rate_limiter import RateLimiter


class BinanceExchange(Exchange):
    """
    Binance exchange implementation.
    
    Implements the Exchange interface for the Binance cryptocurrency exchange.
    """
    
    # Exchange identifier
    EXCHANGE_NAME = "binance"
    
    # API endpoints
    BASE_URL = "https://api.binance.com"
    BASE_URL_TESTNET = "https://testnet.binance.vision"
    
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
        Initialize the Binance exchange.
        
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
        
        # API configuration
        self.recv_window = 5000  # milliseconds
        
        # Cache for exchange information
        self._exchange_info = None
        self._exchange_info_timestamp = 0
        self._exchange_info_ttl = 3600  # 1 hour
        
        # Symbol-specific information cache
        self._symbol_info = {}
    
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
    
    def _add_api_key_header(self, headers: Dict[str, str]) -> None:
        """
        Add the API key to request headers.
        
        Args:
            headers: Request headers to modify
        """
        if not self.credentials:
            raise ValueError("API credentials required")
        
        headers["X-MBX-APIKEY"] = self.credentials.get_api_key()
    
    def _sign_request(
        self,
        method: str,
        endpoint: str,
        params: Dict[str, Any],
        data: Dict[str, Any],
        headers: Dict[str, str]
    ) -> None:
        """
        Sign a request with the API secret.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            params: Query parameters
            data: Request data
            headers: Request headers to modify
        """
        if not self.credentials:
            raise ValueError("API credentials required")
        
        # Add timestamp and recvWindow parameters
        timestamp = int(time.time() * 1000)
        request_params = params.copy() if params else {}
        request_params['timestamp'] = timestamp
        request_params['recvWindow'] = self.recv_window
        
        # For POST requests, merge data into parameters for signing
        if data:
            for key, value in data.items():
                request_params[key] = value
        
        # Create the signature
        query_string = urlencode(request_params)
        signature = hmac.new(
            self.credentials.get_api_secret().encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Add signature to parameters
        request_params['signature'] = signature
        
        # Update the parameters
        if method == 'GET':
            # For GET requests, update the params
            if params is not None:
                params.update(request_params)
            else:
                params = request_params
        else:
            # For other methods, update the data
            if params is not None:
                params.update(request_params)
            else:
                params = request_params
    
    async def _ping(self) -> Dict[str, Any]:
        """
        Ping the Binance API to check connectivity.
        
        Returns:
            Response data
        """
        return await self._request(
            method="GET",
            endpoint="/api/v3/ping",
            rate_limit_key="ping"
        )
    
    async def get_exchange_info(self) -> Dict[str, Any]:
        """
        Get exchange information including trading pairs, limits, etc.
        
        Returns:
            Exchange information
        """
        # Check if cached info is still valid
        current_time = time.time()
        if (self._exchange_info and 
            current_time - self._exchange_info_timestamp < self._exchange_info_ttl):
            return self._exchange_info
        
        # Get fresh exchange info
        result = await self._request(
            method="GET",
            endpoint="/api/v3/exchangeInfo",
            rate_limit_key="exchange_info"
        )
        
        # Cache the result
        self._exchange_info = result
        self._exchange_info_timestamp = current_time
        
        # Parse symbols and update symbol info cache
        if 'symbols' in result:
            for symbol_data in result['symbols']:
                symbol = symbol_data['symbol']
                self._symbol_info[symbol] = symbol_data
        
        return result
    
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get current price ticker for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Ticker data
        """
        return await self._request(
            method="GET",
            endpoint="/api/v3/ticker/24hr",
            params={"symbol": symbol},
            rate_limit_key="ticker"
        )
    
    async def get_order_book(self, symbol: str, limit: int = 100) -> OrderBook:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of bids/asks to return (default: 100, max: 5000)
            
        Returns:
            OrderBook object
        """
        # Validate and adjust limit
        valid_limits = [5, 10, 20, 50, 100, 500, 1000, 5000]
        if limit not in valid_limits:
            # Find the closest valid limit
            limit = min(valid_limits, key=lambda x: abs(x - limit))
        
        result = await self._request(
            method="GET",
            endpoint="/api/v3/depth",
            params={"symbol": symbol, "limit": limit},
            rate_limit_key="order_book"
        )
        
        # Parse the response
        bids = [(float(price), float(qty)) for price, qty in result.get('bids', [])]
        asks = [(float(price), float(qty)) for price, qty in result.get('asks', [])]
        
        return OrderBook(
            symbol=symbol,
            bids=bids,
            asks=asks,
            timestamp=result.get('lastUpdateId')
        )
    
    async def get_recent_trades(self, symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent trades for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of trades to return (default: 100, max: 1000)
            
        Returns:
            List of recent trades
        """
        # Adjust limit if needed
        limit = min(max(1, limit), 1000)
        
        return await self._request(
            method="GET",
            endpoint="/api/v3/trades",
            params={"symbol": symbol, "limit": limit},
            rate_limit_key="recent_trades"
        )
    
    async def get_historical_trades(
        self,
        symbol: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Get historical trades for a symbol.
        
        Note: This endpoint requires API key.
        
        Args:
            symbol: Trading pair symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of trades to return (default: 500, max: 1000)
            
        Returns:
            List of historical trades
        """
        # Adjust limit if needed
        limit = min(max(1, limit), 1000)
        
        params = {"symbol": symbol, "limit": limit}
        
        if start_time:
            params["startTime"] = start_time
        
        if end_time:
            params["endTime"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/api/v3/historicalTrades",
            params=params,
            api_key_required=True,
            rate_limit_key="historical_trades"
        )
    
    async def get_klines(
        self,
        symbol: str,
        interval: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[List[Any]]:
        """
        Get klines/candlesticks for a symbol.
        
        Args:
            symbol: Trading pair symbol
            interval: Kline interval (e.g., "1m", "1h", "1d")
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of klines to return (default: 500, max: 1000)
            
        Returns:
            List of klines
        """
        # Adjust limit if needed
        limit = min(max(1, limit), 1000)
        
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        
        if start_time:
            params["startTime"] = start_time
        
        if end_time:
            params["endTime"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/api/v3/klines",
            params=params,
            rate_limit_key="klines"
        )
    
    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get account information.
        
        Returns:
            Account information including balances
        """
        return await self._request(
            method="GET",
            endpoint="/api/v3/account",
            signed=True,
            rate_limit_key="account"
        )
    
    async def get_account_balance(self) -> AccountBalance:
        """
        Get account balances.
        
        Returns:
            AccountBalance object
        """
        account_info = await self.get_account_info()
        
        balances = {}
        for balance in account_info.get('balances', []):
            asset = balance.get('asset')
            free = float(balance.get('free', 0))
            locked = float(balance.get('locked', 0))
            
            # Only include assets with non-zero balance
            if free > 0 or locked > 0:
                balances[asset] = {
                    'free': free,
                    'locked': locked
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
        quantity: float,
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
            quantity: Order quantity
            price: Order price (required for LIMIT orders)
            time_in_force: Time in force policy (required for LIMIT orders)
            **kwargs: Additional arguments
            
        Returns:
            Order information
        """
        # Ensure symbol, side, and type are valid
        if not symbol:
            raise ValueError("Symbol is required")
        
        if not isinstance(side, OrderSide):
            raise ValueError(f"Invalid order side: {side}")
        
        if not isinstance(order_type, OrderType):
            raise ValueError(f"Invalid order type: {order_type}")
        
        # Prepare order parameters
        params = {
            "symbol": symbol,
            "side": side.value.upper(),
            "type": order_type.value.upper(),
            "quantity": quantity
        }
        
        # Add price and timeInForce for LIMIT orders
        if order_type == OrderType.LIMIT:
            if price is None:
                raise ValueError("Price is required for LIMIT orders")
            
            if time_in_force is None:
                raise ValueError("TimeInForce is required for LIMIT orders")
            
            params["price"] = price
            params["timeInForce"] = time_in_force.value
        
        # Add additional parameters
        for key, value in kwargs.items():
            params[key] = value
        
        # Create the order
        return await self._request(
            method="POST",
            endpoint="/api/v3/order",
            params=params,
            signed=True,
            rate_limit_key="order"
        )
    
    async def cancel_order(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """
        Cancel an order.
        
        Args:
            symbol: Trading pair symbol
            order_id: Order ID
            
        Returns:
            Cancellation information
        """
        return await self._request(
            method="DELETE",
            endpoint="/api/v3/order",
            params={"symbol": symbol, "orderId": order_id},
            signed=True,
            rate_limit_key="cancel_order"
        )
    
    async def get_order(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """
        Get order information.
        
        Args:
            symbol: Trading pair symbol
            order_id: Order ID
            
        Returns:
            Order information
        """
        return await self._request(
            method="GET",
            endpoint="/api/v3/order",
            params={"symbol": symbol, "orderId": order_id},
            signed=True,
            rate_limit_key="get_order"
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
            endpoint="/api/v3/openOrders",
            params=params,
            signed=True,
            rate_limit_key="open_orders"
        )
    
    async def get_order_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Get order history.
        
        Args:
            symbol: Optional trading pair symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of orders to return (default: 500, max: 1000)
            
        Returns:
            List of orders
        """
        # Symbol is required for this endpoint
        if not symbol:
            raise ValueError("Symbol is required")
        
        # Adjust limit if needed
        limit = min(max(1, limit), 1000)
        
        params = {"symbol": symbol, "limit": limit}
        
        if start_time:
            params["startTime"] = start_time
        
        if end_time:
            params["endTime"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/api/v3/allOrders",
            params=params,
            signed=True,
            rate_limit_key="order_history"
        )
    
    async def get_trade_history(
        self,
        symbol: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Get trade history.
        
        Args:
            symbol: Optional trading pair symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of trades to return (default: 500, max: 1000)
            
        Returns:
            List of trades
        """
        # Symbol is required for this endpoint
        if not symbol:
            raise ValueError("Symbol is required")
        
        # Adjust limit if needed
        limit = min(max(1, limit), 1000)
        
        params = {"symbol": symbol, "limit": limit}
        
        if start_time:
            params["startTime"] = start_time
        
        if end_time:
            params["endTime"] = end_time
        
        return await self._request(
            method="GET",
            endpoint="/api/v3/myTrades",
            params=params,
            signed=True,
            rate_limit_key="trade_history"
        )
    
    async def get_deposit_history(
        self,
        asset: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Get deposit history.
        
        Args:
            asset: Optional asset symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of deposits to return
            
        Returns:
            List of deposits
        """
        params = {}
        
        if asset:
            params["coin"] = asset
        
        if start_time:
            params["startTime"] = start_time
        
        if end_time:
            params["endTime"] = end_time
        
        if limit:
            params["limit"] = min(max(1, limit), 1000)
        
        return await self._request(
            method="GET",
            endpoint="/sapi/v1/capital/deposit/hisrec",
            params=params,
            signed=True,
            rate_limit_key="deposit_history"
        )
    
    async def get_withdrawal_history(
        self,
        asset: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Get withdrawal history.
        
        Args:
            asset: Optional asset symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of withdrawals to return
            
        Returns:
            List of withdrawals
        """
        params = {}
        
        if asset:
            params["coin"] = asset
        
        if start_time:
            params["startTime"] = start_time
        
        if end_time:
            params["endTime"] = end_time
        
        if limit:
            params["limit"] = min(max(1, limit), 1000)
        
        return await self._request(
            method="GET",
            endpoint="/sapi/v1/capital/withdraw/history",
            params=params,
            signed=True,
            rate_limit_key="withdrawal_history"
        )
    
    async def withdraw(
        self,
        asset: str,
        address: str,
        amount: float,
        network: Optional[str] = None,
        tag: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Withdraw an asset.
        
        IMPORTANT: This is a sensitive operation that should be
        protected by additional security measures.
        
        Args:
            asset: Asset symbol
            address: Withdrawal address
            amount: Withdrawal amount
            network: Optional network
            tag: Optional address tag
            **kwargs: Additional arguments
            
        Returns:
            Withdrawal information
        """
        # Binance withdrawal endpoint requires additional security checks
        # This implementation deliberately adds extra checks
        
        # Ensure this is not being called accidentally
        if not hasattr(self, '_withdrawal_confirmed') or not self._withdrawal_confirmed:
            raise SecurityError(
                "Withdrawal functionality requires explicit confirmation. "
                "This is a security measure to prevent accidental withdrawals."
            )
        
        params = {
            "coin": asset,
            "address": address,
            "amount": amount
        }
        
        if network:
            params["network"] = network
        
        if tag:
            params["addressTag"] = tag
        
        # Add any additional parameters
        for key, value in kwargs.items():
            params[key] = value
        
        return await self._request(
            method="POST",
            endpoint="/sapi/v1/capital/withdraw/apply",
            params=params,
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
