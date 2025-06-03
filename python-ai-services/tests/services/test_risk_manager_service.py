import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock

from python_ai_services.services.risk_manager_service import RiskManagerService
from python_ai_services.services.agent_management_service import AgentManagementService
from python_ai_services.models.agent_models import AgentConfigOutput, AgentRiskConfig, AgentStrategyConfig
from python_ai_services.models.event_bus_models import TradeSignalEventPayload, RiskAssessmentResponseData

@pytest_asyncio.fixture
def mock_agent_service() -> AgentManagementService:
    return AsyncMock(spec=AgentManagementService)

@pytest_asyncio.fixture
def risk_service(mock_agent_service: AgentManagementService) -> RiskManagerService:
    return RiskManagerService(agent_service=mock_agent_service)

# Helper to create AgentConfigOutput for tests
def create_test_agent_config_for_risk(
    agent_id: str,
    max_capital_allocation: float = 10000.0,
    risk_per_trade: float = 0.01,
    allowed_symbols_list: Optional[list[str]] = None,
    other_op_params: Optional[dict] = None
) -> AgentConfigOutput:
    op_params = {}
    if allowed_symbols_list:
        op_params["allowed_symbols"] = allowed_symbols_list
    if other_op_params:
        op_params.update(other_op_params)

    return AgentConfigOutput(
        agent_id=agent_id,
        name=f"RiskTestAgent {agent_id}",
        strategy=AgentStrategyConfig(strategy_name="test_strat", parameters={}),
        risk_config=AgentRiskConfig(
            max_capital_allocation_usd=max_capital_allocation, # Interpreted as max_trade_value for now
            risk_per_trade_percentage=risk_per_trade
        ),
        operational_parameters=op_params
    )

# Helper to create TradeSignalEventPayload
def create_test_trade_signal(
    symbol: str, action: str = "buy", quantity: float = 1.0, price: float = 100.0, strategy: str = "test_strat"
) -> TradeSignalEventPayload:
    return TradeSignalEventPayload(
        symbol=symbol,
        action=action, #type: ignore
        quantity=quantity,
        price_target=price,
        strategy_name=strategy
    )

@pytest.mark.asyncio
async def test_assess_trade_risk_agent_not_found(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    mock_agent_service.get_agent = AsyncMock(return_value=None)
    trade_signal = create_test_trade_signal("BTC/USD")

    assessment = await risk_service.assess_trade_risk("unknown_agent", trade_signal)

    assert assessment.signal_approved is False
    assert "Agent config for unknown_agent not found" in assessment.rejection_reason #type: ignore
    mock_agent_service.get_agent.assert_called_once_with("unknown_agent")

@pytest.mark.asyncio
async def test_assess_trade_risk_signal_missing_data(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    agent_id = "agent_signal_missing_data"
    agent_config = create_test_agent_config_for_risk(agent_id)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    # Signal missing quantity
    trade_signal_no_qty = TradeSignalEventPayload(symbol="ETH/USD", action="buy", price_target=3000.0, strategy_name="s1") # type: ignore
    assessment_no_qty = await risk_service.assess_trade_risk(agent_id, trade_signal_no_qty)
    assert assessment_no_qty.signal_approved is False
    assert "missing quantity or price_target" in assessment_no_qty.rejection_reason # type: ignore

    # Signal missing price_target
    trade_signal_no_price = TradeSignalEventPayload(symbol="ETH/USD", action="buy", quantity=1.0, strategy_name="s1") # type: ignore
    assessment_no_price = await risk_service.assess_trade_risk(agent_id, trade_signal_no_price)
    assert assessment_no_price.signal_approved is False
    assert "missing quantity or price_target" in assessment_no_price.rejection_reason # type: ignore


@pytest.mark.asyncio
async def test_assess_trade_risk_exceeds_max_capital(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    agent_id = "agent_exceeds_cap"
    # max_capital_allocation_usd is interpreted as max trade value by current RiskManagerService logic
    agent_config = create_test_agent_config_for_risk(agent_id, max_capital_allocation=500.0)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    # Trade value = 10 * 60 = 600 USD, which is > 500 USD
    trade_signal = create_test_trade_signal("BTC/USD", quantity=10.0, price=60.0)

    assessment = await risk_service.assess_trade_risk(agent_id, trade_signal)

    assert assessment.signal_approved is False
    assert "exceeds agent's max capital allocation per trade" in assessment.rejection_reason # type: ignore

@pytest.mark.asyncio
async def test_assess_trade_risk_symbol_not_in_whitelist(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    agent_id = "agent_symbol_not_allowed"
    allowed = ["BTC/USD", "ETH/USD"]
    agent_config = create_test_agent_config_for_risk(agent_id, allowed_symbols_list=allowed)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    trade_signal = create_test_trade_signal("ADA/USD") # ADA/USD is not in whitelist
    assessment = await risk_service.assess_trade_risk(agent_id, trade_signal)

    assert assessment.signal_approved is False
    assert "not in allowed list" in assessment.rejection_reason # type: ignore

    # Test with hyphenated symbol in whitelist
    trade_signal_hyphen = create_test_trade_signal("SOL-USD") # Normalization should handle this
    agent_config_hyphen_whitelist = create_test_agent_config_for_risk(agent_id, allowed_symbols_list=["SOL/USD"])
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config_hyphen_whitelist)
    assessment_hyphen = await risk_service.assess_trade_risk(agent_id, trade_signal_hyphen)
    assert assessment_hyphen.signal_approved is True


@pytest.mark.asyncio
async def test_assess_trade_risk_approved_no_specific_limits_hit(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    agent_id = "agent_approved_trade"
    # Config with high capital limit and no symbol whitelist (or symbol is in it)
    agent_config = create_test_agent_config_for_risk(
        agent_id,
        max_capital_allocation=20000.0,
        allowed_symbols_list=["XRP/USD"]
    )
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    # Trade value = 2 * 0.5 = 1.0 USD, well within 20000
    # Symbol XRP/USD is in whitelist
    trade_signal = create_test_trade_signal("XRP/USD", quantity=2.0, price=0.50)

    assessment = await risk_service.assess_trade_risk(agent_id, trade_signal)

    assert assessment.signal_approved is True
    assert assessment.rejection_reason is None

@pytest.mark.asyncio
async def test_assess_trade_risk_zero_max_capital_allocation_skips_check(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    agent_id = "agent_zero_max_cap"
    # If max_capital_allocation_usd is 0 or not positive, this check should be skipped
    agent_config = create_test_agent_config_for_risk(agent_id, max_capital_allocation=0)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    trade_signal = create_test_trade_signal("ANY/USD", quantity=1000.0, price=100.0) # Very large trade
    assessment = await risk_service.assess_trade_risk(agent_id, trade_signal)

    assert assessment.signal_approved is True # Approved because the max capital check was skipped

@pytest.mark.asyncio
async def test_assess_trade_risk_empty_whitelist_allows_all_symbols(risk_service: RiskManagerService, mock_agent_service: MagicMock):
    agent_id = "agent_empty_whitelist"
    # No 'allowed_symbols' in operational_parameters means check is skipped
    agent_config = create_test_agent_config_for_risk(agent_id, allowed_symbols_list=None)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    trade_signal = create_test_trade_signal("ANY/SYMB", quantity=1.0, price=10.0)
    assessment = await risk_service.assess_trade_risk(agent_id, trade_signal)

    assert assessment.signal_approved is True

# Need Optional for type hints in helper
from typing import Optional
```
