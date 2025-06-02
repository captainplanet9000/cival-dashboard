from pydantic import BaseModel, Field, HttpUrl, validator
from typing import List, Optional, Dict, Any, Union, Literal
from datetime import datetime, date, timezone # Added timezone
import uuid

# --- Base Strategy Configuration & Common Parameters ---

StrategyTimeframe = Literal[
    "1m", "3m", "5m", "15m", "30m", 
    "1h", "2h", "4h", "6h", "8h", "12h", 
    "1d", "3d", "1w", "1M"
]

class BaseStrategyConfig(BaseModel):
    strategy_id: uuid.UUID = Field(default_factory=uuid.uuid4, description="Unique identifier for this strategy instance.")
    strategy_name: str = Field(..., description="User-defined name for this strategy configuration.")
    strategy_type: str = Field(..., description="Identifier for the type of strategy (e.g., 'DarvasBox', 'WilliamsAlligator').")
    description: Optional[str] = None
    symbols: List[str] = Field(..., min_items=1, description="List of symbols this strategy applies to (e.g., ['BTC/USD', 'ETH/USD']).")
    timeframe: StrategyTimeframe = Field(..., description="Primary timeframe for the strategy.")
    is_active: bool = Field(default=True, description="Whether this strategy configuration is currently active.")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- Strategy-Specific Parameters ---
# These models will hold parameters unique to each strategy type.

class DarvasBoxParams(BaseModel):
    lookback_period_days: int = Field(default=20, gt=0, description="Number of days to look back for high/low to define box range.")
    box_breakout_confirmation_bars: int = Field(default=1, ge=0, description="Number of bars to confirm a breakout above box high or below box low.")
    volume_increase_factor: float = Field(default=1.5, ge=1.0, description="Factor by which volume must increase on breakout.")
    min_box_duration_days: int = Field(default=3, ge=1, description="Minimum number of days a valid box must form.")

class WilliamsAlligatorParams(BaseModel):
    jaw_period: int = Field(default=13, gt=0)
    jaw_shift: int = Field(default=8, ge=0)
    teeth_period: int = Field(default=8, gt=0)
    teeth_shift: int = Field(default=5, ge=0)
    lips_period: int = Field(default=5, gt=0)
    lips_shift: int = Field(default=3, ge=0)
    # Example: add a threshold for how far apart lines should be to confirm a trend
    min_spread_percentage_for_trend: Optional[float] = Field(default=0.5, ge=0, le=100, description="Minimum spread between jaw and lips (as % of price) to confirm trend.")

class RenkoParams(BaseModel):
    brick_size_mode: Literal["fixed", "atr"] = Field(default="atr")
    brick_size_value: Optional[float] = Field(default=None, gt=0, description="Fixed brick size (if mode is 'fixed').")
    atr_period: Optional[int] = Field(default=14, gt=0, description="ATR period if brick_size_mode is 'atr'.")
    wick_threshold_percentage: float = Field(default=0.1, ge=0, le=1.0, description="Percentage of brick size for wick consideration.")

class HeikinAshiParams(BaseModel):
    ema_smoothing_period: Optional[int] = Field(default=None, gt=0, description="Optional EMA smoothing period for Heikin Ashi candles.")
    trend_confirmation_candles: int = Field(default=3, ge=1, description="Number of consecutive HA candles to confirm a trend.")

class ElliottWaveParams(BaseModel):
    # Elliott Wave parameters are complex and often qualitative.
    # This might include settings for wave detection algorithms.
    wave_detection_sensitivity: Literal["low", "medium", "high"] = Field(default="medium")
    fibonacci_retracement_levels: List[float] = Field(default_factory=lambda: [0.236, 0.382, 0.5, 0.618, 0.786])
    min_wave_length_bars: int = Field(default=5, gt=0)

# Union type for specific strategy parameters, to be used in a general strategy config model
StrategySpecificParams = Union[
    DarvasBoxParams, 
    WilliamsAlligatorParams, 
    RenkoParams, 
    HeikinAshiParams, 
    ElliottWaveParams
]

class StrategyConfig(BaseStrategyConfig):
    # This field will hold the specific parameters based on 'strategy_type'
    parameters: StrategySpecificParams 

    @validator('parameters', pre=True, always=True) # Added pre=True, always=True
    def validate_parameters_type(cls, v, values):
        strategy_type = values.get('strategy_type')
        # This validator runs *before* Pydantic tries to validate `parameters` against the Union.
        # So, `v` here is the raw dict for parameters. We need to guide Pydantic.
        
        if not strategy_type:
            # This should ideally not happen if strategy_type is processed first by Pydantic
            # or if it's a required field ensured by other means before this validator.
            # If strategy_type is missing, we can't determine the correct model for parameters.
            raise ValueError("strategy_type must be defined to validate parameters.")

        type_map = {
            "DarvasBox": DarvasBoxParams,
            "WilliamsAlligator": WilliamsAlligatorParams,
            "Renko": RenkoParams,
            "HeikinAshi": HeikinAshiParams,
            "ElliottWave": ElliottWaveParams,
        }
        
        expected_param_type = type_map.get(strategy_type)
        if expected_param_type is None:
            raise ValueError(f"Unknown strategy_type '{strategy_type}' for parameter validation.")
        
        # If v is already an instance of the expected type (e.g., during model copy/revalidation), pass it through.
        if isinstance(v, expected_param_type):
            return v
            
        # If v is a dict, try to parse it into the expected_param_type.
        # This is where Pydantic's discriminated union would typically handle things automatically,
        # but we are doing it semi-manually here to ensure the type matches strategy_type.
        if isinstance(v, dict):
            try:
                return expected_param_type(**v)
            except Exception as e: # Catch Pydantic's ValidationError or others
                 raise ValueError(f"Parameters for strategy_type '{strategy_type}' are invalid for type {expected_param_type.__name__}: {e}")
        
        # If v is neither a dict nor already the correct instance, it's an invalid type for parameters.
        raise ValueError(f"Parameters for strategy_type '{strategy_type}' must be a dictionary or an instance of {expected_param_type.__name__}.")

    
    class Config:
        # For Pydantic v2, if you want to use strategy_type as discriminator
        # This is more complex with Union types and often requires custom parsing if strategy_type isn't part of the sub-model.
        # The validator above handles it for Pydantic v1 style.
        # For Pydantic v2, you might explore discriminated unions more directly if strategy_type
        # was part of each sub-model, or use a root_validator.
        pass


# --- Performance Metrics Models ---

class TradeStats(BaseModel):
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate_percentage: float = Field(default=0.0, ge=0, le=100)
    profit_factor: Optional[float] = None # Gross profit / Gross loss
    average_win_amount: float = 0.0
    average_loss_amount: float = 0.0
    max_consecutive_wins: int = 0
    max_consecutive_losses: int = 0

class PerformanceMetrics(BaseModel):
    strategy_id: uuid.UUID
    backtest_id: Optional[uuid.UUID] = None # If metrics are from a specific backtest run
    live_trading_session_id: Optional[uuid.UUID] = None # If metrics are from a live session
    
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    net_profit: float
    net_profit_percentage: float = Field(ge=-100) # Can be negative
    max_drawdown_percentage: float = Field(default=0.0, ge=0, le=100)
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    cagr_percentage: Optional[float] = None # Compound Annual Growth Rate
    volatility_percentage: Optional[float] = None # Annualized volatility
    
    trade_stats: TradeStats = Field(default_factory=TradeStats)
    
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- Goal Alignment Models ---

class Goal(BaseModel):
    goal_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    user_id: uuid.UUID # Assuming goals are user-specific
    goal_name: str
    description: Optional[str] = None
    target_metric: str # e.g., "net_profit_percentage", "sharpe_ratio"
    target_value: float
    start_date: date
    end_date: date
    current_value: Optional[float] = None # To be updated periodically
    is_achieved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StrategyGoalAlignment(BaseModel):
    alignment_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    strategy_id: uuid.UUID
    goal_id: uuid.UUID
    # How well this strategy is expected to contribute to the goal
    expected_contribution_score: Optional[float] = Field(default=None, ge=0, le=1) 
    notes: Optional[str] = None

class StrategyPerformanceTeaser(BaseModel):
    # From StrategyConfig
    strategy_id: uuid.UUID
    strategy_name: str
    strategy_type: str
    is_active: bool
    symbols: List[str] 
    timeframe: StrategyTimeframe
    
    # From latest PerformanceMetrics
    latest_performance_record_timestamp: Optional[datetime] = None 
    latest_net_profit_percentage: Optional[float] = None
    latest_sharpe_ratio: Optional[float] = None 
    latest_sortino_ratio: Optional[float] = None 
    latest_max_drawdown_percentage: Optional[float] = None 
    total_trades_from_latest_metrics: Optional[int] = None

    class Config:
        from_attributes = True
