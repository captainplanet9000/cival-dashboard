from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Any

from python_ai_services.models.dashboard_models import (
    PortfolioSummary,
    TradeLogItem,
    OrderLogItem
)
from python_ai_services.services.trading_data_service import TradingDataService
from python_ai_services.services.agent_management_service import AgentManagementService
# Assuming the get_agent_management_service from agent_management_routes can be reused or a similar one exists
# For simplicity, let's assume we can import the one from agent_management_routes if it provides the singleton
from python_ai_services.api.v1.agent_management_routes import get_agent_management_service as get_agent_management_service_singleton

# Placeholder for HyperliquidExecutionService - actual service would be imported
# from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService

router = APIRouter()

# Dependency for HyperliquidExecutionService Factory
def get_hyperliquid_service_factory_placeholder() -> Callable[[str], Optional[Any]]: # Actual HLES type
    """
    Placeholder factory for HyperliquidExecutionService.
    In a real setup, this would fetch credentials based on cred_id and initialize
    a HyperliquidExecutionService instance.
    """
    def factory(credentials_id: str) -> Optional[Any]: # Actual HLES type
        # This is where you would look up credentials by ID from a secure store
        # and then instantiate the HyperliquidExecutionService.
        # Example:
        # creds = db.get_credentials(credentials_id)
        # if creds:
        #     return HyperliquidExecutionService(wallet_address=creds.wallet, private_key=creds.pk, ...)
        logger.info(f"Hyperliquid service factory called for cred_id: {credentials_id} (placeholder).")
        # Returning None to simulate that the actual HLES instance creation is pending.
        # For testing or if a default mock HLES is available, it could be returned here.
        return None # Or a mock instance of HyperliquidExecutionService
    return factory


from python_ai_services.services.trade_history_service import TradeHistoryService # Added
from pathlib import Path # Added for default fills_dir path

# Dependency for TradeHistoryService (singleton)
# This should ideally be in a central dependency management file or main.py
# For now, defining here for clarity of this subtask.
_trade_history_service_instance = TradeHistoryService(fills_dir=Path("agent_fills")) # Default path
def get_trade_history_service_instance() -> TradeHistoryService:
    return _trade_history_service_instance

# Dependency for TradingDataService
def get_trading_data_service(
    agent_service: AgentManagementService = Depends(get_agent_management_service_singleton),
    hl_factory: Callable[[str], Optional[Any]] = Depends(get_hyperliquid_service_factory_placeholder), # Actual HLES type
    trade_history_service: TradeHistoryService = Depends(get_trade_history_service_instance) # New dependency
) -> TradingDataService:
    # This ensures TradingDataService is created per request, or make it a singleton if preferred.
    # If AgentManagementService is a singleton, TradingDataService can also be a singleton
    # if hl_factory is also stable or if HLES instances are managed elsewhere (e.g., cached by factory).
    # For now, new instance per request is fine.
    return TradingDataService(
        agent_service=agent_service,
        hyperliquid_service_factory=hl_factory,
        trade_history_service=trade_history_service # Pass it here
    )


@router.get("/agents/{agent_id}/portfolio/summary", response_model=PortfolioSummary)
async def get_agent_portfolio_summary(
    agent_id: str,
    service: TradingDataService = Depends(get_trading_data_service)
):
    """
    Retrieve the portfolio summary for a specific trading agent.
    """
    summary = await service.get_portfolio_summary(agent_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Portfolio summary not available for agent {agent_id}.")
    return summary

@router.get("/agents/{agent_id}/portfolio/trade-history", response_model=List[TradeLogItem])
async def get_agent_trade_history(
    agent_id: str,
    limit: int = 100,
    offset: int = 0,
    service: TradingDataService = Depends(get_trading_data_service)
):
    """
    Retrieve the trade history for a specific trading agent.
    (Currently returns mocked data)
    """
    if limit < 1 or limit > 500: # Example validation
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 500.")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be non-negative.")

    history = await service.get_trade_history(agent_id, limit, offset)
    # If agent_id itself is invalid, service methods typically return empty list or None.
    # Consider if agent existence should be checked here first via AgentManagementService for a 404.
    # For now, if service returns empty, it could be valid (no history) or agent not found.
    return history

@router.get("/agents/{agent_id}/orders/open", response_model=List[OrderLogItem])
async def get_agent_open_orders(
    agent_id: str,
    service: TradingDataService = Depends(get_trading_data_service)
):
    """
    Retrieve a list of open orders for a specific trading agent.
    """
    open_orders = await service.get_open_orders(agent_id)
    return open_orders

@router.get("/agents/{agent_id}/orders/history", response_model=List[OrderLogItem])
async def get_agent_order_history(
    agent_id: str,
    limit: int = 100,
    offset: int = 0,
    service: TradingDataService = Depends(get_trading_data_service)
):
    """
    Retrieve the historical orders for a specific trading agent.
    (Currently returns mocked data)
    """
    if limit < 1 or limit > 500:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 500.")
    if offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be non-negative.")

    order_history = await service.get_order_history(agent_id, limit, offset)
    return order_history

# Need to import logger if used in factory, e.g. from loguru import logger
from loguru import logger # Added for the factory placeholder
from typing import Callable # Added for factory type hint
```
