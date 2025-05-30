# This file will contain Pydantic models specific to CrewAI workflows
# or for structuring data passed between agents/tasks.

# Note:
# The final output of the trading crew is intended to be a `TradingDecision` object
# as defined in `python_ai_services.types.trading_types.TradingDecision`.
# The output of the market analyst agent/task is intended to be a `MarketAnalysis` object
# as defined in `python_ai_services.types.trading_types.MarketAnalysis`.

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Attempting relative import from sibling package 'types'
from ..types.trading_types import TradeAction, MarketCondition

class StrategyApplicationResult(BaseModel):
    """
    Represents the direct output from a specific trading strategy's application
    before final synthesis into a TradeSignal/TradingDecision.
    """
    symbol: str = Field(..., example="BTC/USD", description="The financial instrument symbol.")
    strategy_name: str = Field(..., example="DarvasBoxStrategy", description="Name of the strategy that produced this result.")

    advice: TradeAction = Field(..., description="The trading advice from this specific strategy (BUY, SELL, HOLD).")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score of the advice (0.0 to 1.0).")

    target_price: Optional[float] = Field(None, example=65000.0, description="Suggested target price for the trade, if applicable.")
    stop_loss: Optional[float] = Field(None, example=58000.0, description="Suggested stop-loss price for the trade, if applicable.")
    take_profit: Optional[float] = Field(None, example=70000.0, description="Suggested take-profit price for the trade, if applicable.")

    rationale: str = Field(..., description="Brief explanation or rationale behind the strategy's advice.")
    additional_data: Optional[Dict[str, Any]] = Field(None, description="Any other strategy-specific outputs, e.g., calculated indicator values, pattern details.")

    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of when the strategy result was generated.")

# Example of another potential model, if needed for intermediate crew steps:
# class TechnicalAnalysisData(BaseModel):
#     symbol: str
#     timeframe: str
#     indicators: Dict[str, Any]
#     patterns: List[str]
#     summary: str

# class SentimentAnalysisOutput(BaseModel):
#     symbol: str
#     sentiment_score: float = Field(..., ge=-1.0, le=1.0)
#     dominant_sentiment: str # e.g., "bullish", "bearish", "neutral"
#     key_phrases: List[str]
#     source_summary: Optional[str] = None
