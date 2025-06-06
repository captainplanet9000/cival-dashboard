from collections import defaultdict
from typing import Callable, Awaitable, Dict, List
from loguru import logger

from ..models.event_bus_models import Event

Handler = Callable[[Event], Awaitable[None]]

class EventBusService:
    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Handler]] = defaultdict(list)

    async def subscribe(self, message_type: str, handler: Handler) -> None:
        self._subscribers[message_type].append(handler)
        logger.debug(f"Subscribed handler to {message_type}")

    async def publish(self, event: Event) -> None:
        handlers = list(self._subscribers.get(event.message_type, []))
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"EventBus handler error for {event.message_type}: {e}")
