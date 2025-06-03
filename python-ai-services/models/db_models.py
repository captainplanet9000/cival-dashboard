from sqlalchemy import Column, String, Boolean, DateTime, Text, Float # Added Float
# For SQLAlchemy's built-in JSON type, if available and preferred over Text for JSON strings:
# from sqlalchemy import JSON as DB_JSON_TYPE
from python_ai_services.core.database import Base # Adjusted import path
from datetime import datetime, timezone # Ensure timezone for defaults

# Note: AgentStrategyConfig etc. are Pydantic models.
# They will be serialized to JSON strings before storing in Text columns.

class AgentConfigDB(Base):
    __tablename__ = "agent_configs"

    agent_id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    agent_type = Column(String, default="GenericAgent")
    parent_agent_id = Column(String, nullable=True, index=True)
    is_active = Column(Boolean, default=False)

    # Store complex Pydantic models or dicts as JSON strings using Text type.
    # SQLAlchemy's JSON type can be used if the DB backend has good JSON support (e.g., PostgreSQL).
    # For broader compatibility (including older SQLite), Text + manual json.dumps/loads is robust.

    # Stores Pydantic AgentStrategyConfig model as a JSON string
    strategy_config_json = Column(Text, default="{}")

    # Stores Pydantic AgentConfigOutput.hyperliquid_config (Dict[str,str]) as JSON string
    hyperliquid_config_json = Column(Text, nullable=True)

    # Stores Pydantic AgentConfigOutput.operational_parameters (Dict[str,Any]) as JSON string
    operational_parameters_json = Column(Text, default="{}")

    # Stores Pydantic AgentRiskConfig model as a JSON string
    risk_config_json = Column(Text, default="{}")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TradeFillDB(Base):
    __tablename__ = "trade_fills"

    fill_id = Column(String, primary_key=True, index=True) # From TradeFillData.fill_id
    agent_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True, default=datetime.utcnow) # Consider timezone.utc for default
    asset = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False) # "buy" or "sell"
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    fee = Column(Float, default=0.0)
    fee_currency = Column(String, nullable=True)
    exchange_order_id = Column(String, nullable=True, index=True)
    exchange_trade_id = Column(String, nullable=True, index=True) # Exchange's own fill/trade ID
```
