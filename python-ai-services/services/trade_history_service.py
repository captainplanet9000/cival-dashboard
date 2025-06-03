from pathlib import Path
import json
import os
from typing import List, Optional, Dict, Deque
from datetime import datetime, timezone
from collections import deque # For efficient FIFO queue for open_buys

from ..models.trade_history_models import TradeFillData
from ..models.dashboard_models import TradeLogItem # For get_processed_trades output
from loguru import logger
# import asyncio # Not strictly needed if file ops are sync within async methods for now

class TradeHistoryService:
    def __init__(self, fills_dir: Path = Path("agent_fills")):
        self.fills_dir = fills_dir
        os.makedirs(self.fills_dir, exist_ok=True)
        logger.info(f"TradeHistoryService initialized. Fills stored in: {self.fills_dir.resolve()}")

    async def _get_agent_fills_filepath(self, agent_id: str) -> Path:
        return self.fills_dir / f"{agent_id}_fills.jsonl" # Using .jsonl for line-separated JSON

    async def record_fill(self, fill_data: TradeFillData): # agent_id is part of fill_data
        agent_id = fill_data.agent_id
        filepath = await self._get_agent_fills_filepath(agent_id)
        logger.debug(f"Recording fill for agent {agent_id} to file {filepath}. Fill ID: {fill_data.fill_id}")
        try:
            # Append to file, one JSON object per line (.jsonl)
            with open(filepath, 'a') as f:
                f.write(fill_data.model_dump_json() + '\n')
            logger.info(f"Fill {fill_data.fill_id} recorded for agent {agent_id}.")
        except IOError as e:
            logger.error(f"Failed to record fill {fill_data.fill_id} for agent {agent_id} to {filepath}: {e}")
            raise # Re-raise to indicate failure

    async def get_fills_for_agent(self, agent_id: str) -> List[TradeFillData]:
        filepath = await self._get_agent_fills_filepath(agent_id)
        fills: List[TradeFillData] = []
        if not filepath.exists():
            logger.debug(f"No fills file found for agent {agent_id} at {filepath}.")
            return fills

        try:
            with open(filepath, 'r') as f:
                for line in f:
                    if line.strip(): # Ensure line is not empty
                        try:
                            data = json.loads(line)
                            fills.append(TradeFillData(**data))
                        except json.JSONDecodeError as e:
                            logger.error(f"JSON decode error for a fill in {filepath}: {e}. Line: '{line.strip()}'")
                        except Exception as e: # Pydantic validation errors etc.
                            logger.error(f"Error parsing a fill from {filepath}: {e}. Line: '{line.strip()}'")
            # Sort by timestamp after loading all, as they are appended.
            fills.sort(key=lambda fill: fill.timestamp)
            logger.info(f"Retrieved {len(fills)} fills for agent {agent_id} from {filepath}.")
            return fills
        except IOError as e:
            logger.error(f"IOError reading fills for agent {agent_id} from {filepath}: {e}")
            return [] # Return empty list on read error
        except Exception as e:
            logger.error(f"Unexpected error reading fills for agent {agent_id}: {e}", exc_info=True)
            return []


    async def get_processed_trades(self, agent_id: str, limit: int = 100, offset: int = 0) -> List[TradeLogItem]:
        logger.info(f"Processing trades for P&L for agent {agent_id} (limit={limit}, offset={offset}).")
        all_fills = await self.get_fills_for_agent(agent_id)
        if not all_fills:
            return []

        # Ensure fills are sorted by timestamp for correct FIFO processing
        # get_fills_for_agent already sorts them, but an extra sort here doesn't hurt if that changes.
        all_fills.sort(key=lambda f: f.timestamp)

        processed_trades: List[TradeLogItem] = []
        # Group fills by asset for independent FIFO processing
        fills_by_asset: Dict[str, Deque[TradeFillData]] = {}

        for fill in all_fills:
            if fill.asset not in fills_by_asset:
                fills_by_asset[fill.asset] = deque()
            fills_by_asset[fill.asset].append(fill)

        for asset, asset_fills_deque in fills_by_asset.items():
            logger.debug(f"Processing {len(asset_fills_deque)} fills for asset {asset}")
            open_buys: Deque[TradeFillData] = deque() # FIFO queue for buys of this asset

            # Convert deque to list for this iteration to allow modification while iterating if needed (though current logic avoids it)
            # Actually, processing deque directly is better for FIFO.
            while asset_fills_deque:
                current_fill = asset_fills_deque.popleft()

                if current_fill.side == "buy":
                    open_buys.append(current_fill)
                    logger.debug(f"Added to open_buys for {asset}: Qty {current_fill.quantity} @ Prc {current_fill.price} (ID: {current_fill.fill_id})")

                elif current_fill.side == "sell":
                    logger.debug(f"Processing SELL fill for {asset}: Qty {current_fill.quantity} @ Prc {current_fill.price} (ID: {current_fill.fill_id})")
                    sell_qty_remaining = current_fill.quantity
                    total_sell_fees = current_fill.fee # Assume sell fee is for the entire sell_qty_remaining initially

                    while sell_qty_remaining > 1e-9 and open_buys: # 1e-9 to handle float precision
                        oldest_buy = open_buys[0] # Peek at the oldest buy

                        matched_qty = min(sell_qty_remaining, oldest_buy.quantity)

                        # Fee allocation (simplified: proportional to matched quantity)
                        # This assumes fee_currency is consistent or fees are already in quote.
                        buy_fee_for_match = (matched_qty / oldest_buy.quantity) * oldest_buy.fee if oldest_buy.quantity > 0 else 0
                        sell_fee_for_match = (matched_qty / current_fill.quantity) * current_fill.fee if current_fill.quantity > 0 else 0
                        total_fees_for_match = buy_fee_for_match + sell_fee_for_match

                        pnl = (current_fill.price - oldest_buy.price) * matched_qty - total_fees_for_match

                        trade_log = TradeLogItem(
                            agent_id=agent_id,
                            asset=asset,
                            side="buy", # The "trade" is initiated by a buy that is now being closed
                            order_type="limit", # This is a simplification; original order type might be different
                            quantity=matched_qty,
                            price=oldest_buy.price, # Entry price
                            # For TradeLogItem, 'price' could be entry or exit.
                            # Let's define 'price' in TradeLogItem as the main execution price of the closing part.
                            # So, for a buy that's closed by a sell, entry_price is buy.price, exit_price is sell.price.
                            # The TradeLogItem model needs clarification if 'price' means entry or exit.
                            # Assuming TradeLogItem's 'price' field means the price of THIS fill that closed the trade.
                            # This is confusing. Let's assume TradeLogItem is about the *closed portion*.
                            # entry_price from oldest_buy, exit_price from current_fill (sell)
                            # timestamp = current_fill.timestamp (exit time)
                            # For this subtask, TradeLogItem needs to be adapted or interpreted.
                            # Let's make TradeLogItem represent the "closing" part of a trade.
                            # So, side = "sell" (as it's the sell closing a buy), price = sell_price.
                            # This implies TradeLogItem might need entry_price, exit_price fields.
                            # The current TradeLogItem has 'price' and 'side'.
                            # If side=sell, quantity=matched_qty, price=current_fill.price
                            # This represents the "sell" portion of a round trip.
                            # The P&L is for this round trip portion.

                            # Re-interpreting TradeLogItem: it's a log of *executions that resulted in a closed P&L*.
                            # So, if a sell closes a buy, the TradeLogItem is for that sell.
                            trade_id=f"closed_{oldest_buy.fill_id}_{current_fill.fill_id}", # Composite ID
                            timestamp=current_fill.timestamp, # Time of closing
                            side="sell", # This is the closing side
                            order_type="limit", # Simplification, actual order type of sell
                            quantity=matched_qty,
                            price=current_fill.price, # Price of the closing transaction
                            total_value=matched_qty * current_fill.price,
                            realized_pnl=pnl,
                            fees=total_fees_for_match
                        )
                        processed_trades.append(trade_log)
                        logger.debug(f"Closed trade for {asset}: Matched Qty {matched_qty}, P&L {pnl:.2f}")

                        sell_qty_remaining -= matched_qty
                        oldest_buy.quantity -= matched_qty

                        if oldest_buy.quantity < 1e-9: # If oldest buy is fully matched
                            open_buys.popleft()
                            logger.debug(f"Buy fill {oldest_buy.fill_id} fully matched and removed from open_buys.")

                        if sell_qty_remaining < 1e-9:
                            break # Current sell fill fully matched

                    if sell_qty_remaining > 1e-9:
                        # This means the sell was not fully matched by existing buys, so it opens a short or part of it remains.
                        # For this simplified version, we only calculate P&L for closed trades (buy then sell).
                        # Opening new short positions from unmatched sells is not handled for P&L here.
                        # We can log it as an "opening short" fill if we want to represent it.
                        # For now, any remaining sell_qty_remaining is just an "open sell" conceptually.
                        logger.debug(f"Sell fill {current_fill.fill_id} for {asset} has remaining open quantity: {sell_qty_remaining}")
                        # To represent this as an "opening" trade log item (if desired, but not for P&L):
                        # processed_trades.append(TradeLogItem(
                        #     agent_id=agent_id, asset=asset, side="sell", quantity=sell_qty_remaining,
                        #     price=current_fill.price, timestamp=current_fill.timestamp, order_type="limit",
                        #     total_value = sell_qty_remaining * current_fill.price, fee = current_fill.fee * (sell_qty_remaining / current_fill.quantity) if current_fill.quantity else 0
                        # ))


        # Sort final P&L trades by their closing timestamp before applying limit/offset
        processed_trades.sort(key=lambda t: t.timestamp, reverse=True) # Show newest first typically

        logger.info(f"Generated {len(processed_trades)} processed (closed) trades for agent {agent_id}.")

        # Apply offset and limit
        return processed_trades[offset : offset + limit]

# Need Deque for type hint
from typing import Deque
```
