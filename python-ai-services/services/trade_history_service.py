from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional, Dict, Deque, Callable, Any # Added Callable, Any
from datetime import datetime, timezone
from collections import deque

from ..models.trade_history_models import TradeFillData
from ..models.dashboard_models import TradeLogItem
from ..models.db_models import TradeFillDB # New DB model import
from loguru import logger

class TradeHistoryServiceError(Exception): # Custom error for the service
    pass

class TradeHistoryService:
    def __init__(self, session_factory: Callable[[], Session]):
        self.session_factory = session_factory
        logger.info("TradeHistoryService initialized with database session factory.")

    def _pydantic_fill_to_db_dict(self, fill_data: TradeFillData) -> Dict[str, Any]:
        """Converts TradeFillData Pydantic model to a dictionary suitable for TradeFillDB ORM model."""
        return fill_data.model_dump() # Pydantic's model_dump creates a dict

    def _db_fill_to_pydantic(self, db_fill: TradeFillDB) -> TradeFillData:
        """Converts TradeFillDB ORM model object to TradeFillData Pydantic model."""
        return TradeFillData(
            fill_id=db_fill.fill_id,
            agent_id=db_fill.agent_id,
            timestamp=db_fill.timestamp.replace(tzinfo=timezone.utc) if db_fill.timestamp.tzinfo is None else db_fill.timestamp, # Ensure UTC
            asset=db_fill.asset,
            side=db_fill.side, # type: ignore # Literal should match
            quantity=db_fill.quantity,
            price=db_fill.price,
            fee=db_fill.fee,
            fee_currency=db_fill.fee_currency,
            exchange_order_id=db_fill.exchange_order_id,
            exchange_trade_id=db_fill.exchange_trade_id
        )

    async def record_fill(self, fill_data: TradeFillData):
        """
        Records a single trade fill to the database for a specific agent.
        """
        db: Session = self.session_factory()
        logger.debug(f"Recording fill for agent {fill_data.agent_id}. Fill ID: {fill_data.fill_id}")
        try:
            db_fill_data_dict = self._pydantic_fill_to_db_dict(fill_data)
            # Ensure timestamp is timezone-aware (UTC) before DB insertion if model doesn't enforce it
            if isinstance(db_fill_data_dict.get("timestamp"), datetime) and \
               db_fill_data_dict["timestamp"].tzinfo is None:
                db_fill_data_dict["timestamp"] = db_fill_data_dict["timestamp"].replace(tzinfo=timezone.utc)

            db_fill = TradeFillDB(**db_fill_data_dict)
            db.add(db_fill)
            db.commit()
            # db.refresh(db_fill) # Optional, if you need the committed state immediately including defaults set by DB
            logger.info(f"Fill {fill_data.fill_id} recorded to DB for agent {fill_data.agent_id}.")
        except Exception as e: # Catch generic SQLAlchemy errors or other issues
            db.rollback()
            logger.error(f"Failed to record fill {fill_data.fill_id} for agent {fill_data.agent_id} to DB: {e}", exc_info=True)
            raise TradeHistoryServiceError(f"DB error recording fill: {e}")
        finally:
            db.close()

    async def get_fills_for_agent(self, agent_id: str) -> List[TradeFillData]:
        """
        Retrieves all trade fills for a specific agent from the database, sorted by timestamp.
        """
        db: Session = self.session_factory()
        fills_pydantic: List[TradeFillData] = []
        logger.debug(f"Fetching fills from DB for agent {agent_id}.")
        try:
            stmt = select(TradeFillDB).where(TradeFillDB.agent_id == agent_id).order_by(TradeFillDB.timestamp)
            db_results = db.execute(stmt).scalars().all()

            for db_fill in db_results:
                fills_pydantic.append(self._db_fill_to_pydantic(db_fill))

            logger.info(f"Retrieved {len(fills_pydantic)} fills from DB for agent {agent_id}.")
            return fills_pydantic
        except Exception as e:
            logger.error(f"Failed to retrieve fills for agent {agent_id} from DB: {e}", exc_info=True)
            raise TradeHistoryServiceError(f"DB error retrieving fills: {e}")
        finally:
            db.close()

    async def get_processed_trades(self, agent_id: str, limit: int = 100, offset: int = 0) -> List[TradeLogItem]:
        """
        Processes fills for an agent to calculate P&L for closed trades (FIFO).
        Now fetches fills from the database.
        """
        logger.info(f"Processing trades for P&L for agent {agent_id} (limit={limit}, offset={offset}) using DB.")
        all_fills = await self.get_fills_for_agent(agent_id) # This now calls the DB version
        if not all_fills:
            return []

        # Fills from DB are already sorted by timestamp due to the query's order_by.
        # No need to sort again if get_fills_for_agent guarantees it.

        processed_trades: List[TradeLogItem] = []
        fills_by_asset: Dict[str, Deque[TradeFillData]] = {}

        for fill in all_fills:
            if fill.asset not in fills_by_asset:
                fills_by_asset[fill.asset] = deque()
            fills_by_asset[fill.asset].append(fill)

        for asset, asset_fills_deque in fills_by_asset.items():
            logger.debug(f"Processing {len(asset_fills_deque)} DB fills for asset {asset}")
            open_buys: Deque[TradeFillData] = deque()

            while asset_fills_deque:
                current_fill = asset_fills_deque.popleft()

                if current_fill.side == "buy":
                    open_buys.append(current_fill)
                    logger.debug(f"Added to open_buys for {asset}: Qty {current_fill.quantity} @ Prc {current_fill.price} (ID: {current_fill.fill_id})")

                elif current_fill.side == "sell":
                    logger.debug(f"Processing SELL fill for {asset}: Qty {current_fill.quantity} @ Prc {current_fill.price} (ID: {current_fill.fill_id})")
                    sell_qty_remaining = current_fill.quantity
                    # total_sell_fees = current_fill.fee # Not used like this anymore

                    while sell_qty_remaining > 1e-9 and open_buys:
                        oldest_buy = open_buys[0]
                        matched_qty = min(sell_qty_remaining, oldest_buy.quantity)

                        buy_fee_for_match = (matched_qty / oldest_buy.quantity) * oldest_buy.fee if oldest_buy.quantity > 0 else 0
                        sell_fee_for_match = (matched_qty / current_fill.quantity) * current_fill.fee if current_fill.quantity > 0 else 0
                        total_fees_for_match = buy_fee_for_match + sell_fee_for_match

                        pnl = (current_fill.price - oldest_buy.price) * matched_qty - total_fees_for_match

                        trade_log = TradeLogItem(
                            agent_id=agent_id,
                            asset=asset,
                            trade_id=f"closed_{oldest_buy.fill_id}_{current_fill.fill_id}",
                            timestamp=current_fill.timestamp,
                            side="sell", # This log item represents the closing part of a round trip
                            order_type="limit", # Simplification
                            quantity=matched_qty,
                            price=current_fill.price, # Exit price
                            total_value=matched_qty * current_fill.price,
                            realized_pnl=pnl,
                            fees=total_fees_for_match
                        )
                        processed_trades.append(trade_log)
                        logger.debug(f"Closed trade for {asset}: Matched Qty {matched_qty}, P&L {pnl:.2f}")

                        sell_qty_remaining -= matched_qty
                        oldest_buy.quantity -= matched_qty

                        if oldest_buy.quantity < 1e-9:
                            open_buys.popleft()
                            logger.debug(f"Buy fill {oldest_buy.fill_id} fully matched and removed from open_buys.")

                        if sell_qty_remaining < 1e-9:
                            break

                    if sell_qty_remaining > 1e-9:
                        logger.debug(f"Sell fill {current_fill.fill_id} for {asset} has remaining open quantity: {sell_qty_remaining} (potential start of short position)")

        processed_trades.sort(key=lambda t: t.timestamp, reverse=True)
        logger.info(f"Generated {len(processed_trades)} processed (closed) trades for agent {agent_id} from DB data.")
        return processed_trades[offset : offset + limit]

```
