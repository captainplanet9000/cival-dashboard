import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, call
from typing import List, Dict, Any, Optional

from python_ai_services.services.portfolio_optimizer_service import PortfolioOptimizerService
from python_ai_services.services.agent_management_service import AgentManagementService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.models.agent_models import (
    AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig,
    AgentUpdateRequest
)
# PortfolioOptimizerParams and PortfolioOptimizerRule are nested in AgentStrategyConfig
from python_ai_services.models.event_bus_models import Event, MarketConditionEventPayload
from datetime import datetime, timezone

# --- Fixtures ---
@pytest_asyncio.fixture
def mock_agent_management_service() -> AgentManagementService:
    service = AsyncMock(spec=AgentManagementService)
    service.get_agent = AsyncMock()
    service.get_agents = AsyncMock()
    service.update_agent = AsyncMock()
    return service

@pytest_asyncio.fixture
def mock_event_bus() -> EventBusService:
    service = AsyncMock(spec=EventBusService)
    service.subscribe = AsyncMock()
    service.publish = AsyncMock() # Though PO service doesn't publish in this design
    return service

# Helper to create AgentConfigOutput for PortfolioOptimizerAgent
def create_optimizer_agent_config(
    agent_id: str,
    rules: List[AgentStrategyConfig.PortfolioOptimizerRule]
) -> AgentConfigOutput:
    return AgentConfigOutput(
        agent_id=agent_id, name=f"Optimizer_{agent_id}", agent_type="PortfolioOptimizerAgent",
        strategy=AgentStrategyConfig(
            strategy_name="PortfolioOptimizerStrategy",
            portfolio_optimizer_params=AgentStrategyConfig.PortfolioOptimizerParams(rules=rules)
        ),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=0, risk_per_trade_percentage=0), # Not used by PO
        is_active=True, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )

# Helper to create AgentConfigOutput for a target agent
def create_target_agent_config(
    agent_id: str, agent_type: str = "GenericAgent",
    is_active: bool = True, op_params: Optional[Dict[str, Any]] = None
) -> AgentConfigOutput:
    return AgentConfigOutput(
        agent_id=agent_id, name=f"Target_{agent_id}", agent_type=agent_type,
        strategy=AgentStrategyConfig(strategy_name="some_strat", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01),
        is_active=is_active, operational_parameters=op_params if op_params else {},
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )

# --- Test Cases ---
@pytest.mark.asyncio
async def test_portfolio_optimizer_init_and_subscriptions(
    mock_agent_management_service: MagicMock, mock_event_bus: MagicMock
):
    rule = AgentStrategyConfig.PortfolioOptimizerRule(rule_name="Test Rule")
    agent_config = create_optimizer_agent_config("optimizer1", rules=[rule])

    optimizer_service = PortfolioOptimizerService(
        agent_config=agent_config,
        agent_management_service=mock_agent_management_service,
        event_bus=mock_event_bus
    )
    assert optimizer_service.params.rules[0].rule_name == "Test Rule"

    await optimizer_service.setup_subscriptions()
    mock_event_bus.subscribe.assert_called_once_with("MarketConditionEvent", optimizer_service.on_market_condition_event)

@pytest.mark.asyncio
async def test_optimizer_init_no_params(mock_agent_management_service, mock_event_bus):
    agent_config_no_params = AgentConfigOutput(
        agent_id="opt_no_params", name="OptimizerNoParams", agent_type="PortfolioOptimizerAgent",
        strategy=AgentStrategyConfig(strategy_name="PortfolioOptimizerStrategy"), # portfolio_optimizer_params is None
        risk_config=AgentRiskConfig(max_capital_allocation_usd=0, risk_per_trade_percentage=0)
    )
    service = PortfolioOptimizerService(agent_config_no_params, mock_agent_management_service, mock_event_bus)
    assert service.params.rules == [] # Should default to empty rules

@pytest.mark.asyncio
async def test_on_market_condition_event_no_matching_rule(
    mock_agent_management_service: MagicMock, mock_event_bus: MagicMock
):
    rules = [AgentStrategyConfig.PortfolioOptimizerRule(if_market_regime="trending_up")]
    agent_config = create_optimizer_agent_config("optimizer_no_match", rules=rules)
    optimizer_service = PortfolioOptimizerService(agent_config, mock_agent_management_service, mock_event_bus)

    event_payload = MarketConditionEventPayload(symbol="BTC/USD", regime="ranging")
    event = Event(publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload=event_payload.model_dump())

    await optimizer_service.on_market_condition_event(event)
    mock_agent_management_service.update_agent.assert_not_called()

@pytest.mark.asyncio
async def test_on_market_condition_event_applies_rule_target_id(
    mock_agent_management_service: MagicMock, mock_event_bus: MagicMock
):
    target_agent_id = "target_agent_for_id_rule"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(
        rule_name="ActivateAgentOnTrendingUp",
        if_market_regime="trending_up",
        target_agent_id=target_agent_id,
        set_is_active=True,
        set_operational_parameters={"risk_factor": 0.5}
    )
    optimizer_config = create_optimizer_agent_config("optimizer_id_target", rules=[rule])

    target_agent_initial_config = create_target_agent_config(target_agent_id, is_active=False, op_params={"risk_factor": 1.0, "another_param": "value"})
    mock_agent_management_service.get_agent = AsyncMock(return_value=target_agent_initial_config)

    optimizer_service = PortfolioOptimizerService(optimizer_config, mock_agent_management_service, mock_event_bus)

    event_payload = MarketConditionEventPayload(symbol="ETH/USD", regime="trending_up")
    event = Event(publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload=event_payload.model_dump())

    await optimizer_service.on_market_condition_event(event)

    mock_agent_management_service.update_agent.assert_called_once()
    call_args = mock_agent_management_service.update_agent.call_args[1] # Get kwargs
    assert call_args['agent_id'] == target_agent_id
    update_request: AgentUpdateRequest = call_args['update_data']
    assert update_request.is_active is True
    assert update_request.operational_parameters == {"risk_factor": 0.5, "another_param": "value"} # Merged

@pytest.mark.asyncio
async def test_on_market_condition_event_applies_rule_target_type(
    mock_agent_management_service: MagicMock, mock_event_bus: MagicMock
):
    target_type = "TradingAgentTypeX"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(
        rule_name="DeactivateTypeXRanging",
        if_market_regime="ranging",
        target_agent_type=target_type,
        set_is_active=False
    )
    optimizer_config = create_optimizer_agent_config("optimizer_type_target", rules=[rule])

    target_agent1 = create_target_agent_config("target1", agent_type=target_type, is_active=True)
    target_agent2 = create_target_agent_config("target2", agent_type="OtherType", is_active=True) # Should not be affected
    target_agent3 = create_target_agent_config("target3", agent_type=target_type, is_active=True)
    # Optimizer itself should not be targeted even if it matches type
    optimizer_self_as_target_type = create_optimizer_agent_config("optimizer_type_target", rules=[])

    mock_agent_management_service.get_agents = AsyncMock(return_value=[
        target_agent1, target_agent2, target_agent3, optimizer_self_as_target_type
    ])

    optimizer_service = PortfolioOptimizerService(optimizer_config, mock_agent_management_service, mock_event_bus)

    event_payload = MarketConditionEventPayload(symbol="BTC/USD", regime="ranging")
    event = Event(publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload=event_payload.model_dump())

    await optimizer_service.on_market_condition_event(event)

    assert mock_agent_management_service.update_agent.call_count == 2
    # Check that update_agent was called for target1 and target3 with is_active=False
    expected_update_payload = AgentUpdateRequest(is_active=False)

    # Create a list of calls to check against
    calls_made = mock_agent_management_service.update_agent.call_args_list

    # Check call for target_agent1
    assert any(
        c.kwargs['agent_id'] == target_agent1.agent_id and
        c.kwargs['update_data'].model_dump(exclude_none=True) == expected_update_payload.model_dump(exclude_none=True)
        for c in calls_made
    )
    # Check call for target_agent3
    assert any(
        c.kwargs['agent_id'] == target_agent3.agent_id and
        c.kwargs['update_data'].model_dump(exclude_none=True) == expected_update_payload.model_dump(exclude_none=True)
        for c in calls_made
    )


@pytest.mark.asyncio
async def test_on_market_condition_event_no_actual_change(
    mock_agent_management_service: MagicMock, mock_event_bus: MagicMock
):
    target_agent_id = "target_no_change"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(
        rule_name="NoChangeRule", if_market_regime="trending_up",
        target_agent_id=target_agent_id, set_is_active=True # Target is already active
    )
    optimizer_config = create_optimizer_agent_config("optimizer_no_change", rules=[rule])
    target_agent_config = create_target_agent_config(target_agent_id, is_active=True) # Already active
    mock_agent_management_service.get_agent = AsyncMock(return_value=target_agent_config)

    optimizer_service = PortfolioOptimizerService(optimizer_config, mock_agent_management_service, mock_event_bus)
    event_payload = MarketConditionEventPayload(symbol="ANY/USD", regime="trending_up")
    event = Event(publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload=event_payload.model_dump())

    await optimizer_service.on_market_condition_event(event)
    mock_agent_management_service.update_agent.assert_not_called()


@pytest.mark.asyncio
async def test_on_market_condition_event_invalid_payload(
    mock_agent_management_service: MagicMock, mock_event_bus: MagicMock
):
    optimizer_config = create_optimizer_agent_config("optimizer_bad_payload", rules=[AgentStrategyConfig.PortfolioOptimizerRule(if_market_regime="trending_up")])
    optimizer_service = PortfolioOptimizerService(optimizer_config, mock_agent_management_service, mock_event_bus)

    invalid_payload_event = Event(publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload={"wrong_field": "data"})

    with patch.object(optimizer_service.logger, 'error') as mock_log_error:
        await optimizer_service.on_market_condition_event(invalid_payload_event)
        mock_log_error.assert_called_once()
        assert "Failed to parse MarketConditionEventPayload" in mock_log_error.call_args[0][0]

    mock_agent_management_service.update_agent.assert_not_called()

# Ensure all type hints are imported
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
```
