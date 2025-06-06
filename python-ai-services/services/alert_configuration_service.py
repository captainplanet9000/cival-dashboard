from typing import Dict, List, Optional, Any
from loguru import logger

from ..models.alert_models import AlertConfigInput, AlertConfigOutput

class AlertConfigurationService:
    """Simple in-memory alert configuration store."""

    def __init__(self) -> None:
        self._configs: Dict[str, AlertConfigOutput] = {}

    async def create_alert_config(self, agent_id: str, config_input: AlertConfigInput) -> AlertConfigOutput:
        config = AlertConfigOutput(**config_input.model_dump(), agent_id=agent_id)
        self._configs[config.alert_id] = config
        logger.info(f"Alert config {config.alert_id} created for agent {agent_id}")
        return config

    async def get_alert_configs_for_agent(self, agent_id: str, only_enabled: bool = False) -> List[AlertConfigOutput]:
        configs = [cfg for cfg in self._configs.values() if cfg.agent_id == agent_id]
        if only_enabled:
            configs = [c for c in configs if c.is_enabled]
        return configs

    async def get_alert_config(self, alert_id: str) -> Optional[AlertConfigOutput]:
        return self._configs.get(alert_id)

    async def update_alert_config(self, alert_id: str, update_data: Dict[str, Any]) -> Optional[AlertConfigOutput]:
        cfg = self._configs.get(alert_id)
        if not cfg:
            return None
        updated = cfg.model_copy(update=update_data)
        self._configs[alert_id] = updated
        logger.info(f"Alert config {alert_id} updated")
        return updated

    async def delete_alert_config(self, alert_id: str) -> bool:
        existed = self._configs.pop(alert_id, None)
        if existed:
            logger.info(f"Alert config {alert_id} deleted")
            return True
        return False
