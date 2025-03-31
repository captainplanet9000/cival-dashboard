from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Union, Any
import logging
import asyncio
import time
from enum import Enum

# Configure logger
logger = logging.getLogger(__name__)

class OrderType(Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"
    TRAILING_STOP = "TRAILING_STOP"

class OrderSide(Enum):
    BUY = "BUY"
    SELL = "SELL"

class TimeInForce(Enum):
    GTC = "GTC"  # Good Till Cancel
    IOC = "IOC"  # Immediate or Cancel
    FOK = "FOK"  # Fill or Kill
    GTX = "GTX"  # Good Till Crossing

class Order:
    def __init__(
        self,
        symbol: str,
        side: OrderSide,
        order_type: OrderType,
        quantity: float,
        price: Optional[float] = None,
        stop_price: Optional[float] = None,
        time_in_force: TimeInForce = TimeInForce.GTC,
        client_order_id: Optional[str] = None,
        leverage: Optional[float] = None,
        reduce_only: bool = False,
        post_only: bool = False,
        extra_params: Optional[Dict[str, Any]] = None
    ):
        self.symbol = symbol
        self.side = side
        self.order_type = order_type
        self.quantity = quantity
        self.price = price
        self.stop_price = stop_price
        self.time_in_force = time_in_force
        self.client_order_id = client_order_id
        self.leverage = leverage
        self.reduce_only = reduce_only
        self.post_only = post_only
        self.extra_params = extra_params or {}

    def __str__(self):
        return (
            f"Order(symbol={self.symbol}, side={self.side.value}, "
            f"order_type={self.order_type.value}, quantity={self.quantity}, "
            f"price={self.price}, stop_price={self.stop_price})"
        )

class Position:
    def __init__(
        self,
        symbol: str,
        side: OrderSide,
        quantity: float,
        entry_price: float,
        leverage: float,
        unrealized_pnl: float,
        realized_pnl: float,
        liquidation_price: Optional[float] = None,
        margin: Optional[float] = None
    ):
        self.symbol = symbol
        self.side = side
        self.quantity = quantity
        self.entry_price = entry_price
        self.leverage = leverage
        self.unrealized_pnl = unrealized_pnl
        self.realized_pnl = realized_pnl
        self.liquidation_price = liquidation_price
        self.margin = margin

    def __str__(self):
        return (
            f"Position(symbol={self.symbol}, side={self.side.value}, "
            f"quantity={self.quantity}, entry_price={self.entry_price}, "
            f"leverage={self.leverage}, unrealized_pnl={self.unrealized_pnl})"
        )

class OrderBook:
    def __init__(self, symbol: str, bids: List[Dict[str, float]], asks: List[Dict[str, float]], timestamp: float):
        self.symbol = symbol
        self.bids = bids  # List of {price: float, quantity: float}
        self.asks = asks  # List of {price: float, quantity: float}
        self.timestamp = timestamp

    @property
    def best_bid(self) -> Dict[str, float]:
        return self.bids[0] if self.bids else {"price": 0, "quantity": 0}

    @property
    def best_ask(self) -> Dict[str, float]:
        return self.asks[0] if self.asks else {"price": 0, "quantity": 0}

    @property
    def mid_price(self) -> float:
        if not self.bids or not self.asks:
            return 0
        return (self.best_bid["price"] + self.best_ask["price"]) / 2

    @property
    def spread(self) -> float:
        if not self.bids or not self.asks:
            return 0
        return self.best_ask["price"] - self.best_bid["price"]

    def get_depth_at_price(self, price: float, side: OrderSide) -> float:
        """Get the quantity available at a specific price level."""
        if side == OrderSide.BUY:
            for ask in self.asks:
                if ask["price"] <= price:
                    return ask["quantity"]
        else:
            for bid in self.bids:
                if bid["price"] >= price:
                    return bid["quantity"]
        return 0

class ExchangeInterface(ABC):
    """Base class for all exchange integrations."""
    
    def __init__(self, api_key: str, api_secret: str, testnet: bool = False):
        self.api_key = api_key
        self.api_secret = api_secret
        self.testnet = testnet
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the exchange connection."""
        pass

    @abstractmethod
    async def get_account_balance(self) -> Dict[str, float]:
        """Get account balance."""
        pass

    @abstractmethod
    async def get_ticker(self, symbol: str) -> Dict[str, Any]:
        """Get ticker information for a symbol."""
        pass

    @abstractmethod
    async def get_order_book(self, symbol: str, limit: int = 20) -> OrderBook:
        """Get order book for a symbol."""
        pass

    @abstractmethod
    async def create_order(self, order: Order) -> Dict[str, Any]:
        """Create a new order."""
        pass

    @abstractmethod
    async def cancel_order(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order."""
        pass

    @abstractmethod
    async def get_open_orders(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all open orders."""
        pass

    @abstractmethod
    async def get_order_status(self, symbol: str, order_id: str) -> Dict[str, Any]:
        """Get status of a specific order."""
        pass

    @abstractmethod
    async def get_positions(self, symbol: Optional[str] = None) -> List[Position]:
        """Get all open positions."""
        pass

    @abstractmethod
    async def set_leverage(self, symbol: str, leverage: float) -> Dict[str, Any]:
        """Set leverage for a symbol."""
        pass

    @abstractmethod
    async def get_historical_klines(
        self, symbol: str, interval: str, start_time: Optional[int] = None, 
        end_time: Optional[int] = None, limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Get historical klines/candlesticks."""
        pass

    @abstractmethod
    async def subscribe_to_ticker(self, symbol: str, callback):
        """Subscribe to real-time ticker updates."""
        pass
    
    @abstractmethod
    async def subscribe_to_order_book(self, symbol: str, callback):
        """Subscribe to real-time order book updates."""
        pass

    @abstractmethod
    async def subscribe_to_trades(self, symbol: str, callback):
        """Subscribe to real-time trade updates."""
        pass

    async def retry_async(self, coro, max_retries=3, backoff_factor=1.5):
        """Retry an async coroutine with exponential backoff."""
        retries = 0
        last_exception = None
        
        while retries < max_retries:
            try:
                return await coro
            except Exception as e:
                wait_time = backoff_factor ** retries
                retries += 1
                last_exception = e
                self.logger.warning(f"Retrying in {wait_time:.2f}s after error: {e}")
                await asyncio.sleep(wait_time)
        
        self.logger.error(f"Failed after {max_retries} retries: {last_exception}")
        raise last_exception
