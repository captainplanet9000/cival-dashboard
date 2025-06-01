from enum import Enum
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"


class OrderStatus(str, Enum):
    PENDING = "pending"
    OPEN = "open"
    FILLED = "filled"
    PARTIAL = "partial"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class TimeInForce(str, Enum):
    GTC = "gtc"  # Good Till Cancelled
    IOC = "ioc"  # Immediate or Cancel
    FOK = "fok"  # Fill or Kill


class Position(BaseModel):
    id: Optional[int] = None
    user_id: str
    agent_id: Optional[str] = None
    symbol: str
    quantity: float
    avg_price: float
    unrealised_pnl: float = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Order(BaseModel):
    id: Optional[int] = None
    user_id: str
    agent_id: Optional[str] = None
    exchange: str
    symbol: str
    side: OrderSide
    type: OrderType
    price: Optional[float] = None
    quantity: float
    status: OrderStatus = OrderStatus.PENDING
    executed_qty: float = 0
    tx_id: Optional[str] = None
    time_in_force: Optional[TimeInForce] = TimeInForce.GTC
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @validator('price', pre=True, always=True)
    def validate_price(cls, v, values):
        # Price is required for limit and stop-limit orders
        if values.get('type') in [OrderType.LIMIT, OrderType.STOP_LIMIT] and v is None:
            raise ValueError('Price is required for limit and stop-limit orders')
        return v


class OrderRequest(BaseModel):
    agent_id: Optional[str] = None
    exchange: str
    symbol: str
    side: OrderSide
    type: OrderType
    price: Optional[float] = None
    quantity: float
    time_in_force: Optional[TimeInForce] = TimeInForce.GTC


class OrderResponse(BaseModel):
    id: int
    exchange: str
    symbol: str
    side: str
    type: str
    price: Optional[float] = None
    quantity: float
    status: str
    tx_id: Optional[str] = None
    message: Optional[str] = None


class ExchangeCredentials(BaseModel):
    id: Optional[int] = None
    user_id: str
    exchange: str
    api_key_encrypted: str
    api_secret_encrypted: str
    passphrase: Optional[str] = None
    is_active: bool = True
    last_used: Optional[datetime] = None
    last_failed: Optional[datetime] = None


class WalletBalance(BaseModel):
    id: Optional[int] = None
    user_id: str
    exchange: str
    currency: str
    free: float = 0
    locked: float = 0
    updated_at: Optional[datetime] = None


class MarketData(BaseModel):
    symbol: str
    exchange: str
    price: float
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume_24h: Optional[float] = None
    timestamp: datetime
    is_stale: bool = False


class RiskProfile(BaseModel):
    id: Optional[int] = None
    user_id: str
    agent_id: Optional[str] = None
    max_position_pct: float = 0.05  # Default to 5% of portfolio
    max_daily_loss: float = 0.02    # Default to 2% daily loss limit
    circuit_breaker: bool = False   # Disable circuit breaker by default
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TradePerformance(BaseModel):
    id: Optional[int] = None
    user_id: str
    agent_id: Optional[str] = None
    period: str  # daily, weekly, monthly
    pnl: float
    win_rate: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    drawdown: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
