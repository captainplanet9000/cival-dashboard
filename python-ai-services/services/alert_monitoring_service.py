from typing import List
from loguru import logger

from ..models.alert_models import AlertNotification
from .alert_configuration_service import AlertConfigurationService
from .trading_data_service import TradingDataService
from ..services.event_bus_service import EventBusService
from ..models.event_bus_models import Event

class AlertMonitoringService:
    def __init__(self, config_service: AlertConfigurationService, trading_data_service: TradingDataService, event_bus: EventBusService) -> None:
        self.config_service = config_service
        self.trading_data_service = trading_data_service
        self.event_bus = event_bus

    async def check_and_trigger_alerts_for_agent(self, agent_id: str) -> None:
        configs = await self.config_service.get_alert_configs_for_agent(agent_id, only_enabled=True)
        if not configs:
            return
        portfolio = await self.trading_data_service.get_portfolio_summary(agent_id)
        if not portfolio:
            return
        for cfg in configs:
            triggered = False
            for cond in cfg.conditions:
                current_value = getattr(portfolio, cond.metric, None)
                if current_value is None:
                    continue
                if eval(f"{current_value} {cond.operator} {cond.threshold}"):
                    triggered = True
            if triggered:
                notification = AlertNotification(
                    alert_id=cfg.alert_id,
                    alert_name=cfg.name,
                    agent_id=agent_id,
                    message="Alert conditions met",
                    triggered_conditions_details=[c.model_dump() for c in cfg.conditions],
                )
                await self.event_bus.publish(Event(publisher_agent_id=agent_id, message_type="AlertTriggeredEvent", payload=notification.model_dump()))
                logger.info(f"Alert {cfg.alert_id} triggered for agent {agent_id}")
