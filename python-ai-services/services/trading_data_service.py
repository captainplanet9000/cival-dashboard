from typing import List
from loguru import logger

from ..models.dashboard_models import PortfolioSummary, TradeLogItem, OrderLogItem, AssetPositionSummary
from .agent_management_service import AgentManagementService
from .trade_history_service import TradeHistoryService

class TradingDataService:
    def __init__(self, agent_service: AgentManagementService, trade_history_service: TradeHistoryService) -> None:
        self.agent_service = agent_service
        self.trade_history_service = trade_history_service

    async def get_portfolio_summary(self, agent_id: str) -> PortfolioSummary | None:
        fills = await self.trade_history_service.get_fills(agent_id, limit=1000, offset=0)
        account_value = sum(f.price * f.quantity for f in fills)
        return PortfolioSummary(agent_id=agent_id, timestamp=fills[0].timestamp if fills else None, account_value_usd=account_value, total_pnl_usd=0.0, open_positions=[])

    async def get_trade_history(self, agent_id: str, limit: int, offset: int) -> List[TradeLogItem]:
        fills = await self.trade_history_service.get_fills(agent_id, limit, offset)
        return [TradeLogItem(agent_id=agent_id, asset=f.asset, opening_side=f.side, order_type="market", quantity=f.quantity, entry_price_avg=f.price, exit_price_avg=f.price, exit_timestamp=f.timestamp) for f in fills]

    async def get_open_orders(self, agent_id: str) -> List[OrderLogItem]:
        return []

    async def get_order_history(self, agent_id: str, limit: int, offset: int) -> List[OrderLogItem]:
        return []
