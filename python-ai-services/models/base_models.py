from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Literal # Added Literal
from datetime import datetime, timezone # Added timezone
import uuid # Added uuid

# ApprovalStatus = Literal["PENDING_APPROVAL", "APPROVED", "REJECTED"] # This is better tracked on AgentTask.status

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

class ProposedTradeSignal(BaseModel):
    signal_id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique ID for this trade proposal.")
    symbol: str = Field(..., description="The financial symbol for the proposed trade.")
    action: str = Field(..., description="Proposed action: BUY, SELL, or HOLD.") # Validator from TradeSignal can be reused if this inherits or is composed
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for the proposal (0.0 to 1.0).")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp when the signal was generated (UTC).")
    execution_price: Optional[float] = Field(default=None, description="Suggested execution price, if applicable.")
    rationale: str = Field(..., description="Rationale behind the proposed signal.")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Any additional metadata from the crew or agent.")

    @field_validator('action')
    @classmethod
    def validate_action_proposed(cls, value: str) -> str:
        allowed_actions = ["BUY", "SELL", "HOLD"]
        if value.upper() not in allowed_actions:
            raise ValueError(f"Action must be one of {allowed_actions}, got {value}")
        return value.upper()

    class Config:
        from_attributes = True
        validate_assignment = True
        extra = 'forbid'
