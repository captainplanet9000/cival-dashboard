from loguru import logger
from typing import Optional

from ..models.agent_models import AgentConfigOutput
from ..models.event_bus_models import Event, TradeSignalEventPayload
from ..services.event_bus_service import EventBusService
from ..services.market_data_service import MarketDataService
from .learning_data_logger_service import LearningDataLoggerService

class WilliamsAlligatorTechnicalService:
    def __init__(self, agent_config: AgentConfigOutput, event_bus: EventBusService, market_data_service: MarketDataService, learning_logger_service: Optional[LearningDataLoggerService] = None) -> None:
        self.agent_config = agent_config
        self.event_bus = event_bus
        self.market_data_service = market_data_service
        self.learning_logger_service = learning_logger_service

    async def analyze_symbol_and_generate_signal(self, symbol: str) -> None:
        logger.info(f"WilliamsAlligatorService: analyzing {symbol} for agent {self.agent_config.agent_id}")
        payload = TradeSignalEventPayload(symbol=symbol, action="buy", strategy_name="WilliamsAlligator")
        await self.event_bus.publish(Event(publisher_agent_id=self.agent_config.agent_id, message_type="TradeSignal", payload=payload.model_dump()))
