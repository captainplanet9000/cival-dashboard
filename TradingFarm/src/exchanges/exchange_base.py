"""
Exchange Base Module

Defines the base classes and interfaces for exchange connectivity.
Provides the foundation for a unified interface across multiple exchanges.
"""

from abc import ABC, abstractmethod
from enum import Enum
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union, Any, Callable
import json
import aiohttp
import asyncio
import hmac
import hashlib
import time
import logging
from urllib.parse import urlencode


class OrderType(Enum):
    """Types of orders that can be placed on exchanges."""
    MARKET = 'market'
    LIMIT = 'limit'
    STOP_LOSS = 'stop_loss'
    STOP_LOSS_LIMIT = 'stop_loss_limit'
    TAKE_PROFIT = 'take_profit'
    TAKE_PROFIT_LIMIT = 'take_profit_limit'
    LIMIT_MAKER = 'limit_maker'
    OCO = 'oco'  # One-Cancels-Other order


class OrderSide(Enum):
    """Side of an order (buy or sell)."""
    BUY = 'buy'
    SELL = 'sell'


class TimeInForce(Enum):
    """Time in force policies for orders."""
    GTC = 'GTC'  # Good Till Cancelled
    IOC = 'IOC'  # Immediate or Cancel
    FOK = 'FOK'  # Fill or Kill
    GTX = 'GTX'  # Good Till Crossing


class OrderStatus(Enum):
    """Status of an order."""
    NEW = 'new'
    PARTIALLY_FILLED = 'partially_filled'
    FILLED = 'filled'
    CANCELED = 'canceled'
    PENDING_CANCEL = 'pending_cancel'
    REJECTED = 'rejected'
    EXPIRED = 'expired'


class ExchangeCredentials:
    """
    Secure container for exchange API credentials.
    
    Handles encryption and secure storage of API keys.
    """
    
    def __init__(
        self,
        api_key: str,
        api_secret: str,
        passphrase: Optional[str] = None,
        description: str = "",
        encrypted: bool = False,
        key_manager = None
    ):
        """
        Initialize exchange credentials.
        
        Args:
            api_key: API key
            api_secret: API secret
            passphrase: Optional passphrase (required for some exchanges)
            description: Optional description of these credentials
            encrypted: Whether the credentials are already encrypted
            key_manager: Optional APIKeyManager instance for encryption/decryption
        """
        self.description = description
        self._key_manager = key_manager
        
        if encrypted:
            self._api_key = api_key
            self._api_secret = api_secret
            self._passphrase = passphrase
        else:
            # Encrypt credentials if key manager is available
            if key_manager:
                self._api_key = key_manager.encrypt(api_key)
                self._api_secret = key_manager.encrypt(api_secret)
                self._passphrase = key_manager.encrypt(passphrase) if passphrase else None
            else:
                # Store in plaintext if no key manager (not recommended for production)
                self._api_key = api_key
                self._api_secret = api_secret
                self._passphrase = passphrase
    
    def get_api_key(self) -> str:
        """
        Get the API key (decrypted if necessary).
        
        Returns:
            API key
        """
        if self._key_manager:
            return self._key_manager.decrypt(self._api_key)
        return self._api_key
    
    def get_api_secret(self) -> str:
        """
        Get the API secret (decrypted if necessary).
        
        Returns:
            API secret
        """
        if self._key_manager:
            return self._key_manager.decrypt(self._api_secret)
        return self._api_secret
    
    def get_passphrase(self) -> Optional[str]:
        """
        Get the passphrase (decrypted if necessary).
        
        Returns:
            Passphrase or None
        """
        if not self._passphrase:
            return None
        
        if self._key_manager:
            return self._key_manager.decrypt(self._passphrase)
        return self._passphrase
    
    def to_dict(self, include_secrets: bool = False) -> Dict[str, Any]:
        """
        Convert credentials to dictionary.
        
        Args:
            include_secrets: Whether to include secret information
            
        Returns:
            Dictionary with credential information
        """
        result = {
            'description': self.description
        }
        
        if include_secrets:
            result.update({
                'api_key': self._api_key,
                'api_secret': self._api_secret,
                'passphrase': self._passphrase,
                'encrypted': self._key_manager is not None
            })
        
        return result


class OrderBook:
    """
    Order book for a trading pair.
    
    Contains bids and asks with prices and quantities.
    """
    
    def __init__(
        self,
        symbol: str,
        bids: List[Tuple[float, float]],
        asks: List[Tuple[float, float]],
        timestamp: Optional[int] = None
    ):
        """
        Initialize an order book.
        
        Args:
            symbol: Trading pair symbol
            bids: List of (price, quantity) tuples for buy orders
            asks: List of (price, quantity) tuples for sell orders
            timestamp: Optional timestamp of the order book
        """
        self.symbol = symbol
        self.bids = bids  # sorted by price descending
        self.asks = asks  # sorted by price ascending
        self.timestamp = timestamp or int(time.time() * 1000)
    
    @property
    def best_bid(self) -> Optional[Tuple[float, float]]:
        """
        Get the best bid (highest buy price).
        
        Returns:
            (price, quantity) tuple or None
        """
        return self.bids[0] if self.bids else None
    
    @property
    def best_ask(self) -> Optional[Tuple[float, float]]:
        """
        Get the best ask (lowest sell price).
        
        Returns:
            (price, quantity) tuple or None
        """
        return self.asks[0] if self.asks else None
    
    @property
    def spread(self) -> float:
        """
        Get the bid-ask spread.
        
        Returns:
            Spread as absolute value
        """
        if not self.best_bid or not self.best_ask:
            return float('inf')
        return self.best_ask[0] - self.best_bid[0]
    
    @property
    def spread_percent(self) -> float:
        """
        Get the bid-ask spread as a percentage.
        
        Returns:
            Spread as a percentage
        """
        if not self.best_bid or not self.best_ask:
            return float('inf')
        mid_price = (self.best_ask[0] + self.best_bid[0]) / 2
        return (self.spread / mid_price) * 100
    
    def to_dataframe(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Convert order book to pandas DataFrames.
        
        Returns:
            Tuple of (bids_df, asks_df)
        """
        bids_df = pd.DataFrame(self.bids, columns=['price', 'quantity'])
        asks_df = pd.DataFrame(self.asks, columns=['price', 'quantity'])
        return bids_df, asks_df
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert order book to dictionary.
        
        Returns:
            Dictionary with order book data
        """
        return {
            'symbol': self.symbol,
            'bids': self.bids,
            'asks': self.asks,
            'timestamp': self.timestamp
        }


class AccountBalance:
    """
    Account balance information for an exchange.
    
    Contains free and locked balances for each asset.
    """
    
    def __init__(
        self,
        exchange: str,
        balances: Dict[str, Dict[str, float]],
        timestamp: Optional[int] = None
    ):
        """
        Initialize account balance.
        
        Args:
            exchange: Exchange name
            balances: Dictionary mapping asset symbols to {'free': amount, 'locked': amount}
            timestamp: Optional timestamp of the balance
        """
        self.exchange = exchange
        self.balances = balances
        self.timestamp = timestamp or int(time.time() * 1000)
    
    def get_total_balance(self, asset: str) -> float:
        """
        Get the total balance for an asset.
        
        Args:
            asset: Asset symbol
            
        Returns:
            Total balance (free + locked)
        """
        if asset not in self.balances:
            return 0.0
        
        return self.balances[asset].get('free', 0.0) + self.balances[asset].get('locked', 0.0)
    
    def get_free_balance(self, asset: str) -> float:
        """
        Get the free (available) balance for an asset.
        
        Args:
            asset: Asset symbol
            
        Returns:
            Free balance
        """
        if asset not in self.balances:
            return 0.0
        
        return self.balances[asset].get('free', 0.0)
    
    def get_locked_balance(self, asset: str) -> float:
        """
        Get the locked (in orders) balance for an asset.
        
        Args:
            asset: Asset symbol
            
        Returns:
            Locked balance
        """
        if asset not in self.balances:
            return 0.0
        
        return self.balances[asset].get('locked', 0.0)
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert balances to pandas DataFrame.
        
        Returns:
            DataFrame with balance information
        """
        data = []
        for asset, amounts in self.balances.items():
            free = amounts.get('free', 0.0)
            locked = amounts.get('locked', 0.0)
            data.append({
                'asset': asset,
                'free': free,
                'locked': locked,
                'total': free + locked
            })
        
        return pd.DataFrame(data)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert account balance to dictionary.
        
        Returns:
            Dictionary with balance data
        """
        return {
            'exchange': self.exchange,
            'balances': self.balances,
            'timestamp': self.timestamp
        }


class Exchange(ABC):
    """
    Base class for exchange connectivity.
    
    Provides a unified interface for interacting with different exchanges.
    """
    
    def __init__(
        self,
        name: str,
        credentials: Optional[ExchangeCredentials] = None,
        testnet: bool = False,
        rate_limiter = None,
        session: Optional[aiohttp.ClientSession] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialize an exchange connection.
        
        Args:
            name: Exchange name
            credentials: Optional API credentials
            testnet: Whether to use the testnet/sandbox
            rate_limiter: Optional rate limiter
            session: Optional aiohttp session
            logger: Optional logger
        """
        self.name = name
        self.credentials = credentials
        self.testnet = testnet
        self.rate_limiter = rate_limiter
        self._session = session
        self.logger = logger or logging.getLogger(f"exchange.{name}")
        
        # Default settings
        self.timeout = 30.0  # seconds
        self.retry_attempts = 3
        self.retry_delay = 1.0  # seconds
        
        # Exchange connection status
        self.connected = False
        self.last_connection_time = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """
        Get or create an aiohttp session.
        
        Returns:
            aiohttp ClientSession
        """
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self) -> None:
        """Close the connection and resources."""
        if self._session and not self._session.closed:
            await self._session.close()
        self.connected = False
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Dict[str, Any] = None,
        data: Dict[str, Any] = None,
        headers: Dict[str, str] = None,
        signed: bool = False,
        api_key_required: bool = False,
        rate_limit_key: str = None
    ) -> Dict[str, Any]:
        """
        Send a request to the exchange API.
        
        Args:
            method: HTTP method (GET, POST, DELETE, etc.)
            endpoint: API endpoint
            params: Optional query parameters
            data: Optional request data
            headers: Optional request headers
            signed: Whether the request needs to be signed
            api_key_required: Whether the API key is required
            rate_limit_key: Optional key for rate limiting
            
        Returns:
            Response data as dictionary
        """
        # Check for API credentials
        if (signed or api_key_required) and not self.credentials:
            raise ValueError(f"API credentials required for {endpoint}")
        
        # Apply rate limiting if available
        if self.rate_limiter and rate_limit_key:
            await self.rate_limiter.acquire(rate_limit_key)
        
        # Prepare full URL and headers
        url = self._get_url(endpoint)
        headers = headers or {}
        
        if api_key_required:
            self._add_api_key_header(headers)
        
        if signed:
            self._sign_request(method, endpoint, params, data, headers)
        
        # Make the request with retries
        session = await self._get_session()
        
        for attempt in range(1, self.retry_attempts + 1):
            try:
                async with session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=data,
                    headers=headers,
                    timeout=self.timeout
                ) as response:
                    response_data = await response.json()
                    
                    # Check for error responses
                    if response.status >= 400:
                        error_msg = f"API error: {response.status} - {response_data}"
                        self.logger.error(error_msg)
                        
                        # Some exchanges have specific error codes to handle
                        await self._handle_error(response.status, response_data)
                        
                        if attempt < self.retry_attempts:
                            retry_delay = self.retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                            self.logger.info(f"Retrying in {retry_delay}s (attempt {attempt}/{self.retry_attempts})")
                            await asyncio.sleep(retry_delay)
                            continue
                        
                        raise Exception(error_msg)
                    
                    return response_data
                    
            except aiohttp.ClientError as e:
                error_msg = f"Request error: {str(e)}"
                self.logger.error(error_msg)
                
                if attempt < self.retry_attempts:
                    retry_delay = self.retry_delay * (2 ** (attempt - 1))
                    self.logger.info(f"Retrying in {retry_delay}s (attempt {attempt}/{self.retry_attempts})")
                    await asyncio.sleep(retry_delay)
                else:
                    raise Exception(error_msg)
        
        raise Exception("Max retry attempts reached")
    
    @abstractmethod
    def _get_url(self, endpoint: str) -> str:
        """
        Get the full URL for an API endpoint.
        
        Args:
            endpoint: API endpoint
            
        Returns:
            Full URL
        """
        pass
    
    @abstractmethod
    def _add_api_key_header(self, headers: Dict[str, str]) -> None:
        """
        Add the API key to request headers.
        
        Args:
            headers: Request headers to modify
        """
        pass
    
    @abstractmethod
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
        pass
    
    async def _handle_error(self, status_code: int, response_data: Dict[str, Any]) -> None:
        """
        Handle API error responses.
        
        Args:
            status_code: HTTP status code
            response_data: Response data
        """
        # Default implementation does nothing
        pass
    
    async def test_connection(self) -> bool:
        """
        Test the connection to the exchange.
        
        Returns:
            True if connected successfully, False otherwise
        """
        try:
            await self._ping()
            self.connected = True
            self.last_connection_time = time.time()
            return True
        except Exception as e:
            self.logger.error(f"Connection test failed: {str(e)}")
            self.connected = False
            return False
    
    @abstractmethod
    async def _ping(self) -> Dict[str, Any]:
        """
        Ping the exchange API to check connectivity.
        
        Returns:
            Response data
        """
        pass
    
    @abstractmethod
    async def get_exchange_info(self) -> Dict[str, Any]:
        """
        Get exchange information.
        
        Returns:
            Exchange information including trading pairs, limits, etc.
        """
        pass
    
    @abstractmethod
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """
        Get current price ticker for a symbol.
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Ticker data
        """
        pass
    
    @abstractmethod
    async def get_order_book(self, symbol: str, limit: int = 100) -> OrderBook:
        """
        Get order book for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of bids/asks to return
            
        Returns:
            OrderBook object
        """
        pass
    
    @abstractmethod
    async def get_recent_trades(
        self,
        symbol: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get recent trades for a symbol.
        
        Args:
            symbol: Trading pair symbol
            limit: Maximum number of trades to return
            
        Returns:
            List of recent trades
        """
        pass
    
    @abstractmethod
    async def get_historical_trades(
        self,
        symbol: str,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict[str, Any]]:
        """
        Get historical trades for a symbol.
        
        Args:
            symbol: Trading pair symbol
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Maximum number of trades to return
            
        Returns:
            List of historical trades
        """
        pass
    
    @abstractmethod
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
            limit: Maximum number of klines to return
            
        Returns:
            List of klines
        """
        pass
    
    @abstractmethod
    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get account information.
        
        Returns:
            Account information including balances
        """
        pass
    
    @abstractmethod
    async def get_account_balance(self) -> AccountBalance:
        """
        Get account balances.
        
        Returns:
            AccountBalance object
        """
        pass
    
    @abstractmethod
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
        pass
    
    @abstractmethod
    async def cancel_order(
        self,
        symbol: str,
        order_id: str
    ) -> Dict[str, Any]:
        """
        Cancel an order.
        
        Args:
            symbol: Trading pair symbol
            order_id: Order ID
            
        Returns:
            Cancellation information
        """
        pass
    
    @abstractmethod
    async def get_order(
        self,
        symbol: str,
        order_id: str
    ) -> Dict[str, Any]:
        """
        Get order information.
        
        Args:
            symbol: Trading pair symbol
            order_id: Order ID
            
        Returns:
            Order information
        """
        pass
    
    @abstractmethod
    async def get_open_orders(
        self,
        symbol: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get open orders.
        
        Args:
            symbol: Optional trading pair symbol
            
        Returns:
            List of open orders
        """
        pass
    
    @abstractmethod
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
            limit: Maximum number of orders to return
            
        Returns:
            List of orders
        """
        pass
    
    @abstractmethod
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
            limit: Maximum number of trades to return
            
        Returns:
            List of trades
        """
        pass
    
    @abstractmethod
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
        pass
    
    @abstractmethod
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
        pass
    
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
        # This method is intentionally not abstract to highlight the security concern
        raise NotImplementedError(
            "Withdrawal functionality is disabled by default. "
            "Override this method with necessary security checks."
        )
