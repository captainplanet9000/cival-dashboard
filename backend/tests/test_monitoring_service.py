# backend/tests/test_monitoring_service.py
import pytest
import asyncio
from unittest.mock import patch, AsyncMock

from backend.services.monitoring_service import MonitoringService

@pytest.fixture
def monitor_service():
    """Fixture to create an instance of MonitoringService for testing."""
    # Mock dependencies if needed (e.g., db_client, messaging_client)
    return MonitoringService(farm_id="test-farm-monitor")

@pytest.mark.asyncio
async def test_monitoring_service_initialization(monitor_service):
    """Test if the MonitoringService initializes correctly."""
    assert monitor_service.farm_id == "test-farm-monitor"
    assert not monitor_service._is_running
    assert monitor_service._monitoring_task is None

@pytest.mark.asyncio
async def test_start_and_stop_monitoring(monitor_service):
    """Test starting and stopping the monitoring loop."""
    with patch.object(monitor_service, '_monitoring_loop', new_callable=AsyncMock) as mock_loop:
        await monitor_service.start_monitoring(interval_seconds=0.1)
        assert monitor_service._is_running
        assert monitor_service._monitoring_task is not None
        await asyncio.sleep(0.3) # Allow the loop to run a few times

        await monitor_service.stop_monitoring()
        assert not monitor_service._is_running
        assert monitor_service._monitoring_task is None
        mock_loop.assert_called() # Check if the loop was actually started
        # Check if cancellation was handled (might need more specific checks)

@pytest.mark.asyncio
async def test_monitoring_loop_calls_checks(monitor_service):
    """Test if the monitoring loop calls the individual check methods."""
    monitor_service._is_running = True # Manually set for testing the loop directly

    with patch.object(monitor_service, 'check_agent_health', new_callable=AsyncMock) as mock_agent_check, \
         patch.object(monitor_service, 'check_vault_status', new_callable=AsyncMock) as mock_vault_check, \
         patch.object(monitor_service, 'check_linked_account_status', new_callable=AsyncMock) as mock_account_check, \
         patch.object(monitor_service, 'check_system_resources', new_callable=AsyncMock) as mock_resource_check, \
         patch.object(monitor_service, 'check_external_dependencies', new_callable=AsyncMock) as mock_dependency_check, \
         patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep: # Patch sleep to speed up test

        # Run the loop for one iteration
        async def side_effect(*args, **kwargs):
            monitor_service._is_running = False # Stop loop after one run
            return await asyncio.sleep(0) # Original sleep returns awaitable
        mock_sleep.side_effect = side_effect

        await monitor_service._monitoring_loop(interval_seconds=1)

        mock_agent_check.assert_awaited_once()
        mock_vault_check.assert_awaited_once()
        mock_account_check.assert_awaited_once()
        mock_resource_check.assert_awaited_once()
        mock_dependency_check.assert_awaited_once()
        mock_sleep.assert_awaited_once() # Ensure it waited at the end

@pytest.mark.asyncio
async def test_monitoring_loop_exception_handling(monitor_service):
    """Test if the monitoring loop handles exceptions in checks gracefully."""
    monitor_service._is_running = True

    with patch.object(monitor_service, 'check_agent_health', new_callable=AsyncMock, side_effect=ValueError("Test Error")) as mock_agent_check, \
         patch.object(monitor_service, 'check_vault_status', new_callable=AsyncMock) as mock_vault_check, \
         patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep, \
         patch('backend.services.monitoring_service.logger.error') as mock_logger_error:

        # Run the loop for one iteration
        async def side_effect(*args, **kwargs):
            # Check if sleep is called after the error
            if mock_logger_error.call_count > 0:
                monitor_service._is_running = False
            return await asyncio.sleep(0)
        mock_sleep.side_effect = side_effect

        await monitor_service._monitoring_loop(interval_seconds=1)

        mock_agent_check.assert_awaited_once()
        mock_vault_check.assert_not_awaited() # Should not proceed after error in agent check
        mock_logger_error.assert_called_once()
        assert "Error during monitoring cycle" in mock_logger_error.call_args[0][0]
        assert mock_sleep.call_count > 0 # Ensure it slept after the error

@pytest.mark.asyncio
async def test_trigger_alert(monitor_service):
    """Test the placeholder trigger_alert method."""
    with patch('backend.services.monitoring_service.logger.warning') as mock_logger_warning:
        await monitor_service.trigger_alert(
            severity='warning',
            component='TestComponent',
            message='This is a test alert.',
            details={'key': 'value'}
        )
        mock_logger_warning.assert_called_once()
        call_args = mock_logger_warning.call_args[0][0]
        assert "ALERT [WARNING]" in call_args
        assert "TestComponent" in call_args
        assert "This is a test alert." in call_args
        assert "{'key': 'value'}" in call_args

# TODO: Add more specific tests for each check method once implemented
# e.g., test_check_agent_health_detects_offline_agent()
# e.g., test_check_vault_status_detects_anomaly()
# e.g., test_check_linked_account_status_detects_invalid_key() 