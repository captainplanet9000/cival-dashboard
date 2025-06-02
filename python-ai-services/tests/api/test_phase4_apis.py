import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch, call # Added call
from fastapi.testclient import TestClient
import uuid
from datetime import date, datetime, timezone, timedelta # Added timedelta
from typing import List, Dict, Any, Optional

# Assuming main.app is the FastAPI instance
from python_ai_services.main import app

# Import models for request/response validation and mocking service returns
from python_ai_services.models.visualization_models import StrategyVisualizationRequest, StrategyVisualizationDataResponse, OHLCVBar
from python_ai_services.models.strategy_models import StrategyTimeframe, StrategyConfig, DarvasBoxParams # Added StrategyConfig, DarvasBoxParams
# Assuming StrategyFormMetadataResponse is defined in main.py or easily importable
# For this test, let's assume it's importable from main or a models file
try:
    from python_ai_services.main import StrategyFormMetadataResponse # If defined in main
except ImportError:
    # If you have a dedicated api_models.py or similar, import from there:
    # from python_ai_services.models.api_models import StrategyFormMetadataResponse
    # For this test structure, we'll assume it could be in main or we'll define a fallback if needed.
    # Fallback if not found, to allow tests to run, though ideally this import should be solid.
    class StrategyFormMetadataResponse(MagicMock): # type: ignore
        pass


# Import services to mock their behavior when injected into endpoints
from python_ai_services.services.strategy_visualization_service import StrategyVisualizationService, StrategyVisualizationServiceError
from python_ai_services.services.strategy_config_service import StrategyConfigService

# Import actual dependency injector functions to use as keys for overrides
from python_ai_services.main import get_strategy_visualization_service, get_strategy_config_service


# --- Test Client Fixture ---
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

# --- Mock Service Fixtures ---
@pytest_asyncio.fixture
async def mock_viz_service():
    service = MagicMock(spec=StrategyVisualizationService)
    service.get_strategy_visualization_data = AsyncMock()
    return service

# No specific mock for StrategyConfigService needed for form_metadata endpoint as it's simple,
# but could be added if testing more complex scenarios involving it.

# --- Tests for Strategy Visualization Endpoint ---

def test_get_strategy_chart_data_success(client: TestClient, mock_viz_service: MagicMock):
    # Arrange
    strategy_config_id = uuid.uuid4()
    user_id = uuid.uuid4()
    start_date_obj = date(2023, 1, 1)
    end_date_obj = date(2023, 1, 31)
    start_date_str = start_date_obj.isoformat()
    end_date_str = end_date_obj.isoformat()


    mock_response_data = StrategyVisualizationDataResponse(
        strategy_config_id=strategy_config_id,
        symbol_visualized="AAPL",
        period_start_date=start_date_obj,
        period_end_date=end_date_obj,
        ohlcv_data=[OHLCVBar(timestamp=datetime.now(timezone.utc), open=1.0,high=2.0,low=0.0,close=1.5,volume=1000.0)],
        generated_at=datetime.now(timezone.utc)
    )
    mock_viz_service.get_strategy_visualization_data.return_value = mock_response_data

    app.dependency_overrides[get_strategy_visualization_service] = lambda: mock_viz_service

    # Act
    response = client.get(
        "/api/v1/visualizations/strategy",
        params={
            "strategy_config_id": str(strategy_config_id),
            "user_id": str(user_id),
            "start_date": start_date_str,
            "end_date": end_date_str
        }
    )

    app.dependency_overrides.clear()

    # Assert
    assert response.status_code == 200
    response_data_dict = response.json()
    # Re-parse to validate against the model, or compare dict fields carefully
    response_data_model = StrategyVisualizationDataResponse(**response_data_dict)
    assert response_data_model.strategy_config_id == strategy_config_id
    assert response_data_model.symbol_visualized == "AAPL"
    assert len(response_data_model.ohlcv_data) == 1

    mock_viz_service.get_strategy_visualization_data.assert_called_once()
    call_args = mock_viz_service.get_strategy_visualization_data.call_args[1]
    assert isinstance(call_args['request'], StrategyVisualizationRequest)
    assert call_args['request'].strategy_config_id == strategy_config_id
    assert call_args['request'].user_id == user_id
    assert call_args['request'].start_date == start_date_obj
    assert call_args['request'].end_date == end_date_obj


def test_get_strategy_chart_data_service_error(client: TestClient, mock_viz_service: MagicMock):
    mock_viz_service.get_strategy_visualization_data.side_effect = StrategyVisualizationServiceError("Service failed")
    app.dependency_overrides[get_strategy_visualization_service] = lambda: mock_viz_service

    response = client.get("/api/v1/visualizations/strategy", params={"strategy_config_id": str(uuid.uuid4()), "user_id": str(uuid.uuid4()), "start_date": "2023-01-01", "end_date": "2023-01-10"})
    app.dependency_overrides.clear()

    assert response.status_code == 500
    assert "Service failed" in response.json()["detail"]

def test_get_strategy_chart_data_not_found_error(client: TestClient, mock_viz_service: MagicMock):
    mock_viz_service.get_strategy_visualization_data.side_effect = StrategyVisualizationServiceError("Could not fetch price data for SYMBOL")
    app.dependency_overrides[get_strategy_visualization_service] = lambda: mock_viz_service

    response = client.get("/api/v1/visualizations/strategy", params={"strategy_config_id": str(uuid.uuid4()), "user_id": str(uuid.uuid4()), "start_date": "2023-01-01", "end_date": "2023-01-10"})
    app.dependency_overrides.clear()

    assert response.status_code == 404
    assert "Could not fetch price data for SYMBOL" in response.json()["detail"]


def test_get_strategy_chart_data_bad_request_params(client: TestClient):
    response = client.get(
        "/api/v1/visualizations/strategy",
        params={
            "strategy_config_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "start_date": "invalid-date-format",
            "end_date": "2023-01-31"
        }
    )
    assert response.status_code == 422

# --- Tests for Strategy Form Metadata Endpoint ---

def test_get_strategy_form_metadata_success(client: TestClient):
    expected_types = ["DarvasBox", "WilliamsAlligator", "HeikinAshi", "Renko", "SMACrossover", "ElliottWave"]
    expected_timeframes = list(StrategyTimeframe.__args__)

    response = client.get("/api/v1/strategies/form-metadata")

    assert response.status_code == 200
    data = response.json()
    assert data["available_strategy_types"] == expected_types
    assert data["available_timeframes"] == expected_timeframes


# --- Placeholders for other API endpoint tests (Watchlist, Paper Trading, etc.) ---

# Ensure these are imported if not already at the top:
from python_ai_services.services.simulated_trade_executor import SimulatedTradeExecutor
from python_ai_services.models.watchlist_models import BatchQuotesRequest, BatchQuotesResponse, BatchQuotesResponseItem # BatchQuotesResponseItem needed for mock
from python_ai_services.models.paper_trading_models import PaperTradeOrder, PaperTradeFill, CreatePaperTradeOrderRequest, PaperPosition # Added PaperPosition
from python_ai_services.models.trading_history_models import TradeRecord, TradeSide, OrderType as PaperOrderType, OrderStatus as PaperOrderStatus
from python_ai_services.main import get_simulated_trade_executor # Dependency injector
# import uuid, datetime, timezone, List, Optional, Dict, Any # Standard imports
# from fastapi.testclient import TestClient # Covered by fixture
# from unittest.mock import AsyncMock, MagicMock, call # call already imported at top
# import pytest # Covered

# --- Mock Service Fixture for SimulatedTradeExecutor ---
@pytest_asyncio.fixture
async def mock_simulated_trade_executor():
    service = MagicMock(spec=SimulatedTradeExecutor)
    service.get_open_paper_orders = AsyncMock()
    service.submit_paper_order = AsyncMock()
    service.cancel_paper_order = AsyncMock()
    service.apply_fill_to_position = AsyncMock()
    service._log_paper_trade_to_history = AsyncMock()
    return service

# --- Tests for Batch Quotes Endpoint ---

def test_get_batch_quotes_success(client: TestClient, mock_watchlist_service: MagicMock): # Uses mock_watchlist_service
    request_data = BatchQuotesRequest(symbols=["AAPL", "MSFT"], provider="test_prov")
    mock_response_items = [
        BatchQuotesResponseItem(symbol="AAPL", quote_data={"price": 150.0}),
        BatchQuotesResponseItem(symbol="MSFT", quote_data={"price": 300.0})
    ]
    mock_watchlist_service.get_batch_quotes_for_symbols.return_value = BatchQuotesResponse(results=mock_response_items)
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.post("/api/v1/quotes/batch", json=request_data.model_dump())
    app.dependency_overrides.clear()

    assert response.status_code == 200
    data = BatchQuotesResponse(**response.json())
    assert len(data.results) == 2
    assert data.results[0].symbol == "AAPL"
    mock_watchlist_service.get_batch_quotes_for_symbols.assert_called_once_with(
        symbols=request_data.symbols, provider=request_data.provider
    )

def test_get_batch_quotes_service_error(client: TestClient, mock_watchlist_service: MagicMock): # Uses mock_watchlist_service
    request_data = BatchQuotesRequest(symbols=["FAIL"])
    mock_watchlist_service.get_batch_quotes_for_symbols.side_effect = Exception("Service error")
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.post("/api/v1/quotes/batch", json=request_data.model_dump())
    app.dependency_overrides.clear()
    assert response.status_code == 500
    assert "Failed to fetch batch quotes" in response.json()["detail"]


# --- Tests for Paper Trading Order Endpoints ---

def test_list_open_paper_orders_success(client: TestClient, mock_simulated_trade_executor: MagicMock):
    user_id = uuid.uuid4()
    # Constructing mock data that can be parsed by TradeRecord
    mock_orders_data = [
        {"trade_id": str(uuid.uuid4()), "user_id": str(user_id), "order_id":str(uuid.uuid4()), "symbol":"AAPL", "side":TradeSide.BUY.value, "order_type":PaperOrderType.MARKET.value, "status":PaperOrderStatus.NEW.value, "quantity_ordered":10.0, "created_at":datetime.now(timezone.utc).isoformat(), "updated_at":datetime.now(timezone.utc).isoformat(), "exchange":"PAPER_BACKTEST", "quantity_filled": 0.0}
    ]
    mock_orders_models = [TradeRecord(**data) for data in mock_orders_data]
    mock_simulated_trade_executor.get_open_paper_orders.return_value = mock_orders_models
    app.dependency_overrides[get_simulated_trade_executor] = lambda: mock_simulated_trade_executor

    response = client.get(f"/api/v1/paper-trading/orders/open/user/{user_id}")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    response_data = [TradeRecord(**o) for o in response.json()]
    assert len(response_data) == 1
    assert response_data[0].symbol == "AAPL"
    mock_simulated_trade_executor.get_open_paper_orders.assert_called_once_with(user_id=user_id)

def test_submit_new_paper_order_success(client: TestClient, mock_simulated_trade_executor: MagicMock):
    user_id = uuid.uuid4()
    order_req_data = CreatePaperTradeOrderRequest(user_id=user_id, symbol="MSFT", side=TradeSide.BUY, order_type=PaperOrderType.MARKET, quantity=5)

    mock_order_id = uuid.uuid4()
    mock_updated_order = PaperTradeOrder(
        order_id=mock_order_id, user_id=user_id, symbol="MSFT", side=TradeSide.BUY,
        order_type=PaperOrderType.MARKET, quantity=5,
        status=PaperOrderStatus.FILLED,
        order_request_timestamp=datetime.now(timezone.utc) # Default factory will handle this in actual model
    )
    mock_fills = [PaperTradeFill(
        order_id=mock_order_id, user_id=user_id, symbol="MSFT", side=TradeSide.BUY,
        price=100.0, quantity=5, fill_timestamp=datetime.now(timezone.utc)
    )]
    mock_simulated_trade_executor.submit_paper_order.return_value = (mock_updated_order, mock_fills)

    mock_simulated_trade_executor.apply_fill_to_position = AsyncMock(return_value=MagicMock(spec=PaperPosition))
    mock_simulated_trade_executor._log_paper_trade_to_history = AsyncMock(return_value=MagicMock(spec=TradeRecord))

    app.dependency_overrides[get_simulated_trade_executor] = lambda: mock_simulated_trade_executor

    response = client.post("/api/v1/paper-trading/orders", json=order_req_data.model_dump())
    app.dependency_overrides.clear()

    assert response.status_code == 202
    data = response.json()
    assert data["message"].startswith("Paper order")
    assert data["updated_order"]["symbol"] == "MSFT"
    assert data["updated_order"]["status"] == PaperOrderStatus.FILLED.value
    assert len(data["fills"]) == 1

    mock_simulated_trade_executor.submit_paper_order.assert_called_once()
    passed_paper_order_arg = mock_simulated_trade_executor.submit_paper_order.call_args[0][0]
    assert isinstance(passed_paper_order_arg, PaperTradeOrder)
    assert passed_paper_order_arg.symbol == order_req_data.symbol

    mock_simulated_trade_executor.apply_fill_to_position.assert_called_once_with(mock_fills[0])
    mock_simulated_trade_executor._log_paper_trade_to_history.assert_called_once_with(mock_updated_order, mock_fills[0])


def test_cancel_user_paper_order_success(client: TestClient, mock_simulated_trade_executor: MagicMock):
    user_id = uuid.uuid4()
    order_id = uuid.uuid4()

    mock_canceled_order = PaperTradeOrder(
        order_id=order_id, user_id=user_id, symbol="GOOG", side=TradeSide.BUY,
        order_type=PaperOrderType.LIMIT, quantity=2, limit_price=100.0,
        status=PaperOrderStatus.CANCELED,
        order_request_timestamp=datetime.now(timezone.utc), notes="User Canceled"
    )
    mock_simulated_trade_executor.cancel_paper_order.return_value = mock_canceled_order
    app.dependency_overrides[get_simulated_trade_executor] = lambda: mock_simulated_trade_executor

    response = client.post(f"/api/v1/paper-trading/orders/{order_id}/user/{user_id}/cancel")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    response_data = PaperTradeOrder(**response.json())
    assert response_data.order_id == order_id
    assert response_data.status == PaperOrderStatus.CANCELED
    mock_simulated_trade_executor.cancel_paper_order.assert_called_once_with(user_id=user_id, order_id=order_id)


# Ensure these are imported if not already at the top:
# from python_ai_services.services.strategy_config_service import StrategyConfigService, StrategyConfigServiceError (StrategyConfigService is already imported)
from python_ai_services.services.strategy_config_service import StrategyConfigServiceError # Explicitly import the error
from python_ai_services.models.strategy_models import StrategyPerformanceTeaser # StrategyTimeframe already imported at top
# from python_ai_services.main import get_strategy_config_service # Already imported at top
# import uuid # Already imported
# from fastapi.testclient import TestClient # Covered by fixture
# from unittest.mock import AsyncMock, MagicMock # Covered
# import pytest # Covered
# from datetime import datetime, timezone # Already imported

# --- Mock Service Fixture for StrategyConfigService (if not already suitable one exists) ---
@pytest_asyncio.fixture
async def mock_strategy_config_service_for_api(): # Specific name to avoid clashes
    service = MagicMock(spec=StrategyConfigService)
    service.get_all_user_strategies_with_performance_teasers = AsyncMock()
    return service

# --- Tests for Strategy Performance Teasers Endpoint ---

def test_get_user_strategies_performance_teasers_success(
    client: TestClient,
    mock_strategy_config_service_for_api: MagicMock
):
    # Arrange
    user_id = uuid.uuid4()
    mock_teasers = [
        StrategyPerformanceTeaser(
            strategy_id=uuid.uuid4(), strategy_name="Test Strat 1", strategy_type="DarvasBox",
            is_active=True, symbols=["AAPL"], timeframe=StrategyTimeframe.d1,
            latest_performance_record_timestamp=datetime.now(timezone.utc),
            latest_net_profit_percentage=10.5, total_trades_from_latest_metrics=50
        ),
        StrategyPerformanceTeaser(
            strategy_id=uuid.uuid4(), strategy_name="Test Strat 2", strategy_type="SMACrossover",
            is_active=False, symbols=["MSFT"], timeframe=StrategyTimeframe.h4,
            latest_performance_record_timestamp=datetime.now(timezone.utc),
            latest_net_profit_percentage=-2.3, total_trades_from_latest_metrics=25
        )
    ]
    mock_strategy_config_service_for_api.get_all_user_strategies_with_performance_teasers.return_value = mock_teasers

    app.dependency_overrides[get_strategy_config_service] = lambda: mock_strategy_config_service_for_api

    # Act
    response = client.get(f"/api/v1/strategies/user/{user_id}/performance-teasers")
    app.dependency_overrides.clear()

    # Assert
    assert response.status_code == 200
    response_data = [StrategyPerformanceTeaser(**t) for t in response.json()]
    assert len(response_data) == 2
    assert response_data[0].strategy_name == "Test Strat 1"
    assert response_data[1].is_active is False
    mock_strategy_config_service_for_api.get_all_user_strategies_with_performance_teasers.assert_called_once_with(user_id=user_id)

def test_get_user_strategies_performance_teasers_empty(
    client: TestClient,
    mock_strategy_config_service_for_api: MagicMock
):
    # Arrange
    user_id = uuid.uuid4()
    mock_strategy_config_service_for_api.get_all_user_strategies_with_performance_teasers.return_value = []
    app.dependency_overrides[get_strategy_config_service] = lambda: mock_strategy_config_service_for_api

    # Act
    response = client.get(f"/api/v1/strategies/user/{user_id}/performance-teasers")
    app.dependency_overrides.clear()

    # Assert
    assert response.status_code == 200
    assert response.json() == []
    mock_strategy_config_service_for_api.get_all_user_strategies_with_performance_teasers.assert_called_once_with(user_id=user_id)

def test_get_user_strategies_performance_teasers_service_error(
    client: TestClient,
    mock_strategy_config_service_for_api: MagicMock
):
    # Arrange
    user_id = uuid.uuid4()
    mock_strategy_config_service_for_api.get_all_user_strategies_with_performance_teasers.side_effect = StrategyConfigServiceError("DB connection lost")
    app.dependency_overrides[get_strategy_config_service] = lambda: mock_strategy_config_service_for_api

    # Act
    response = client.get(f"/api/v1/strategies/user/{user_id}/performance-teasers")
    app.dependency_overrides.clear()

    # Assert
    assert response.status_code == 500
    assert "DB connection lost" in response.json()["detail"]

# Ensure these are imported if not already at the top:
# from python_ai_services.services.watchlist_service import WatchlistService, WatchlistNotFoundError, WatchlistItemNotFoundError, WatchlistOperationForbiddenError # Already imported effectively by direct use or spec
from python_ai_services.models.watchlist_models import Watchlist, WatchlistCreate, WatchlistItem, WatchlistWithItems, AddWatchlistItemsRequest # WatchlistItemCreate also needed for some tests
from python_ai_services.main import get_watchlist_service # Dependency injector
# import uuid, datetime, timezone, List, Optional, Dict, Any # Standard imports, mostly covered
# from fastapi.testclient import TestClient # Covered by fixture
# from unittest.mock import AsyncMock, MagicMock # Covered by imports at top of file
# import pytest # Covered

# --- Mock Service Fixture for WatchlistService ---
@pytest_asyncio.fixture
async def mock_watchlist_service():
    service = MagicMock(spec=WatchlistService)
    service.create_watchlist = AsyncMock()
    service.get_watchlists_by_user = AsyncMock()
    service.get_watchlist = AsyncMock()
    service.update_watchlist = AsyncMock()
    service.delete_watchlist = AsyncMock()
    service.add_multiple_items_to_watchlist = AsyncMock()
    service.remove_item_from_watchlist = AsyncMock()
    return service

# --- Tests for Watchlist CRUD Endpoints ---

def test_create_new_watchlist_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    watchlist_data_in = WatchlistCreate(name="Crypto Majors", description="Track top cryptos")

    mock_created_watchlist = Watchlist(
        watchlist_id=uuid.uuid4(), user_id=user_id, name=watchlist_data_in.name,
        description=watchlist_data_in.description,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    mock_watchlist_service.create_watchlist.return_value = mock_created_watchlist
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.post(f"/api/v1/watchlists/user/{user_id}", json=watchlist_data_in.model_dump())
    app.dependency_overrides.clear()

    assert response.status_code == 201
    response_data = Watchlist(**response.json())
    assert response_data.name == watchlist_data_in.name
    assert response_data.user_id == user_id
    mock_watchlist_service.create_watchlist.assert_called_once_with(user_id=user_id, data=watchlist_data_in)

def test_get_user_watchlists_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    mock_watchlists = [
        Watchlist(watchlist_id=uuid.uuid4(), user_id=user_id, name="WL1", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)),
        Watchlist(watchlist_id=uuid.uuid4(), user_id=user_id, name="WL2", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    ]
    mock_watchlist_service.get_watchlists_by_user.return_value = mock_watchlists
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.get(f"/api/v1/watchlists/user/{user_id}")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    response_data = [Watchlist(**wl) for wl in response.json()]
    assert len(response_data) == 2
    assert response_data[0].name == "WL1"
    mock_watchlist_service.get_watchlists_by_user.assert_called_once_with(user_id=user_id)

def test_get_user_watchlist_details_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    watchlist_id = uuid.uuid4()
    mock_watchlist_with_items = WatchlistWithItems(
        watchlist_id=watchlist_id, user_id=user_id, name="Detailed WL", items=[],
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    mock_watchlist_service.get_watchlist.return_value = mock_watchlist_with_items
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.get(f"/api/v1/watchlists/{watchlist_id}/user/{user_id}")
    app.dependency_overrides.clear()

    assert response.status_code == 200
    response_data = WatchlistWithItems(**response.json())
    assert response_data.watchlist_id == watchlist_id
    mock_watchlist_service.get_watchlist.assert_called_once_with(watchlist_id=watchlist_id, user_id=user_id, include_items=True)

def test_get_user_watchlist_details_not_found(client: TestClient, mock_watchlist_service: MagicMock):
    mock_watchlist_service.get_watchlist.return_value = None
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.get(f"/api/v1/watchlists/{uuid.uuid4()}/user/{uuid.uuid4()}")
    app.dependency_overrides.clear()
    assert response.status_code == 404

def test_update_user_watchlist_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    watchlist_id = uuid.uuid4()
    update_payload = WatchlistCreate(name="Updated WL Name", description="Updated desc.")

    mock_updated_wl = Watchlist(
        watchlist_id=watchlist_id, user_id=user_id, name=update_payload.name, description=update_payload.description,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )
    mock_watchlist_service.update_watchlist.return_value = mock_updated_wl
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.put(f"/api/v1/watchlists/{watchlist_id}/user/{user_id}", json=update_payload.model_dump())
    app.dependency_overrides.clear()

    assert response.status_code == 200
    response_data = Watchlist(**response.json())
    assert response_data.name == update_payload.name
    mock_watchlist_service.update_watchlist.assert_called_once_with(watchlist_id=watchlist_id, user_id=user_id, data=update_payload)

def test_delete_user_watchlist_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    watchlist_id = uuid.uuid4()
    mock_watchlist_service.delete_watchlist.return_value = None
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.delete(f"/api/v1/watchlists/{watchlist_id}/user/{user_id}")
    app.dependency_overrides.clear()

    assert response.status_code == 204
    mock_watchlist_service.delete_watchlist.assert_called_once_with(watchlist_id=watchlist_id, user_id=user_id)

# --- Tests for Watchlist Item CRUD Endpoints ---

def test_add_items_to_watchlist_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    watchlist_id = uuid.uuid4()
    items_req_payload = AddWatchlistItemsRequest(symbols=["AAPL", "TSLA"])

    mock_created_items = [
        WatchlistItem(item_id=uuid.uuid4(), watchlist_id=watchlist_id, user_id=user_id, symbol="AAPL", added_at=datetime.now(timezone.utc)),
        WatchlistItem(item_id=uuid.uuid4(), watchlist_id=watchlist_id, user_id=user_id, symbol="TSLA", added_at=datetime.now(timezone.utc))
    ]
    mock_watchlist_service.add_multiple_items_to_watchlist.return_value = mock_created_items
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.post(f"/api/v1/watchlists/{watchlist_id}/user/{user_id}/items", json=items_req_payload.model_dump())
    app.dependency_overrides.clear()

    assert response.status_code == 201
    response_data = [WatchlistItem(**item) for item in response.json()]
    assert len(response_data) == 2
    assert response_data[0].symbol == "AAPL"
    mock_watchlist_service.add_multiple_items_to_watchlist.assert_called_once_with(watchlist_id=watchlist_id, user_id=user_id, items_request=items_req_payload)

def test_add_items_to_watchlist_not_found(client: TestClient, mock_watchlist_service: MagicMock):
    # Import specific exception for this test
    from python_ai_services.services.watchlist_service import WatchlistNotFoundError
    mock_watchlist_service.add_multiple_items_to_watchlist.side_effect = WatchlistNotFoundError("WL not found")
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    items_req_payload = AddWatchlistItemsRequest(symbols=["FAIL"])
    response = client.post(f"/api/v1/watchlists/{uuid.uuid4()}/user/{uuid.uuid4()}/items", json=items_req_payload.model_dump())
    app.dependency_overrides.clear()
    assert response.status_code == 404

def test_add_items_to_watchlist_conflict_duplicate(client: TestClient, mock_watchlist_service: MagicMock):
    # Import specific exception for this test
    from python_ai_services.services.watchlist_service import WatchlistServiceError
    mock_watchlist_service.add_multiple_items_to_watchlist.side_effect = WatchlistServiceError("Symbol already exists")
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    items_req_payload = AddWatchlistItemsRequest(symbols=["DUPE"])
    response = client.post(f"/api/v1/watchlists/{uuid.uuid4()}/user/{uuid.uuid4()}/items", json=items_req_payload.model_dump())
    app.dependency_overrides.clear()
    assert response.status_code == 409

def test_remove_item_from_watchlist_success(client: TestClient, mock_watchlist_service: MagicMock):
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    mock_watchlist_service.remove_item_from_watchlist.return_value = None
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.delete(f"/api/v1/watchlists/items/{item_id}/user/{user_id}")
    app.dependency_overrides.clear()

    assert response.status_code == 204
    mock_watchlist_service.remove_item_from_watchlist.assert_called_once_with(item_id=item_id, user_id=user_id)

def test_remove_item_from_watchlist_not_found(client: TestClient, mock_watchlist_service: MagicMock):
    from python_ai_services.services.watchlist_service import WatchlistItemNotFoundError
    mock_watchlist_service.remove_item_from_watchlist.side_effect = WatchlistItemNotFoundError("Item not found")
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.delete(f"/api/v1/watchlists/items/{uuid.uuid4()}/user/{uuid.uuid4()}")
    app.dependency_overrides.clear()
    assert response.status_code == 404

def test_remove_item_from_watchlist_forbidden(client: TestClient, mock_watchlist_service: MagicMock):
    from python_ai_services.services.watchlist_service import WatchlistOperationForbiddenError
    mock_watchlist_service.remove_item_from_watchlist.side_effect = WatchlistOperationForbiddenError("Forbidden")
    app.dependency_overrides[get_watchlist_service] = lambda: mock_watchlist_service

    response = client.delete(f"/api/v1/watchlists/items/{uuid.uuid4()}/user/{uuid.uuid4()}")
    app.dependency_overrides.clear()
    assert response.status_code == 403
```
