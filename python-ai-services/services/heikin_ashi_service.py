from loguru import logger
from typing import Optional
from ..models.agent_models import AgentConfigOutput
from ..models.event_bus_models import Event, TradeSignalEventPayload
from ..services.event_bus_service import EventBusService
from ..services.market_data_service import MarketDataService

class HeikinAshiTechnicalService:
    def __init__(self, agent_config: AgentConfigOutput, event_bus: EventBusService, market_data_service: MarketDataService) -> None:
        self.agent_config = agent_config
        self.event_bus = event_bus
        self.market_data_service = market_data_service

    async def analyze_symbol_and_generate_signal(self, symbol: str) -> None:
        logger.info(f"HeikinAshiService: analyzing {symbol} for {self.agent_config.agent_id}")
        payload = TradeSignalEventPayload(symbol=symbol, action="buy", strategy_name="HeikinAshi")
        await self.event_bus.publish(Event(publisher_agent_id=self.agent_config.agent_id, message_type="TradeSignal", payload=payload.model_dump()))
