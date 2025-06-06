from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone
import json
from loguru import logger

from ..models.dashboard_models import PortfolioSnapshotOutput
from ..services.event_bus_service import EventBusService
from ..models.event_bus_models import Event
from sqlalchemy.orm import sessionmaker

class PortfolioSnapshotService:
    def __init__(self, session_factory: sessionmaker, event_bus: Optional[EventBusService] = None, storage_dir: Path | str = "snapshots") -> None:
        self.session_factory = session_factory
        self.event_bus = event_bus
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def record_snapshot(self, agent_id: str, total_equity_usd: float) -> None:
        snapshot = PortfolioSnapshotOutput(agent_id=agent_id, timestamp=datetime.now(timezone.utc), total_equity_usd=total_equity_usd)
        path = self.storage_dir / f"{agent_id}_snapshots.jsonl"
        with path.open("a") as f:
            f.write(snapshot.model_dump_json() + "\n")
        if self.event_bus:
            await self.event_bus.publish(Event(publisher_agent_id=agent_id, message_type="PortfolioSnapshotTakenEvent", payload=snapshot.model_dump()))
        logger.debug(f"Recorded portfolio snapshot for {agent_id}")

    async def get_historical_snapshots(self, agent_id: str, start_time: Optional[datetime] = None, end_time: Optional[datetime] = None, limit: int = 1000, sort_ascending: bool = True) -> List[PortfolioSnapshotOutput]:
        path = self.storage_dir / f"{agent_id}_snapshots.jsonl"
        if not path.exists():
            return []
        snapshots = []
        with path.open() as f:
            for line in f:
                try:
                    data = json.loads(line)
                    snap = PortfolioSnapshotOutput(**data)
                    if start_time and snap.timestamp < start_time:
                        continue
                    if end_time and snap.timestamp > end_time:
                        continue
                    snapshots.append(snap)
                except Exception:
                    continue
        snapshots.sort(key=lambda s: s.timestamp, reverse=not sort_ascending)
        return snapshots[:limit]
