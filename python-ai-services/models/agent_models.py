from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
import uuid

class AgentStrategyConfig(BaseModel):
    strategy_name: str # e.g., "sma_crossover", "darvas_box"
    parameters: Dict[str, Any] = Field(default_factory=dict) # General parameters, ensure default_factory if it can be empty
    watched_symbols: List[str] = Field(default_factory=list, description="List of symbols the agent should primarily focus on.")
    default_market_event_description: str = Field(default="Periodic market check for {symbol}", description="Default description for analysis crew if no specific event.")
    default_additional_context: Optional[Dict[str, Any]] = Field(default=None, description="Default additional context for analysis crew.")

    # Nested model for Darvas parameters
    class DarvasStrategyParams(BaseModel):
        lookback_period: int = 20
        breakout_confirmation_periods: int = 1 # Simplified: price must close above box top
        box_range_min_percentage: float = 0.02 # Min range of box (e.g. 2%) for validity - Optional
        stop_loss_percentage_from_box_bottom: float = 0.01 # e.g. 1% below box bottom

    darvas_params: Optional[DarvasStrategyParams] = None

    # Nested model for Williams Alligator parameters
    class WilliamsAlligatorParams(BaseModel):
        jaw_period: int = 13
        jaw_shift: int = 8
        teeth_period: int = 8
        teeth_shift: int = 5
        lips_period: int = 5
        lips_shift: int = 3
        # Optional: add parameters for signal confirmation, e.g., min_spread_percentage

    williams_alligator_params: Optional[WilliamsAlligatorParams] = None


class AgentRiskConfig(BaseModel):
    max_capital_allocation_usd: float
    risk_per_trade_percentage: float # e.g., 0.01 for 1%
    stop_loss_percentage: Optional[float] = None
    take_profit_percentage: Optional[float] = None

class AgentConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    strategy: AgentStrategyConfig
    risk_config: AgentRiskConfig
    execution_provider: Literal["paper", "hyperliquid"] = "paper"
    hyperliquid_credentials_id: Optional[str] = None # ID to link to stored HL credentials (DEPRECATED by hyperliquid_config)
    hyperliquid_config: Optional[Dict[str, str]] = Field(default=None, description="Configuration for Hyperliquid: {'wallet_address': '0x...', 'private_key_env_var_name': 'AGENT_X_HL_PRIVKEY', 'network_mode': 'mainnet/testnet'}")
    agent_type: str = Field(default="GenericAgent", description="Type of the agent, e.g., 'TradingCoordinator', 'MarketAnalyst', 'DarvasBoxTechnical'.")
    parent_agent_id: Optional[str] = Field(default=None, description="ID of the parent agent, if part of a hierarchy.")
    operational_parameters: Dict[str, Any] = Field(default_factory=dict, description="Runtime operational parameters like decision weights, resource limits, strategy-specific overrides.")

class AgentConfigInput(AgentConfigBase):
    pass

class AgentConfigOutput(AgentConfigBase):
    agent_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # hyperliquid_config is inherited from AgentConfigBase
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Ensure timezone
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Ensure timezone
    is_active: bool = False # Is the agent's main trading loop active?

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
    execution_provider: Optional[Literal["paper", "hyperliquid"]] = None
    hyperliquid_credentials_id: Optional[str] = None # DEPRECATED by hyperliquid_config
    hyperliquid_config: Optional[Dict[str, str]] = None
    agent_type: Optional[str] = None
    parent_agent_id: Optional[str] = None
    operational_parameters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None # Allow updating active status via this model too
