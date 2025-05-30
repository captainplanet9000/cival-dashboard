import pytest
import pytest_asyncio
from unittest import mock
from unittest.mock import AsyncMock, MagicMock, patch
import os
from copy import deepcopy

from crewai import Crew, Agent, Task, Process
from pydantic import ValidationError as PydanticValidationError

# Modules to test
from python_ai_services.crews.trading_crew_service import TradingCrewService, TradingCrewRequest
from python_ai_services.crews.trading_crew_definitions import (
    trading_analysis_crew,
    market_analyst_agent,
    strategy_agent,
    trade_advisor_agent,
    market_analysis_task,
    strategy_application_task,
    trade_decision_task
)

# Supporting Pydantic models and types
from python_ai_services.types.trading_types import TradingDecision, TradeAction
from python_ai_services.main import LLMConfig, LLMParameter # LLMConfig is in main.py

# Attempt to import actual LLM clients for type checking and patching targets
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None # Placeholder if not available

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None # Placeholder if not available


# --- Tests for trading_analysis_crew Definition ---

def test_trading_crew_structure():
    """Test the static structure of the trading_analysis_crew."""
    assert isinstance(trading_analysis_crew, Crew)
    assert len(trading_analysis_crew.agents) == 3
    assert len(trading_analysis_crew.tasks) == 3

    # Check if the correct agent instances are in the crew
    assert market_analyst_agent in trading_analysis_crew.agents
    assert strategy_agent in trading_analysis_crew.agents
    assert trade_advisor_agent in trading_analysis_crew.agents

    # Check if the correct task instances are in the crew
    assert market_analysis_task in trading_analysis_crew.tasks
    assert strategy_application_task in trading_analysis_crew.tasks
    assert trade_decision_task in trading_analysis_crew.tasks

    assert trading_analysis_crew.process == Process.sequential
    assert trading_analysis_crew.verbose == 2
    # Check other properties if necessary, e.g., memory, manager_llm, output_log_file
    assert trading_analysis_crew.memory is False # As defined
    assert trading_analysis_crew.manager_llm is None # As defined
    assert trading_analysis_crew.output_log_file is True # As defined

# --- Tests for TradingCrewService._get_llm_instance ---

@pytest.fixture
def trading_crew_service_instance_for_llm_test():
    """Provides a TradingCrewService instance for testing _get_llm_instance."""
    # No mocks needed for __init__ for this specific helper method test
    return TradingCrewService()

# Patch targets need to be where the object is looked up, which is in trading_crew_service module
LANGCHAIN_OPENAI_PATH = "python_ai_services.crews.trading_crew_service.ChatOpenAI"
LANGCHAIN_GEMINI_PATH = "python_ai_services.crews.trading_crew_service.ChatGoogleGenerativeAI"
OS_GETENV_PATH = "python_ai_services.crews.trading_crew_service.os.getenv"

@patch(LANGCHAIN_OPENAI_PATH, new_callable=MagicMock)
@patch(OS_GETENV_PATH, return_value="dummy_openai_api_key")
def test_get_llm_instance_openai_success(mock_getenv, MockChatOpenAI, trading_crew_service_instance_for_llm_test):
    llm_config = LLMConfig(
        id="openai_test",
        model_name="gpt-4-turbo",
        api_key_env_var="OPENAI_API_KEY",
        parameters=LLMParameter(temperature=0.5, max_tokens=100)
    )
    # Simulate ChatOpenAI being available
    if ChatOpenAI is None: # If original import failed, make mock available
        trading_crew_service_instance_for_llm_test.ChatOpenAI = MockChatOpenAI

    llm_instance = trading_crew_service_instance_for_llm_test._get_llm_instance(llm_config)

    mock_getenv.assert_called_once_with("OPENAI_API_KEY")
    MockChatOpenAI.assert_called_once_with(
        model="gpt-4-turbo",
        api_key="dummy_openai_api_key",
        temperature=0.5,
        max_tokens=100
    )
    assert llm_instance == MockChatOpenAI.return_value

@patch(LANGCHAIN_GEMINI_PATH, new_callable=MagicMock)
@patch(OS_GETENV_PATH, return_value="dummy_gemini_api_key")
def test_get_llm_instance_gemini_success(mock_getenv, MockChatGemini, trading_crew_service_instance_for_llm_test):
    llm_config = LLMConfig(
        id="gemini_test",
        model_name="gemini-1.5-pro",
        api_key_env_var="GEMINI_API_KEY",
        parameters=LLMParameter(temperature=0.8, top_k=30)
    )
    if ChatGoogleGenerativeAI is None:
        trading_crew_service_instance_for_llm_test.ChatGoogleGenerativeAI = MockChatGemini

    llm_instance = trading_crew_service_instance_for_llm_test._get_llm_instance(llm_config)

    mock_getenv.assert_called_once_with("GEMINI_API_KEY")
    MockChatGemini.assert_called_once_with(
        model_name="gemini-1.5-pro",
        google_api_key="dummy_gemini_api_key",
        temperature=0.8,
        top_k=30
    )
    assert llm_instance == MockChatGemini.return_value

@patch(OS_GETENV_PATH, return_value=None)
def test_get_llm_instance_missing_api_key(mock_getenv, trading_crew_service_instance_for_llm_test):
    llm_config = LLMConfig(
        id="openai_test_no_key",
        model_name="gpt-4-turbo",
        api_key_env_var="MISSING_OPENAI_KEY",
        parameters=LLMParameter()
    )
    with pytest.raises(ValueError, match="API key for gpt-4-turbo not configured."):
        trading_crew_service_instance_for_llm_test._get_llm_instance(llm_config)
    mock_getenv.assert_called_once_with("MISSING_OPENAI_KEY")

def test_get_llm_instance_unsupported_model(trading_crew_service_instance_for_llm_test):
    llm_config = LLMConfig(
        id="unsupported_test",
        model_name="llama-3-70b", # Assuming not directly supported by name check
        api_key_env_var="ANY_KEY_VAR", # os.getenv will be called if var is set
        parameters=LLMParameter()
    )
    with patch(OS_GETENV_PATH, return_value="dummy_key"): # Mock getenv to proceed to model check
        with pytest.raises(NotImplementedError, match="LLM support for 'llama-3-70b' is not implemented."):
            trading_crew_service_instance_for_llm_test._get_llm_instance(llm_config)

# --- Tests for TradingCrewService.run_analysis ---

@pytest_asyncio.fixture
async def trading_crew_service():
    """Provides a TradingCrewService instance with a mocked _get_llm_instance."""
    service = TradingCrewService()
    # Mock _get_llm_instance to avoid actual LLM instantiation complexities here
    service._get_llm_instance = mock.MagicMock(return_value=MagicMock(spec=["generate", "invoke"])) # A generic LLM mock
    return service

@pytest.mark.asyncio
@patch("python_ai_services.crews.trading_crew_service.Crew", new_callable=MagicMock) # Patch Crew where it's used
async def test_run_analysis_success(MockCrewClass, trading_crew_service: TradingCrewService):
    mock_llm_instance = MagicMock()
    trading_crew_service._get_llm_instance = MagicMock(return_value=mock_llm_instance)

    mock_crew_instance = MockCrewClass.return_value
    mock_crew_instance.kickoff_async = AsyncMock(return_value={
        "symbol": "BTC/USD", "action": "BUY", "confidence_score": 0.8, "reasoning": "Strong signal"
        # Other fields for TradingDecision can be added if needed for full validation
    })

    request = TradingCrewRequest(
        symbol="BTC/USD", timeframe="1h", strategy_name="TestStrategy", llm_config_id="openai_gpt4_turbo"
    )

    result = await trading_crew_service.run_analysis(request)

    trading_crew_service._get_llm_instance.assert_called_once()
    # Check that the LLMConfig passed to _get_llm_instance matches the request's llm_config_id
    called_llm_config: LLMConfig = trading_crew_service._get_llm_instance.call_args[0][0]
    assert called_llm_config.model_name == "gpt-4-turbo" # From available_llm_configs in service

    MockCrewClass.assert_called_once()
    crew_args, crew_kwargs = MockCrewClass.call_args
    assert len(crew_kwargs['agents']) == 3
    for agent in crew_kwargs['agents']:
        assert agent.llm == mock_llm_instance # Check if cloned agents got the new LLM
    assert len(crew_kwargs['tasks']) == 3

    mock_crew_instance.kickoff_async.assert_called_once_with(inputs={
        "symbol": "BTC/USD", "timeframe": "1h", "strategy_name": "TestStrategy"
    })

    assert isinstance(result, TradingDecision)
    assert result.symbol == "BTC/USD"
    assert result.action == TradeAction.BUY # Assuming TradingDecision parses "BUY" string to enum
    assert result.confidence_score == 0.8
    assert result.reasoning == "Strong signal"

@pytest.mark.asyncio
async def test_run_analysis_llm_instantiation_fails(trading_crew_service: TradingCrewService):
    trading_crew_service._get_llm_instance = MagicMock(side_effect=ValueError("LLM init error"))
    request = TradingCrewRequest(
        symbol="BTC/USD", timeframe="1h", strategy_name="TestStrategy", llm_config_id="some_config"
    )

    # Based on current implementation, it logs and returns None
    result = await trading_crew_service.run_analysis(request)
    assert result is None
    # To check logs, you'd need to capture loguru's output or use a custom sink in tests

@pytest.mark.asyncio
@patch("python_ai_services.crews.trading_crew_service.Crew", new_callable=MagicMock)
async def test_run_analysis_crew_kickoff_fails(MockCrewClass, trading_crew_service: TradingCrewService):
    trading_crew_service._get_llm_instance = MagicMock(return_value=MagicMock()) # Successful LLM mock

    mock_crew_instance = MockCrewClass.return_value
    mock_crew_instance.kickoff_async = AsyncMock(side_effect=Exception("Crew failed!"))

    request = TradingCrewRequest(
        symbol="BTC/USD", timeframe="1h", strategy_name="TestStrategy", llm_config_id="openai_gpt4_turbo"
    )

    # Based on current implementation, it logs and returns None
    result = await trading_crew_service.run_analysis(request)
    assert result is None

@pytest.mark.asyncio
@patch("python_ai_services.crews.trading_crew_service.Crew", new_callable=MagicMock)
async def test_run_analysis_invalid_crew_output_dict(MockCrewClass, trading_crew_service: TradingCrewService):
    trading_crew_service._get_llm_instance = MagicMock(return_value=MagicMock())

    mock_crew_instance = MockCrewClass.return_value
    # Malformed dict - missing required 'action' for TradingDecision
    mock_crew_instance.kickoff_async = AsyncMock(return_value={"symbol": "BTC/USD", "confidence_score": 0.7})

    request = TradingCrewRequest(
        symbol="BTC/USD", timeframe="1h", strategy_name="TestStrategy", llm_config_id="openai_gpt4_turbo"
    )

    # Expect PydanticValidationError to be caught, logged, and None returned
    result = await trading_crew_service.run_analysis(request)
    assert result is None

@pytest.mark.asyncio
@patch("python_ai_services.crews.trading_crew_service.Crew", new_callable=MagicMock)
async def test_run_analysis_crew_output_string_force_info(MockCrewClass, trading_crew_service: TradingCrewService):
    trading_crew_service._get_llm_instance = MagicMock(return_value=MagicMock())

    mock_crew_instance = MockCrewClass.return_value
    # Crew returns a simple string, not a dict or TradingDecision model
    crew_output_string = "The market looks very uncertain, better to wait."
    mock_crew_instance.kickoff_async = AsyncMock(return_value=crew_output_string)

    request = TradingCrewRequest(
        symbol="XYZ/USD", timeframe="1h", strategy_name="TestStrategy", llm_config_id="openai_gpt4_turbo"
    )

    result = await trading_crew_service.run_analysis(request)
    assert result is not None
    assert isinstance(result, TradingDecision)
    assert result.symbol == "XYZ/USD"
    assert result.action == TradeAction.INFO # As per fallback logic in service
    assert result.confidence_score == 0.0
    assert result.reasoning == crew_output_string
```
