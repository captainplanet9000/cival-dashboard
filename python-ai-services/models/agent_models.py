from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, Literal, List
from datetime import datetime, timezone
import uuid

class AgentStrategyConfig(BaseModel):
    strategy_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    watched_symbols: List[str] = Field(default_factory=list, description="List of symbols the agent should primarily focus on.")
    default_market_event_description: str = Field(default="Periodic market check for {symbol}", description="Default description for analysis crew if no specific event.")
    default_additional_context: Optional[Dict[str, Any]] = Field(default=None, description="Default additional context for analysis crew.")

    class DarvasStrategyParams(BaseModel):
        lookback_period: int = 20
        breakout_confirmation_periods: int = 1
        box_range_min_percentage: float = 0.02
        stop_loss_percentage_from_box_bottom: float = 0.01
    darvas_params: Optional[DarvasStrategyParams] = None

    class WilliamsAlligatorParams(BaseModel):
        jaw_period: int = 13
        jaw_shift: int = 8
        teeth_period: int = 8
        teeth_shift: int = 5
        lips_period: int = 5
        lips_shift: int = 3
    williams_alligator_params: Optional[WilliamsAlligatorParams] = None

    class MarketConditionClassifierParams(BaseModel):
        adx_period: int = 14
        ma_short_period: int = 10
        ma_long_period: int = 50
        bbands_period: int = 20
        bbands_stddev: float = 2.0
        adx_trend_threshold: float = 25.0
        ma_slope_threshold: float = 0.001
        bbands_width_volatility_threshold: float = 0.1
        bbands_width_ranging_threshold: float = 0.03
    market_condition_classifier_params: Optional[MarketConditionClassifierParams] = None

    class PortfolioOptimizerRule(BaseModel):
        rule_name: Optional[str] = None
        if_market_regime: Optional[Literal["trending_up", "trending_down", "ranging", "volatile", "undetermined"]] = None
        if_news_sentiment_is: Optional[Literal["positive", "negative", "neutral"]] = None
        target_agent_type: Optional[str] = None
        target_agent_id: Optional[str] = None
        set_operational_parameters: Optional[Dict[str, Any]] = None
        set_is_active: Optional[bool] = None
    class PortfolioOptimizerParams(BaseModel):
        rules: List[PortfolioOptimizerRule] = Field(default_factory=list)
    portfolio_optimizer_params: Optional[PortfolioOptimizerParams] = None

    class NewsAnalysisParams(BaseModel):
        rss_feed_urls: List[str] = Field(default_factory=list)
        symbols_of_interest: List[str] = Field(default_factory=list)
        keywords_positive: List[str] = Field(default_factory=lambda: ["positive", "upgrade", "strong", "rally", "breakthrough", "bullish", "optimistic", "profit", "growth"])
        keywords_negative: List[str] = Field(default_factory=lambda: ["negative", "downgrade", "weak", "crash", "scandal", "bearish", "pessimistic", "loss", "decline", "fud"])
        fetch_limit_per_feed: Optional[int] = 10
    news_analysis_params: Optional[NewsAnalysisParams] = None

    class RenkoParams(BaseModel):
        brick_size_mode: Literal["fixed", "atr"] = "atr"
        brick_size_value_fixed: Optional[float] = Field(default=None, gt=0, description="Fixed brick size if mode is 'fixed'.")
        atr_period: int = Field(default=14, gt=0, description="ATR period if mode is 'atr'.")
        signal_confirmation_bricks: int = Field(default=2, ge=1, description="Number of same-color bricks for signal confirmation.")
        stop_loss_bricks_away: Optional[int] = Field(default=2, ge=1, description="Stop loss X bricks away from entry brick's open/close.")
    renko_params: Optional[RenkoParams] = None

    class HeikinAshiParams(BaseModel):
        trend_sma_period: int = Field(default=20, ge=1, description="SMA period on HA close for trend confirmation.")
        signal_confirmation_candles: int = Field(default=2, ge=1, description="Number of consecutive strong HA candles for signal.")
        stop_loss_atr_multiplier: float = Field(default=1.5, gt=0, description="ATR multiplier for stop-loss placement.")
        atr_period_for_sl: int = Field(default=14, ge=1, description="ATR period for stop-loss calculation.")
    heikin_ashi_params: Optional[HeikinAshiParams] = None

class AgentRiskConfig(BaseModel):
    max_capital_allocation_usd: float
    risk_per_trade_percentage: float
    stop_loss_percentage: Optional[float] = None
    take_profit_percentage: Optional[float] = None
    max_loss_per_trade_percentage_balance: Optional[float] = Field(
        default=None, ge=0.001, le=1.0,
        description="Maximum potential loss for a single trade as a percentage of current account balance (e.g., 0.01 for 1%). Requires trade_signal.stop_loss."
    )
    max_concurrent_open_trades: Optional[int] = Field(
        default=None, ge=1,
        description="Maximum number of concurrent open positions/trades allowed for the agent."
    )
    max_exposure_per_asset_usd: Optional[float] = Field(
        default=None, ge=0.0,
        description="Maximum total notional exposure in USD for any single asset."
    )

class AgentConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    strategy: AgentStrategyConfig
    risk_config: AgentRiskConfig
    execution_provider: Literal["paper", "hyperliquid", "dex"] = "paper" # Added "dex"
    hyperliquid_credentials_id: Optional[str] = None # DEPRECATED
    hyperliquid_config: Optional[Dict[str, str]] = Field(default=None, description="Configuration for Hyperliquid: {'wallet_address': '0x...', 'private_key_env_var_name': 'AGENT_X_HL_PRIVKEY', 'network_mode': 'mainnet/testnet'}")
    dex_config: Optional[Dict[str, Any]] = Field( # New field
        default=None,
        description="Configuration for DEX trading: e.g., {'rpc_url_env_var_name': 'RPC_URL_ENV', 'private_key_env_var_name': 'DEX_PK_ENV', 'wallet_address': '0x...', 'dex_router_address': '0x...', 'weth_address': '0x...' (optional), 'default_chain_id': 1, 'default_gas_limit': 300000, 'token_mappings': {'USDC': '0xA0b...'} }"
    )
    agent_type: str = Field(default="GenericAgent", description="Type of the agent, e.g., 'TradingCoordinator', 'MarketAnalyst', 'DarvasBoxTechnical'.")
    parent_agent_id: Optional[str] = Field(default=None, description="ID of the parent agent, if part of a hierarchy.")
    operational_parameters: Dict[str, Any] = Field(default_factory=dict, description="Runtime operational parameters like decision weights, resource limits, strategy-specific overrides.")

class AgentConfigInput(AgentConfigBase):
    pass

class AgentConfigOutput(AgentConfigBase):
    agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = False

class AgentStatus(BaseModel):
    agent_id: str
    status: Literal["running", "stopped", "error", "starting", "stopping"]
    message: Optional[str] = None
    last_heartbeat: Optional[datetime] = None

class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    strategy: Optional[AgentStrategyConfig] = None
    risk_config: Optional[AgentRiskConfig] = None
    execution_provider: Optional[Literal["paper", "hyperliquid", "dex"]] = None # Added "dex"
    hyperliquid_credentials_id: Optional[str] = None # DEPRECATED
    hyperliquid_config: Optional[Dict[str, str]] = None
    dex_config: Optional[Dict[str, Any]] = None # New field
    agent_type: Optional[str] = None
    parent_agent_id: Optional[str] = None
    operational_parameters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
```
