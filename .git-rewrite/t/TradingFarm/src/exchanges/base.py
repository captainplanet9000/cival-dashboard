"""
Base exchange client for the TradingFarm platform.
Provides a unified interface for interacting with various cryptocurrency exchanges.
"""

import abc
import asyncio
import logging
import time
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Union

import aiohttp

logger = logging.getLogger(__name__)

class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"

class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TRAILING_STOP = "trailing_stop"

class OrderTimeInForce(str, Enum):
    GTC = "gtc"  # Good till canceled
    IOC = "ioc"  # Immediate or cancel
    FOK = "fok"  # Fill or kill
    GTD = "gtd"  # Good till date

class OrderStatus(str, Enum):
    NEW = "new"
    PARTIALLY_FILLED = "partially_filled"
    FILLED = "filled"
    CANCELED = "canceled"
    PENDING_CANCEL = "pending_cancel"
    REJECTED = "rejected"
    EXPIRED = "expired"

class MarketType(str, Enum):
    SPOT = "spot"
    MARGIN = "margin"
    FUTURES = "futures"
    PERPETUAL = "perpetual"
    OPTIONS = "options"

class ExchangeConnectionStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"

class MarketData:
    """Container for standardized market data across exchanges."""
    
    def __init__(
        self,
        symbol: str,
        exchange: str,
        timestamp: int,
        bid: float = None,
        ask: float = None,
        last: float = None,
        volume_24h: float = None,
        high_24h: float = None,
        low_24h: float = None,
        open_24h: float = None,
        vwap_24h: float = None,
        market_type: MarketType = MarketType.SPOT,
        extra: Dict[str, Any] = None
    ):
        self.symbol = symbol
        self.exchange = exchange
        self.timestamp = timestamp
        self.bid = bid
        self.ask = ask
        self.last = last
        self.volume_24h = volume_24h
        self.high_24h = high_24h
        self.low_24h = low_24h
        self.open_24h = open_24h
        self.vwap_24h = vwap_24h
        self.market_type = market_type
        self.extra = extra or {}
        
    @property
    def mid_price(self) -> Optional[float]:
        """Calculate the mid price if bid and ask are available."""
        if self.bid is not None and self.ask is not None:
            return (self.bid + self.ask) / 2
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the market data to a dictionary."""
        return {
            "symbol": self.symbol,
            "exchange": self.exchange,
            "timestamp": self.timestamp,
            "bid": self.bid,
            "ask": self.ask,
            "last": self.last,
            "volume_24h": self.volume_24h,
            "high_24h": self.high_24h,
            "low_24h": self.low_24h,
            "open_24h": self.open_24h,
            "vwap_24h": self.vwap_24h,
            "market_type": self.market_type.value,
            "extra": self.extra
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MarketData":
        """Create a MarketData object from a dictionary."""
        market_type = data.get("market_type", MarketType.SPOT.value)
        if isinstance(market_type, str):
            market_type = MarketType(market_type)
            
        return cls(
            symbol=data["symbol"],
            exchange=data["exchange"],
            timestamp=data["timestamp"],
            bid=data.get("bid"),
            ask=data.get("ask"),
            last=data.get("last"),
            volume_24h=data.get("volume_24h"),
            high_24h=data.get("high_24h"),
            low_24h=data.get("low_24h"),
            open_24h=data.get("open_24h"),
            vwap_24h=data.get("vwap_24h"),
            market_type=market_type,
            extra=data.get("extra", {})
        )

class Order:
    """Unified order object for all exchanges."""
    
    def __init__(
        self,
        id: str,
        symbol: str,
        exchange: str,
        side: OrderSide,
        type: OrderType,
        price: Optional[float] = None,
        amount: float = None,
        filled_amount: float = 0.0,
        status: OrderStatus = OrderStatus.NEW,
        timestamp: int = None,
        time_in_force: OrderTimeInForce = OrderTimeInForce.GTC,
        stop_price: Optional[float] = None,
        client_order_id: Optional[str] = None,
        extra: Dict[str, Any] = None
    ):
        self.id = id
        self.symbol = symbol
        self.exchange = exchange
        self.side = side if isinstance(side, OrderSide) else OrderSide(side)
        self.type = type if isinstance(type, OrderType) else OrderType(type)
        self.price = price
        self.amount = amount
        self.filled_amount = filled_amount
        self.status = status if isinstance(status, OrderStatus) else OrderStatus(status)
        self.timestamp = timestamp or int(time.time() * 1000)
        self.time_in_force = time_in_force if isinstance(time_in_force, OrderTimeInForce) else OrderTimeInForce(time_in_force)
        self.stop_price = stop_price
        self.client_order_id = client_order_id
        self.extra = extra or {}
        
    @property
    def remaining_amount(self) -> float:
        """Calculate the remaining amount to be filled."""
        return self.amount - self.filled_amount
    
    @property
    def is_filled(self) -> bool:
        """Check if the order is completely filled."""
        return self.status == OrderStatus.FILLED
    
    @property
    def is_active(self) -> bool:
        """Check if the order is still active."""
        return self.status in [
            OrderStatus.NEW, 
            OrderStatus.PARTIALLY_FILLED
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the order to a dictionary."""
        return {
            "id": self.id,
            "symbol": self.symbol,
            "exchange": self.exchange,
            "side": self.side.value,
            "type": self.type.value,
            "price": self.price,
            "amount": self.amount,
            "filled_amount": self.filled_amount,
            "status": self.status.value,
            "timestamp": self.timestamp,
            "time_in_force": self.time_in_force.value,
            "stop_price": self.stop_price,
            "client_order_id": self.client_order_id,
            "extra": self.extra
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Order":
        """Create an Order object from a dictionary."""
        return cls(
            id=data["id"],
            symbol=data["symbol"],
            exchange=data["exchange"],
            side=OrderSide(data["side"]),
            type=OrderType(data["type"]),
            price=data.get("price"),
            amount=data.get("amount"),
            filled_amount=data.get("filled_amount", 0.0),
            status=OrderStatus(data["status"]),
            timestamp=data.get("timestamp"),
            time_in_force=OrderTimeInForce(data.get("time_in_force", OrderTimeInForce.GTC.value)),
            stop_price=data.get("stop_price"),
            client_order_id=data.get("client_order_id"),
            extra=data.get("extra", {})
        )

class Position:
    """Unified position object for all exchanges."""
    
    def __init__(
        self,
        symbol: str,
        exchange: str,
        side: OrderSide,
        amount: float,
        entry_price: float,
        liquidation_price: Optional[float] = None,
        margin_mode: str = "cross",
        leverage: float = 1.0,
        unrealized_pnl: Optional[float] = None,
        realized_pnl: Optional[float] = None,
        timestamp: int = None,
        extra: Dict[str, Any] = None
    ):
        self.symbol = symbol
        self.exchange = exchange
        self.side = side if isinstance(side, OrderSide) else OrderSide(side)
        self.amount = amount
        self.entry_price = entry_price
        self.liquidation_price = liquidation_price
        self.margin_mode = margin_mode
        self.leverage = leverage
        self.unrealized_pnl = unrealized_pnl
        self.realized_pnl = realized_pnl
        self.timestamp = timestamp or int(time.time() * 1000)
        self.extra = extra or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the position to a dictionary."""
        return {
            "symbol": self.symbol,
            "exchange": self.exchange,
            "side": self.side.value,
            "amount": self.amount,
            "entry_price": self.entry_price,
            "liquidation_price": self.liquidation_price,
            "margin_mode": self.margin_mode,
            "leverage": self.leverage,
            "unrealized_pnl": self.unrealized_pnl,
            "realized_pnl": self.realized_pnl,
            "timestamp": self.timestamp,
            "extra": self.extra
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Position":
        """Create a Position object from a dictionary."""
        return cls(
            symbol=data["symbol"],
            exchange=data["exchange"],
            side=OrderSide(data["side"]),
            amount=data["amount"],
            entry_price=data["entry_price"],
            liquidation_price=data.get("liquidation_price"),
            margin_mode=data.get("margin_mode", "cross"),
            leverage=data.get("leverage", 1.0),
            unrealized_pnl=data.get("unrealized_pnl"),
            realized_pnl=data.get("realized_pnl"),
            timestamp=data.get("timestamp"),
            extra=data.get("extra", {})
        )

class ExchangeClient(abc.ABC):
    """Abstract base class for all exchange clients."""
    
    def __init__(
        self,
        exchange_id: str,
        api_key: str = None,
        api_secret: str = None,
        passphrase: str = None,
        testnet: bool = False,
        timeout: int = 30000,
        rate_limit_retry: bool = True,
        rate_limit_retry_attempts: int = 3,
        throttle_rate: float = 0.2,  # 5 requests per second
    ):
        self.exchange_id = exchange_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.passphrase = passphrase
        self.testnet = testnet
        self.timeout = timeout
        self.rate_limit_retry = rate_limit_retry
        self.rate_limit_retry_attempts = rate_limit_retry_attempts
        self.throttle_rate = throttle_rate
        
        self._http_session = None
        self._ws_session = None
        self._ws_connections = {}
        self._last_request_time = 0
        self._status = ExchangeConnectionStatus.DISCONNECTED
        self._market_data_callbacks = []
        self._order_update_callbacks = []
        self._position_update_callbacks = []
        self._error_callbacks = []
        
    @property
    def status(self) -> ExchangeConnectionStatus:
        """Get the current connection status."""
        return self._status
    
    async def _init_session(self) -> None:
        """Initialize HTTP session."""
        if self._http_session is None or self._http_session.closed:
            self._http_session = aiohttp.ClientSession()
    
    async def _close_session(self) -> None:
        """Close HTTP session."""
        if self._http_session and not self._http_session.closed:
            await self._http_session.close()
            self._http_session = None
    
    async def _throttle(self) -> None:
        """Implement rate limiting."""
        if self.throttle_rate > 0:
            current_time = time.time()
            elapsed = current_time - self._last_request_time
            
            if elapsed < self.throttle_rate:
                await asyncio.sleep(self.throttle_rate - elapsed)
                
            self._last_request_time = time.time()
    
    async def _make_request(
        self, 
        method: str, 
        url: str, 
        params: Dict = None, 
        data: Dict = None, 
        headers: Dict = None
    ) -> Dict:
        """Make an HTTP request to the exchange API."""
        await self._init_session()
        await self._throttle()
        
        attempts = 0
        while attempts < self.rate_limit_retry_attempts:
            try:
                self._status = ExchangeConnectionStatus.CONNECTING
                async with self._http_session.request(
                    method, 
                    url, 
                    params=params, 
                    json=data, 
                    headers=headers,
                    timeout=self.timeout / 1000
                ) as response:
                    if response.status == 429:  # Rate limited
                        self._status = ExchangeConnectionStatus.RATE_LIMITED
                        if self.rate_limit_retry and attempts < self.rate_limit_retry_attempts - 1:
                            retry_after = int(response.headers.get('Retry-After', 1))
                            logger.warning(f"Rate limited. Retrying after {retry_after} seconds.")
                            await asyncio.sleep(retry_after)
                            attempts += 1
                            continue
                    
                    response.raise_for_status()
                    self._status = ExchangeConnectionStatus.CONNECTED
                    return await response.json()
            
            except aiohttp.ClientError as e:
                self._status = ExchangeConnectionStatus.ERROR
                logger.error(f"HTTP request error: {e}")
                self._notify_error(str(e))
                raise
            
            except asyncio.TimeoutError:
                self._status = ExchangeConnectionStatus.ERROR
                logger.error("Request timed out")
                self._notify_error("Request timed out")
                raise
                
            except Exception as e:
                self._status = ExchangeConnectionStatus.ERROR
                logger.error(f"Unexpected error: {e}")
                self._notify_error(str(e))
                raise
    
    def add_market_data_callback(self, callback) -> None:
        """Add a callback function for market data updates."""
        self._market_data_callbacks.append(callback)
    
    def add_order_update_callback(self, callback) -> None:
        """Add a callback function for order updates."""
        self._order_update_callbacks.append(callback)
    
    def add_position_update_callback(self, callback) -> None:
        """Add a callback function for position updates."""
        self._position_update_callbacks.append(callback)
    
    def add_error_callback(self, callback) -> None:
        """Add a callback function for error notifications."""
        self._error_callbacks.append(callback)
    
    def _notify_market_data(self, market_data: MarketData) -> None:
        """Notify all registered callbacks about market data updates."""
        for callback in self._market_data_callbacks:
            try:
                callback(market_data)
            except Exception as e:
                logger.error(f"Error in market data callback: {e}")
    
    def _notify_order_update(self, order: Order) -> None:
        """Notify all registered callbacks about order updates."""
        for callback in self._order_update_callbacks:
            try:
                callback(order)
            except Exception as e:
                logger.error(f"Error in order update callback: {e}")
    
    def _notify_position_update(self, position: Position) -> None:
        """Notify all registered callbacks about position updates."""
        for callback in self._position_update_callbacks:
            try:
                callback(position)
            except Exception as e:
                logger.error(f"Error in position update callback: {e}")
    
    def _notify_error(self, error: str) -> None:
        """Notify all registered callbacks about errors."""
        for callback in self._error_callbacks:
            try:
                callback(error)
            except Exception as e:
                logger.error(f"Error in error callback: {e}")
    
    @abc.abstractmethod
    async def fetch_markets(self) -> List[Dict[str, Any]]:
        """Fetch all available markets from the exchange."""
        pass
    
    @abc.abstractmethod
    async def fetch_ticker(self, symbol: str) -> MarketData:
        """Fetch ticker data for a symbol."""
        pass
    
    @abc.abstractmethod
    async def fetch_order_book(self, symbol: str, limit: int = 100) -> Dict[str, Any]:
        """Fetch order book for a symbol."""
        pass
    
    @abc.abstractmethod
    async def fetch_balance(self) -> Dict[str, Any]:
        """Fetch account balance."""
        pass
    
    @abc.abstractmethod
    async def create_order(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        amount: float,
        price: float = None,
        params: Dict[str, Any] = None
    ) -> Order:
        """Create a new order."""
        pass
    
    @abc.abstractmethod
    async def cancel_order(self, id: str, symbol: str = None) -> bool:
        """Cancel an existing order."""
        pass
    
    @abc.abstractmethod
    async def fetch_order(self, id: str, symbol: str = None) -> Order:
        """Fetch an order by ID."""
        pass
    
    @abc.abstractmethod
    async def fetch_orders(self, symbol: str = None, since: int = None, limit: int = None) -> List[Order]:
        """Fetch all orders."""
        pass
    
    @abc.abstractmethod
    async def fetch_open_orders(self, symbol: str = None, since: int = None, limit: int = None) -> List[Order]:
        """Fetch open orders."""
        pass
    
    @abc.abstractmethod
    async def fetch_closed_orders(self, symbol: str = None, since: int = None, limit: int = None) -> List[Order]:
        """Fetch closed orders."""
        pass
    
    @abc.abstractmethod
    async def fetch_positions(self, symbols: List[str] = None) -> List[Position]:
        """Fetch positions."""
        pass
    
    @abc.abstractmethod
    async def subscribe_market_data(self, symbols: List[str]) -> None:
        """Subscribe to market data streams for a list of symbols."""
        pass
    
    @abc.abstractmethod
    async def unsubscribe_market_data(self, symbols: List[str]) -> None:
        """Unsubscribe from market data streams for a list of symbols."""
        pass
    
    @abc.abstractmethod
    async def subscribe_orders(self) -> None:
        """Subscribe to order updates."""
        pass
    
    @abc.abstractmethod
    async def unsubscribe_orders(self) -> None:
        """Unsubscribe from order updates."""
        pass
    
    @abc.abstractmethod
    async def subscribe_positions(self) -> None:
        """Subscribe to position updates."""
        pass
    
    @abc.abstractmethod
    async def unsubscribe_positions(self) -> None:
        """Unsubscribe from position updates."""
        pass
    
    async def close(self) -> None:
        """Close all connections and sessions."""
        # Close websocket connections
        for ws in self._ws_connections.values():
            if not ws.closed:
                await ws.close()
        self._ws_connections = {}
        
        # Close HTTP session
        await self._close_session()
        
        self._status = ExchangeConnectionStatus.DISCONNECTED
