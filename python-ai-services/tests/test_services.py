import pytest
import pytest_asyncio
from unittest import mock # Using unittest.mock for broader compatibility
import asyncio # httpx removed, asyncio might still be needed for Lock if directly tested
from datetime import datetime
from typing import Dict, List, Optional, Any # Added for Pydantic placeholders if needed

# Service Imports
from python_ai_services.services.agent_state_manager import AgentStateManager
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.trading_coordinator import TradingCoordinator
from python_ai_services.services.agent_persistence_service import AgentPersistenceService # Added

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
async def mock_persistence_service() -> AgentPersistenceService:
    """Provides a mock AgentPersistenceService."""
    mock_svc = mock.AsyncMock(spec=AgentPersistenceService)
    mock_svc.get_realtime_state_from_redis = mock.AsyncMock(return_value=None)
    mock_svc.save_realtime_state_to_redis = mock.AsyncMock(return_value=True)
    mock_svc.get_agent_state_from_supabase = mock.AsyncMock(return_value=None)
    mock_svc.save_agent_state_to_supabase = mock.AsyncMock(return_value=None) # Will be set in tests
    mock_svc.delete_agent_state_from_supabase = mock.AsyncMock(return_value=True)
    mock_svc.delete_realtime_state_from_redis = mock.AsyncMock(return_value=True)
    mock_svc.save_agent_checkpoint_to_supabase = mock.AsyncMock(return_value=None)
    mock_svc.get_agent_checkpoint_from_supabase = mock.AsyncMock(return_value=None)
    return mock_svc

@pytest_asyncio.fixture
async def agent_state_manager(mock_persistence_service: AgentPersistenceService) -> AgentStateManager:
    """Provides an AgentStateManager instance with a mocked persistence service."""
    # Default TTL, can be overridden in specific tests if needed
    return AgentStateManager(persistence_service=mock_persistence_service, redis_realtime_ttl_seconds=3600)


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


# --- AgentStateManager Tests (Refactored) ---

@pytest.mark.asyncio
async def test_get_agent_state_in_memory_cache_hit(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "test_agent_mem_hit"
    cached_data = {"agent_id": agent_id, "state": {"data": "in_memory_data"}, "source": "memory"}
    agent_state_manager.in_memory_cache[agent_id] = cached_data

    result = await agent_state_manager.get_agent_state(agent_id)

    assert result == cached_data
    mock_persistence_service.get_realtime_state_from_redis.assert_not_called()
    mock_persistence_service.get_agent_state_from_supabase.assert_not_called()

@pytest.mark.asyncio
async def test_get_agent_state_redis_hit(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "test_agent_redis_hit"
    redis_data = {"agent_id": agent_id, "state": {"data": "redis_data"}, "source": "redis"}
    mock_persistence_service.get_realtime_state_from_redis.return_value = redis_data

    result = await agent_state_manager.get_agent_state(agent_id)

    assert result == redis_data
    mock_persistence_service.get_realtime_state_from_redis.assert_called_once_with(agent_id)
    mock_persistence_service.get_agent_state_from_supabase.assert_not_called() # Should not be called if Redis hits
    assert agent_state_manager.in_memory_cache[agent_id] == redis_data

@pytest.mark.asyncio
async def test_get_agent_state_supabase_hit(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "test_agent_supabase_hit"
    supabase_data = {"agent_id": agent_id, "state": {"data": "supabase_data"}, "strategy_type": "default_strat", "source": "supabase"}
    mock_persistence_service.get_realtime_state_from_redis.return_value = None # Redis miss
    mock_persistence_service.get_agent_state_from_supabase.return_value = supabase_data

    result = await agent_state_manager.get_agent_state(agent_id)

    assert result == supabase_data
    mock_persistence_service.get_realtime_state_from_redis.assert_called_once_with(agent_id)
    mock_persistence_service.get_agent_state_from_supabase.assert_called_once_with(agent_id)
    mock_persistence_service.save_realtime_state_to_redis.assert_called_once_with(
        agent_id, supabase_data, agent_state_manager.redis_realtime_ttl_seconds
    )
    assert agent_state_manager.in_memory_cache[agent_id] == supabase_data

@pytest.mark.asyncio
async def test_get_agent_state_all_miss_returns_default(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "test_agent_all_miss"
    mock_persistence_service.get_realtime_state_from_redis.return_value = None
    mock_persistence_service.get_agent_state_from_supabase.return_value = None

    result = await agent_state_manager.get_agent_state(agent_id)

    assert result["agent_id"] == agent_id
    assert result["state"] == {}
    assert result["source"] == "new_default"
    assert agent_state_manager.in_memory_cache[agent_id] == result
    mock_persistence_service.get_realtime_state_from_redis.assert_called_once_with(agent_id)
    mock_persistence_service.get_agent_state_from_supabase.assert_called_once_with(agent_id)
    # save_realtime_state_to_redis should not be called for default state
    mock_persistence_service.save_realtime_state_to_redis.assert_not_called()


@pytest.mark.asyncio
async def test_update_agent_state_success(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "test_agent_update"
    new_state_dict = {"data": "new_value"}
    strategy_type = "test_strategy"
    memory_refs = ["mem1"]

    # Mock the return value of save_agent_state_to_supabase
    # This should be the full record including DB timestamps, etc.
    persisted_record = {
        "agent_id": agent_id,
        "state": new_state_dict,
        "strategy_type": strategy_type,
        "memory_references": memory_refs,
        "updated_at": datetime.utcnow().isoformat()
    }
    mock_persistence_service.save_agent_state_to_supabase.return_value = persisted_record

    result = await agent_state_manager.update_agent_state(agent_id, new_state_dict, strategy_type, memory_refs)

    assert result == persisted_record
    mock_persistence_service.save_agent_state_to_supabase.assert_called_once_with(
        agent_id, strategy_type, new_state_dict, memory_refs
    )
    mock_persistence_service.save_realtime_state_to_redis.assert_called_once_with(
        agent_id, persisted_record, agent_state_manager.redis_realtime_ttl_seconds
    )
    assert agent_state_manager.in_memory_cache[agent_id] == persisted_record

@pytest.mark.asyncio
async def test_update_agent_state_supabase_fails(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "test_agent_update_fail"
    new_state_dict = {"data": "new_value"}
    mock_persistence_service.save_agent_state_to_supabase.return_value = None # Simulate Supabase failure

    result = await agent_state_manager.update_agent_state(agent_id, new_state_dict)

    assert result is None
    mock_persistence_service.save_agent_state_to_supabase.assert_called_once()
    mock_persistence_service.save_realtime_state_to_redis.assert_not_called()
    assert agent_id not in agent_state_manager.in_memory_cache # Or it might hold old value, depends on desired behavior on fail

@pytest.mark.asyncio
async def test_update_state_field_success_refactored(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "agent_update_field"
    initial_state_dict = {"field1": "value1", "field2": "value2"}
    initial_strategy_type = "initial_strat"
    initial_full_record = {
        "agent_id": agent_id,
        "state": initial_state_dict,
        "strategy_type": initial_strategy_type,
        "memory_references": ["mem_ref1"],
        "updated_at": datetime.utcnow().isoformat(),
        "source": "supabase" # Or any source
    }

    # Mock get_agent_state's underlying calls
    mock_persistence_service.get_realtime_state_from_redis.return_value = None
    mock_persistence_service.get_agent_state_from_supabase.return_value = initial_full_record

    # Mock update_agent_state's underlying calls for the update part
    updated_field_state_dict = {"field1": "new_value", "field2": "value2"}
    expected_persisted_record_after_field_update = {
        "agent_id": agent_id,
        "state": updated_field_state_dict,
        "strategy_type": initial_strategy_type, # Preserved
        "memory_references": ["mem_ref1"],      # Preserved
        "updated_at": datetime.utcnow().isoformat() # New timestamp
    }
    mock_persistence_service.save_agent_state_to_supabase.return_value = expected_persisted_record_after_field_update

    result = await agent_state_manager.update_state_field(agent_id, "field1", "new_value")

    assert result == expected_persisted_record_after_field_update
    # get_agent_state calls
    mock_persistence_service.get_realtime_state_from_redis.assert_called_once_with(agent_id)
    mock_persistence_service.get_agent_state_from_supabase.assert_called_once_with(agent_id)
    # save_agent_state_to_supabase called by update_agent_state
    mock_persistence_service.save_agent_state_to_supabase.assert_called_once_with(
        agent_id, initial_strategy_type, updated_field_state_dict, ["mem_ref1"]
    )
    # save_realtime_state_to_redis also called by update_agent_state
    mock_persistence_service.save_realtime_state_to_redis.call_count == 2 # Once for get, once for update

@pytest.mark.asyncio
async def test_delete_agent_state_refactored(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "agent_to_delete"
    agent_state_manager.in_memory_cache[agent_id] = {"some": "data"} # Pre-populate cache

    mock_persistence_service.delete_agent_state_from_supabase.return_value = True
    mock_persistence_service.delete_realtime_state_from_redis.return_value = True

    success = await agent_state_manager.delete_agent_state(agent_id)

    assert success is True
    mock_persistence_service.delete_agent_state_from_supabase.assert_called_once_with(agent_id)
    mock_persistence_service.delete_realtime_state_from_redis.assert_called_once_with(agent_id)
    assert agent_id not in agent_state_manager.in_memory_cache

@pytest.mark.asyncio
async def test_save_trading_decision_refactored(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "agent_decision"
    decision_data = {"action": "BUY", "symbol": "BTCUSD", "price": 50000}

    initial_state_dict = {"decisionHistory": []}
    initial_strategy_type = "trading_bot_v1"
    initial_full_record = {
        "agent_id": agent_id,
        "state": initial_state_dict,
        "strategy_type": initial_strategy_type,
        "updated_at": datetime.utcnow().isoformat()
    }

    # Mock get_agent_state behavior (called by _update_decision_history -> get_agent_state)
    mock_persistence_service.get_realtime_state_from_redis.return_value = None
    mock_persistence_service.get_agent_state_from_supabase.return_value = initial_full_record

    # Mock update_agent_state behavior (called by _update_decision_history -> update_agent_state)
    def mock_save_supabase_for_decision(agent_id_call, strategy_type_call, state_call, memory_refs_call):
        assert state_call["decisionHistory"][0]["action"] == "BUY"
        return {
            "agent_id": agent_id_call,
            "state": state_call,
            "strategy_type": strategy_type_call,
            "memory_references": memory_refs_call,
            "updated_at": datetime.utcnow().isoformat()
        }
    mock_persistence_service.save_agent_state_to_supabase.side_effect = mock_save_supabase_for_decision

    result = await agent_state_manager.save_trading_decision(agent_id, decision_data)

    assert result is not None
    assert result["status"] == "decision_history_updated_in_state"
    mock_persistence_service.save_agent_state_to_supabase.assert_called_once()
    # Further assertions can be made on the arguments of save_agent_state_to_supabase if needed

@pytest.mark.asyncio
async def test_create_agent_checkpoint_refactored(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "agent_checkpoint"
    metadata = {"reason": "daily backup"}
    current_state_dict = {"value": 123}
    current_strategy_type = "chkpt_strat"
    current_full_record = {
        "agent_id": agent_id,
        "state": current_state_dict,
        "strategy_type": current_strategy_type,
        "updated_at": datetime.utcnow().isoformat()
    }

    mock_persistence_service.get_realtime_state_from_redis.return_value = None
    mock_persistence_service.get_agent_state_from_supabase.return_value = current_full_record

    mock_checkpoint_result = {"checkpoint_id": "chk_123", "agent_id": agent_id}
    mock_persistence_service.save_agent_checkpoint_to_supabase.return_value = mock_checkpoint_result

    result = await agent_state_manager.create_agent_checkpoint(agent_id, metadata)

    assert result == mock_checkpoint_result
    expected_metadata_to_save = metadata.copy()
    expected_metadata_to_save["strategy_type"] = current_strategy_type
    mock_persistence_service.save_agent_checkpoint_to_supabase.assert_called_once_with(
        agent_id, current_state_dict, expected_metadata_to_save
    )

@pytest.mark.asyncio
async def test_restore_agent_checkpoint_refactored(agent_state_manager: AgentStateManager, mock_persistence_service: mock.AsyncMock):
    agent_id = "agent_restore"
    checkpoint_id = "chk_to_restore"

    checkpoint_state_dict = {"value": 456}
    checkpoint_metadata = {"strategy_type": "restored_strat_type"}
    checkpoint_data_from_db = { # As returned by persistence_service.get_agent_checkpoint_from_supabase
        "checkpoint_id": checkpoint_id,
        "agent_id": agent_id, # Important for validation
        "state": checkpoint_state_dict, # Assuming 'state' key holds the snapshot
        "metadata": checkpoint_metadata
    }
    mock_persistence_service.get_agent_checkpoint_from_supabase.return_value = checkpoint_data_from_db

    # This is the record that update_agent_state (via persistence_service) will return
    final_updated_state_record = {
        "agent_id": agent_id,
        "state": checkpoint_state_dict,
        "strategy_type": "restored_strat_type",
        "updated_at": datetime.utcnow().isoformat()
    }
    mock_persistence_service.save_agent_state_to_supabase.return_value = final_updated_state_record

    result = await agent_state_manager.restore_agent_checkpoint(agent_id, checkpoint_id)

    assert result == final_updated_state_record
    mock_persistence_service.get_agent_checkpoint_from_supabase.assert_called_once_with(checkpoint_id)
    mock_persistence_service.save_agent_state_to_supabase.assert_called_once_with(
        agent_id, checkpoint_state_dict, strategy_type="restored_strat_type", memory_references=None # Assuming update_agent_state defaults memory_references
    )
    # In-memory and Redis caches are updated by the call to update_agent_state


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
