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
    agent_input.operational_parameters = {"op_param1": "initial_op", "op_param2": 100}
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id
    original_updated_at_iso = created_agent.updated_at.isoformat()
    original_op_params = created_agent.operational_parameters.copy()


    update_payload = AgentUpdateRequest(
        name="Updated Name",
        description="New Desc",
        agent_type="SpecialAgent",
        parent_agent_id="parent123",
        operational_parameters={"op_param1": "updated_op", "op_param3": True} # op_param2 should remain, op_param1 updated, op_param3 added
    )

    await asyncio.sleep(0.01) # Ensure timestamp can change
    updated_agent = await service.update_agent(agent_id, update_payload)

    assert updated_agent is not None
    assert updated_agent.name == "Updated Name"
    assert updated_agent.description == "New Desc"
    assert updated_agent.agent_type == "SpecialAgent"
    assert updated_agent.parent_agent_id == "parent123"

    expected_op_params = original_op_params.copy()
    expected_op_params.update(update_payload.operational_parameters) # type: ignore
    assert updated_agent.operational_parameters == expected_op_params

    assert updated_agent.updated_at.isoformat() > original_updated_at_iso

    # Verify file content
    expected_file = tmp_path / f"{agent_id}.json"
    with open(expected_file, 'r') as f:
        data = json.load(f)
        assert data["name"] == "Updated Name"
        assert data["description"] == "New Desc"
        assert data["agent_type"] == "SpecialAgent"
        assert data["parent_agent_id"] == "parent123"
        assert data["operational_parameters"] == expected_op_params

    non_existent_update = await service.update_agent(str(uuid.uuid4()), AgentUpdateRequest(name="ghost"))
    assert non_existent_update is None

@pytest.mark.asyncio
async def test_update_agent_only_operational_params(service: AgentManagementService, tmp_path: Path):
    agent_input = create_sample_agent_input("OpParamAgent")
    agent_input.operational_parameters = {"initial_key": "initial_value"}
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id

    update_op_params = AgentUpdateRequest(operational_parameters={"new_key": "new_value", "initial_key": "updated_initial_value"})
    updated_agent = await service.update_agent(agent_id, update_op_params)

    assert updated_agent is not None
    assert updated_agent.operational_parameters == {"initial_key": "updated_initial_value", "new_key": "new_value"}

@pytest.mark.asyncio
async def test_load_agent_missing_new_fields_uses_defaults(service: AgentManagementService, tmp_path: Path):
    agent_id = str(uuid.uuid4())
    # Create a JSON file that represents an older agent config (missing new fields)
    old_format_data = {
        "agent_id": agent_id,
        "name": "Old Agent",
        "strategy": {"strategy_name": "old_strat", "parameters": {}},
        "risk_config": {"max_capital_allocation_usd": 100, "risk_per_trade_percentage": 0.01},
        "execution_provider": "paper",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": False
        # agent_type, parent_agent_id, operational_parameters are missing
    }
    with open(tmp_path / f"{agent_id}.json", 'w') as f:
        json.dump(old_format_data, f)

    # Initialize status for this manually created agent file for get_agent_status to work if called by other parts
    service._agent_statuses[agent_id] = AgentStatus(agent_id=agent_id, status="stopped")


    loaded_agent = await service.get_agent(agent_id)
    assert loaded_agent is not None
    assert loaded_agent.agent_type == "GenericAgent" # Default value
    assert loaded_agent.parent_agent_id is None # Default value
    assert loaded_agent.operational_parameters == {} # Default value (default_factory=dict)


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


# --- Tests for get_child_agents ---
@pytest.mark.asyncio
async def test_get_child_agents(service: AgentManagementService, tmp_path: Path):
    parent_id = "parent_agent_1"

    # Create parent (though not strictly necessary for this method's logic, good for context)
    await service.create_agent(create_sample_agent_input(name="ParentAgent", agent_id_override=parent_id))

    # Create child agents
    child1_input = create_sample_agent_input(name="Child1")
    child1_input.parent_agent_id = parent_id
    child1 = await service.create_agent(child1_input)

    child2_input = create_sample_agent_input(name="Child2")
    child2_input.parent_agent_id = parent_id
    child2 = await service.create_agent(child2_input)

    # Create unrelated agent
    await service.create_agent(create_sample_agent_input(name="UnrelatedAgent"))

    # Create another agent with a different parent
    other_parent_child_input = create_sample_agent_input(name="OtherParentChild")
    other_parent_child_input.parent_agent_id = "other_parent_id"
    await service.create_agent(other_parent_child_input)

    child_agents = await service.get_child_agents(parent_id)
    assert len(child_agents) == 2
    child_agent_ids = {agent.agent_id for agent in child_agents}
    assert child1.agent_id in child_agent_ids
    assert child2.agent_id in child_agent_ids

@pytest.mark.asyncio
async def test_get_child_agents_no_children(service: AgentManagementService):
    parent_id_no_children = "parent_no_children"
    await service.create_agent(create_sample_agent_input(name="ParentNoChildren", agent_id_override=parent_id_no_children))

    children = await service.get_child_agents(parent_id_no_children)
    assert len(children) == 0

@pytest.mark.asyncio
async def test_get_child_agents_parent_id_not_exist(service: AgentManagementService):
    children = await service.get_child_agents("non_existent_parent_id")
    assert len(children) == 0

@pytest.mark.asyncio
async def test_get_child_agents_with_corrupted_file(service: AgentManagementService, tmp_path: Path):
    parent_id = "parent_with_issues"
    # Child that is fine
    child_ok_input = create_sample_agent_input("ChildOK")
    child_ok_input.parent_agent_id = parent_id
    await service.create_agent(child_ok_input)

    # Create a corrupted JSON file
    corrupted_file_id = str(uuid.uuid4())
    with open(tmp_path / f"{corrupted_file_id}.json", 'w') as f:
        f.write("{'name': 'Corrupted', 'parent_agent_id': '" + parent_id + "', ...") # Invalid JSON

    children = await service.get_child_agents(parent_id)
    # Should still return the valid child, and log error for corrupted one (check logs manually or mock logger)
    assert len(children) == 1
    assert children[0].name == "ChildOK"


# Fixture update for create_sample_agent_input to allow setting agent_id for predictable testing
def create_sample_agent_input(name: str = "Test Agent", agent_id_override: Optional[str]=None) -> AgentConfigInput:
    strategy_conf = AgentStrategyConfig(strategy_name="test_strat", parameters={"param1": 10})
    risk_conf = AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    # agent_id is not part of AgentConfigInput, it's generated on creation (AgentConfigOutput)
    # This helper is for AgentConfigInput, so agent_id_override is not used here.
    # If we need to create AgentConfigOutput directly for file writing, that's different.
    # For now, the tests for get_child_agents create agents via service.create_agent, which is fine.
    return AgentConfigInput(
        name=name,
        strategy=strategy_conf,
        risk_config=risk_conf,
        execution_provider="paper"
    )


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
