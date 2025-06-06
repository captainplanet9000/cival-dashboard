from loguru import logger
from typing import Optional

from ..models.agent_models import AgentConfigOutput
from ..models.event_bus_models import Event, NewsArticleEventPayload
from ..services.event_bus_service import EventBusService
from .learning_data_logger_service import LearningDataLoggerService

class NewsAnalysisService:
    def __init__(self, agent_config: AgentConfigOutput, event_bus: EventBusService, learning_logger_service: Optional[LearningDataLoggerService] = None) -> None:
        self.agent_config = agent_config
        self.event_bus = event_bus
        self.learning_logger_service = learning_logger_service

    async def fetch_and_analyze_feeds(self) -> None:
        logger.info(f"NewsAnalysisService: fetching feeds for agent {self.agent_config.agent_id}")
        payload = NewsArticleEventPayload(source_feed_url="https://example.com", headline="Example", link="https://example.com/article")
        await self.event_bus.publish(Event(publisher_agent_id=self.agent_config.agent_id, message_type="NewsArticleEvent", payload=payload.model_dump()))
