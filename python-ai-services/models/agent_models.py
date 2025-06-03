from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
import uuid

class AgentStrategyConfig(BaseModel):
    strategy_name: str # e.g., "sma_crossover", "darvas_box"
    parameters: Dict[str, Any] # e.g., {"short_window": 20, "long_window": 50}
    watched_symbols: List[str] = Field(default_factory=list, description="List of symbols the agent should primarily focus on.")
    default_market_event_description: str = Field(default="Periodic market check for {symbol}", description="Default description for analysis crew if no specific event.")
    default_additional_context: Optional[Dict[str, Any]] = Field(default=None, description="Default additional context for analysis crew.")

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
    is_active: Optional[bool] = None # Allow updating active status via this model too
