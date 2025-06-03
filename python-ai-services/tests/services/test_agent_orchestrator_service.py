import pytest
import pytest_asyncio
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio

from python_ai_services.services.agent_orchestrator_service import AgentOrchestratorService
from python_ai_services.services.agent_management_service import AgentManagementService
from python_ai_services.services.trading_coordinator import TradingCoordinator
from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService
from python_ai_services.services.simulated_trade_executor import SimulatedTradeExecutor
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.api_models import TradingAnalysisCrewRequest
from python_ai_services.utils.google_sdk_bridge import GoogleSDKBridge
from python_ai_services.utils.a2a_protocol import A2AProtocol


@pytest_asyncio.fixture
def mock_agent_service() -> AgentManagementService:
    return AsyncMock(spec=AgentManagementService) # Use AsyncMock for async methods

@pytest_asyncio.fixture
def mock_google_bridge() -> GoogleSDKBridge:
    return MagicMock(spec=GoogleSDKBridge)

@pytest_asyncio.fixture
def mock_a2a_protocol() -> A2AProtocol:
    return MagicMock(spec=A2AProtocol)

@pytest_asyncio.fixture
def mock_simulated_trade_executor() -> SimulatedTradeExecutor:
    return MagicMock(spec=SimulatedTradeExecutor)

# mock_hles_factory and mock_hles_instance are removed as we'll patch the factory function directly

@pytest_asyncio.fixture
def orchestrator_service(
    mock_agent_service: AgentManagementService,
    mock_google_bridge: GoogleSDKBridge,
    mock_a2a_protocol: A2AProtocol,
from python_ai_services.services.trade_history_service import TradeHistoryService # Added

@pytest_asyncio.fixture
def mock_trade_history_service() -> TradeHistoryService: # Added
    return AsyncMock(spec=TradeHistoryService)

@pytest_asyncio.fixture
def orchestrator_service(
    mock_agent_service: AgentManagementService,
    mock_google_bridge: GoogleSDKBridge,
    mock_a2a_protocol: A2AProtocol,
    mock_simulated_trade_executor: SimulatedTradeExecutor,
    mock_trade_history_service: TradeHistoryService # Added
    # mock_hles_factory removed
) -> AgentOrchestratorService:
    # hles_factory and trade_history_service are now passed to AgentOrchestratorService constructor
    return AgentOrchestratorService(
        agent_service=mock_agent_service,
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_trade_executor,
        trade_history_service=mock_trade_history_service # Added
    )

# --- Helper to create sample AgentConfigOutput ---
def create_sample_agent_config(
    agent_id: str,
    is_active: bool = True,
    provider: str = "paper",
    symbols: list = None,
    cred_id: str = None
) -> AgentConfigOutput:
    if symbols is None:
        symbols = ["BTC/USD", "ETH/USD"]
    return AgentConfigOutput(
        agent_id=agent_id,
        name=f"Agent {agent_id}",
        is_active=is_active,
        strategy=AgentStrategyConfig(
            strategy_name="test_strat",
            parameters={},
            watched_symbols=symbols,
            default_market_event_description="Market event for {symbol}",
            default_additional_context={"source": "orchestrator"}
        ),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01),
        execution_provider=provider,
        hyperliquid_credentials_id=cred_id
    )

# --- Tests for _get_trading_coordinator_for_agent ---
@pytest.mark.asyncio
async def test_get_trading_coordinator_paper_agent(orchestrator_service: AgentOrchestratorService, mock_simulated_trade_executor: MagicMock):
    agent_config = create_sample_agent_config("paper_agent", provider="paper")

    with patch('python_ai_services.services.agent_orchestrator_service.TradingCoordinator') as MockTradingCoordinator:
        mock_tc_instance = AsyncMock(spec=TradingCoordinator)
        mock_tc_instance.set_trade_execution_mode = AsyncMock()
        MockTradingCoordinator.return_value = mock_tc_instance

        coordinator = await orchestrator_service._get_trading_coordinator_for_agent(agent_config)

        assert coordinator is not None
        MockTradingCoordinator.assert_called_once_with(
            google_bridge=orchestrator_service.google_bridge,
            a2a_protocol=orchestrator_service.a2a_protocol,
            simulated_trade_executor=mock_simulated_trade_executor,
            hyperliquid_execution_service=None,
            trade_history_service=orchestrator_service.trade_history_service # Verify it's passed
        )
        mock_tc_instance.set_trade_execution_mode.assert_called_once_with("paper")


@pytest.mark.asyncio
@patch('python_ai_services.services.agent_orchestrator_service.get_hyperliquid_execution_service_instance')
async def test_get_trading_coordinator_hyperliquid_agent_success(
    mock_get_hles_instance: MagicMock, # Patched factory function
    orchestrator_service: AgentOrchestratorService
):
    agent_config = create_sample_agent_config("hl_agent", provider="hyperliquid", cred_id="cred1")
    mock_hles_instance = MagicMock(spec=HyperliquidExecutionService) # What the factory returns
    mock_get_hles_instance.return_value = mock_hles_instance

    with patch('python_ai_services.services.agent_orchestrator_service.TradingCoordinator') as MockTradingCoordinator:
        mock_tc_instance = AsyncMock(spec=TradingCoordinator)
        mock_tc_instance.set_trade_execution_mode = AsyncMock()
        MockTradingCoordinator.return_value = mock_tc_instance

        coordinator = await orchestrator_service._get_trading_coordinator_for_agent(agent_config)

        assert coordinator is not None
        mock_get_hles_instance.assert_called_once_with(agent_config)
        MockTradingCoordinator.assert_called_once_with(
            google_bridge=orchestrator_service.google_bridge,
            a2a_protocol=orchestrator_service.a2a_protocol,
            simulated_trade_executor=orchestrator_service.simulated_trade_executor,
            hyperliquid_execution_service=mock_hles_instance,
            trade_history_service=orchestrator_service.trade_history_service # Verify it's passed
        )
        mock_tc_instance.set_trade_execution_mode.assert_called_once_with("hyperliquid")


@patch('python_ai_services.services.agent_orchestrator_service.get_hyperliquid_execution_service_instance')
async def test_get_trading_coordinator_hyperliquid_factory_returns_none(
    mock_get_hles_instance: MagicMock,
    orchestrator_service: AgentOrchestratorService
):
    mock_get_hles_instance.return_value = None # Factory function returns None
    agent_config = create_sample_agent_config("hl_agent_factory_fail", provider="hyperliquid", cred_id="cred1")
    coordinator = await orchestrator_service._get_trading_coordinator_for_agent(agent_config)
    assert coordinator is None
    mock_get_hles_instance.assert_called_once_with(agent_config)

# --- Tests for run_single_agent_cycle ---

@pytest.mark.asyncio
async def test_run_single_agent_cycle_agent_not_found(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    mock_agent_service.get_agent = AsyncMock(return_value=None)
    await orchestrator_service.run_single_agent_cycle("unknown_agent")
    mock_agent_service.get_agent.assert_called_once_with("unknown_agent")
    # Heartbeat should not be called if agent not found before TC setup
    mock_agent_service.update_agent_heartbeat.assert_not_called()


@pytest.mark.asyncio
async def test_run_single_agent_cycle_agent_not_active(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "inactive_agent"
    agent_config = create_sample_agent_config(agent_id, is_active=False)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    await orchestrator_service.run_single_agent_cycle(agent_id)
    # Heartbeat should not be called if agent is inactive
    mock_agent_service.update_agent_heartbeat.assert_not_called()


@pytest.mark.asyncio
async def test_run_single_agent_cycle_tc_setup_fails(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "agent_tc_fail"
    agent_config = create_sample_agent_config(agent_id, provider="hyperliquid", cred_id=None) # Missing cred_id will cause TC setup fail
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    # _get_trading_coordinator_for_agent will return None

    await orchestrator_service.run_single_agent_cycle(agent_id)
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id) # Heartbeat called even if TC fails

@pytest.mark.asyncio
async def test_run_single_agent_cycle_no_watched_symbols(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "agent_no_symbols"
    agent_config = create_sample_agent_config(agent_id, symbols=[])
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    # Mock _get_trading_coordinator_for_agent to return a mock TC
    mock_tc = AsyncMock(spec=TradingCoordinator)
    mock_tc.analyze_trading_opportunity = AsyncMock()
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock(return_value=mock_tc)

    await orchestrator_service.run_single_agent_cycle(agent_id)
    mock_tc.analyze_trading_opportunity.assert_not_called() # No symbols, no analysis
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
async def test_run_single_agent_cycle_success_with_symbols(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "agent_with_symbols"
    symbols = ["BTC/USD", "ETH/USD"]
    agent_config = create_sample_agent_config(agent_id, symbols=symbols)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    mock_tc = AsyncMock(spec=TradingCoordinator)
    mock_tc.set_trade_execution_mode = AsyncMock() # Called by _get_trading_coordinator_for_agent
    mock_tc.analyze_trading_opportunity = AsyncMock(return_value={"decision": "buy"}) # Simulate some result

    # Patch the _get_trading_coordinator_for_agent to return our mock_tc
    # This is simpler than mocking TradingCoordinator class instantiation for this test
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock(return_value=mock_tc)

    await orchestrator_service.run_single_agent_cycle(agent_id)

    assert mock_tc.analyze_trading_opportunity.call_count == len(symbols)
    # Check one call as an example
    first_call_args = mock_tc.analyze_trading_opportunity.call_args_list[0][0][0] # First arg of first call
    assert isinstance(first_call_args, TradingAnalysisCrewRequest)
    assert first_call_args.symbol == symbols[0]
    assert first_call_args.user_id == agent_id
    assert agent_config.strategy.default_market_event_description.format(symbol=symbols[0]) == first_call_args.market_event_description

    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

# --- Tests for run_all_active_agents_once ---
@pytest.mark.asyncio
async def test_run_all_active_agents_once_no_active_agents(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    mock_agent_service.get_agents = AsyncMock(return_value=[
        create_sample_agent_config("agent1", is_active=False),
        create_sample_agent_config("agent2", is_active=False)
    ])
    orchestrator_service.run_single_agent_cycle = AsyncMock() # So we can check calls

    await orchestrator_service.run_all_active_agents_once()
    orchestrator_service.run_single_agent_cycle.assert_not_called()

@pytest.mark.asyncio
async def test_run_all_active_agents_once_multiple_active(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent1_config = create_sample_agent_config("agent1", is_active=True)
    agent2_config = create_sample_agent_config("agent2", is_active=False) # One inactive
    agent3_config = create_sample_agent_config("agent3", is_active=True)

    mock_agent_service.get_agents = AsyncMock(return_value=[agent1_config, agent2_config, agent3_config])

    # Patch run_single_agent_cycle on the instance to check calls
    orchestrator_service.run_single_agent_cycle = AsyncMock()

    await orchestrator_service.run_all_active_agents_once()

    assert orchestrator_service.run_single_agent_cycle.call_count == 2
    # Check it was called with the active agent IDs
    calls = orchestrator_service.run_single_agent_cycle.call_args_list
    called_agent_ids = {call[0][0] for call in calls} # call[0][0] is the first arg (agent_id)
    assert "agent1" in called_agent_ids
    assert "agent3" in called_agent_ids
    assert "agent2" not in called_agent_ids # Was inactive

@pytest.mark.asyncio
async def test_run_all_active_agents_one_cycle_fails(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent1_config = create_sample_agent_config("agent1_ok", is_active=True)
    agent2_config = create_sample_agent_config("agent2_fail", is_active=True)
    mock_agent_service.get_agents = AsyncMock(return_value=[agent1_config, agent2_config])

    async def side_effect_for_run_cycle(agent_id):
        if agent_id == "agent2_fail":
            raise ValueError("Simulated cycle failure")
        return f"Success for {agent_id}"

    orchestrator_service.run_single_agent_cycle = AsyncMock(side_effect=side_effect_for_run_cycle)

    # asyncio.gather should not stop other tasks if one fails with return_exceptions=True
    await orchestrator_service.run_all_active_agents_once()

    assert orchestrator_service.run_single_agent_cycle.call_count == 2
    # (Logging of exception is done in the actual method, test just ensures gather works as expected)

```
