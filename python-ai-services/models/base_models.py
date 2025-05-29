from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any # Corrected: Imported Any
from datetime import datetime

class MarketData(BaseModel):
    symbol: str
    price: float
    timestamp: datetime
    volume: Optional[float] = None
    open_price: Optional[float] = Field(default=None, alias='open') 
    high_price: Optional[float] = Field(default=None, alias='high') 
    low_price: Optional[float] = Field(default=None, alias='low')   
    close_price: Optional[float] = Field(default=None, alias='close')

    class Config:
        populate_by_name = True 

class TradeSignal(BaseModel):
    symbol: str
    action: str 
    confidence: float 
    timestamp: datetime
    execution_price: Optional[float] = None # Price at which the signal is considered valid
    rationale: str
    metadata: Optional[Dict[str, Any]] = None 

    @field_validator('action')
    @classmethod
    def validate_action(cls, value: str) -> str: # Added type hint for value
        allowed_actions = ["BUY", "SELL", "HOLD"]
        if value.upper() not in allowed_actions:
            raise ValueError(f"Action must be one of {allowed_actions}, got {value}")
        return value.upper()

    @field_validator('confidence')
    @classmethod
    def validate_confidence(cls, value: float) -> float: # Added type hint for value
        if not (0.0 <= value <= 1.0):
            raise ValueError("Confidence must be between 0.0 and 1.0")
        return value
