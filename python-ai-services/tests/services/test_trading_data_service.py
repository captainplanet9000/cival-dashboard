import pytest
import pytest_asyncio
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timezone
import uuid

from python_ai_services.services.trading_data_service import TradingDataService, HyperliquidServiceFactory
from python_ai_services.services.agent_management_service import AgentManagementService
from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService, HyperliquidExecutionServiceError
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.dashboard_models import PortfolioSummary, AssetPositionSummary, TradeLogItem, OrderLogItem
from python_ai_services.models.hyperliquid_models import (
    HyperliquidAccountSnapshot,
    HyperliquidAssetPosition,
    HyperliquidOpenOrderItem,
    HyperliquidMarginSummary
)

# --- Fixtures ---

@pytest_asyncio.fixture
def mock_agent_service() -> AgentManagementService:
    return MagicMock(spec=AgentManagementService)

@pytest_asyncio.fixture
def mock_hles_factory() -> HyperliquidServiceFactory:
    # This factory itself is a mock. It returns another mock (hles_instance).
    factory = MagicMock() # Mock the callable factory
    hles_instance = MagicMock(spec=HyperliquidExecutionService)
    hles_instance.wallet_address = "mock_hl_wallet_address" # Set a default wallet address for the mock HLES
    factory.return_value = hles_instance # When factory("cred_id") is called, it returns hles_instance
    return factory

@pytest_asyncio.fixture
def mock_hles_instance(mock_hles_factory: MagicMock) -> MagicMock:
    # Convenience fixture to get the HLES instance returned by the factory
    return mock_hles_factory.return_value


from python_ai_services.services.trade_history_service import TradeHistoryService # Added import

@pytest_asyncio.fixture
def mock_trade_history_service() -> TradeHistoryService: # New fixture
    return AsyncMock(spec=TradeHistoryService)

@pytest_asyncio.fixture
def trading_data_service(
    mock_agent_service: AgentManagementService,
    mock_hles_factory: HyperliquidServiceFactory,
    mock_trade_history_service: TradeHistoryService # Add new dependency
) -> TradingDataService:
    return TradingDataService(
        agent_service=mock_agent_service,
        hyperliquid_service_factory=mock_hles_factory,
        trade_history_service=mock_trade_history_service # Pass it here
    )

# --- Helper Functions ---
def create_mock_agent_config(agent_id: str, provider: str = "paper", cred_id: Optional[str] = None) -> AgentConfigOutput:
    return AgentConfigOutput(
        agent_id=agent_id,
        name=f"Agent {agent_id}",
        strategy=AgentStrategyConfig(strategy_name="test", parameters={}),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01),
        execution_provider=provider,
        hyperliquid_credentials_id=cred_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

# --- Tests for get_portfolio_summary ---

@pytest.mark.asyncio
async def test_get_portfolio_summary_paper_agent(trading_data_service: TradingDataService, mock_agent_service: MagicMock):
    agent_id = "paper_agent_1"
    mock_agent_service.get_agent = AsyncMock(return_value=create_mock_agent_config(agent_id, provider="paper"))

    summary = await trading_data_service.get_portfolio_summary(agent_id)

    assert isinstance(summary, PortfolioSummary)
    assert summary.agent_id == agent_id
    assert summary.account_value_usd == 10000.0 # Mocked data
    assert len(summary.open_positions) > 0
    mock_agent_service.get_agent.assert_called_once_with(agent_id)

@pytest.mark.asyncio
async def test_get_portfolio_summary_hyperliquid_agent_success(
    trading_data_service: TradingDataService,
    mock_agent_service: MagicMock,
    mock_hles_factory: MagicMock,
    mock_hles_instance: MagicMock
):
    agent_id = "hl_agent_1"
    cred_id = "hl_cred_1"
    agent_config = create_mock_agent_config(agent_id, provider="hyperliquid", cred_id=cred_id)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    # Mock HLES method responses
    mock_hl_margin_summary = HyperliquidMarginSummary(
        accountValue="12000.50", totalRawUsd="12000.50", totalNtlPos="250.75",
        totalMarginUsed="1500.20", withdrawable="10500.30" # available_balance_for_new_orders
    )
    mock_hl_account_snapshot = HyperliquidAccountSnapshot(
        time=int(datetime.now(timezone.utc).timestamp() * 1000),
        totalRawUsd="12000.50", # Should align with margin summary
        parsed_positions=[
            HyperliquidAssetPosition(asset="ETH", szi="2.0", entry_px="3000.00", unrealized_pnl="200.00", margin_used="600.00"),
            HyperliquidAssetPosition(asset="BTC", szi="0.05", entry_px="60000.00", unrealized_pnl="50.75", margin_used="900.20")
        ]
    )
    mock_hles_instance.get_account_margin_summary = AsyncMock(return_value=mock_hl_margin_summary)
    mock_hles_instance.get_detailed_account_summary = AsyncMock(return_value=mock_hl_account_snapshot)

    summary = await trading_data_service.get_portfolio_summary(agent_id)

    assert isinstance(summary, PortfolioSummary)
    assert summary.agent_id == agent_id
    assert summary.account_value_usd == 12000.50
    assert summary.total_pnl_usd == 250.75
    assert summary.available_balance_usd == 10500.30
    assert summary.margin_used_usd == 1500.20
    assert len(summary.open_positions) == 2
    assert summary.open_positions[0].asset == "ETH"
    assert summary.open_positions[0].size == 2.0

    mock_agent_service.get_agent.assert_called_once_with(agent_id)
    mock_hles_factory.assert_called_once_with(cred_id)
    mock_hles_instance.get_account_margin_summary.assert_called_once()
    mock_hles_instance.get_detailed_account_summary.assert_called_once_with(mock_hles_instance.wallet_address)


@pytest.mark.asyncio
async def test_get_portfolio_summary_hyperliquid_no_hles_instance(
    trading_data_service: TradingDataService,
    mock_agent_service: MagicMock,
    mock_hles_factory: MagicMock # Factory will be configured to return None
):
    agent_id = "hl_agent_no_hles"
    cred_id = "hl_cred_no_hles"
    agent_config = create_mock_agent_config(agent_id, provider="hyperliquid", cred_id=cred_id)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    mock_hles_factory.return_value = None # Simulate factory failing to create/return HLES

    summary = await trading_data_service.get_portfolio_summary(agent_id)
    assert summary is None
    mock_hles_factory.assert_called_once_with(cred_id)


@pytest.mark.asyncio
async def test_get_portfolio_summary_agent_not_found(trading_data_service: TradingDataService, mock_agent_service: MagicMock):
    agent_id = "unknown_agent"
    mock_agent_service.get_agent = AsyncMock(return_value=None)
    summary = await trading_data_service.get_portfolio_summary(agent_id)
    assert summary is None

# --- Tests for get_trade_history (now uses TradeHistoryService) ---

@pytest.mark.asyncio
async def test_get_trade_history_uses_trade_history_service(
    trading_data_service: TradingDataService,
    mock_trade_history_service: MagicMock # Use the new mock fixture
):
    agent_id = "agent_real_trades"
    limit_val = 50
    offset_val = 10

    # Setup mock response from TradeHistoryService
    mock_processed_trades = [
        TradeLogItem(
            agent_id=agent_id, trade_id=str(uuid.uuid4()), timestamp=datetime.now(timezone.utc),
            asset="BTC/USD", side="buy", order_type="market", quantity=1, price=50000, total_value=50000, realized_pnl=100
        )
    ]
    mock_trade_history_service.get_processed_trades = AsyncMock(return_value=mock_processed_trades)

    history = await trading_data_service.get_trade_history(agent_id, limit=limit_val, offset=offset_val)

    assert history == mock_processed_trades
    mock_trade_history_service.get_processed_trades.assert_called_once_with(
        agent_id=agent_id, limit=limit_val, offset=offset_val
    )

@pytest.mark.asyncio
async def test_get_trade_history_service_error_returns_empty(
    trading_data_service: TradingDataService,
    mock_trade_history_service: MagicMock
):
    agent_id = "agent_th_error"
    mock_trade_history_service.get_processed_trades = AsyncMock(side_effect=Exception("Failed to process trades"))

    history = await trading_data_service.get_trade_history(agent_id)
    assert history == [] # Should return empty list on error

# --- Tests for get_open_orders ---

@pytest.mark.asyncio
async def test_get_open_orders_paper_agent(trading_data_service: TradingDataService, mock_agent_service: MagicMock):
    agent_id = "paper_open_orders"
    mock_agent_service.get_agent = AsyncMock(return_value=create_mock_agent_config(agent_id, provider="paper"))

    orders = await trading_data_service.get_open_orders(agent_id)
    assert len(orders) > 0 # Mocked data for paper
    for order in orders:
        assert isinstance(order, OrderLogItem)
        assert order.agent_id == agent_id

@pytest.mark.asyncio
async def test_get_open_orders_hyperliquid_agent_success(
    trading_data_service: TradingDataService,
    mock_agent_service: MagicMock,
    mock_hles_instance: MagicMock
):
    agent_id = "hl_open_orders"
    cred_id = "hl_cred_oo"
    agent_config = create_mock_agent_config(agent_id, provider="hyperliquid", cred_id=cred_id)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    mock_hl_orders = [
        HyperliquidOpenOrderItem(oid=123, asset="ETH", side="b", limit_px="2900.0", sz="0.5", timestamp=int(datetime.now(timezone.utc).timestamp()*1000), raw_order_data={}),
        HyperliquidOpenOrderItem(oid=456, asset="BTC", side="s", limit_px="61000.0", sz="0.01", timestamp=int(datetime.now(timezone.utc).timestamp()*1000), raw_order_data={})
    ]
    mock_hles_instance.get_all_open_orders = AsyncMock(return_value=mock_hl_orders)

    open_orders = await trading_data_service.get_open_orders(agent_id)

    assert len(open_orders) == 2
    assert open_orders[0].order_id == "123"
    assert open_orders[0].asset == "ETH"
    assert open_orders[0].side == "buy"
    assert open_orders[1].order_id == "456"
    assert open_orders[1].asset == "BTC"
    assert open_orders[1].side == "sell"
    mock_hles_instance.get_all_open_orders.assert_called_once_with(mock_hles_instance.wallet_address)

@pytest.mark.asyncio
async def test_get_open_orders_hyperliquid_hles_error(
    trading_data_service: TradingDataService,
    mock_agent_service: MagicMock,
    mock_hles_instance: MagicMock
):
    agent_id = "hl_oo_error"
    cred_id = "hl_cred_oo_err"
    agent_config = create_mock_agent_config(agent_id, provider="hyperliquid", cred_id=cred_id)
    mock_agent_service.get_agent = AsyncMock(return_value=agent_config)

    mock_hles_instance.get_all_open_orders = AsyncMock(side_effect=HyperliquidExecutionServiceError("SDK Down"))

    open_orders = await trading_data_service.get_open_orders(agent_id)
    assert len(open_orders) == 0 # Should return empty list on error

# --- Tests for get_order_history (mocked data) ---

@pytest.mark.asyncio
async def test_get_order_history_mocked(trading_data_service: TradingDataService, mock_agent_service: MagicMock):
    agent_id = "agent_mock_order_hist"
    mock_agent_service.get_agent = AsyncMock(return_value=create_mock_agent_config(agent_id))

    history = await trading_data_service.get_order_history(agent_id, limit=2)
    assert len(history) == 2 # Mock service creates 4, limit applies
    for item in history:
        assert isinstance(item, OrderLogItem)
        assert item.agent_id == agent_id

```
