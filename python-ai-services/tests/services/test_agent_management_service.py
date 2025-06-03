import pytest
import pytest_asyncio
from datetime import datetime, timezone
import uuid
import json
import os
from pathlib import Path # For tmp_path type hint

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
async def service(tmp_path: Path) -> AgentManagementService:
    """Provides a fresh instance of AgentManagementService using a temporary config directory."""
    return AgentManagementService(config_dir=tmp_path)

# Helper to create agent input for tests
def create_sample_agent_input(name: str = "Test Agent") -> AgentConfigInput:
    strategy_conf = AgentStrategyConfig(strategy_name="test_strat", parameters={"param1": 10})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    return AgentConfigInput(
        name=name,
        strategy=strategy_conf,
        risk_config=risk_conf,
        execution_provider="paper"
    )

@pytest.mark.asyncio
async def test_create_agent(service: AgentManagementService, tmp_path: Path):
    agent_input = create_sample_agent_input()
    created_agent = await service.create_agent(agent_input)

    assert isinstance(created_agent, AgentConfigOutput)
    assert created_agent.name == "Test Agent"
    agent_id = created_agent.agent_id
    assert agent_id is not None
    assert created_agent.is_active is False

    # Verify file was created
    expected_file = tmp_path / f"{agent_id}.json"
    assert expected_file.exists()
    with open(expected_file, 'r') as f:
        data = json.load(f)
        assert data["agent_id"] == agent_id
        assert data["name"] == "Test Agent"
        assert data["is_active"] is False

    # Check status initialization
    status = await service.get_agent_status(agent_id)
    assert status is not None
    assert status.status == "stopped"

@pytest.mark.asyncio
async def test_get_agent(service: AgentManagementService, tmp_path: Path):
    # First, create an agent directly by saving a file
    agent_id_manual = str(uuid.uuid4())
    manual_agent_data = AgentConfigOutput(
        agent_id=agent_id_manual, name="Manual Agent",
        strategy=AgentStrategyConfig(strategy_name="s_manual", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=200, risk_per_trade_percentage=0.03),
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    with open(tmp_path / f"{agent_id_manual}.json", 'w') as f:
        f.write(manual_agent_data.model_dump_json(indent=2))

    # Initialize its status as _load_existing_statuses would typically do on service init
    # or get_agent_status would provide a default. For this direct test, let's ensure it's there for consistency.
    service._agent_statuses[agent_id_manual] = AgentStatus(agent_id=agent_id_manual, status="stopped")


    retrieved_agent = await service.get_agent(agent_id_manual)
    assert retrieved_agent is not None
    assert retrieved_agent.agent_id == agent_id_manual
    assert retrieved_agent.name == "Manual Agent"

    non_existent_agent = await service.get_agent(str(uuid.uuid4()))
    assert non_existent_agent is None

@pytest.mark.asyncio
async def test_get_agents(service: AgentManagementService, tmp_path: Path):
    agents_list = await service.get_agents()
    assert len(agents_list) == 0 # Should be empty initially or only contain from _load_existing_statuses

    # Create some agent files
    agent_input1 = create_sample_agent_input("FileAgent1")
    created1 = await service.create_agent(agent_input1) # Uses service to create file

    agent_input2 = create_sample_agent_input("FileAgent2")
    created2 = await service.create_agent(agent_input2)

    agents_list = await service.get_agents()
    assert len(agents_list) == 2
    agent_names = {agent.name for agent in agents_list}
    assert "FileAgent1" in agent_names
    assert "FileAgent2" in agent_names

@pytest.mark.asyncio
async def test_update_agent(service: AgentManagementService, tmp_path: Path):
    agent_input = create_sample_agent_input("Initial Name")
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id
    original_updated_at_iso = created_agent.updated_at.isoformat()


    update_payload = AgentUpdateRequest(name="Updated Name", description="New Desc")

    await asyncio.sleep(0.01) # Ensure timestamp can change
    updated_agent = await service.update_agent(agent_id, update_payload)

    assert updated_agent is not None
    assert updated_agent.name == "Updated Name"
    assert updated_agent.description == "New Desc"
    # Pydantic v1 to_datetime on updated_at might be naive if not careful with isoformat from file.
    # Service saves with timezone. Pydantic model should parse it back to aware.
    assert updated_agent.updated_at.isoformat() > original_updated_at_iso

    # Verify file content
    expected_file = tmp_path / f"{agent_id}.json"
    with open(expected_file, 'r') as f:
        data = json.load(f)
        assert data["name"] == "Updated Name"
        assert data["description"] == "New Desc"

    non_existent_update = await service.update_agent(str(uuid.uuid4()), AgentUpdateRequest(name="ghost"))
    assert non_existent_update is None

@pytest.mark.asyncio
async def test_delete_agent(service: AgentManagementService, tmp_path: Path):
    agent_input = create_sample_agent_input("To Delete")
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id

    expected_file = tmp_path / f"{agent_id}.json"
    assert expected_file.exists()
    assert await service.get_agent_status(agent_id) is not None # Status should exist

    deleted = await service.delete_agent(agent_id)
    assert deleted is True
    assert not expected_file.exists()
    assert await service.get_agent(agent_id) is None
    assert await service.get_agent_status(agent_id) is None # Status should also be removed

    deleted_non_existent = await service.delete_agent(str(uuid.uuid4()))
    assert deleted_non_existent is False

@pytest.mark.asyncio
async def test_start_agent(service: AgentManagementService, tmp_path: Path):
    agent_input = create_sample_agent_input("Startable Agent")
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id
    assert created_agent.is_active is False

    start_status = await service.start_agent(agent_id)
    assert start_status.status == "running"

    # Verify is_active in file
    retrieved_agent_config = await service.get_agent(agent_id)
    assert retrieved_agent_config is not None
    assert retrieved_agent_config.is_active is True

    expected_file = tmp_path / f"{agent_id}.json"
    with open(expected_file, 'r') as f:
        data = json.load(f)
        assert data["is_active"] is True

@pytest.mark.asyncio
async def test_stop_agent(service: AgentManagementService, tmp_path: Path):
    agent_input = create_sample_agent_input("Stoppable Agent")
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id

    await service.start_agent(agent_id) # Start it first
    agent_config_after_start = await service.get_agent(agent_id)
    assert agent_config_after_start.is_active is True

    stop_status = await service.stop_agent(agent_id)
    assert stop_status.status == "stopped"

    # Verify is_active in file
    retrieved_agent_config_after_stop = await service.get_agent(agent_id)
    assert retrieved_agent_config_after_stop is not None
    assert retrieved_agent_config_after_stop.is_active is False

    expected_file = tmp_path / f"{agent_id}.json"
    with open(expected_file, 'r') as f:
        data = json.load(f)
        assert data["is_active"] is False

@pytest.mark.asyncio
async def test_get_agent_status_after_service_restart_with_existing_files(tmp_path: Path):
    agent_id_active_in_file = str(uuid.uuid4())
    agent_id_inactive_in_file = str(uuid.uuid4())

    # Create mock config files as if they existed before service start
    active_config_data = AgentConfigOutput(
        agent_id=agent_id_active_in_file, name="Active In File", is_active=True, # is_active=True in file
        strategy=AgentStrategyConfig(strategy_name="s", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01),
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    with open(tmp_path / f"{agent_id_active_in_file}.json", 'w') as f:
        f.write(active_config_data.model_dump_json())

    inactive_config_data = AgentConfigOutput(
        agent_id=agent_id_inactive_in_file, name="Inactive In File", is_active=False,
        strategy=AgentStrategyConfig(strategy_name="s", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01),
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    with open(tmp_path / f"{agent_id_inactive_in_file}.json", 'w') as f:
        f.write(inactive_config_data.model_dump_json())

    # New service instance, will run _load_existing_statuses
    restarted_service = AgentManagementService(config_dir=tmp_path)

    status_active_in_file = await restarted_service.get_agent_status(agent_id_active_in_file)
    assert status_active_in_file is not None
    # _load_existing_statuses initializes all to 'stopped' regardless of is_active in file,
    # as runtime state is ephemeral and requires explicit start.
    assert status_active_in_file.status == "stopped"

    status_inactive_in_file = await restarted_service.get_agent_status(agent_id_inactive_in_file)
    assert status_inactive_in_file is not None
    assert status_inactive_in_file.status == "stopped"

    # Test that get_agent still loads the correct is_active from file
    loaded_active_config = await restarted_service.get_agent(agent_id_active_in_file)
    assert loaded_active_config.is_active is True

@pytest.mark.asyncio
async def test_update_agent_heartbeat_running_agent(service: AgentManagementService):
    agent_input = create_sample_agent_input("Heartbeat Agent")
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id
    await service.start_agent(agent_id) # Agent needs to be running

    initial_status = await service.get_agent_status(agent_id)
    assert initial_status is not None
    initial_heartbeat = initial_status.last_heartbeat
    initial_message = initial_status.message # Store initial message

    await asyncio.sleep(0.01) # Ensure time passes
    result = await service.update_agent_heartbeat(agent_id) # No message param
    assert result is True

    updated_status = await service.get_agent_status(agent_id)
    assert updated_status is not None
    assert updated_status.last_heartbeat > initial_heartbeat
    # Message should remain the same as heartbeat doesn't update it with new signature
    assert updated_status.message == initial_message
    assert updated_status.status == "running"

@pytest.mark.asyncio
async def test_update_agent_heartbeat_stopped_agent_becomes_running(service: AgentManagementService):
    # Per prompt: "ensure status is running" on heartbeat if config exists
    agent_input = create_sample_agent_input("Stopped Heartbeat Agent")
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id

    initial_status = await service.get_agent_status(agent_id)
    assert initial_status is not None
    assert initial_status.status == "stopped"
    initial_heartbeat = initial_status.last_heartbeat

    result = await service.update_agent_heartbeat(agent_id) # No message param
    assert result is True

    updated_status = await service.get_agent_status(agent_id)
    assert updated_status is not None
    assert updated_status.last_heartbeat > initial_heartbeat
    assert updated_status.status == "running" # Status changed to running
    assert "Forcing to 'running' due to heartbeat" in updated_status.message


@pytest.mark.asyncio
async def test_update_agent_heartbeat_non_existent_agent_config(service: AgentManagementService):
    non_existent_agent_id = str(uuid.uuid4())
    result = await service.update_agent_heartbeat(non_existent_agent_id) # No message param
    assert result is False

@pytest.mark.asyncio
async def test_update_agent_heartbeat_status_not_in_memory_but_config_exists(service: AgentManagementService, tmp_path: Path):
    agent_id = str(uuid.uuid4())
    # Create a config file manually to simulate existing agent after service restart
    config_data = AgentConfigOutput(
        agent_id=agent_id, name="HB Test No Mem Status", is_active=True,
        strategy=AgentStrategyConfig(strategy_name="s", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01),
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    with open(tmp_path / f"{agent_id}.json", 'w') as f:
        f.write(config_data.model_dump_json())

    # Ensure status is not in memory
    if agent_id in service._agent_statuses:
        del service._agent_statuses[agent_id]

    result = await service.update_agent_heartbeat(agent_id) # No message param
    assert result is True

    updated_status = await service.get_agent_status(agent_id)
    assert updated_status is not None
    assert updated_status.status == "running"
    assert "Heartbeat received, status auto-initialized to running" in updated_status.message


# Need asyncio for sleep in update test
import asyncio
```
