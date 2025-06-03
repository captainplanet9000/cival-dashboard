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
# Import specific strategy params from their definition
from python_ai_services.models.agent_models import AgentStrategyConfig # DarvasStrategyParams etc. are nested
from python_ai_services.models.api_models import TradingAnalysisCrewRequest
from python_ai_services.utils.google_sdk_bridge import GoogleSDKBridge
from python_ai_services.utils.a2a_protocol import A2AProtocol
from python_ai_services.services.trade_history_service import TradeHistoryService
from python_ai_services.services.risk_manager_service import RiskManagerService
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.event_bus_service import EventBusService
from typing import Optional, List, Dict, Any


@pytest_asyncio.fixture
def mock_agent_service() -> AgentManagementService:
    return AsyncMock(spec=AgentManagementService)

@pytest_asyncio.fixture
def mock_google_bridge() -> GoogleSDKBridge:
    return MagicMock(spec=GoogleSDKBridge)

@pytest_asyncio.fixture
def mock_a2a_protocol() -> A2AProtocol:
    return MagicMock(spec=A2AProtocol)

@pytest_asyncio.fixture
def mock_simulated_trade_executor() -> SimulatedTradeExecutor:
    return MagicMock(spec=SimulatedTradeExecutor)

@pytest_asyncio.fixture
def mock_trade_history_service() -> TradeHistoryService:
    return AsyncMock(spec=TradeHistoryService)

@pytest_asyncio.fixture
def mock_risk_manager_service() -> RiskManagerService:
    return AsyncMock(spec=RiskManagerService)

@pytest_asyncio.fixture
def mock_event_bus_service() -> EventBusService: # Added
    return AsyncMock(spec=EventBusService)

@pytest_asyncio.fixture
def mock_market_data_service() -> MarketDataService:
    return AsyncMock(spec=MarketDataService)


@pytest_asyncio.fixture
def orchestrator_service(
    mock_agent_service: AgentManagementService,
    mock_google_bridge: GoogleSDKBridge,
    mock_a2a_protocol: A2AProtocol,
    mock_simulated_trade_executor: SimulatedTradeExecutor,
    mock_trade_history_service: TradeHistoryService,
    mock_risk_manager_service: RiskManagerService,
    mock_event_bus_service: EventBusService, # Corrected from previous version
    mock_market_data_service: MarketDataService
) -> AgentOrchestratorService:
    return AgentOrchestratorService(
        agent_management_service=mock_agent_service,
        trade_history_service=mock_trade_history_service,
        risk_manager_service=mock_risk_manager_service,
        market_data_service=mock_market_data_service,
        event_bus_service=mock_event_bus_service, # Make sure this is passed
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_trade_executor
    )

# Updated Helper to create sample AgentConfigOutput
def create_sample_agent_config(
    agent_id: str,
    is_active: bool = True,
    provider: str = "paper",
    symbols: Optional[List[str]] = None,
    agent_type_override: Optional[str] = None
) -> AgentConfigOutput:
    if symbols is None:
        symbols = ["BTC/USD", "ETH/USD"]

    hl_config = None
    if provider == "hyperliquid":
        hl_config = {
            "wallet_address": f"0xWallet{agent_id}",
            "private_key_env_var_name": f"PRIV_KEY_{agent_id.upper()}",
            "network_mode": "testnet"
        }

    strategy = AgentStrategyConfig(
        strategy_name="test_strat",
        parameters={},
        watched_symbols=symbols,
        default_market_event_description="Market event for {symbol}",
        default_additional_context={"source": "orchestrator"}
    )

    agent_type_to_use = agent_type_override if agent_type_override else "GenericAgent"
    if agent_type_to_use == "DarvasBoxTechnicalAgent":
        strategy.darvas_params = AgentStrategyConfig.DarvasStrategyParams()
    elif agent_type_to_use == "WilliamsAlligatorTechnicalAgent":
        strategy.williams_alligator_params = AgentStrategyConfig.WilliamsAlligatorParams()
    elif agent_type_to_use == "MarketConditionClassifierAgent":
        strategy.market_condition_classifier_params = AgentStrategyConfig.MarketConditionClassifierParams()
    elif agent_type_to_use == "PortfolioOptimizerAgent": # Added this
        strategy.portfolio_optimizer_params = AgentStrategyConfig.PortfolioOptimizerParams(rules=[])


    return AgentConfigOutput(
        agent_id=agent_id, name=f"Agent {agent_id}", is_active=is_active,
        agent_type=agent_type_to_use, strategy=strategy,
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01),
        execution_provider=provider, #type: ignore
        hyperliquid_config=hl_config
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
            agent_id=agent_config.agent_id,
            agent_management_service=orchestrator_service.agent_management_service,
            risk_manager_service=orchestrator_service.risk_manager_service,
            google_bridge=orchestrator_service.google_bridge,
            a2a_protocol=orchestrator_service.a2a_protocol,
            simulated_trade_executor=mock_simulated_trade_executor,
            hyperliquid_execution_service=None,
            trade_history_service=orchestrator_service.trade_history_service,
            event_bus_service=orchestrator_service.event_bus_service
        )
        mock_tc_instance.set_trade_execution_mode.assert_called_once_with("paper")

@pytest.mark.asyncio
@patch('python_ai_services.services.agent_orchestrator_service.get_hyperliquid_execution_service_instance')
async def test_get_trading_coordinator_hyperliquid_agent_success(
    mock_get_hles_instance: MagicMock, orchestrator_service: AgentOrchestratorService
):
    agent_config = create_sample_agent_config("hl_agent", provider="hyperliquid")
    mock_hles_instance = MagicMock(spec=HyperliquidExecutionService)
    mock_get_hles_instance.return_value = mock_hles_instance
    with patch('python_ai_services.services.agent_orchestrator_service.TradingCoordinator') as MockTradingCoordinator:
        mock_tc_instance = AsyncMock(spec=TradingCoordinator)
        mock_tc_instance.set_trade_execution_mode = AsyncMock()
        MockTradingCoordinator.return_value = mock_tc_instance
        coordinator = await orchestrator_service._get_trading_coordinator_for_agent(agent_config)
        assert coordinator is not None
        mock_get_hles_instance.assert_called_once_with(agent_config)
        MockTradingCoordinator.assert_called_once_with(
            agent_id=agent_config.agent_id,
            agent_management_service=orchestrator_service.agent_management_service,
            risk_manager_service=orchestrator_service.risk_manager_service,
            google_bridge=orchestrator_service.google_bridge,
            a2a_protocol=orchestrator_service.a2a_protocol,
            simulated_trade_executor=orchestrator_service.simulated_trade_executor,
            hyperliquid_execution_service=mock_hles_instance,
            trade_history_service=orchestrator_service.trade_history_service,
            event_bus_service=orchestrator_service.event_bus_service
        )
        mock_tc_instance.set_trade_execution_mode.assert_called_once_with("hyperliquid")

@patch('python_ai_services.services.agent_orchestrator_service.get_hyperliquid_execution_service_instance')
async def test_get_trading_coordinator_hyperliquid_factory_returns_none(
    mock_get_hles_instance: MagicMock, orchestrator_service: AgentOrchestratorService
):
    mock_get_hles_instance.return_value = None
    agent_config = create_sample_agent_config("hl_agent_factory_fail", provider="hyperliquid")
    coordinator = await orchestrator_service._get_trading_coordinator_for_agent(agent_config)
    assert coordinator is None
    mock_get_hles_instance.assert_called_once_with(agent_config)

# --- Tests for run_single_agent_cycle ---
@pytest.mark.asyncio
async def test_run_single_agent_cycle_agent_not_found(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    mock_agent_service.get_agent = AsyncMock(return_value=None)
    await orchestrator_service.run_single_agent_cycle("unknown_agent")
    mock_agent_service.get_agent.assert_called_once_with("unknown_agent")
    mock_agent_service.update_agent_heartbeat.assert_not_called()

@pytest.mark.asyncio
async def test_run_single_agent_cycle_agent_not_active(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "inactive_agent"
    agent_config = create_sample_agent_config(agent_id, is_active=False)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    await orchestrator_service.run_single_agent_cycle(agent_id)
    mock_agent_service.update_agent_heartbeat.assert_not_called()

@pytest.mark.asyncio
async def test_run_single_agent_cycle_tc_setup_fails(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "agent_tc_fail"
    agent_config = create_sample_agent_config(agent_id, provider="hyperliquid")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    with patch('python_ai_services.services.agent_orchestrator_service.get_hyperliquid_execution_service_instance', return_value=None):
        await orchestrator_service.run_single_agent_cycle(agent_id)
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
async def test_run_single_agent_cycle_generic_agent_no_watched_symbols(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "generic_agent_no_symbols"
    agent_config = create_sample_agent_config(agent_id, symbols=[], agent_type_override="GenericAgent")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    mock_tc = AsyncMock(spec=TradingCoordinator)
    mock_tc.analyze_trading_opportunity = AsyncMock()
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock(return_value=mock_tc)
    await orchestrator_service.run_single_agent_cycle(agent_id)
    mock_tc.analyze_trading_opportunity.assert_not_called()
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
async def test_run_single_agent_cycle_generic_agent_success_with_symbols(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent_id = "generic_agent_with_symbols"
    symbols = ["BTC/USD", "ETH/USD"]
    agent_config = create_sample_agent_config(agent_id, symbols=symbols, agent_type_override="GenericAgent")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    mock_tc = AsyncMock(spec=TradingCoordinator)
    mock_tc.analyze_trading_opportunity = AsyncMock(return_value={"decision": "buy"})
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock(return_value=mock_tc)
    await orchestrator_service.run_single_agent_cycle(agent_id)
    assert mock_tc.analyze_trading_opportunity.call_count == len(symbols)
    first_call_args = mock_tc.analyze_trading_opportunity.call_args_list[0][0][0]
    assert isinstance(first_call_args, TradingAnalysisCrewRequest)
    assert first_call_args.symbol == symbols[0]
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
@patch('python_ai_services.services.agent_orchestrator_service.DarvasBoxTechnicalService')
async def test_run_single_agent_cycle_darvas_agent_success(
    MockDarvasService: MagicMock, orchestrator_service: AgentOrchestratorService,
    mock_agent_service: MagicMock, mock_market_data_service: MagicMock, mock_event_bus_service: MagicMock
):
    agent_id = "darvas_agent_1"
    symbols = ["SOL/USD", "ADA/USD"]
    agent_config = create_sample_agent_config(agent_id, symbols=symbols, agent_type_override="DarvasBoxTechnicalAgent")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    mock_darvas_instance = AsyncMock()
    mock_darvas_instance.analyze_symbol_and_generate_signal = AsyncMock()
    MockDarvasService.return_value = mock_darvas_instance
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock()
    await orchestrator_service.run_single_agent_cycle(agent_id)
    MockDarvasService.assert_called_once_with(
        agent_config=agent_config, event_bus=mock_event_bus_service, market_data_service=mock_market_data_service
    )
    assert mock_darvas_instance.analyze_symbol_and_generate_signal.call_count == len(symbols)
    orchestrator_service._get_trading_coordinator_for_agent.assert_not_called()
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
@patch('python_ai_services.services.agent_orchestrator_service.WilliamsAlligatorTechnicalService')
async def test_run_single_agent_cycle_williams_alligator_agent_success(
    MockWilliamsAlligatorService: MagicMock, orchestrator_service: AgentOrchestratorService,
    mock_agent_service: MagicMock, mock_market_data_service: MagicMock, mock_event_bus_service: MagicMock
):
    agent_id = "wa_agent_1"
    symbols = ["AAPL", "MSFT"]
    agent_config = create_sample_agent_config(agent_id, symbols=symbols, agent_type_override="WilliamsAlligatorTechnicalAgent")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    mock_wa_instance = AsyncMock()
    mock_wa_instance.analyze_symbol_and_generate_signal = AsyncMock()
    MockWilliamsAlligatorService.return_value = mock_wa_instance
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock()
    await orchestrator_service.run_single_agent_cycle(agent_id)
    MockWilliamsAlligatorService.assert_called_once_with(
        agent_config=agent_config, event_bus=mock_event_bus_service, market_data_service=mock_market_data_service
    )
    assert mock_wa_instance.analyze_symbol_and_generate_signal.call_count == len(symbols)
    orchestrator_service._get_trading_coordinator_for_agent.assert_not_called()
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
@patch('python_ai_services.services.agent_orchestrator_service.MarketConditionClassifierService')
async def test_run_single_agent_cycle_mcc_agent_success(
    MockMCCService: MagicMock, orchestrator_service: AgentOrchestratorService,
    mock_agent_service: MagicMock, mock_market_data_service: MagicMock, mock_event_bus_service: MagicMock
):
    agent_id = "mcc_agent_1"
    symbols = ["EUR/USD", "USD/JPY"]
    agent_config = create_sample_agent_config(agent_id, symbols=symbols, agent_type_override="MarketConditionClassifierAgent")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)
    mock_mcc_instance = AsyncMock()
    mock_mcc_instance.analyze_symbol_and_publish_condition = AsyncMock()
    MockMCCService.return_value = mock_mcc_instance
    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock()
    await orchestrator_service.run_single_agent_cycle(agent_id)
    MockMCCService.assert_called_once_with(
        agent_config=agent_config, event_bus=mock_event_bus_service, market_data_service=mock_market_data_service
    )
    assert mock_mcc_instance.analyze_symbol_and_publish_condition.call_count == len(symbols)
    orchestrator_service._get_trading_coordinator_for_agent.assert_not_called()
    mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)

@pytest.mark.asyncio
@patch('python_ai_services.services.agent_orchestrator_service.PortfolioOptimizerService') # Not directly used but to be safe
async def test_run_single_agent_cycle_portfolio_optimizer_agent(
    MockPOService: MagicMock, # Unused for now as PO service not instantiated by cycle
    orchestrator_service: AgentOrchestratorService,
    mock_agent_service: MagicMock
):
    agent_id = "po_agent_1"
    agent_config = create_sample_agent_config(agent_id, agent_type_override="PortfolioOptimizerAgent")
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    orchestrator_service._get_trading_coordinator_for_agent = AsyncMock()
    # Specialized services should not be called for PO agent in its own cycle.
    with patch('python_ai_services.services.agent_orchestrator_service.DarvasBoxTechnicalService') as MockDarvas, \
         patch('python_ai_services.services.agent_orchestrator_service.WilliamsAlligatorTechnicalService') as MockWA, \
         patch('python_ai_services.services.agent_orchestrator_service.MarketConditionClassifierService') as MockMCC:

        await orchestrator_service.run_single_agent_cycle(agent_id)

        MockDarvas.assert_not_called()
        MockWA.assert_not_called()
        MockMCC.assert_not_called()
        orchestrator_service._get_trading_coordinator_for_agent.assert_not_called()
        mock_agent_service.update_agent_heartbeat.assert_called_once_with(agent_id)


# --- Tests for run_all_active_agents_once ---
@pytest.mark.asyncio
async def test_run_all_active_agents_once_no_active_agents(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    mock_agent_service.get_agents = AsyncMock(return_value=[
        create_sample_agent_config("agent1", is_active=False),
        create_sample_agent_config("agent2", is_active=False)
    ])
    orchestrator_service.run_single_agent_cycle = AsyncMock()
    await orchestrator_service.run_all_active_agents_once()
    orchestrator_service.run_single_agent_cycle.assert_not_called()

@pytest.mark.asyncio
async def test_run_all_active_agents_once_multiple_active(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent1_config = create_sample_agent_config("agent1_active", is_active=True)
    agent2_config = create_sample_agent_config("agent2_inactive", is_active=False)
    agent3_config = create_sample_agent_config("agent3_active", is_active=True)
    mock_agent_service.get_agents = AsyncMock(return_value=[agent1_config, agent2_config, agent3_config])
    orchestrator_service.run_single_agent_cycle = AsyncMock()
    await orchestrator_service.run_all_active_agents_once()
    assert orchestrator_service.run_single_agent_cycle.call_count == 2
    calls = orchestrator_service.run_single_agent_cycle.call_args_list
    called_agent_ids = {call[0][0] for call in calls}
    assert agent1_config.agent_id in called_agent_ids
    assert agent3_config.agent_id in called_agent_ids
    assert agent2_config.agent_id not in called_agent_ids

@pytest.mark.asyncio
async def test_run_all_active_agents_one_cycle_fails(orchestrator_service: AgentOrchestratorService, mock_agent_service: MagicMock):
    agent1_config = create_sample_agent_config("agent1_ok_cycle", is_active=True)
    agent2_config = create_sample_agent_config("agent2_fail_cycle", is_active=True)
    mock_agent_service.get_agents = AsyncMock(return_value=[agent1_config, agent2_config])
    async def side_effect_for_run_cycle(agent_id_param):
        if agent_id_param == "agent2_fail_cycle":
            raise ValueError("Simulated cycle failure")
        return f"Success for {agent_id_param}"
    orchestrator_service.run_single_agent_cycle = AsyncMock(side_effect=side_effect_for_run_cycle)
    await orchestrator_service.run_all_active_agents_once()
    assert orchestrator_service.run_single_agent_cycle.call_count == 2

# Ensure all type hints are imported
from typing import Optional, List, Dict, Any
```
