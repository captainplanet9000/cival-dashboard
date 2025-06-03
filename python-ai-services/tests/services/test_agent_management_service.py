import pytest
import pytest_asyncio
from datetime import datetime, timezone
import uuid

from python_ai_services.models.agent_models import (
    AgentConfigInput,
    AgentStrategyConfig,
    AgentRiskConfig,
    AgentUpdateRequest,
    AgentConfigOutput,
    AgentStatus
)
from python_ai_services.services.agent_management_service import AgentManagementService

@pytest_asyncio.fixture
async def service() -> AgentManagementService:
    """Provides a fresh instance of AgentManagementService for each test."""
    return AgentManagementService()

@pytest.mark.asyncio
async def test_create_agent(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="test_strat", parameters={"param1": 10})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    agent_input = AgentConfigInput(
        name="Test Agent",
        strategy=strategy_conf,
        risk_config=risk_conf,
        execution_provider="paper"
    )

    created_agent = await service.create_agent(agent_input)

    assert isinstance(created_agent, AgentConfigOutput)
    assert created_agent.name == "Test Agent"
    assert created_agent.agent_id is not None
    assert created_agent.is_active is False
    assert created_agent.strategy.strategy_name == "test_strat"

    # Check status initialization
    status = await service.get_agent_status(created_agent.agent_id)
    assert status is not None
    assert status.status == "stopped"

@pytest.mark.asyncio
async def test_get_agent(service: AgentManagementService):
    # First, create an agent
    strategy_conf = AgentStrategyConfig(strategy_name="s1", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.02)
    agent_input = AgentConfigInput(name="Agent S1", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)

    # Retrieve it
    retrieved_agent = await service.get_agent(created_agent.agent_id)
    assert retrieved_agent is not None
    assert retrieved_agent.agent_id == created_agent.agent_id
    assert retrieved_agent.name == "Agent S1"

    # Try to retrieve non-existent agent
    non_existent_agent = await service.get_agent(str(uuid.uuid4()))
    assert non_existent_agent is None

@pytest.mark.asyncio
async def test_get_agents(service: AgentManagementService):
    agents_list = await service.get_agents()
    assert len(agents_list) == 0

    strategy_conf = AgentStrategyConfig(strategy_name="s", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01)
    await service.create_agent(AgentConfigInput(name="A1", strategy=strategy_conf, risk_config=risk_conf))
    await service.create_agent(AgentConfigInput(name="A2", strategy=strategy_conf, risk_config=risk_conf))

    agents_list = await service.get_agents()
    assert len(agents_list) == 2

@pytest.mark.asyncio
async def test_update_agent(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="initial_strat", parameters={"p1": 1, "p2": "a"})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=500, risk_per_trade_percentage=0.01, stop_loss_percentage=0.05)
    agent_input = AgentConfigInput(name="Initial Name", description="Desc", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)
    original_updated_at = created_agent.updated_at

    update_payload = AgentUpdateRequest(
        name="Updated Name",
        description="New Desc",
        strategy=AgentStrategyConfig(strategy_name="updated_strat", parameters={"p1": 2, "p3": "new_p"}), # p2 should remain
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.02), # SL should become None
        execution_provider="hyperliquid",
        hyperliquid_credentials_id="cred_123",
        is_active=True
    )

    # Make sure some time passes to check updated_at
    await asyncio.sleep(0.01) # Small delay to ensure timestamp changes
    updated_agent = await service.update_agent(created_agent.agent_id, update_payload)

    assert updated_agent is not None
    assert updated_agent.name == "Updated Name"
    assert updated_agent.description == "New Desc"
    assert updated_agent.strategy.strategy_name == "updated_strat"
    # Test strategy parameters merge logic (p1 updated, p2 kept, p3 added)
    assert updated_agent.strategy.parameters == {"p1": 2, "p2": "a", "p3": "new_p"}
    assert updated_agent.risk_config.max_capital_allocation_usd == 1000
    assert updated_agent.risk_config.risk_per_trade_percentage == 0.02
    assert updated_agent.risk_config.stop_loss_percentage is None # Was set, now updated to None via model default if not in payload
    assert updated_agent.execution_provider == "hyperliquid"
    assert updated_agent.hyperliquid_credentials_id == "cred_123"
    assert updated_agent.is_active is True
    assert updated_agent.updated_at > original_updated_at

    # Test partial update: only description
    new_desc_payload = AgentUpdateRequest(description="Even Newer Desc")
    further_updated_agent = await service.update_agent(created_agent.agent_id, new_desc_payload)
    assert further_updated_agent is not None
    assert further_updated_agent.name == "Updated Name" # Should remain from previous update
    assert further_updated_agent.description == "Even Newer Desc"

    # Test updating a non-existent agent
    non_existent_update = await service.update_agent(str(uuid.uuid4()), AgentUpdateRequest(name="ghost"))
    assert non_existent_update is None

@pytest.mark.asyncio
async def test_delete_agent(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="s", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01)
    agent_input = AgentConfigInput(name="To Delete", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)

    # Agent and its status should exist
    assert await service.get_agent(created_agent.agent_id) is not None
    assert await service.get_agent_status(created_agent.agent_id) is not None

    deleted = await service.delete_agent(created_agent.agent_id)
    assert deleted is True
    assert await service.get_agent(created_agent.agent_id) is None
    assert await service.get_agent_status(created_agent.agent_id) is None # Status should also be removed

    # Try to delete non-existent agent
    deleted_non_existent = await service.delete_agent(str(uuid.uuid4()))
    assert deleted_non_existent is False

@pytest.mark.asyncio
async def test_start_agent(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="s", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01)
    agent_input = AgentConfigInput(name="Startable Agent", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)
    assert created_agent.is_active is False # Starts inactive

    status_before_start = await service.get_agent_status(created_agent.agent_id)
    assert status_before_start.status == "stopped"

    start_status = await service.start_agent(created_agent.agent_id)
    assert start_status.status == "running" # Simulates 'starting' then 'running'
    assert start_status.message == "Agent is now running."

    updated_agent_config = await service.get_agent(created_agent.agent_id)
    assert updated_agent_config.is_active is True

    # Try to start non-existent agent
    with pytest.raises(ValueError, match="Agent with ID .* not found."):
        await service.start_agent(str(uuid.uuid4()))

@pytest.mark.asyncio
async def test_stop_agent(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="s", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01)
    agent_input = AgentConfigInput(name="Stoppable Agent", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)

    # Start it first
    await service.start_agent(created_agent.agent_id)
    agent_config_after_start = await service.get_agent(created_agent.agent_id)
    assert agent_config_after_start.is_active is True
    status_after_start = await service.get_agent_status(created_agent.agent_id)
    assert status_after_start.status == "running"

    # Now stop it
    stop_status = await service.stop_agent(created_agent.agent_id)
    assert stop_status.status == "stopped" # Simulates 'stopping' then 'stopped'
    assert stop_status.message == "Agent has been stopped."

    agent_config_after_stop = await service.get_agent(created_agent.agent_id)
    assert agent_config_after_stop.is_active is False

    # Try to stop non-existent agent
    with pytest.raises(ValueError, match="Agent with ID .* not found."):
        await service.stop_agent(str(uuid.uuid4()))

@pytest.mark.asyncio
async def test_get_agent_status_defaulting(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="s", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01)
    agent_input = AgentConfigInput(name="Status Test Agent", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)

    # Remove status to simulate inconsistency, then check if get_agent_status provides a default
    del service._agent_statuses[created_agent.agent_id]

    status = await service.get_agent_status(created_agent.agent_id)
    assert status is not None
    assert status.status == "stopped"
    assert "Status not explicitly tracked" in status.message

    # Check for non-existent agent ID
    non_existent_status = await service.get_agent_status(str(uuid.uuid4()))
    assert non_existent_status is None

@pytest.mark.asyncio
async def test_update_agent_heartbeat(service: AgentManagementService):
    strategy_conf = AgentStrategyConfig(strategy_name="s", parameters={})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01)
    agent_input = AgentConfigInput(name="Heartbeat Agent", strategy=strategy_conf, risk_config=risk_conf)
    created_agent = await service.create_agent(agent_input)
    await service.start_agent(created_agent.agent_id) # Agent needs to be running

    initial_status = await service.get_agent_status(created_agent.agent_id)
    assert initial_status is not None
    initial_heartbeat = initial_status.last_heartbeat

    await asyncio.sleep(0.01) # Ensure time passes
    updated_status = await service.update_agent_heartbeat(created_agent.agent_id, "Processing trades")

    assert updated_status is not None
    assert updated_status.last_heartbeat > initial_heartbeat
    assert updated_status.message == "Processing trades"

    # Test heartbeat for non-running agent
    await service.stop_agent(created_agent.agent_id)
    status_after_stop = await service.get_agent_status(created_agent.agent_id)
    heartbeat_after_stop = status_after_stop.last_heartbeat

    non_updated_status = await service.update_agent_heartbeat(created_agent.agent_id, "Still alive?")
    assert non_updated_status.last_heartbeat == heartbeat_after_stop # Should not update for stopped agent
    assert non_updated_status.message != "Still alive?" # Message should not change

    # Test heartbeat for non-existent agent
    assert await service.update_agent_heartbeat(str(uuid.uuid4())) is None

# Need to import asyncio for the sleep
import asyncio
```
