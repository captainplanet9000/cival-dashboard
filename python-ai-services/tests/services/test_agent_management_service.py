import pytest
import pytest_asyncio
from datetime import datetime, timezone
import uuid
import json
from pathlib import Path
from typing import Optional, Dict, Any, Callable

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from python_ai_services.core.database import Base
from python_ai_services.models.db_models import AgentConfigDB

from python_ai_services.models.agent_models import (
    AgentConfigInput,
    AgentStrategyConfig,
    AgentRiskConfig,
    AgentUpdateRequest,
    AgentConfigOutput,
    AgentStatus
)
from python_ai_services.services.agent_management_service import AgentManagementService
import asyncio

# --- Test Database Setup ---
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest_asyncio.fixture(scope="function")
async def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()
    Base.metadata.drop_all(bind=engine)

@pytest_asyncio.fixture
async def service(db_session: Session) -> AgentManagementService:
    def test_session_factory():
        return TestSessionLocal() # Each call in service gets a new session if needed

    service_instance = AgentManagementService(session_factory=TestSessionLocal)
    # Call _load_existing_statuses_from_db for tests that might rely on it (e.g. get_agent_status for an agent only in DB)
    # This is essential if tests don't always create agents via the service instance being tested.
    await service_instance._load_existing_statuses_from_db()
    return service_instance

# Helper to create agent input for tests
def create_sample_agent_input(
    name: str = "Test Agent",
    agent_type: str = "GenericAgent",
    parent_id: Optional[str] = None,
    op_params: Optional[Dict[str, Any]] = None,
    risk_config_override: Optional[Dict[str, Any]] = None
) -> AgentConfigInput:
    strategy_conf = AgentStrategyConfig(
        strategy_name="test_strat",
        parameters={"param1": 10},
        watched_symbols=["BTC/USD"],
    )

    risk_conf_data = {"max_capital_allocation_usd": 1000.0, "risk_per_trade_percentage": 0.01}
    if risk_config_override:
        risk_conf_data.update(risk_config_override)
    risk_conf = AgentRiskConfig(**risk_conf_data)

    return AgentConfigInput(
        name=name,
        strategy=strategy_conf,
        risk_config=risk_conf,
        execution_provider="paper",
        agent_type=agent_type,
        parent_agent_id=parent_id,
        operational_parameters=op_params if op_params else {"op_key": "op_value"}
    )

# --- CRUD Tests ---
@pytest.mark.asyncio
async def test_create_agent(service: AgentManagementService, db_session: Session):
    agent_input = create_sample_agent_input()
    created_agent_pydantic = await service.create_agent(agent_input)

    assert isinstance(created_agent_pydantic, AgentConfigOutput)
    assert created_agent_pydantic.name == "Test Agent"
    agent_id = created_agent_pydantic.agent_id
    assert agent_id is not None
    assert created_agent_pydantic.is_active is False
    assert created_agent_pydantic.agent_type == "GenericAgent"
    assert created_agent_pydantic.operational_parameters == {"op_key": "op_value"}
    # Verify risk_config is now correctly retrieved after persistence
    assert created_agent_pydantic.risk_config.max_capital_allocation_usd == 1000.0
    assert created_agent_pydantic.risk_config.risk_per_trade_percentage == 0.01

    db_record = db_session.query(AgentConfigDB).filter(AgentConfigDB.agent_id == agent_id).first()
    assert db_record is not None
    assert db_record.name == "Test Agent"
    assert db_record.is_active is False
    strategy_in_db = json.loads(db_record.strategy_config_json)
    assert strategy_in_db["strategy_name"] == "test_strat"
    # Verify risk_config_json in DB
    risk_config_in_db = json.loads(db_record.risk_config_json)
    assert risk_config_in_db["max_capital_allocation_usd"] == 1000.0

    status = await service.get_agent_status(agent_id)
    assert status is not None
    assert status.status == "stopped"

@pytest.mark.asyncio
async def test_get_agent(service: AgentManagementService):
    agent_input = create_sample_agent_input(name="Get Me Agent")
    created_agent_pydantic = await service.create_agent(agent_input)

    retrieved_agent = await service.get_agent(created_agent_pydantic.agent_id)
    assert retrieved_agent is not None
    assert retrieved_agent.agent_id == created_agent_pydantic.agent_id
    assert retrieved_agent.name == "Get Me Agent"
    assert retrieved_agent.risk_config.max_capital_allocation_usd == 1000.0 # Check risk_config

    non_existent_agent = await service.get_agent(str(uuid.uuid4()))
    assert non_existent_agent is None

@pytest.mark.asyncio
async def test_get_agents(service: AgentManagementService):
    await service.create_agent(create_sample_agent_input("DBAgent1"))
    await service.create_agent(create_sample_agent_input("DBAgent2"))

    agents_list_after = await service.get_agents()
    assert len(agents_list_after) == 2
    agent_names = {agent.name for agent in agents_list_after}
    assert "DBAgent1" in agent_names
    assert "DBAgent2" in agent_names

@pytest.mark.asyncio
async def test_update_agent(service: AgentManagementService):
    agent_input = create_sample_agent_input("Initial DB Name", op_params={"op1": "val1", "op2": "val2"})
    created_agent = await service.create_agent(agent_input)
    agent_id = created_agent.agent_id
    original_updated_at = created_agent.updated_at
    original_risk_config = created_agent.risk_config

    update_payload = AgentUpdateRequest(
        name="Updated DB Name",
        description="New DB Desc",
        agent_type="SpecialDBAgent",
        operational_parameters={"op1": "new_val1", "op3": "val3"}
    )

    await asyncio.sleep(0.01)
    updated_agent = await service.update_agent(agent_id, update_payload)

    assert updated_agent is not None
    assert updated_agent.name == "Updated DB Name"
    assert updated_agent.description == "New DB Desc"
    assert updated_agent.agent_type == "SpecialDBAgent"
    assert updated_agent.operational_parameters == {"op1": "new_val1", "op2": "val2", "op3": "val3"}
    assert updated_agent.updated_at > original_updated_at
    assert updated_agent.risk_config.model_dump() == original_risk_config.model_dump() # Risk config should not change

    refetched_agent = await service.get_agent(agent_id)
    assert refetched_agent is not None
    assert refetched_agent.name == "Updated DB Name"
    assert refetched_agent.operational_parameters == {"op1": "new_val1", "op2": "val2", "op3": "val3"}
    assert refetched_agent.risk_config.model_dump() == original_risk_config.model_dump()


@pytest.mark.asyncio
async def test_update_agent_with_risk_config(service: AgentManagementService):
    agent_input_orig = create_sample_agent_input("RiskUpdateAgent")
    created_agent = await service.create_agent(agent_input_orig)
    agent_id = created_agent.agent_id

    new_risk_config_data = AgentRiskConfig(
        max_capital_allocation_usd=5000.0,
        risk_per_trade_percentage=0.05,
        stop_loss_percentage=0.10
    )
    update_payload = AgentUpdateRequest(risk_config=new_risk_config_data)
    updated_agent = await service.update_agent(agent_id, update_payload)

    assert updated_agent is not None
    assert updated_agent.risk_config.max_capital_allocation_usd == 5000.0
    assert updated_agent.risk_config.risk_per_trade_percentage == 0.05
    assert updated_agent.risk_config.stop_loss_percentage == 0.10

    refetched_agent = await service.get_agent(agent_id)
    assert refetched_agent is not None
    assert refetched_agent.risk_config.model_dump() == new_risk_config_data.model_dump()

@pytest.mark.asyncio
async def test_load_agent_with_invalid_risk_config_json(service: AgentManagementService, db_session: Session):
    agent_id = str(uuid.uuid4())
    db_agent = AgentConfigDB(
        agent_id=agent_id, name="InvalidRiskAgent",
        strategy_config_json=AgentStrategyConfig(strategy_name="s", parameters={}).model_dump_json(),
        risk_config_json="{'this_is': 'not_a_valid_risk_config_json_because_single_quotes'}",
        operational_parameters_json="{}",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    db_session.add(db_agent)
    db_session.commit()

    loaded_agent = await service.get_agent(agent_id)
    assert loaded_agent is not None
    default_risk_config = AgentRiskConfig(max_capital_allocation_usd=0, risk_per_trade_percentage=0.01)
    assert loaded_agent.risk_config.max_capital_allocation_usd == default_risk_config.max_capital_allocation_usd
    assert loaded_agent.risk_config.risk_per_trade_percentage == default_risk_config.risk_per_trade_percentage

@pytest.mark.asyncio
async def test_load_agent_with_missing_risk_config_json_field(service: AgentManagementService, db_session: Session):
    agent_id = str(uuid.uuid4())
    db_agent_no_risk = AgentConfigDB(
        agent_id=agent_id, name="NoRiskJsonAgent",
        strategy_config_json=AgentStrategyConfig(strategy_name="s", parameters={}).model_dump_json(),
        risk_config_json=None,
        operational_parameters_json="{}",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    db_session.add(db_agent_no_risk)
    db_session.commit()

    loaded_agent = await service.get_agent(agent_id)
    assert loaded_agent is not None
    default_risk_config = AgentRiskConfig(max_capital_allocation_usd=0, risk_per_trade_percentage=0.01)
    assert loaded_agent.risk_config.max_capital_allocation_usd == default_risk_config.max_capital_allocation_usd
    assert loaded_agent.risk_config.risk_per_trade_percentage == default_risk_config.risk_per_trade_percentage


@pytest.mark.asyncio
async def test_delete_agent(service: AgentManagementService):
    created_agent = await service.create_agent(create_sample_agent_input("To Delete DB"))
    agent_id = created_agent.agent_id

    assert await service.get_agent(agent_id) is not None
    deleted = await service.delete_agent(agent_id)
    assert deleted is True
    assert await service.get_agent(agent_id) is None
    assert await service.get_agent_status(agent_id) is None

# --- Start/Stop/Status/Heartbeat Tests ---
@pytest.mark.asyncio
async def test_start_agent(service: AgentManagementService, db_session: Session):
    created_agent = await service.create_agent(create_sample_agent_input("Startable DB Agent"))
    agent_id = created_agent.agent_id
    assert not created_agent.is_active

    start_status = await service.start_agent(agent_id)
    assert start_status.status == "running"

    db_record = db_session.query(AgentConfigDB).filter(AgentConfigDB.agent_id == agent_id).first()
    assert db_record is not None
    assert db_record.is_active is True

@pytest.mark.asyncio
async def test_stop_agent(service: AgentManagementService, db_session: Session):
    created_agent = await service.create_agent(create_sample_agent_input("Stoppable DB Agent"))
    agent_id = created_agent.agent_id
    await service.start_agent(agent_id)

    stop_status = await service.stop_agent(agent_id)
    assert stop_status.status == "stopped"

    db_record = db_session.query(AgentConfigDB).filter(AgentConfigDB.agent_id == agent_id).first()
    assert db_record is not None
    assert db_record.is_active is False

@pytest.mark.asyncio
async def test_get_child_agents(service: AgentManagementService):
    parent_agent_obj = await service.create_agent(create_sample_agent_input(name="ActualParent"))
    actual_parent_id = parent_agent_obj.agent_id

    child1_input = create_sample_agent_input(name="ChildDB1", parent_id=actual_parent_id)
    await service.create_agent(child1_input)
    child2_input = create_sample_agent_input(name="ChildDB2", parent_id=actual_parent_id)
    await service.create_agent(child2_input)
    await service.create_agent(create_sample_agent_input(name="UnrelatedDBAgent"))

    child_agents = await service.get_child_agents(actual_parent_id)
    assert len(child_agents) == 2
    child_names = {agent.name for agent in child_agents}
    assert "ChildDB1" in child_names
    assert "ChildDB2" in child_names

@pytest.mark.asyncio
async def test_load_existing_statuses_from_db(service: AgentManagementService, db_session: Session):
    agent1_id = str(uuid.uuid4())
    db_agent1 = AgentConfigDB(agent_id=agent1_id, name="DB Agent 1", is_active=True, strategy_config_json="{}", operational_parameters_json="{}", risk_config_json="{}")
    agent2_id = str(uuid.uuid4())
    db_agent2 = AgentConfigDB(agent_id=agent2_id, name="DB Agent 2", is_active=False, strategy_config_json="{}", operational_parameters_json="{}", risk_config_json="{}")
    db_session.add_all([db_agent1, db_agent2])
    db_session.commit()

    await service._load_existing_statuses_from_db()

    status1 = service._agent_statuses.get(agent1_id)
    assert status1 is not None
    assert status1.status == "stopped"

    status2 = service._agent_statuses.get(agent2_id)
    assert status2 is not None
    assert status2.status == "stopped"

@pytest.mark.asyncio
async def test_get_agent_status_db_check(service: AgentManagementService, db_session: Session):
    agent_id = str(uuid.uuid4())
    db_agent = AgentConfigDB(agent_id=agent_id, name="DB Status Test", is_active=True, strategy_config_json="{}", operational_parameters_json="{}", risk_config_json=AgentRiskConfig(max_capital_allocation_usd=100, risk_per_trade_percentage=0.01).model_dump_json())
    db_session.add(db_agent)
    db_session.commit()

    status = await service.get_agent_status(agent_id)
    assert status is not None
    assert status.status == "running"
    assert "Status initialized from DB is_active field" in status.message #type: ignore

@pytest.mark.asyncio
async def test_update_agent_heartbeat_db(service: AgentManagementService):
    created_agent = await service.create_agent(create_sample_agent_input("Heartbeat DB Agent"))
    agent_id = created_agent.agent_id
    await service.start_agent(agent_id)

    initial_status = await service.get_agent_status(agent_id)
    assert initial_status is not None
    initial_heartbeat = initial_status.last_heartbeat

    await asyncio.sleep(0.01)
    result = await service.update_agent_heartbeat(agent_id)
    assert result is True

    updated_status = await service.get_agent_status(agent_id)
    assert updated_status is not None
    assert updated_status.last_heartbeat > initial_heartbeat
    assert updated_status.status == "running"

```
