import pytest
import pytest_asyncio
from pathlib import Path
import json
from datetime import datetime, timezone, timedelta
import uuid
import os # For checking file existence, removing files etc.

from python_ai_services.services.trade_history_service import TradeHistoryService
from python_ai_services.models.trade_history_models import TradeFillData
from python_ai_services.models.dashboard_models import TradeLogItem

@pytest_asyncio.fixture
async def service(tmp_path: Path) -> TradeHistoryService:
    """Provides a fresh instance of TradeHistoryService using a temporary fills directory."""
    fills_dir = tmp_path / "agent_fills_test"
    return TradeHistoryService(fills_dir=fills_dir)

# Helper to create TradeFillData instances
def create_fill(
    agent_id: str, asset: str, side: str, quantity: float, price: float,
    timestamp_offset_seconds: int = 0, fee: float = 0.0, fee_currency: str = "USD"
) -> TradeFillData:
    return TradeFillData(
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

@pytest.mark.asyncio
async def test_record_and_get_fills(service: TradeHistoryService):
    agent_id = "agent_record_get"
    fill1 = create_fill(agent_id, "BTC/USD", "buy", 1.0, 50000.0, timestamp_offset_seconds=10)
    fill2 = create_fill(agent_id, "ETH/USD", "sell", 5.0, 3000.0, timestamp_offset_seconds=5)

    await service.record_fill(fill1)
    await service.record_fill(fill2)

    fills = await service.get_fills_for_agent(agent_id)
    assert len(fills) == 2
    # get_fills_for_agent sorts by timestamp (oldest first)
    assert fills[0].asset == "BTC/USD"
    assert fills[0].quantity == 1.0
    assert fills[1].asset == "ETH/USD"
    assert fills[1].quantity == 5.0

    # Check file content
    filepath = await service._get_agent_fills_filepath(agent_id)
    assert filepath.exists()
    with open(filepath, 'r') as f:
        lines = f.readlines()
        assert len(lines) == 2
        data1 = json.loads(lines[0])
        data2 = json.loads(lines[1])
        # Order of recording is preserved in file, but get_fills_for_agent sorts by time
        assert data1["asset"] == "BTC/USD"
        assert data2["asset"] == "ETH/USD"

@pytest.mark.asyncio
async def test_get_fills_for_non_existent_agent(service: TradeHistoryService):
    fills = await service.get_fills_for_agent("non_existent_agent_id")
    assert len(fills) == 0

@pytest.mark.asyncio
async def test_get_fills_corrupted_file_line(service: TradeHistoryService, tmp_path: Path):
    agent_id = "agent_corrupt"
    filepath = await service._get_agent_fills_filepath(agent_id)

    fill_ok = create_fill(agent_id, "SOL/USD", "buy", 10, 150)

    with open(filepath, 'w') as f:
        f.write(fill_ok.model_dump_json() + '\n')
        f.write("this is not valid json\n") # Corrupted line
        f.write(create_fill(agent_id, "ADA/USD", "sell", 100, 1.0).model_dump_json() + '\n')

    fills = await service.get_fills_for_agent(agent_id)
    assert len(fills) == 2 # Should skip the corrupted line and load others
    assert fills[0].asset == "SOL/USD"
    assert fills[1].asset == "ADA/USD"


# --- Tests for get_processed_trades (P&L Calculation) ---

@pytest.mark.asyncio
async def test_get_processed_trades_no_fills(service: TradeHistoryService):
    agent_id = "agent_no_trades_for_pnl"
    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 0

@pytest.mark.asyncio
async def test_get_processed_trades_only_buys(service: TradeHistoryService):
    agent_id = "agent_only_buys"
    await service.record_fill(create_fill(agent_id, "BTC/USD", "buy", 1, 50000))
    await service.record_fill(create_fill(agent_id, "BTC/USD", "buy", 0.5, 51000))

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 0 # No sells, so no P&L calculated

@pytest.mark.asyncio
async def test_get_processed_trades_only_sells(service: TradeHistoryService):
    # (Assuming no short selling P&L logic for this version)
    agent_id = "agent_only_sells"
    await service.record_fill(create_fill(agent_id, "ETH/USD", "sell", 2, 3000))
    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 0

@pytest.mark.asyncio
async def test_get_processed_trades_simple_buy_sell_match(service: TradeHistoryService):
    agent_id = "agent_simple_match"
    buy_fill = create_fill(agent_id, "DOT/USD", "buy", 10, 7.0, fee=0.07, timestamp_offset_seconds=10) # fee 1% of value
    sell_fill = create_fill(agent_id, "DOT/USD", "sell", 10, 8.0, fee=0.08, timestamp_offset_seconds=0) # fee 1% of value
    await service.record_fill(buy_fill)
    await service.record_fill(sell_fill)

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 1
    trade_log = trades[0]
    assert trade_log.asset == "DOT/USD"
    assert trade_log.quantity == 10
    assert trade_log.side == "sell" # Represents the closing part of the trade
    assert trade_log.price == 8.0 # Sell price
    expected_pnl = (8.0 - 7.0) * 10 - (0.07 + 0.08) # (sell_price - buy_price) * qty - total_fees
    assert pytest.approx(trade_log.realized_pnl) == expected_pnl
    assert pytest.approx(trade_log.fees) == 0.15
    assert trade_log.timestamp == sell_fill.timestamp # Timestamp of the closing fill

@pytest.mark.asyncio
async def test_get_processed_trades_one_buy_multiple_sells(service: TradeHistoryService):
    agent_id = "agent_one_buy_multi_sell"
    await service.record_fill(create_fill(agent_id, "LINK/USD", "buy", 10, 15.0, fee=0.15, timestamp_offset_seconds=20)) # Total buy fee
    await service.record_fill(create_fill(agent_id, "LINK/USD", "sell", 6, 16.0, fee=0.096, timestamp_offset_seconds=10)) # Sell 1 fee
    await service.record_fill(create_fill(agent_id, "LINK/USD", "sell", 4, 17.0, fee=0.068, timestamp_offset_seconds=0))   # Sell 2 fee

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 2
    trades.sort(key=lambda t: t.timestamp) # Sort by exit time for assertion consistency

    # First sell closes 6 units
    trade1 = trades[0]
    assert trade1.quantity == 6
    assert trade1.price == 16.0
    buy_fee_p1 = (6/10) * 0.15
    sell_fee_p1 = 0.096
    expected_pnl1 = (16.0 - 15.0) * 6 - (buy_fee_p1 + sell_fee_p1)
    assert pytest.approx(trade1.realized_pnl) == expected_pnl1
    assert pytest.approx(trade1.fees) == buy_fee_p1 + sell_fee_p1

    # Second sell closes remaining 4 units
    trade2 = trades[1]
    assert trade2.quantity == 4
    assert trade2.price == 17.0
    buy_fee_p2 = (4/10) * 0.15
    sell_fee_p2 = 0.068
    expected_pnl2 = (17.0 - 15.0) * 4 - (buy_fee_p2 + sell_fee_p2)
    assert pytest.approx(trade2.realized_pnl) == expected_pnl2
    assert pytest.approx(trade2.fees) == buy_fee_p2 + sell_fee_p2

@pytest.mark.asyncio
async def test_get_processed_trades_multiple_buys_one_sell(service: TradeHistoryService):
    agent_id = "agent_multi_buy_one_sell"
    # Buys are FIFO
    await service.record_fill(create_fill(agent_id, "AVAX/USD", "buy", 5, 30.0, fee=0.15, timestamp_offset_seconds=30)) # Buy 1
    await service.record_fill(create_fill(agent_id, "AVAX/USD", "buy", 8, 32.0, fee=0.256, timestamp_offset_seconds=20)) # Buy 2
    # Sell closes Buy 1 fully, and part of Buy 2
    await service.record_fill(create_fill(agent_id, "AVAX/USD", "sell", 10, 35.0, fee=0.35, timestamp_offset_seconds=0))

    trades = await service.get_processed_trades(agent_id)
    assert len(trades) == 2 # One for closing Buy 1, one for closing part of Buy 2
    trades.sort(key=lambda t: t.quantity, reverse=True) # Sort by quantity to identify parts (not by time, as they have same exit time)
                                                       # The service sorts by exit time (newest first), so this sort is for test stability

    # Part 1: Closing the first buy (5 units @ $30)
    # Sell of 10 units: 5 units match first buy, 5 units match second buy.
    # The sell fill is split to match these.

    # Trade for closing first buy (5 units)
    # Find the trade log item that corresponds to closing the first buy fill (quantity 5)
    trade_closing_first_buy = next(t for t in trades if abs(t.quantity - 5.0) < 1e-9) # quantity might be float
    assert trade_closing_first_buy.price == 35.0 # Sell price
    buy1_fee = 0.15
    sell_fee_p1 = (5/10) * 0.35
    expected_pnl1 = (35.0 - 30.0) * 5 - (buy1_fee + sell_fee_p1)
    assert pytest.approx(trade_closing_first_buy.realized_pnl) == expected_pnl1
    assert pytest.approx(trade_closing_first_buy.fees) == buy1_fee + sell_fee_p1

    # Trade for closing part of second buy (remaining 5 units of the sell)
    trade_closing_part_of_second_buy = next(t for t in trades if abs(t.quantity - 5.0) < 1e-9 and t != trade_closing_first_buy)
    assert trade_closing_part_of_second_buy.price == 35.0 # Sell price
    buy2_fee_for_match = (5/8) * 0.256 # Proportional fee for the matched part of second buy
    sell_fee_p2 = (5/10) * 0.35
    expected_pnl2 = (35.0 - 32.0) * 5 - (buy2_fee_for_match + sell_fee_p2)
    assert pytest.approx(trade_closing_part_of_second_buy.realized_pnl) == expected_pnl2
    assert pytest.approx(trade_closing_part_of_second_buy.fees) == buy2_fee_for_match + sell_fee_p2

    # Check if any buy quantity remains in open_buys (should be 3 from the second buy)
    # This is internal state, but we can infer by trying to close it with another sell
    remaining_buy_qty_inferred = 8.0 - 5.0
    await service.record_fill(create_fill(agent_id, "AVAX/USD", "sell", remaining_buy_qty_inferred, 36.0, fee=0.108, timestamp_offset_seconds=-10)) # Negative offset to make it newest

    all_trades_after_second_sell = await service.get_processed_trades(agent_id)
    assert len(all_trades_after_second_sell) == 3


@pytest.mark.asyncio
async def test_get_processed_trades_offset_limit(service: TradeHistoryService):
    agent_id = "agent_pagination"
    for i in range(10): # Create 5 closed trades (10 fills)
        await service.record_fill(create_fill(agent_id, "XLM/USD", "buy", 100, 0.10 + i*0.01, timestamp_offset_seconds=100-i*10-1))
        await service.record_fill(create_fill(agent_id, "XLM/USD", "sell", 100, 0.11 + i*0.01, timestamp_offset_seconds=100-i*10))

    all_trades = await service.get_processed_trades(agent_id, limit=1000) # Get all first
    assert len(all_trades) == 10

    # Trades are sorted newest first by default by the service
    limited_trades = await service.get_processed_trades(agent_id, limit=3, offset=0)
    assert len(limited_trades) == 3
    assert limited_trades[0].timestamp == all_trades[0].timestamp # newest

    offset_trades = await service.get_processed_trades(agent_id, limit=3, offset=2)
    assert len(offset_trades) == 3
    assert offset_trades[0].timestamp == all_trades[2].timestamp # 3rd newest
```
