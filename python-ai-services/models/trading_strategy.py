"""
Trading Strategy Models for Cival Dashboard AI Services.
Defines core data models and interfaces for AI-powered trading strategies.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, validator

class TimeFrame(str, Enum):
    """Trading timeframes supported by the system."""
    MINUTE_1 = "1min"
    MINUTE_5 = "5min"
    MINUTE_15 = "15min"
    MINUTE_30 = "30min"
    HOUR_1 = "1h"
    HOUR_4 = "4h"
    DAY_1 = "1d"
    WEEK_1 = "1w"

class SignalType(str, Enum):
    """Trading signal types."""
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"

class OrderType(str, Enum):
    """Order types for paper trading."""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"

class OrderSide(str, Enum):
    """Order sides (buy/sell)."""
    BUY = "BUY"
    SELL = "SELL"

class OrderStatus(str, Enum):
    """Order status values."""
    OPEN = "OPEN"
    FILLED = "FILLED"
    CANCELED = "CANCELED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class StrategyRunStatus(str, Enum):
    """Status values for strategy runs."""
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class OHLCVData(BaseModel):
    """Open-High-Low-Close-Volume market data."""
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class TradingStrategyParameters(BaseModel):
    """Base model for strategy parameters."""
    class Config:
        extra = "allow"  # Allow additional fields based on strategy type

class TradingStrategy(BaseModel):
    """Trading strategy model."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    type: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            UUID: lambda uuid: str(uuid)
        }

class TradingSignal(BaseModel):
    """Trading signal generated by a strategy."""
    id: UUID = Field(default_factory=uuid4)
    strategy_id: UUID
    symbol: str
    timeframe: str
    signal: SignalType
    confidence: Optional[float] = None
    price: Optional[float] = None
    quantity: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    executed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            UUID: lambda uuid: str(uuid)
        }
    
    @validator('confidence')
    def validate_confidence(cls, v):
        """Validate confidence is between 0 and 100."""
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Confidence must be between 0 and 100')
        return v

class PaperTradingOrder(BaseModel):
    """Paper trading order model."""
    id: UUID = Field(default_factory=uuid4)
    signal_id: Optional[UUID] = None
    user_id: UUID
    symbol: str
    order_type: OrderType
    side: OrderSide
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    status: OrderStatus = OrderStatus.OPEN
    filled_quantity: float = 0
    filled_price: Optional[float] = None
    portfolio_id: Optional[UUID] = None
    strategy_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            UUID: lambda uuid: str(uuid)
        }
    
    @validator('price')
    def validate_price(cls, v, values):
        """Validate price for different order types."""
        if values.get('order_type') in [OrderType.LIMIT, OrderType.STOP_LIMIT] and v is None:
            raise ValueError('Price is required for LIMIT and STOP_LIMIT orders')
        return v
    
    @validator('stop_price')
    def validate_stop_price(cls, v, values):
        """Validate stop_price for different order types."""
        if values.get('order_type') in [OrderType.STOP, OrderType.STOP_LIMIT] and v is None:
            raise ValueError('Stop price is required for STOP and STOP_LIMIT orders')
        return v

class PaperTradingPosition(BaseModel):
    """Paper trading position model."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    portfolio_id: Optional[UUID] = None
    symbol: str
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: Optional[float] = None
    realized_pnl: float = 0
    strategy_id: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            UUID: lambda uuid: str(uuid)
        }

class PaperTradingPortfolio(BaseModel):
    """Paper trading portfolio model."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    name: str
    balance: float = 100000
    currency: str = "USD"
    description: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            UUID: lambda uuid: str(uuid)
        }

class StrategyRun(BaseModel):
    """Model for tracking strategy runs."""
    id: UUID = Field(default_factory=uuid4)
    strategy_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    status: StrategyRunStatus = StrategyRunStatus.RUNNING
    result: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            UUID: lambda uuid: str(uuid)
        }

class TechnicalIndicatorValue(BaseModel):
    """Technical indicator value model."""
    symbol: str
    timeframe: str
    timestamp: datetime
    indicator_type: str
    values: Dict[str, Any]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
