from pathlib import Path
from loguru import logger
import json
from typing import Dict, Any

class OrderHistoryServiceError(Exception):
    pass

class OrderHistoryService:
    def __init__(self, storage_dir: Path | str = "order_history") -> None:
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def record_order(self, agent_id: str, order_data: Dict[str, Any]) -> None:
        path = self.storage_dir / f"{agent_id}_orders.jsonl"
        with path.open("a") as f:
            f.write(json.dumps(order_data) + "\n")
        logger.debug(f"Recorded order for agent {agent_id}")

    async def link_fill_to_order(self, fill_id: str, order_id: str) -> None:
        # Placeholder: real implementation would update stored order record
        logger.debug(f"Linking fill {fill_id} to order {order_id}")
