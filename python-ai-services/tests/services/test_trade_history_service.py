import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
import uuid
from typing import List, Callable

# SQLAlchemy imports for testing with in-memory DB
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from python_ai_services.core.database import Base # Your declarative base
from python_ai_services.models.db_models import TradeFillDB # The DB model to test against

from python_ai_services.services.trade_history_service import TradeHistoryService, TradeHistoryServiceError
from python_ai_services.models.trade_history_models import TradeFillData
from python_ai_services.models.dashboard_models import TradeLogItem

# --- In-Memory SQLite Test Database Setup ---
DATABASE_URL_TEST = "sqlite:///:memory:"
engine_test = create_engine(DATABASE_URL_TEST, connect_args={"check_same_thread": False})
TestSessionLocal: Callable[[], Session] = sessionmaker(autocommit=False, autoflush=False, bind=engine_test) # type: ignore

# --- Fixtures ---
@pytest_asyncio.fixture(scope="function") # Changed scope to function for clean DB per test
async def db_session() -> Session: # Renamed from service to db_session for clarity
    """Creates a new database session for a test, with tables created and dropped."""
    Base.metadata.create_all(bind=engine_test) # Create tables
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine_test) # Drop tables after test

@pytest_asyncio.fixture
async def service(db_session: Session) -> TradeHistoryService: # db_session is not directly used by service init
    """Provides a fresh instance of TradeHistoryService using the test session factory."""
    # The service needs a factory (a callable that returns a new session)
    return TradeHistoryService(session_factory=TestSessionLocal)

# Helper to create TradeFillData instances
def create_fill_pydantic(
    agent_id: str, asset: str, side: str, quantity: float, price: float,
    timestamp_offset_seconds: int = 0, fee: float = 0.0, fee_currency: str = "USD",
    fill_id: Optional[str] = None
) -> TradeFillData:
    return TradeFillData(
        fill_id=fill_id or str(uuid.uuid4()), # Allow specifying fill_id for easier matching
        agent_id=agent_id,
        timestamp=datetime.now(timezone.utc) - timedelta(seconds=timestamp_offset_seconds),
        asset=asset,
        side=side, # type: ignore
        quantity=quantity,
        price=price,
        fee=fee,
        fee_currency=fee_currency,
        exchange_order_id=f"ord_{uuid.uuid4()}",
        exchange_trade_id=f"trade_{uuid.uuid4()}"
    )

# --- Test Cases ---

@pytest.mark.asyncio
async def test_record_fill_db(service: TradeHistoryService, db_session: Session):
    agent_id = "agent_db_record"
    fill_to_record = create_fill_pydantic(agent_id, "BTC/USD", "buy", 1.0, 50000.0)

    await service.record_fill(fill_to_record)

    # Verify directly in DB
    retrieved_db_fill = db_session.query(TradeFillDB).filter_by(fill_id=fill_to_record.fill_id).first()
    assert retrieved_db_fill is not None
    assert retrieved_db_fill.agent_id == agent_id
    assert retrieved_db_fill.asset == "BTC/USD"
    assert retrieved_db_fill.quantity == 1.0
    assert retrieved_db_fill.price == 50000.0
    # Ensure timestamp is stored (default UTC handling in model/service is important)
    assert retrieved_db_fill.timestamp.replace(tzinfo=None) == fill_to_record.timestamp.replace(tzinfo=None)


@pytest.mark.asyncio
async def test_get_fills_for_agent_db(service: TradeHistoryService, db_session: Session):
    agent_id_1 = "agent_db_get_1"
    agent_id_2 = "agent_db_get_2"

    fill1_agent1 = create_fill_pydantic(agent_id_1, "ETH/USD", "sell", 5.0, 3000.0, timestamp_offset_seconds=10)
    fill2_agent1 = create_fill_pydantic(agent_id_1, "BTC/USD", "buy", 0.5, 52000.0, timestamp_offset_seconds=5)
    fill1_agent2 = create_fill_pydantic(agent_id_2, "SOL/USD", "buy", 10.0, 150.0)

    # Manually add to DB for this test
    db_session.add(TradeFillDB(**service._pydantic_fill_to_db_dict(fill1_agent1)))
    db_session.add(TradeFillDB(**service._pydantic_fill_to_db_dict(fill2_agent1)))
    db_session.add(TradeFillDB(**service._pydantic_fill_to_db_dict(fill1_agent2)))
    db_session.commit()

    fills_agent1 = await service.get_fills_for_agent(agent_id_1)
    assert len(fills_agent1) == 2
    # Service sorts by timestamp (oldest first)
    assert fills_agent1[0].asset == "ETH/USD"
    assert fills_agent1[1].asset == "BTC/USD"

    fills_agent2 = await service.get_fills_for_agent(agent_id_2)
    assert len(fills_agent2) == 1
    assert fills_agent2[0].asset == "SOL/USD"

    fills_non_existent = await service.get_fills_for_agent("non_existent_agent")
    assert len(fills_non_existent) == 0

@pytest.mark.asyncio
async def test_record_fill_db_error_handling(service: TradeHistoryService):
    agent_id = "agent_db_error"
    fill_data = create_fill_pydantic(agent_id, "FAIL/USD", "buy", 1, 100)

    # Mock session_factory to return a session that will raise an error on commit
    mock_session = MagicMock(spec=Session)
    mock_session.commit.side_effect = Exception("DB commit error")
    mock_session.rollback.return_value = None # Ensure rollback doesn't also fail test

    original_factory = service.session_factory
    service.session_factory = MagicMock(return_value=mock_session)

    with pytest.raises(TradeHistoryServiceError, match="DB error recording fill: DB commit error"):
        await service.record_fill(fill_data)

    mock_session.add.assert_called_once()
    mock_session.commit.assert_called_once()
    mock_session.rollback.assert_called_once() # Ensure rollback was attempted
    mock_session.close.assert_called_once()

    service.session_factory = original_factory # Restore original factory


# --- Tests for get_processed_trades (P&L Calculation) - now using DB backed service ---

async def _setup_fills_for_pnl_test(service: TradeHistoryService, agent_id: str, fills_config: List[Dict]):
    """Helper to record multiple fills for P&L tests."""
    for f_conf in fills_config:
        fill = create_fill_pydantic(
            agent_id=agent_id, asset=f_conf["asset"], side=f_conf["side"],
            quantity=f_conf["qty"], price=f_conf["price"], fee=f_conf.get("fee", 0.0),
            timestamp_offset_seconds=f_conf["offset"]
        )
        await service.record_fill(fill)

@pytest.mark.asyncio
async def test_get_processed_trades_no_fills_db(service: TradeHistoryService):
    agent_id = "agent_no_trades_pnl_db"
    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 0

@pytest.mark.asyncio
async def test_get_processed_trades_simple_match_db(service: TradeHistoryService):
    agent_id = "agent_simple_match_db"
    fills_config = [
        {"asset": "DOT/USD", "side": "buy", "qty": 10, "price": 7.0, "fee": 0.07, "offset": 10},
        {"asset": "DOT/USD", "side": "sell", "qty": 10, "price": 8.0, "fee": 0.08, "offset": 0}
    ]
    await _setup_fills_for_pnl_test(service, agent_id, fills_config)

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 1
    trade_log = trades[0]
    assert trade_log.asset == "DOT/USD"
    assert trade_log.quantity == 10
    assert trade_log.side == "sell"
    assert trade_log.price == 8.0
    expected_pnl = (8.0 - 7.0) * 10 - (0.07 + 0.08)
    assert pytest.approx(trade_log.realized_pnl) == expected_pnl
    assert pytest.approx(trade_log.fees) == 0.15
    # Timestamps are tricky with now(), ensure it's the sell fill's timestamp
    # This requires getting the fill back or knowing its exact timestamp.
    # For now, check P&L and structure.

@pytest.mark.asyncio
async def test_get_processed_trades_one_buy_multiple_sells_db(service: TradeHistoryService):
    agent_id = "agent_one_buy_multi_sell_db"
    fills_config = [
        {"asset": "LINK/USD", "side": "buy", "qty": 10, "price": 15.0, "fee": 0.15, "offset": 20},
        {"asset": "LINK/USD", "side": "sell", "qty": 6, "price": 16.0, "fee": 0.096, "offset": 10},
        {"asset": "LINK/USD", "side": "sell", "qty": 4, "price": 17.0, "fee": 0.068, "offset": 0}
    ]
    await _setup_fills_for_pnl_test(service, agent_id, fills_config)

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 2
    trades.sort(key=lambda t: t.timestamp) # Sort by exit time (service already does newest first, so this makes it oldest exit first)

    # First sell (6 units @ $16) closes part of the buy
    trade1 = trades[0]
    assert trade1.quantity == 6
    assert trade1.price == 16.0
    buy_fee_p1 = (6/10) * 0.15
    sell_fee_p1 = 0.096
    expected_pnl1 = (16.0 - 15.0) * 6 - (buy_fee_p1 + sell_fee_p1)
    assert pytest.approx(trade1.realized_pnl) == expected_pnl1

    # Second sell (4 units @ $17) closes rest of the buy
    trade2 = trades[1]
    assert trade2.quantity == 4
    assert trade2.price == 17.0
    buy_fee_p2 = (4/10) * 0.15
    sell_fee_p2 = 0.068
    expected_pnl2 = (17.0 - 15.0) * 4 - (buy_fee_p2 + sell_fee_p2)
    assert pytest.approx(trade2.realized_pnl) == expected_pnl2

@pytest.mark.asyncio
async def test_get_processed_trades_multiple_assets_db(service: TradeHistoryService):
    agent_id = "agent_multi_asset_db"
    fills_config = [
        # Asset 1: BTC
        {"asset": "BTC/USD", "side": "buy", "qty": 1, "price": 50000, "fee": 50, "offset": 30},
        {"asset": "BTC/USD", "side": "sell", "qty": 1, "price": 51000, "fee": 51, "offset": 20},
        # Asset 2: ETH
        {"asset": "ETH/USD", "side": "buy", "qty": 10, "price": 3000, "fee": 30, "offset": 25},
        {"asset": "ETH/USD", "side": "sell", "qty": 5, "price": 3100, "fee": 15.5, "offset": 15}, # Partial sell
        {"asset": "ETH/USD", "side": "sell", "qty": 5, "price": 3200, "fee": 16, "offset": 5},   # Close ETH
    ]
    await _setup_fills_for_pnl_test(service, agent_id, fills_config)

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 3 # 1 for BTC, 2 for ETH

    btc_trades = [t for t in trades if t.asset == "BTC/USD"]
    eth_trades = [t for t in trades if t.asset == "ETH/USD"]
    assert len(btc_trades) == 1
    assert len(eth_trades) == 2

    # Check BTC P&L
    expected_pnl_btc = (51000 - 50000) * 1 - (50 + 51)
    assert pytest.approx(btc_trades[0].realized_pnl) == expected_pnl_btc

    # Check ETH P&L (sum of two closing parts)
    eth_trades.sort(key=lambda t: t.timestamp) # Oldest exit first for easier assertion

    # PNL from first ETH sell (5 units @ $3100 against 10 units @ $3000)
    eth_buy_fee_total = 30
    eth_sell1_fee = 15.5
    eth_buy_fee_p1 = (5/10) * eth_buy_fee_total
    expected_pnl_eth1 = (3100 - 3000) * 5 - (eth_buy_fee_p1 + eth_sell1_fee)
    assert pytest.approx(eth_trades[0].realized_pnl) == expected_pnl_eth1

    # PNL from second ETH sell (remaining 5 units @ $3200 against 10 units @ $3000)
    eth_sell2_fee = 16
    eth_buy_fee_p2 = (5/10) * eth_buy_fee_total
    expected_pnl_eth2 = (3200 - 3000) * 5 - (eth_buy_fee_p2 + eth_sell2_fee)
    assert pytest.approx(eth_trades[1].realized_pnl) == expected_pnl_eth2

# Optional: Import for type hinting if not already present
from typing import Optional
```
