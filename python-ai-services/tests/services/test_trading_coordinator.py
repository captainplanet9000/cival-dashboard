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
    mock_google_bridge: MagicMock,
    mock_a2a_protocol: MagicMock,
    mock_simulated_executor: MagicMock,
    mock_hyperliquid_executor: MagicMock # Add to params but make it optional in test if needed
):
    # Default initialization with both executors for general testing
    return TradingCoordinator(
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_executor,
        hyperliquid_execution_service=mock_hyperliquid_executor
    )

# --- Tests for __init__ ---

def test_trading_coordinator_init_defaults(
    mock_google_bridge, mock_a2a_protocol, mock_simulated_executor
):
    coordinator = TradingCoordinator(
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_executor
        # hyperliquid_execution_service is None by default
    )
    assert coordinator.google_bridge == mock_google_bridge
    assert coordinator.a2a_protocol == mock_a2a_protocol
    assert coordinator.simulated_trade_executor == mock_simulated_executor
    assert coordinator.hyperliquid_execution_service is None
    assert coordinator.trade_execution_mode == "paper"

def test_trading_coordinator_init_with_hyperliquid(
    mock_google_bridge, mock_a2a_protocol, mock_simulated_executor, mock_hyperliquid_executor
):
    coordinator = TradingCoordinator(
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_executor,
        hyperliquid_execution_service=mock_hyperliquid_executor
    )
    assert coordinator.hyperliquid_execution_service == mock_hyperliquid_executor
    assert coordinator.trade_execution_mode == "paper" # Still defaults to paper

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
async def test_parse_crew_result_buy_action_json_string(mock_execute_decision: AsyncMock, trading_coordinator: TradingCoordinator):
    user_id = str(uuid.uuid4())
    crew_result_json_str = json.dumps({
        "action": "BUY", "symbol": "ETH/USD", "quantity": "0.1", "order_type": "LIMIT", "price": "2000.0"
    })
    await trading_coordinator._parse_crew_result_and_execute(crew_result_json_str, user_id)

    expected_trade_params = {
        "action": "buy", "symbol": "ETH/USD", "quantity": 0.1, "order_type": "limit", "price": 2000.0
    }
    mock_execute_decision.assert_called_once_with(expected_trade_params, user_id)

@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_sell_action_dict(mock_execute_decision: AsyncMock, trading_coordinator: TradingCoordinator):
    user_id = str(uuid.uuid4())
    crew_result_dict = {
        "trading_decision": {"action": "SELL", "symbol": "BTC/USD", "quantity": 0.01, "order_type": "MARKET"}
    }
    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, user_id)

    expected_trade_params = {
        "action": "sell", "symbol": "BTC/USD", "quantity": 0.01, "order_type": "market"
    }
    mock_execute_decision.assert_called_once_with(expected_trade_params, user_id)

@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_hold_action(mock_execute_decision: AsyncMock, trading_coordinator: TradingCoordinator):
    user_id = str(uuid.uuid4())
    crew_result_dict = {"action": "HOLD", "symbol": "ETH/USD"}
    with patch.object(trading_coordinator, 'logger') as mock_logger: # trading_coordinator.logger
      await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, user_id)
      mock_execute_decision.assert_not_called()
      mock_logger.info.assert_any_call("Crew decision is 'hold' for ETH/USD. No trade execution.")


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
    assert result["status"] == "live_executed"
    assert result["details"]["oid"] == 67890

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
