import pytest
import pytest_asyncio
from unittest import mock # Using unittest.mock for broader compatibility
import httpx
import asyncio
from datetime import datetime

# Attempt to import actual services and types
from python_ai_services.services.agent_state_manager import AgentStateManager
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.trading_coordinator import TradingCoordinator

# Attempt to import Pydantic models for A2A communication and requests
# If these imports fail in a real test environment due to path issues or complexity,
# simplified placeholder classes would be defined here.
try:
    from python_ai_services.types.trading_types import (
        MarketAnalysis,
        RiskAssessment,
        TradingAnalysisRequest,
        # Assuming these simple structures for mock responses from A2A
        A2AResponse # A conceptual type for a2a_protocol.send_message
    )
    # Define a simple A2AResponse if not in trading_types, for mocking purposes
    if 'A2AResponse' not in globals():
        from pydantic import BaseModel, Field
        class A2AResponse(BaseModel):
            payload: dict = Field(...)
            message_type: str = "response"
            status: str = "success"

except ImportError:
    # Placeholder Pydantic models if actual import fails
    from pydantic import BaseModel, Field, HttpUrl
    from typing import List, Dict, Optional, Any

    class MarketAnalysis(BaseModel):
        condition: str = "stable"
        trend_direction: str = "sideways"
        trend_strength: float = 0.5
        support_levels: List[float] = [100.0, 90.0]
        resistance_levels: List[float] = [110.0, 120.0]
        indicators: Dict[str, Any] = {"RSI": 50}
        raw_data_url: Optional[HttpUrl] = None

    class RiskAssessment(BaseModel):
        is_within_limits: bool = True
        risk_score: float = 0.3
        reason: Optional[str] = "Trade size is acceptable."
        details: Optional[Dict[str, Any]] = None

    class TradingAnalysisRequest(BaseModel):
        symbol: str
        account_id: Optional[str] = None
        context: Optional[Dict[str, Any]] = None

    class A2AResponse(BaseModel):
        payload: dict = Field(...)
        message_type: str = "response"
        status: str = "success"


# --- Fixtures ---

@pytest_asyncio.fixture
async def agent_state_manager_service():
    return AgentStateManager(db_connection_string="dummy_string_not_used_in_mocked_tests")

@pytest_asyncio.fixture
async def mock_google_sdk_bridge():
    return mock.AsyncMock()

@pytest_asyncio.fixture
async def mock_a2a_protocol():
    return mock.AsyncMock()

@pytest_asyncio.fixture
async def market_data_service_instance(mock_google_sdk_bridge, mock_a2a_protocol):
    return MarketDataService(google_bridge=mock_google_sdk_bridge, a2a_protocol=mock_a2a_protocol)

@pytest_asyncio.fixture
async def trading_coordinator_instance(mock_google_sdk_bridge, mock_a2a_protocol):
    service = TradingCoordinator(google_bridge=mock_google_sdk_bridge, a2a_protocol=mock_a2a_protocol)
    # Further mock the PydanticAI agent if its direct instantiation is complex or has side effects
    service.agent = mock.AsyncMock()
    service.agent.tools = mock.AsyncMock() # Mock the tools attribute if accessed directly
    # Specifically mock the tool methods that TradingCoordinator registers
    # These are actually wrappers around a2a_protocol.send_message
    service.agent.tools.analyze_market_conditions = mock.AsyncMock(spec=service.a2a_protocol.send_message)
    service.agent.tools.check_risk_limits = mock.AsyncMock(spec=service.a2a_protocol.send_message)
    return service


# --- AgentStateManager Tests ---

@pytest.mark.asyncio
async def test_get_agent_state_cache_hit(agent_state_manager_service: AgentStateManager):
    agent_id = "agent_cache_hit"
    cached_state = {"agentId": agent_id, "state": {"data": "from_cache"}, "updatedAt": datetime.utcnow().isoformat()}
    agent_state_manager_service.in_memory_cache[agent_id] = cached_state

    with mock.patch("httpx.AsyncClient") as mock_async_client:
        state = await agent_state_manager_service.get_agent_state(agent_id)
        assert state == cached_state
        mock_async_client.assert_not_called()

@pytest.mark.asyncio
async def test_get_agent_state_cache_miss_success(agent_state_manager_service: AgentStateManager):
    agent_id = "agent_cache_miss"
    api_response_state = {"agentId": agent_id, "state": {"data": "from_api"}, "updatedAt": datetime.utcnow().isoformat()}

    mock_response = mock.Mock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = api_response_state

    mock_get = mock.AsyncMock(return_value=mock_response)

    with mock.patch("httpx.AsyncClient.get", mock_get):
        state = await agent_state_manager_service.get_agent_state(agent_id)
        assert state == api_response_state
        assert agent_state_manager_service.in_memory_cache[agent_id] == api_response_state
        mock_get.assert_called_once()

@pytest.mark.asyncio
async def test_get_agent_state_api_404(agent_state_manager_service: AgentStateManager):
    agent_id = "agent_api_404"
    mock_response = mock.Mock(spec=httpx.Response)
    mock_response.status_code = 404
    mock_response.text = "Not Found"

    mock_get = mock.AsyncMock(side_effect=httpx.HTTPStatusError("Not Found", request=mock.Mock(), response=mock_response))

    with mock.patch("httpx.AsyncClient.get", mock_get):
        state = await agent_state_manager_service.get_agent_state(agent_id)
        assert state["agentId"] == agent_id
        assert state["state"] == {} # Empty default state
        assert agent_id in agent_state_manager_service.in_memory_cache
        assert agent_state_manager_service.in_memory_cache[agent_id]["state"] == {}

@pytest.mark.asyncio
async def test_update_state_field_success(agent_state_manager_service: AgentStateManager):
    agent_id = "agent_update_field"
    initial_state_data = {"field1": "value1", "field2": "value2"}
    initial_full_state = {"agentId": agent_id, "state": initial_state_data, "updatedAt": "sometime"}

    updated_state_response = {"agentId": agent_id, "state": {"field1": "new_value", "field2": "value2"}, "updatedAt": "now"}

    # Mock get_agent_state to return our initial state
    agent_state_manager_service.get_agent_state = mock.AsyncMock(return_value=initial_full_state)
    # Mock update_agent_state to check its arguments and return a success response
    agent_state_manager_service.update_agent_state = mock.AsyncMock(return_value=updated_state_response)

    result = await agent_state_manager_service.update_state_field(agent_id, "field1", "new_value")

    agent_state_manager_service.get_agent_state.assert_called_once_with(agent_id)
    expected_state_to_update = initial_state_data.copy()
    expected_state_to_update["field1"] = "new_value"
    agent_state_manager_service.update_agent_state.assert_called_once_with(agent_id, expected_state_to_update)
    assert result == updated_state_response

# --- MarketDataService Tests ---

@pytest.mark.asyncio
async def test_get_historical_data_success(market_data_service_instance: MarketDataService):
    symbol = "BTCUSD"
    mock_candles = [{"open": 1, "close": 2}, {"open": 2, "close": 3}]
    api_response_data = {"candles": mock_candles}

    mock_response = mock.Mock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = api_response_data
    mock_get = mock.AsyncMock(return_value=mock_response)

    with mock.patch("httpx.AsyncClient.get", mock_get):
        candles = await market_data_service_instance.get_historical_data(symbol)
        assert candles == mock_candles
        mock_get.assert_called_once()

@pytest.mark.asyncio
async def test_get_historical_data_api_error(market_data_service_instance: MarketDataService):
    symbol = "BTCUSD"
    mock_response = mock.Mock(spec=httpx.Response)
    mock_response.status_code = 500
    mock_response.text = "Server Error"

    mock_get = mock.AsyncMock(side_effect=httpx.HTTPStatusError("Server Error", request=mock.Mock(), response=mock_response))

    with mock.patch("httpx.AsyncClient.get", mock_get):
        with pytest.raises(Exception, match="Failed to get historical data"):
            await market_data_service_instance.get_historical_data(symbol)

@pytest.mark.asyncio
async def test_subscribe_to_market_data(market_data_service_instance: MarketDataService):
    symbol = "ETHUSD"
    interval = "1m"

    mock_post_response = mock.Mock(spec=httpx.Response)
    mock_post_response.status_code = 200
    mock_post_response.json.return_value = {"status": "subscribed", "subscriptionId": "sub123"}
    mock_post = mock.AsyncMock(return_value=mock_post_response)

    with mock.patch("httpx.AsyncClient.post", mock_post), \
         mock.patch("asyncio.create_task") as mock_create_task:

        subscription_id = await market_data_service_instance.subscribe_to_market_data(symbol, interval)

        assert subscription_id is not None
        assert subscription_id in market_data_service_instance.subscriptions
        assert market_data_service_instance.subscriptions[subscription_id]["symbol"] == symbol
        mock_post.assert_called_once() # For registration
        mock_create_task.assert_called_once() # For _maintain_websocket_connection

# --- TradingCoordinator Tests ---

@pytest.mark.asyncio
async def test_execute_trade_success(trading_coordinator_instance: TradingCoordinator):
    trade_request_data = {"agentId": "agent1", "symbol": "BTCUSD", "action": "buy", "quantity": 1}
    api_trade_result = {"tradeId": "trade123", "status": "filled", **trade_request_data}

    mock_response = mock.Mock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = api_trade_result
    mock_post = mock.AsyncMock(return_value=mock_response)

    with mock.patch("httpx.AsyncClient.post", mock_post):
        result = await trading_coordinator_instance.execute_trade(trade_request_data)
        assert result == api_trade_result
        trading_coordinator_instance.a2a_protocol.broadcast_message.assert_called_once()
        args, kwargs = trading_coordinator_instance.a2a_protocol.broadcast_message.call_args
        assert kwargs["message_type"] == "trade_executed"
        assert kwargs["payload"]["trade"] == api_trade_result
        assert kwargs["payload"]["agent_id"] == trade_request_data["agentId"]
        assert "timestamp" in kwargs["payload"]

@pytest.mark.asyncio
async def test_analyze_trading_opportunity_no_account_id(trading_coordinator_instance: TradingCoordinator):
    """Test analyze_trading_opportunity when account_id is None, so risk check is skipped."""
    request_symbol = "BTCUSD"
    # Pass timeframe in context as the method expects it
    request_data = TradingAnalysisRequest(symbol=request_symbol, account_id=None, context={"timeframe": "4h"})

    mock_market_analysis = MarketAnalysis(
        condition="bullish",
        trend_direction="up",
        trend_strength=0.8,
        support_levels=[50000],
        resistance_levels=[55000],
        indicators={"SMA20": 51000}
    )

    # This mock will apply to all calls to send_message made by the tools
    # within analyze_trading_opportunity
    async def mock_send_message_logic_market_analyst(*args, **kwargs):
        if kwargs.get("to_agent") == "market-analyst":
            # Verify payload for market_analyst call
            assert kwargs.get("message_type") == "analyze_request"
            payload = kwargs.get("payload")
            assert payload is not None
            assert payload.get("symbol") == request_symbol
            # The actual method uses request.context.get("timeframe", "1h")
            # So if context has timeframe, it uses it, otherwise "1h"
            assert payload.get("timeframe") == request_data.context.get("timeframe")
            assert payload.get("indicators") == ["RSI", "MACD", "BB", "EMA"] # Default indicators
            return A2AResponse(payload=mock_market_analysis.dict())
        # This scenario should not call risk-monitor
        raise ValueError(f"Unexpected call to a2a_protocol.send_message: {kwargs}")

    trading_coordinator_instance.a2a_protocol.send_message = mock.AsyncMock(side_effect=mock_send_message_logic_market_analyst)

    ai_decision_str = f"AI Decision: Hold {request_symbol} due to market conditions."
    trading_coordinator_instance.agent.run = mock.AsyncMock(return_value=ai_decision_str)

    response = await trading_coordinator_instance.analyze_trading_opportunity(request_data)

    # Verify agent.run was called and check prompt
    trading_coordinator_instance.agent.run.assert_called_once()
    prompt_arg = trading_coordinator_instance.agent.run.call_args[0][0] # First positional argument
    assert request_symbol in prompt_arg
    assert mock_market_analysis.condition in prompt_arg
    assert mock_market_analysis.trend_direction in prompt_arg
    assert str(mock_market_analysis.support_levels[0]) in prompt_arg
    assert request_data.context.get("timeframe") in prompt_arg

    # Assert response structure
    assert response["symbol"] == request_symbol
    assert response["analysis"] == mock_market_analysis.dict()
    assert response["decision"] == ai_decision_str
    assert "risk_assessment" not in response # IMPORTANT: Risk check should be skipped

    # Ensure risk-monitor was NOT called by checking that send_message was only called once (for market-analyst)
    trading_coordinator_instance.a2a_protocol.send_message.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("ai_decision_str_template,is_actionable", [
    ("AI Decision: Buy {symbol} now.", True),
    ("AI Decision: Sell {symbol} based on resistance.", True),
    ("AI Decision: Hold {symbol}, market is choppy.", False),
])
async def test_analyze_trading_opportunity_with_account_id_and_conditional_risk_check(
    trading_coordinator_instance: TradingCoordinator,
    ai_decision_str_template: str,
    is_actionable: bool
):
    """Test analyze_trading_opportunity with account_id, conditional risk check based on AI decision, and prompt content."""
    request_symbol = "ETHUSD"
    ai_decision_str = ai_decision_str_template.format(symbol=request_symbol) # Format with symbol
    request_account_id = "acc_test_123"
    # Ensure timeframe is in context for market analysis tool call
    request_data = TradingAnalysisRequest(symbol=request_symbol, account_id=request_account_id, context={"source": "test_suite", "timeframe": "15m"})

    mock_market_analysis = MarketAnalysis(
        condition="ranging",
        trend_direction="sideways",
        trend_strength=0.3,
        support_levels=[2000],
        resistance_levels=[2100],
        indicators={"EMA50": 2050}
    )
    mock_risk_assessment = RiskAssessment(is_within_limits=True, risk_score=0.1, reason="OK")

    # Mock a2a_protocol.send_message to handle calls for market_analyst and risk_monitor
    async def mock_send_message_side_effect(*args, **kwargs):
        agent_called = kwargs.get("to_agent")
        if agent_called == "market-analyst":
            assert kwargs.get("message_type") == "analyze_request"
            payload = kwargs.get("payload")
            assert payload is not None
            assert payload.get("symbol") == request_symbol
            assert payload.get("timeframe") == request_data.context.get("timeframe")
            assert payload.get("indicators") == ["RSI", "MACD", "BB", "EMA"]
            return A2AResponse(payload=mock_market_analysis.dict())
        elif agent_called == "risk-monitor":
            assert kwargs.get("message_type") == "risk_check"
            payload = kwargs.get("payload")
            assert payload is not None
            assert payload.get("portfolio_id") == request_account_id
            assert payload.get("proposed_trade")["symbol"] == request_symbol
            assert payload.get("proposed_trade")["account_id"] == request_account_id
            # Determine action based on the AI decision string for robust checking
            expected_action = "buy" if "buy" in ai_decision_str.lower() else "sell"
            assert payload.get("proposed_trade")["action"] == expected_action
            return A2AResponse(payload=mock_risk_assessment.dict())
        # If an unexpected agent is called, raise an error to fail the test clearly.
        raise AssertionError(f"Unexpected call to a2a_protocol.send_message: to_agent='{agent_called}' with payload: {kwargs.get('payload')}")


    trading_coordinator_instance.a2a_protocol.send_message = mock.AsyncMock(side_effect=mock_send_message_side_effect)
    trading_coordinator_instance.agent.run = mock.AsyncMock(return_value=ai_decision_str)


    response = await trading_coordinator_instance.analyze_trading_opportunity(request_data)

    # Assertions for agent.run and prompt content (always happens)
    trading_coordinator_instance.agent.run.assert_called_once()
    prompt_arg = trading_coordinator_instance.agent.run.call_args[0][0]
    assert request_symbol in prompt_arg
    assert mock_market_analysis.condition in prompt_arg
    assert mock_market_analysis.trend_direction in prompt_arg
    assert str(mock_market_analysis.support_levels[0]) in prompt_arg
    assert '"source": "test_suite"' in prompt_arg
    assert f'"timeframe": "{request_data.context["timeframe"]}"' in prompt_arg


    market_analyst_call_found = False
    risk_monitor_call_found = False
    # Iterate over calls to check which agents were contacted
    for call_args_item in trading_coordinator_instance.a2a_protocol.send_message.call_args_list:
        if call_args_item.kwargs.get("to_agent") == "market-analyst":
            market_analyst_call_found = True
        elif call_args_item.kwargs.get("to_agent") == "risk-monitor":
            risk_monitor_call_found = True

    assert market_analyst_call_found, "Market analyst should always be called."

    if is_actionable:
        assert risk_monitor_call_found, "Risk monitor should be called for an actionable decision."
        assert "risk_assessment" in response
        assert response["risk_assessment"] == mock_risk_assessment.dict()
    else:
        assert not risk_monitor_call_found, "Risk monitor should NOT be called for a non-actionable decision."
        assert "risk_assessment" not in response

    # General response assertions
    assert response["symbol"] == request_symbol
    assert response["analysis"] == mock_market_analysis.dict()
    assert response["decision"] == ai_decision_str
    assert "timestamp" in response
```
