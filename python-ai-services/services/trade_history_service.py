from pathlib import Path
import json
from typing import List
from loguru import logger

from ..models.trade_history_models import TradeFillData

class TradeHistoryService:
    def __init__(self, fills_dir: Path | str = "agent_fills") -> None:
        self.fills_dir = Path(fills_dir)
        self.fills_dir.mkdir(parents=True, exist_ok=True)

    async def record_fill(self, fill: TradeFillData) -> None:
        path = self.fills_dir / f"{fill.agent_id}_fills.jsonl"
        with path.open("a") as f:
            f.write(fill.model_dump_json() + "\n")
        logger.debug(f"Recorded fill for {fill.agent_id}")

    async def get_fills(self, agent_id: str, limit: int = 100, offset: int = 0) -> List[TradeFillData]:
        path = self.fills_dir / f"{agent_id}_fills.jsonl"
        if not path.exists():
            return []
        fills: List[TradeFillData] = []
        with path.open() as f:
            for line in f:
                try:
                    data = json.loads(line)
                    fills.append(TradeFillData(**data))
                except Exception:
                    continue
        fills.sort(key=lambda x: x.timestamp, reverse=True)
        return fills[offset:offset + limit]
