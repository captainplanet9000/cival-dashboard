# __init__.py for core module

from .factories import get_hyperliquid_execution_service_instance
from .scheduler_setup import (
    scheduler, # The global scheduler instance itself
    schedule_agent_orchestration,
    schedule_alert_monitoring,
    _run_alert_monitoring_for_active_agents, # Might not be needed for external export
    start_scheduler,
    shutdown_scheduler
)
from .websocket_manager import connection_manager # Added

__all__ = [
    "connection_manager", # Added
    "get_hyperliquid_execution_service_instance",
    "scheduler",
    "schedule_agent_orchestration",
    "schedule_alert_monitoring",
    # "_run_alert_monitoring_for_active_agents", # Typically private/helper, not exported
    "start_scheduler",
    "shutdown_scheduler"
]
