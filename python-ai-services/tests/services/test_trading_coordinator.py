import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import json
from typing import Optional, Dict, Any

# Models and Services to test or mock
from python_ai_services.services.trading_coordinator import TradingCoordinator
from python_ai_services.services.simulated_trade_executor import SimulatedTradeExecutor
from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService, HyperliquidExecutionServiceError

from python_ai_services.models.paper_trading_models import PaperTradeOrder, PaperTradeFill, PaperOrderStatus
from python_ai_services.models.trading_history_models import TradeSide as PaperTradeSide, OrderType as PaperOrderType
from python_ai_services.models.hyperliquid_models import HyperliquidPlaceOrderParams, HyperliquidOrderResponseData

from python_ai_services.utils.google_sdk_bridge import GoogleSDKBridge
from python_ai_services.utils.a2a_protocol import A2AProtocol

# --- Mock Fixtures ---

@pytest_asyncio.fixture
def mock_google_bridge():
    return MagicMock(spec=GoogleSDKBridge)

@pytest_asyncio.fixture
def mock_a2a_protocol():
    return MagicMock(spec=A2AProtocol)

@pytest_asyncio.fixture
def mock_simulated_executor():
    executor = MagicMock(spec=SimulatedTradeExecutor)
    executor.submit_paper_order = AsyncMock()
    return executor

@pytest_asyncio.fixture
def mock_hyperliquid_executor():
    executor = MagicMock(spec=HyperliquidExecutionService)
    executor.place_order = AsyncMock()
    return executor

@pytest_asyncio.fixture
def trading_coordinator(
from python_ai_services.services.trade_history_service import TradeHistoryService
from python_ai_services.models.trade_history_models import TradeFillData
from python_ai_services.services.risk_manager_service import RiskManagerService # Added
from python_ai_services.services.agent_management_service import AgentManagementService # Added
from python_ai_services.models.event_bus_models import RiskAssessmentResponseData, TradeSignalEventPayload # Added
from datetime import datetime, timezone

@pytest_asyncio.fixture
def mock_trade_history_service():
    service = AsyncMock(spec=TradeHistoryService)
    service.record_fill = AsyncMock()
    return service

@pytest_asyncio.fixture # Added
def mock_risk_manager_service():
    service = AsyncMock(spec=RiskManagerService)
    service.assess_trade_risk = AsyncMock()
    return service

@pytest_asyncio.fixture # Added
def mock_agent_management_service():
    return AsyncMock(spec=AgentManagementService)


@pytest_asyncio.fixture
def trading_coordinator( # Updated
    mock_google_bridge: MagicMock,
    mock_a2a_protocol: MagicMock,
    mock_simulated_executor: MagicMock,
    mock_hyperliquid_executor: MagicMock,
    mock_trade_history_service: MagicMock,
    mock_risk_manager_service: MagicMock, # Added
    mock_agent_management_service: MagicMock # Added
):
    return TradingCoordinator(
        agent_id="tc_main_test_id", # Provide a default agent_id for TC itself
        agent_management_service=mock_agent_management_service, # Added
        risk_manager_service=mock_risk_manager_service, # Added
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_executor,
        hyperliquid_execution_service=mock_hyperliquid_executor,
        trade_history_service=mock_trade_history_service,
        event_bus_service=AsyncMock() # Mock event bus, not used in this step actively
    )

# --- Tests for __init__ ---

def test_trading_coordinator_init( # Renamed and Updated
    mock_google_bridge, mock_a2a_protocol, mock_simulated_executor,
    mock_hyperliquid_executor, mock_trade_history_service,
    mock_risk_manager_service, mock_agent_management_service
):
    coordinator = TradingCoordinator(
        agent_id="tc_test_init",
        agent_management_service=mock_agent_management_service,
        risk_manager_service=mock_risk_manager_service,
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_executor,
        hyperliquid_execution_service=mock_hyperliquid_executor, # Can be None for some tests
        trade_history_service=mock_trade_history_service,
        event_bus_service=AsyncMock()
    )
    assert coordinator.agent_id == "tc_test_init"
    assert coordinator.agent_management_service == mock_agent_management_service
    assert coordinator.risk_manager_service == mock_risk_manager_service
    assert coordinator.google_bridge == mock_google_bridge
    assert coordinator.hyperliquid_execution_service == mock_hyperliquid_executor
    assert coordinator.trade_history_service == mock_trade_history_service
    assert coordinator.trade_execution_mode == "paper"


# --- Tests for set_trade_execution_mode and get_trade_execution_mode ---

@pytest.mark.asyncio
async def test_set_and_get_trade_execution_mode(trading_coordinator: TradingCoordinator):
    # Default mode
    mode_info = await trading_coordinator.get_trade_execution_mode()
    assert mode_info["current_mode"] == "paper"

    # Set to live
    result = await trading_coordinator.set_trade_execution_mode("live")
    assert result["status"] == "success"
    assert result["message"] == "Trade execution mode set to live"
    mode_info = await trading_coordinator.get_trade_execution_mode()
    assert mode_info["current_mode"] == "live"

    # Set back to paper
    result = await trading_coordinator.set_trade_execution_mode("paper")
    assert result["status"] == "success"
    mode_info = await trading_coordinator.get_trade_execution_mode()
    assert mode_info["current_mode"] == "paper"

@pytest.mark.asyncio
async def test_set_trade_execution_mode_invalid(trading_coordinator: TradingCoordinator):
    with pytest.raises(ValueError, match="Invalid trade execution mode 'test'. Allowed modes are: paper, live"):
        await trading_coordinator.set_trade_execution_mode("test")

# --- Tests for _parse_crew_result_and_execute ---

@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_risk_approved_executes(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_risk_manager_service: MagicMock
):
    user_id = "agent_risk_approved" # This is the agent_id for whom the decision is made
    crew_result_dict = {
        "action": "BUY", "symbol": "ETH/USD", "quantity": 0.1,
        "order_type": "LIMIT", "price": "2000.0",
        "strategy_name": "test_strat", "confidence": 0.8
    }
    # Mock RiskManagerService to approve the trade
    mock_risk_manager_service.assess_trade_risk = AsyncMock(
        return_value=RiskAssessmentResponseData(signal_approved=True)
    )

    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, user_id)

    mock_risk_manager_service.assess_trade_risk.assert_called_once()
    # Verify the TradeSignalEventPayload passed to assess_trade_risk
    call_args_list = mock_risk_manager_service.assess_trade_risk.call_args_list
    assert len(call_args_list) == 1
    actual_call_args = call_args_list[0][1] # Keywords args of the first call
    assert actual_call_args['agent_id_of_proposer'] == user_id
    assert isinstance(actual_call_args['trade_signal'], TradeSignalEventPayload)
    assert actual_call_args['trade_signal'].symbol == "ETH/USD"
    assert actual_call_args['trade_signal'].action == "buy"

    expected_trade_params_for_execution = {
        "action": "buy", "symbol": "ETH/USD", "quantity": 0.1,
        "order_type": "limit", "price": 2000.0,
        "stop_loss_price": None, "take_profit_price": None # From parsing logic if not in crew_result
    }
    mock_execute_decision.assert_called_once_with(expected_trade_params_for_execution, user_id)


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_risk_rejected_does_not_execute(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_risk_manager_service: MagicMock
):
    user_id = "agent_risk_rejected"
    crew_result_dict = {
        "action": "SELL", "symbol": "BTC/USD", "quantity": 0.01, "order_type": "MARKET", "price": 60000.0
    }
    # Mock RiskManagerService to reject the trade
    mock_risk_manager_service.assess_trade_risk = AsyncMock(
        return_value=RiskAssessmentResponseData(signal_approved=False, rejection_reason="Symbol not allowed")
    )

    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, user_id)

    mock_risk_manager_service.assess_trade_risk.assert_called_once()
    mock_execute_decision.assert_not_called() # Should not execute if risk rejected


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_hold_action_skips_risk_check_and_execution(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_risk_manager_service: MagicMock
):
    user_id = "agent_hold_action"
    crew_result_dict = {"action": "HOLD", "symbol": "ETH/USD"}

    with patch.object(trading_coordinator.logger, 'info') as mock_logger:
      await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, user_id)

      mock_risk_manager_service.assess_trade_risk.assert_not_called()
      mock_execute_decision.assert_not_called()
      mock_logger.assert_any_call(f"Crew decision is 'hold' for ETH/USD. No trade execution. User ID: {user_id}")


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_missing_params(mock_execute_decision: AsyncMock, trading_coordinator: TradingCoordinator):
    user_id = str(uuid.uuid4())
    crew_result_dict = {"action": "BUY", "symbol": "ETH/USD"} # Missing quantity
    with patch.object(trading_coordinator, 'logger') as mock_logger:
        await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, user_id)
        mock_execute_decision.assert_not_called()
        mock_logger.warning.assert_any_call(f"Essential trade parameters (action, symbol, quantity) not found in crew result: {crew_result_dict}")


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_invalid_json_string(mock_execute_decision: AsyncMock, trading_coordinator: TradingCoordinator):
    user_id = str(uuid.uuid4())
    crew_result_invalid_json = "{'action': 'BUY', 'symbol': 'ETH/USD'" # Invalid JSON
    with patch.object(trading_coordinator, 'logger') as mock_logger:
        await trading_coordinator._parse_crew_result_and_execute(crew_result_invalid_json, user_id)
        mock_execute_decision.assert_not_called()
        mock_logger.warning.assert_any_call(f"Crew result is a string but not valid JSON: {crew_result_invalid_json}")

# --- Tests for _execute_trade_decision ---

# Paper Trading Mode Tests
@pytest.mark.asyncio
async def test_execute_paper_trade_buy_limit_success(trading_coordinator: TradingCoordinator, mock_simulated_executor: MagicMock):
    await trading_coordinator.set_trade_execution_mode("paper")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "buy", "symbol": "ETH", "quantity": 1.0, "order_type": "limit", "price": 1900.0}

    mock_order = PaperTradeOrder(user_id=uuid.UUID(user_id), symbol="ETH", side=PaperTradeSide.BUY, order_type=PaperOrderType.LIMIT, quantity=1.0, limit_price=1900.0, status=PaperOrderStatus.FILLED, order_id=uuid.uuid4())
    mock_fill = PaperTradeFill(order_id=mock_order.order_id, user_id=uuid.UUID(user_id), symbol="ETH", side=PaperTradeSide.BUY, price=1900.0, quantity=1.0)
    mock_simulated_executor.submit_paper_order.return_value = (mock_order, [mock_fill])

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)

    mock_simulated_executor.submit_paper_order.assert_called_once()
    called_arg = mock_simulated_executor.submit_paper_order.call_args[0][0]
    assert isinstance(called_arg, PaperTradeOrder)
    assert called_arg.symbol == "ETH" and called_arg.side == PaperTradeSide.BUY
    assert result["status"] == "paper_executed"
    assert result["details"]["order"]["symbol"] == "ETH"

@pytest.mark.asyncio
async def test_execute_paper_trade_sell_market_success(trading_coordinator: TradingCoordinator, mock_simulated_executor: MagicMock):
    await trading_coordinator.set_trade_execution_mode("paper")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "sell", "symbol": "BTC", "quantity": 0.1, "order_type": "market"}

    mock_order = PaperTradeOrder(user_id=uuid.UUID(user_id), symbol="BTC", side=PaperTradeSide.SELL, order_type=PaperOrderType.MARKET, quantity=0.1, status=PaperOrderStatus.FILLED, order_id=uuid.uuid4())
    mock_fill = PaperTradeFill(order_id=mock_order.order_id, user_id=uuid.UUID(user_id), symbol="BTC", side=PaperTradeSide.SELL, price=30000.0, quantity=0.1) # Example fill price
    mock_simulated_executor.submit_paper_order.return_value = (mock_order, [mock_fill])

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)

    mock_simulated_executor.submit_paper_order.assert_called_once()
    called_arg = mock_simulated_executor.submit_paper_order.call_args[0][0]
    assert isinstance(called_arg, PaperTradeOrder)
    assert called_arg.symbol == "BTC" and called_arg.side == PaperTradeSide.SELL
    assert result["status"] == "paper_executed"

@pytest.mark.asyncio
async def test_execute_paper_trade_executor_fails(trading_coordinator: TradingCoordinator, mock_simulated_executor: MagicMock):
    await trading_coordinator.set_trade_execution_mode("paper")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "buy", "symbol": "ETH", "quantity": 1.0, "order_type": "market"}
    mock_simulated_executor.submit_paper_order.side_effect = Exception("Simulated DB error")

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)
    assert result["status"] == "paper_failed"
    assert result["error"] == "Simulated DB error"

@pytest.mark.asyncio
async def test_execute_paper_trade_no_executor(mock_google_bridge, mock_a2a_protocol, mock_hyperliquid_executor):
    # Initialize TC without simulated_executor
    coordinator = TradingCoordinator(mock_google_bridge, mock_a2a_protocol, None, mock_hyperliquid_executor)
    await coordinator.set_trade_execution_mode("paper")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "buy", "symbol": "ETH", "quantity": 1.0, "order_type": "market"}

    result = await coordinator._execute_trade_decision(trade_params, user_id)
    assert result["status"] == "paper_skipped"
    assert result["reason"] == "Simulated executor unavailable."


# Live Trading Mode Tests (Hyperliquid)
@pytest.mark.asyncio
async def test_execute_live_trade_buy_limit_success(trading_coordinator: TradingCoordinator, mock_hyperliquid_executor: MagicMock):
    await trading_coordinator.set_trade_execution_mode("live")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "buy", "symbol": "ETH", "quantity": 0.01, "order_type": "limit", "price": 1950.0}

    mock_hl_response = HyperliquidOrderResponseData(status="resting", oid=67890, order_type_info={"limit": {"tif": "Gtc"}})
    mock_hyperliquid_executor.place_order.return_value = mock_hl_response

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)

    mock_hyperliquid_executor.place_order.assert_called_once()
    called_arg: HyperliquidPlaceOrderParams = mock_hyperliquid_executor.place_order.call_args[0][0]
    assert isinstance(called_arg, HyperliquidPlaceOrderParams)
    assert called_arg.asset == "ETH"
    assert called_arg.is_buy is True
    assert called_arg.order_type == {"limit": {"tif": "Gtc"}}
    # Status changed in a previous subtask due to risk management additions
    assert result["status"] == "live_executed_with_risk_management"
    assert result["details"]["main_order"]["oid"] == 67890
    # Check that record_fill was NOT called because simulated_fills was None in mock_hl_response
    trading_coordinator.trade_history_service.record_fill.assert_not_called()


@pytest.mark.asyncio
async def test_execute_live_trade_with_simulated_fills_records_history(
    trading_coordinator: TradingCoordinator,
    mock_hyperliquid_executor: MagicMock,
    mock_trade_history_service: MagicMock # Added
):
    await trading_coordinator.set_trade_execution_mode("live")
    user_id = str(uuid.uuid4())
    # Market order, price is placeholder for sizing, actual fill price in sim_fill_data
    trade_params = {"action": "buy", "symbol": "ETH", "quantity": 0.01, "order_type": "market", "price": 0.0}

    # Create mock HLES response with simulated_fills
    sim_fill_data_dict = {
        "asset": "ETH", "side": "buy", "quantity": 0.01, "price": 2000.0, # Actual fill price
        "timestamp": datetime.now(timezone.utc).isoformat(), "fee": 0.2, "fee_currency": "USD",
        "exchange_order_id": "hl_oid_123", "exchange_trade_id": "hl_tid_abc"
    }
    mock_hl_response_with_fills = HyperliquidOrderResponseData(
        status="filled", oid=12345,
        order_type_info={"market": {"tif": "Ioc"}},
        simulated_fills=[sim_fill_data_dict] # List of dicts
    )
    mock_hyperliquid_executor.place_order.return_value = mock_hl_response_with_fills
    # mock_trade_history_service.record_fill is already an AsyncMock from the fixture

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)

    assert result["status"] == "live_executed_with_risk_management" # Status from risk management update
    assert result["details"]["main_order"]["oid"] == 12345

    # Verify record_fill was called
    mock_trade_history_service.record_fill.assert_called_once()
    called_fill_arg = mock_trade_history_service.record_fill.call_args[0][0]
    assert isinstance(called_fill_arg, TradeFillData)
    assert called_fill_arg.agent_id == user_id
    assert called_fill_arg.asset == sim_fill_data_dict["asset"]
    assert called_fill_arg.quantity == sim_fill_data_dict["quantity"]
    assert called_fill_arg.price == sim_fill_data_dict["price"]
    assert called_fill_arg.timestamp == datetime.fromisoformat(sim_fill_data_dict["timestamp"])


@pytest.mark.asyncio
async def test_execute_live_trade_hyperliquid_service_error(trading_coordinator: TradingCoordinator, mock_hyperliquid_executor: MagicMock):
    await trading_coordinator.set_trade_execution_mode("live")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "sell", "symbol": "BTC", "quantity": 0.001, "order_type": "market"}
    mock_hyperliquid_executor.place_order.side_effect = HyperliquidExecutionServiceError("Insufficient funds for HL")

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)
    assert result["status"] == "live_failed"
    assert result["error"] == "Insufficient funds for HL"

@pytest.mark.asyncio
async def test_execute_live_trade_general_exception(trading_coordinator: TradingCoordinator, mock_hyperliquid_executor: MagicMock):
    await trading_coordinator.set_trade_execution_mode("live")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "sell", "symbol": "BTC", "quantity": 0.001, "order_type": "market"}
    mock_hyperliquid_executor.place_order.side_effect = Exception("Unexpected network issue")

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)
    assert result["status"] == "live_failed"
    assert result["error"] == "Unexpected error: Unexpected network issue"


@pytest.mark.asyncio
async def test_execute_live_trade_no_hyperliquid_service(mock_google_bridge, mock_a2a_protocol, mock_simulated_executor):
    # Initialize TC without hyperliquid_executor
    coordinator = TradingCoordinator(mock_google_bridge, mock_a2a_protocol, mock_simulated_executor, None)
    await coordinator.set_trade_execution_mode("live")
    user_id = str(uuid.uuid4())
    trade_params = {"action": "buy", "symbol": "ETH", "quantity": 1.0, "order_type": "market"}

    result = await coordinator._execute_trade_decision(trade_params, user_id)
    assert result["status"] == "live_skipped"
    assert result["reason"] == "Hyperliquid service unavailable."

# Unknown Mode Test
@pytest.mark.asyncio
async def test_execute_trade_unknown_mode(trading_coordinator: TradingCoordinator):
    await trading_coordinator.set_trade_execution_mode("mystery_mode") # Set an invalid mode
    user_id = str(uuid.uuid4())
    trade_params = {"action": "buy", "symbol": "SOL", "quantity": 10, "order_type": "market"}

    result = await trading_coordinator._execute_trade_decision(trade_params, user_id)
    assert result["status"] == "error"
    assert result["reason"] == "Unknown trade execution mode."

```
