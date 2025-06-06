from pathlib import Path
from loguru import logger
from ..models.learning_models import LearningLogEntry

class LearningDataLoggerService:
    def __init__(self, log_dir: Path | str = "learning_logs") -> None:
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

    async def log_entry(self, entry: LearningLogEntry) -> None:
        path = self.log_dir / f"{entry.log_id}.json"
        path.write_text(entry.model_dump_json())
        logger.debug(f"Learning log written to {path}")
