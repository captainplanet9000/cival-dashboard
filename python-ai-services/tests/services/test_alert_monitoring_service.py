import pytest
import pytest_asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone, timedelta
import uuid

from python_ai_services.services.alert_monitoring_service import AlertMonitoringService
from python_ai_services.services.alert_configuration_service import AlertConfigurationService
from python_ai_services.services.trading_data_service import TradingDataService
from python_ai_services.models.alert_models import AlertConfigOutput, AlertCondition, AlertNotification
from python_ai_services.models.dashboard_models import PortfolioSummary, AssetPositionSummary
from python_ai_services.core.websocket_manager import ConnectionManager # Added
from python_ai_services.models.websocket_models import WebSocketEnvelope # Added

@pytest_asyncio.fixture
def mock_alert_config_service() -> AlertConfigurationService:
    return MagicMock(spec=AlertConfigurationService)

@pytest_asyncio.fixture
def mock_trading_data_service() -> TradingDataService:
    return MagicMock(spec=TradingDataService)

@pytest_asyncio.fixture
def mock_connection_manager() -> MagicMock: # Added
    manager = MagicMock(spec=ConnectionManager)
    manager.send_to_client = AsyncMock()
    return manager

@pytest_asyncio.fixture
def alert_monitoring_service(
    mock_alert_config_service: AlertConfigurationService,
    mock_trading_data_service: TradingDataService,
    mock_connection_manager: MagicMock # Added
) -> AlertMonitoringService:
    return AlertMonitoringService(
        config_service=mock_alert_config_service,
        data_service=mock_trading_data_service,
        connection_mgr=mock_connection_manager # Added
    )

# --- Helper to create sample data ---
def create_sample_alert_config(
    agent_id: str, alert_id: str, conditions: List[AlertCondition],
    is_enabled: bool = True, cooldown: int = 300, name: str = "Test Alert"
) -> AlertConfigOutput:
    return AlertConfigOutput(
        alert_id=alert_id,
        agent_id=agent_id,
        name=name,
        conditions=conditions,
        notification_channels=["log"],
        is_enabled=is_enabled,
        cooldown_seconds=cooldown,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

def create_sample_portfolio_summary(
    account_value: float = 10000.0,
    total_pnl: float = 500.0,
    available_balance: float = 9000.0,
    margin_used: float = 1000.0,
    positions: Optional[List[AssetPositionSummary]] = None
) -> PortfolioSummary:
    if positions is None:
        positions = [AssetPositionSummary(asset="BTC", size=0.1, unrealized_pnl=150.0)]
    return PortfolioSummary(
        agent_id="test_agent", # agent_id in portfolio summary is not used by alert logic directly
        timestamp=datetime.now(timezone.utc),
        account_value_usd=account_value,
        total_pnl_usd=total_pnl,
        available_balance_usd=available_balance,
        margin_used_usd=margin_used,
        open_positions=positions
    )

# --- Test Cases for _evaluate_condition ---
# Test _evaluate_condition directly as it's complex
def test_evaluate_condition_account_value_met(alert_monitoring_service: AlertMonitoringService):
    condition = AlertCondition(metric="account_value_usd", operator="<", threshold=9500.0)
    portfolio = create_sample_portfolio_summary(account_value=9000.0)
    met, val = alert_monitoring_service._evaluate_condition(condition, portfolio)
    assert met is True
    assert val == 9000.0

def test_evaluate_condition_account_value_not_met(alert_monitoring_service: AlertMonitoringService):
    condition = AlertCondition(metric="account_value_usd", operator=">", threshold=10000.0)
    portfolio = create_sample_portfolio_summary(account_value=9000.0)
    met, val = alert_monitoring_service._evaluate_condition(condition, portfolio)
    assert met is False
    assert val == 9000.0

def test_evaluate_condition_position_pnl_met(alert_monitoring_service: AlertMonitoringService):
    condition = AlertCondition(metric="open_position_unrealized_pnl", operator="<", threshold=-50.0, asset_symbol="ETH")
    positions = [AssetPositionSummary(asset="ETH", size=1, unrealized_pnl=-100.0)]
    portfolio = create_sample_portfolio_summary(open_positions=positions)
    met, val = alert_monitoring_service._evaluate_condition(condition, portfolio)
    assert met is True
    assert val == -100.0

def test_evaluate_condition_position_pnl_asset_not_found(alert_monitoring_service: AlertMonitoringService):
    condition = AlertCondition(metric="open_position_unrealized_pnl", operator="<", threshold=-50.0, asset_symbol="ADA")
    positions = [AssetPositionSummary(asset="ETH", size=1, unrealized_pnl=-100.0)]
    portfolio = create_sample_portfolio_summary(open_positions=positions)
    met, val = alert_monitoring_service._evaluate_condition(condition, portfolio)
    assert met is False
    assert val is None

def test_evaluate_condition_position_pnl_no_asset_symbol_in_condition(alert_monitoring_service: AlertMonitoringService):
    condition = AlertCondition(metric="open_position_unrealized_pnl", operator="<", threshold=-50.0) # asset_symbol missing
    portfolio = create_sample_portfolio_summary() # Pydantic validation on AlertCondition should catch this if strict
    # Assuming it bypasses for test:
    met, val = alert_monitoring_service._evaluate_condition(condition, portfolio)
    assert met is False
    assert val is None


# --- Test Cases for check_and_trigger_alerts_for_agent ---
@pytest.mark.asyncio
async def test_check_alerts_no_enabled_configs(alert_monitoring_service: AlertMonitoringService, mock_alert_config_service: MagicMock):
    agent_id = "agent_no_alerts"
    mock_alert_config_service.get_alert_configs_for_agent = AsyncMock(return_value=[])

    notifications = await alert_monitoring_service.check_and_trigger_alerts_for_agent(agent_id)
    assert len(notifications) == 0
    mock_alert_config_service.get_alert_configs_for_agent.assert_called_once_with(agent_id, only_enabled=True)

@pytest.mark.asyncio
async def test_check_alerts_no_portfolio_summary(
    alert_monitoring_service: AlertMonitoringService,
    mock_alert_config_service: MagicMock,
    mock_trading_data_service: MagicMock
):
    agent_id = "agent_no_portfolio"
    alert_conf = create_sample_alert_config(agent_id, "alert1", [AlertCondition(metric="account_value_usd", operator="<", threshold=1000)])
    mock_alert_config_service.get_alert_configs_for_agent = AsyncMock(return_value=[alert_conf])
    mock_trading_data_service.get_portfolio_summary = AsyncMock(return_value=None)

    notifications = await alert_monitoring_service.check_and_trigger_alerts_for_agent(agent_id)
    assert len(notifications) == 0
    mock_trading_data_service.get_portfolio_summary.assert_called_once_with(agent_id)

@pytest.mark.asyncio
async def test_check_alerts_condition_met_and_triggered(
    alert_monitoring_service: AlertMonitoringService,
    mock_alert_config_service: MagicMock,
    mock_trading_data_service: MagicMock
):
    agent_id = "agent_trigger"
    alert_id = "alert_id_1"
    condition = AlertCondition(metric="account_value_usd", operator="<", threshold=9500.0)
    alert_conf = create_sample_alert_config(agent_id, alert_id, [condition], name="Low Balance Alert")

    mock_alert_config_service.get_alert_configs_for_agent = AsyncMock(return_value=[alert_conf])
    portfolio = create_sample_portfolio_summary(account_value=9000.0)
    mock_trading_data_service.get_portfolio_summary = AsyncMock(return_value=portfolio)

    # Mock _send_notifications to verify it's called
    alert_monitoring_service._send_notifications = AsyncMock()

    notifications = await alert_monitoring_service.check_and_trigger_alerts_for_agent(agent_id)

    assert len(notifications) == 1
    notification = notifications[0]
    assert notification.alert_id == alert_id
    assert notification.agent_id == agent_id
    assert "Low Balance Alert" in notification.message
    assert "account_value_usd < 9500.0 (current value: 9000.00)" in notification.message
    assert len(notification.triggered_conditions_details) == 1

    alert_monitoring_service._send_notifications.assert_called_once_with(alert_conf, notification)
    assert alert_id in alert_monitoring_service._last_triggered_times

@pytest.mark.asyncio
async def test_check_alerts_condition_not_met(
    alert_monitoring_service: AlertMonitoringService,
    mock_alert_config_service: MagicMock,
    mock_trading_data_service: MagicMock
):
    agent_id = "agent_no_trigger"
    condition = AlertCondition(metric="account_value_usd", operator=">", threshold=10000.0) # Not met
    alert_conf = create_sample_alert_config(agent_id, "alert2", [condition])

    mock_alert_config_service.get_alert_configs_for_agent = AsyncMock(return_value=[alert_conf])
    portfolio = create_sample_portfolio_summary(account_value=9000.0) # Current value doesn't meet condition
    mock_trading_data_service.get_portfolio_summary = AsyncMock(return_value=portfolio)
    alert_monitoring_service._send_notifications = AsyncMock()

    notifications = await alert_monitoring_service.check_and_trigger_alerts_for_agent(agent_id)
    assert len(notifications) == 0
    alert_monitoring_service._send_notifications.assert_not_called()

@pytest.mark.asyncio
async def test_check_alerts_cooldown_prevents_trigger(
    alert_monitoring_service: AlertMonitoringService,
    mock_alert_config_service: MagicMock,
    mock_trading_data_service: MagicMock
):
    agent_id = "agent_cooldown"
    alert_id = "alert_cooldown_1"
    condition = AlertCondition(metric="account_value_usd", operator="<", threshold=9500.0)
    alert_conf = create_sample_alert_config(agent_id, alert_id, [condition], cooldown=600) # 10 min cooldown

    mock_alert_config_service.get_alert_configs_for_agent = AsyncMock(return_value=[alert_conf])
    portfolio = create_sample_portfolio_summary(account_value=9000.0) # Condition is met
    mock_trading_data_service.get_portfolio_summary = AsyncMock(return_value=portfolio)
    alert_monitoring_service._send_notifications = AsyncMock()

    # Simulate it was triggered recently
    alert_monitoring_service._last_triggered_times[alert_id] = datetime.now(timezone.utc) - timedelta(seconds=100)

    notifications = await alert_monitoring_service.check_and_trigger_alerts_for_agent(agent_id)
    assert len(notifications) == 0 # Should be skipped due to cooldown
    alert_monitoring_service._send_notifications.assert_not_called()

    # Simulate cooldown has passed
    alert_monitoring_service._last_triggered_times[alert_id] = datetime.now(timezone.utc) - timedelta(seconds=700)
    notifications_after_cooldown = await alert_monitoring_service.check_and_trigger_alerts_for_agent(agent_id)
    assert len(notifications_after_cooldown) == 1 # Should trigger now
    alert_monitoring_service._send_notifications.assert_called_once()


@pytest.mark.asyncio
async def test_send_notifications_logs_and_websocket(alert_monitoring_service: AlertMonitoringService, mock_connection_manager: MagicMock): # Renamed and added mock_connection_manager
    alert_id = "alert_send_log_ws"
    agent_id = "agent_send_log_ws"
    alert_config = create_sample_alert_config(
        agent_id, alert_id,
        conditions=[],
        name="Log & WS Test",
        notification_channels=["log", "websocket", "email_placeholder"], # Added "websocket"
        target_email="test@example.com"
        # target_webhook_url not used for this specific test focus
    )
    notification = AlertNotification(
        alert_id=alert_id, alert_name="Log & WS Test", agent_id=agent_id,
        message="Test log and WebSocket notification message", triggered_conditions_details=[]
    )

    # Patch loguru's logger instance if it's used within the service directly
    # If the service uses self.logger (instance logger), then patch that.
    # Assuming logger is imported globally in the service file for now.
    with patch('python_ai_services.services.alert_monitoring_service.logger.warning') as mock_log_warn, \
         patch('python_ai_services.services.alert_monitoring_service.logger.info') as mock_log_info:

        await alert_monitoring_service._send_notifications(alert_config, notification)

        # Check log channel
        mock_log_warn.assert_any_call(f"ALERT TRIGGERED (Agent: {agent_id}, Alert: Log & WS Test): Test log and WebSocket notification message")
        # Check email placeholder channel
        mock_log_info.assert_any_call(f"Placeholder: Would send email to test@example.com: Test log and WebSocket notification message")

        # Check WebSocket channel
        mock_connection_manager.send_to_client.assert_called_once()
        call_args = mock_connection_manager.send_to_client.call_args[0]
        assert call_args[0] == agent_id # client_id for websocket is agent_id

        ws_envelope: WebSocketEnvelope = call_args[1]
        assert isinstance(ws_envelope, WebSocketEnvelope)
        assert ws_envelope.event_type == "ALERT_TRIGGERED"
        assert ws_envelope.agent_id == agent_id
        assert ws_envelope.payload == notification.model_dump(mode='json') # mode='json' for datetime serialization
        # Check if the specific log for successful WS send was made
        mock_log_info.assert_any_call(f"Sent WebSocket ALERT_TRIGGERED for alert {alert_config.name} to agent {alert_config.agent_id}")


@pytest.mark.asyncio
async def test_send_notifications_websocket_manager_unavailable(alert_monitoring_service: AlertMonitoringService, caplog):
    # Temporarily set connection_manager to None for this service instance
    # Need to correctly path the logger for caplog if it's instance logger or module logger
    # For this test, directly check logger output related to the service.
    alert_monitoring_service.connection_manager = None # Simulate no manager available

    alert_id = "alert_no_ws_mgr"
    agent_id = "agent_no_ws_mgr"
    alert_config = create_sample_alert_config(
        agent_id, alert_id, conditions=[], name="WS No Manager Test",
        notification_channels=["websocket"] # Only websocket
    )
    notification = AlertNotification(
        alert_id=alert_id, alert_name="WS No Manager Test", agent_id=agent_id,
        message="Test WS no manager", triggered_conditions_details=[]
    )

    # Use caplog from pytest to capture loguru logs if logger is module-level
    # If self.logger, then patch that specific logger instance.
    # Assuming module-level logger for this example based on previous structure.
    with patch('python_ai_services.services.alert_monitoring_service.logger.warning') as mock_log_warning_in_method:
        await alert_monitoring_service._send_notifications(alert_config, notification)
        mock_log_warning_in_method.assert_any_call(f"Cannot send WebSocket notification for alert {alert_id}: ConnectionManager not available.")

# Need List, Optional from typing for helpers
from typing import List, Optional, Any # Added Any
```
