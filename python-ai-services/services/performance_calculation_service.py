from loguru import logger
from typing import Optional

from ..models.performance_models import PerformanceMetrics
from .trading_data_service import TradingDataService

class PerformanceCalculationService:
    def __init__(self, trading_data_service: TradingDataService) -> None:
        self.trading_data_service = trading_data_service

    async def calculate_performance_metrics(self, agent_id: str) -> PerformanceMetrics:
        fills = await self.trading_data_service.get_trade_history(agent_id, limit=1000, offset=0)
        metrics = PerformanceMetrics(agent_id=agent_id, total_trades=len(fills))
        metrics.win_rate = None
        metrics.loss_rate = None
        metrics.total_net_pnl = 0.0
        logger.debug(f"Performance metrics calculated for {agent_id}")
        return metrics
