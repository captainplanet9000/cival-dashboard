import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock # AsyncMock for async service methods
from datetime import datetime, timezone
import uuid

from python_ai_services.models.dashboard_models import PortfolioSummary, TradeLogItem, OrderLogItem, AssetPositionSummary
from python_ai_services.services.trading_data_service import TradingDataService
from python_ai_services.api.v1.dashboard_data_routes import router as dashboard_data_router, get_trading_data_service

# Create a minimal FastAPI app for testing this specific router
app = FastAPI()
app.include_router(dashboard_data_router, prefix="/api/v1")

# Mock service instance that will be used by the router's dependency override
mock_service_tds = MagicMock(spec=TradingDataService)

# Override the dependency for testing
def override_get_trading_data_service():
    return mock_service_tds

app.dependency_overrides[get_trading_data_service] = override_get_trading_data_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_mock_service():
    """Reset the mock service before each test."""
    mock_service_tds.reset_mock()

# --- Helper to create sample data ---
def _create_sample_portfolio_summary(agent_id: str) -> PortfolioSummary:
    return PortfolioSummary(
        agent_id=agent_id,
        timestamp=datetime.now(timezone.utc),
        account_value_usd=10000.0,
        total_pnl_usd=500.0,
        available_balance_usd=9000.0,
        margin_used_usd=1000.0,
        open_positions=[AssetPositionSummary(asset="BTC", size=0.1, entry_price=50000.0)]
    )

def _create_sample_trade_log_item(agent_id: str) -> TradeLogItem:
    return TradeLogItem(
        trade_id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc),
        agent_id=agent_id,
        asset="ETH",
        side="buy",
        order_type="market",
        quantity=1.0,
        price=3000.0,
        total_value=3000.0
    )

def _create_sample_order_log_item(agent_id: str, status: str = "open") -> OrderLogItem:
    return OrderLogItem(
        order_id=str(uuid.uuid4()),
        agent_id=agent_id,
        timestamp=datetime.now(timezone.utc),
        asset="SOL",
        side="sell",
        order_type="limit",
        quantity=10.0,
        limit_price=150.0,
        status=status
    )

# --- Test Cases ---

def test_get_agent_portfolio_summary_found():
    agent_id = "agent123"
    mock_summary = _create_sample_portfolio_summary(agent_id)
    mock_service_tds.get_portfolio_summary = AsyncMock(return_value=mock_summary)

    response = client.get(f"/api/v1/agents/{agent_id}/portfolio/summary")

    assert response.status_code == 200
    response_json = response.json()
    assert response_json["agent_id"] == agent_id
    assert response_json["account_value_usd"] == 10000.0
    mock_service_tds.get_portfolio_summary.assert_called_once_with(agent_id)

def test_get_agent_portfolio_summary_not_found():
    agent_id = "agent_unknown"
    mock_service_tds.get_portfolio_summary = AsyncMock(return_value=None)

    response = client.get(f"/api/v1/agents/{agent_id}/portfolio/summary")

    assert response.status_code == 404
    assert "not available" in response.json()["detail"]
    mock_service_tds.get_portfolio_summary.assert_called_once_with(agent_id)


def test_get_agent_trade_history():
    agent_id = "agent_th"
    mock_trades = [_create_sample_trade_log_item(agent_id) for _ in range(2)]
    mock_service_tds.get_trade_history = AsyncMock(return_value=mock_trades)

    response = client.get(f"/api/v1/agents/{agent_id}/portfolio/trade-history?limit=5&offset=0")

    assert response.status_code == 200
    response_json = response.json()
    assert len(response_json) == 2
    assert response_json[0]["agent_id"] == agent_id
    mock_service_tds.get_trade_history.assert_called_once_with(agent_id, 5, 0)

def test_get_agent_trade_history_invalid_limit():
    agent_id = "agent_th_limit"
    response_over_limit = client.get(f"/api/v1/agents/{agent_id}/portfolio/trade-history?limit=1000&offset=0")
    assert response_over_limit.status_code == 400
    assert "Limit must be between 1 and 500" in response_over_limit.json()["detail"]

    response_under_limit = client.get(f"/api/v1/agents/{agent_id}/portfolio/trade-history?limit=0&offset=0")
    assert response_under_limit.status_code == 400
    assert "Limit must be between 1 and 500" in response_under_limit.json()["detail"]

    mock_service_tds.get_trade_history.assert_not_called()


def test_get_agent_open_orders():
    agent_id = "agent_oo"
    mock_orders = [_create_sample_order_log_item(agent_id, status="open") for _ in range(1)]
    mock_service_tds.get_open_orders = AsyncMock(return_value=mock_orders)

    response = client.get(f"/api/v1/agents/{agent_id}/orders/open")

    assert response.status_code == 200
    response_json = response.json()
    assert len(response_json) == 1
    assert response_json[0]["agent_id"] == agent_id
    assert response_json[0]["status"] == "open"
    mock_service_tds.get_open_orders.assert_called_once_with(agent_id)

def test_get_agent_order_history():
    agent_id = "agent_oh"
    mock_orders = [_create_sample_order_log_item(agent_id, status="filled") for _ in range(3)]
    mock_service_tds.get_order_history = AsyncMock(return_value=mock_orders)

    response = client.get(f"/api/v1/agents/{agent_id}/orders/history?limit=10&offset=0")

    assert response.status_code == 200
    response_json = response.json()
    assert len(response_json) == 3
    assert response_json[0]["agent_id"] == agent_id
    assert response_json[0]["status"] == "filled"
    mock_service_tds.get_order_history.assert_called_once_with(agent_id, 10, 0)

```
