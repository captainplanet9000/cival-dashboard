from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import uuid

class AssetPositionSummary(BaseModel):
    asset: str
    size: float
    entry_price: Optional[float] = None
    current_price: Optional[float] = None # Placeholder, would need market data feed
    unrealized_pnl: Optional[float] = None
    margin_used: Optional[float] = None

class PortfolioSummary(BaseModel):
    agent_id: str
    timestamp: datetime
    account_value_usd: float
    total_pnl_usd: float # Overall PnL (e.g., from Hyperliquid's totalNtlPos)
    available_balance_usd: Optional[float] = None # e.g., from Hyperliquid's withdrawable
    margin_used_usd: Optional[float] = None # e.g., from Hyperliquid's totalMarginUsed
    open_positions: List[AssetPositionSummary]

class TradeLogItem(BaseModel):
    trade_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime
    agent_id: str
    asset: str
    side: Literal["buy", "sell"]
    order_type: Literal["market", "limit"] # Execution order type
    quantity: float
    price: float # Execution price
    total_value: float # quantity * price
    realized_pnl: Optional[float] = None # PnL for this specific trade if it's a closing trade
    fees: Optional[float] = None

class OrderLogItem(BaseModel):
    order_id: str # Could be int from exchange or UUID string for paper/internal
    agent_id: str
    timestamp: datetime # Creation timestamp
    asset: str
    side: Literal["buy", "sell"]
    order_type: Literal["market", "limit", "stop_loss", "take_profit", "trigger"] # Extended with common types
    quantity: float
    limit_price: Optional[float] = None
    filled_quantity: float = 0.0
    avg_fill_price: Optional[float] = None
    status: Literal["open", "partially_filled", "filled", "canceled", "rejected", "expired", "unknown"]
    raw_details: Optional[Dict[str, Any]] = None # To store original exchange data if needed
