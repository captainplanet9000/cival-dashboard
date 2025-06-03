import os
from supabase import create_client, Client
from dotenv import load_dotenv
from decimal import Decimal # Keep for existing methods if they use it, not used in new methods

from datetime import datetime, timedelta, timezone # Add timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple # Added Tuple
from logging import getLogger
import pandas as pd

# Import the new Pydantic models and enums
from ..models.paper_trading_models import PaperTradeOrder, PaperTradeFill, PaperPosition
from ..models.trading_history_models import TradeSide, OrderType as PaperOrderType, OrderStatus as PaperOrderStatus, TradeRecord, OrderType as TradingHistoryOrderType, OrderStatus as TradingHistoryOrderStatus
# Import market data tool
from ..tools.market_data_tools import get_historical_price_data_tool
import uuid
from typing import Callable # For strategy_function type hint
from .event_service import EventService
from ..models.event_models import AlertEvent, AlertLevel # Added
import asyncio # Added for event publishing from async methods

logger = getLogger(__name__)

load_dotenv() # Keep if module-level load is intended for some reason, though often done at app entry

class SimulatedTradeExecutor:
    def __init__(self, supabase_url: str, supabase_key: str, event_service: Optional[EventService] = None):
        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and Key must be provided for SimulatedTradeExecutor.")
        try:
            self.supabase: Client = create_client(supabase_url, supabase_key) # Ensure Client is imported from supabase
            logger.info("SimulatedTradeExecutor initialized with Supabase client.") # Ensure logger is defined
        except Exception as e:
            logger.error(f"Error initializing Supabase client in SimulatedTradeExecutor: {e}", exc_info=True)
            raise ValueError(f"Error initializing Supabase client in SimulatedTradeExecutor: {e}")

        self.event_service = event_service
        if self.event_service:
            logger.info("SimulatedTradeExecutor initialized with EventService.")
        else:
            logger.warning("SimulatedTradeExecutor initialized without EventService. Alert event publishing will be disabled.")

    async def get_open_paper_orders(self, user_id: uuid.UUID) -> List[TradeRecord]:
        """
        Fetches all paper trade orders for a user that are currently in an open state
        (e.g., NEW, PARTIALLY_FILLED, PENDING_CANCEL).
        Orders are retrieved from the 'trading_history' table.
        """
        logger.info(f"Fetching open paper orders for user {user_id}")
        open_statuses = [
            TradingHistoryOrderStatus.NEW.value,
            TradingHistoryOrderStatus.PARTIALLY_FILLED.value,
            TradingHistoryOrderStatus.PENDING_CANCEL.value
            # Add other statuses considered "open" if any, e.g., PENDING_NEW if that exists
        ]
        try:
            response = await self.supabase.table("trading_history") \
                .select("*") \
                .eq("user_id", str(user_id)) \
                .in_("status", open_statuses) \
                .eq("exchange", "PAPER_BACKTEST") \
                .order("created_at", desc=True) \
                .execute()

            if response.data:
                return [TradeRecord(**order_data) for order_data in response.data]
            return []
        except Exception as e:
            logger.error(f"Error fetching open paper orders for user {user_id}: {e}", exc_info=True)
            # Re-raise a generic exception or a custom one
            raise Exception(f"Database error fetching open paper orders: {str(e)}")

    async def _get_market_data_for_fill(self, symbol: str, around_time: datetime, window_minutes: int = 5) -> Optional[pd.DataFrame]:
        """
        Fetches a small window of market data around a specific time for fill simulation.
        For simplicity, fetches 1-minute interval data.
        """
        start_dt = around_time - timedelta(minutes=window_minutes)
        end_dt = around_time + timedelta(minutes=window_minutes)

        start_date_str = start_dt.strftime("%Y-%m-%d")
        # Add a day to end_date_str to ensure the window around `around_time` is fully covered,
        # especially if `around_time` is near end of day.
        end_date_str = (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")

        logger.debug(f"Fetching 1m data for {symbol} from {start_date_str} to {end_date_str} (effective window around {around_time})")
        historical_data_df = get_historical_price_data_tool( # Renamed variable for clarity
            symbol=symbol,
            start_date=start_date_str,
            end_date=end_date_str,
            interval="1m",
            provider="yfinance"
        )
        if historical_data_df is None or historical_data_df.empty:
            logger.warning(f"Could not fetch 1m market data for {symbol} around {around_time}")
            return None

        if not isinstance(historical_data_df.index, pd.DatetimeIndex):
            try:
                historical_data_df.index = pd.to_datetime(historical_data_df.index, utc=True) # Assume UTC if not already
            except Exception as e:
                logger.error(f"Market data index for {symbol} is not DatetimeIndex and could not be converted: {e}")
                return None
        # Ensure index is UTC if not already (OpenBB might return naive or local)
        if historical_data_df.index.tz is None:
            historical_data_df.index = historical_data_df.index.tz_localize('UTC')
        elif historical_data_df.index.tz != timezone.utc:
            historical_data_df.index = historical_data_df.index.tz_convert('UTC')


        historical_data_df.sort_index(inplace=True)
        return historical_data_df

    async def submit_paper_order(self, order: PaperTradeOrder,
                                 simulated_commission_pct: float = 0.001
                                ) -> Tuple[PaperTradeOrder, List[PaperTradeFill]]:
        """
        Simulates the execution of a paper trade order.
        """
        logger.info(f"Simulating paper order {order.order_id} for {order.quantity} {order.symbol} {order.side.value} @ {order.order_type.value}")

        fills: List[PaperTradeFill] = []

        order_time_utc = order.order_request_timestamp.astimezone(timezone.utc) if order.order_request_timestamp.tzinfo else order.order_request_timestamp.replace(tzinfo=timezone.utc)

        market_data = await self._get_market_data_for_fill(order.symbol, order_time_utc)

        if market_data is None or market_data.empty:
            order.status = PaperOrderStatus.REJECTED
            order.notes = (order.notes or "") + " Failed: No market data available for simulation period."
            logger.warning(f"Order {order.order_id} rejected due to no market data for {order.symbol}")
            return order, fills

        relevant_data = market_data[market_data.index > order_time_utc] # Data strictly after order request

        if relevant_data.empty:
            order.status = PaperOrderStatus.REJECTED
            order.notes = (order.notes or "") + f" Failed: No market data found after order time {order_time_utc} for fill simulation."
            logger.warning(f"Order {order.order_id} rejected, no market data after order time for {order.symbol}")
            return order, fills

        fill_price = None
        fill_timestamp = None # This will be a pd.Timestamp from DataFrame index

        if order.order_type == PaperOrderType.MARKET:
            fill_bar = relevant_data.iloc[0]
            # Simulate fill at the open price of the first available bar after order time.
            # Ensure 'Open' column exists after market_data_tools processing (it should)
            if 'Open' in fill_bar and not pd.isna(fill_bar['Open']):
                fill_price = fill_bar['Open']
                fill_timestamp = fill_bar.name
                logger.info(f"Market order {order.order_id}: attempting fill at next bar open: {fill_price} on {fill_timestamp}")
            else:
                logger.warning(f"Market order {order.order_id}: 'Open' price missing or NaN in fill bar {fill_bar.name}. Cannot fill.")


        elif order.order_type == PaperOrderType.LIMIT:
            if order.limit_price is None:
                order.status = PaperOrderStatus.REJECTED
                order.notes = (order.notes or "") + " Failed: Limit price not set for LIMIT order."
                logger.error(f"Order {order.order_id} for {order.symbol}: LIMIT order rejected, no limit price.")
                return order, fills

            for idx_timestamp, bar in relevant_data.iterrows(): # idx_timestamp is pd.Timestamp
                if order.side == TradeSide.BUY:
                    if 'Low' in bar and not pd.isna(bar['Low']) and bar['Low'] <= order.limit_price:
                        # Fill at limit price if market touches or goes through it.
                        # If bar opens below limit, fill at open (better price for buyer, but less likely for pure limit).
                        # Standard limit fill: at limit_price or better.
                        # Simplification: fill at limit_price if Low <= limit_price.
                        fill_price = order.limit_price
                        fill_timestamp = idx_timestamp
                        logger.info(f"BUY Limit order {order.order_id}: hit at {fill_price} on {fill_timestamp} (bar low: {bar['Low']})")
                        break
                elif order.side == TradeSide.SELL:
                    if 'High' in bar and not pd.isna(bar['High']) and bar['High'] >= order.limit_price:
                        fill_price = order.limit_price
                        fill_timestamp = idx_timestamp
                        logger.info(f"SELL Limit order {order.order_id}: hit at {fill_price} on {fill_timestamp} (bar high: {bar['High']})")
                        break

            if fill_price is None:
                order.notes = (order.notes or "") + " Info: Limit price not reached in simulation window."
                logger.info(f"Limit order {order.order_id} for {order.symbol}: limit price {order.limit_price} not reached.")
                # Status remains NEW or could be considered EXPIRED depending on TIF logic (not implemented here)
                return order, fills
        else:
            order.status = PaperOrderStatus.REJECTED
            order.notes = (order.notes or "") + f" Failed: Order type '{order.order_type.value}' not supported by simulator."
            logger.warning(f"Order {order.order_id} for {order.symbol}: type {order.order_type.value} not supported.")
            return order, fills

        if fill_price is not None and fill_timestamp is not None:
            sim_commission = round(order.quantity * fill_price * simulated_commission_pct, 4)

            # Convert pd.Timestamp to python datetime, ensure UTC
            py_fill_timestamp = fill_timestamp.to_pydatetime()
            if py_fill_timestamp.tzinfo is None:
                py_fill_timestamp = py_fill_timestamp.replace(tzinfo=timezone.utc)
            else:
                py_fill_timestamp = py_fill_timestamp.astimezone(timezone.utc)

            fill = PaperTradeFill(
                order_id=order.order_id,
                user_id=order.user_id,
                symbol=order.symbol,
                side=order.side,
                fill_timestamp=py_fill_timestamp,
                price=fill_price,
                quantity=order.quantity,
                commission=sim_commission,
                commission_asset="USD",
                fill_notes=f"Simulated fill for order {order.order_id}"
            )
            fills.append(fill)
            order.status = PaperOrderStatus.FILLED
            order.notes = (order.notes or "") + f" Simulated fill at ${fill_price:.2f}." # Assuming 2 decimals for notes
            logger.info(f"Order {order.order_id} for {order.symbol} filled. Price: {fill_price}, Qty: {order.quantity}")
        else:
            if order.status not in [PaperOrderStatus.REJECTED, PaperOrderStatus.CANCELED]:
                 order.notes = (order.notes or "") + f" Info: Order not filled (no valid fill price or timestamp found)."
                 logger.warning(f"Order {order.order_id} for {order.symbol} was not filled (e.g. no valid price in fill bar for MARKET order).")

        # Publish alert after processing
        alert_to_publish: Optional[AlertEvent] = None
        if order.status == PaperOrderStatus.FILLED and fills:
            fill = fills[0]
            alert_to_publish = AlertEvent(
                source_id=f"SimulatedTradeExecutor_Order_{order.order_id}",
                alert_level=AlertLevel.INFO,
                message=f"Paper trade order FILLED for {order.symbol}.",
                details={
                    "order_id": str(order.order_id), "symbol": order.symbol, "side": order.side.value,
                    "type": order.order_type.value, "filled_quantity": fill.quantity, "fill_price": fill.price
                },
                # crew_run_id might be passed via order.metadata if available from context
            )
        elif order.status == PaperOrderStatus.REJECTED:
            alert_to_publish = AlertEvent(
                source_id=f"SimulatedTradeExecutor_Order_{order.order_id}",
                alert_level=AlertLevel.WARNING,
                message=f"Paper trade order REJECTED for {order.symbol}.",
                details={"order_id": str(order.order_id), "symbol": order.symbol, "reason": order.notes}
            )

        if alert_to_publish and self.event_service:
            try:
                await self.event_service.publish_event(alert_to_publish, channel="alert_events")
                logger.info(f"Published {alert_to_publish.alert_level.value} alert for order {order.order_id}")
            except Exception as e_pub:
                logger.error(f"Failed to publish alert for order {order.order_id}: {e_pub}", exc_info=True)

        return order, fills

    async def cancel_paper_order(self, user_id: uuid.UUID, order_id: uuid.UUID) -> PaperTradeOrder:
        """
        Attempts to cancel a pending paper trade order.
        Orders are fetched from 'trading_history' based on their original paper_order_id.
        """
        logger.info(f"Attempting to cancel paper order {order_id} for user {user_id}")

        # Fetch the trade record from trading_history using the paper order's ID
        trade_record_response = await self.supabase.table("trading_history") \
            .select("*") \
            .eq("order_id", str(order_id)) \
            .eq("user_id", str(user_id)) \
            .eq("exchange", "PAPER_BACKTEST") \
            .maybe_single() \
            .execute()

        if not trade_record_response.data:
            logger.warning(f"Paper order {order_id} not found in trading_history for user {user_id}.")
            raise ValueError(f"Paper order {order_id} not found or does not belong to user.")

        trade_record_data = trade_record_response.data
        current_status_val = trade_record_data.get("status")
        try:
            current_status = TradingHistoryOrderStatus(current_status_val)
        except ValueError:
            logger.error(f"Invalid status '{current_status_val}' for order {order_id} in trading_history.")
            raise ValueError(f"Order {order_id} has an invalid status: {current_status_val}")

        if current_status not in [TradingHistoryOrderStatus.NEW, TradingHistoryOrderStatus.PARTIALLY_FILLED, TradingHistoryOrderStatus.PENDING_CANCEL]:
            logger.warning(f"Paper order {order_id} for user {user_id} is not in a cancellable state. Status: {current_status.value}")
            raise ValueError(f"Order {order_id} cannot be canceled. Current status: {current_status.value}")

        update_payload = {
            "status": TradingHistoryOrderStatus.CANCELED.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "notes": (trade_record_data.get("notes") or "") + " [User Canceled]"
        }

        # Use the primary key of trading_history table, which is 'trade_id' (or 'id' if that's the case)
        # Assuming 'trade_id' is the primary key based on previous log_simulated_trade and _log_paper_trade_to_history.
        # If 'id' is the PK, this should be 'id'. Let's assume 'trade_id' for now as per typical DB naming.
        # The previous log_simulated_trade used `response.data[0]['trade_id']`.
        # The _log_paper_trade_to_history used `response.data[0].get('trade_id', 'N/A')` or `id`.
        # Need to be consistent. Let's assume 'id' is the actual PK in 'trading_history'.
        pk_column_name = 'id' # Defaulting to 'id' as it's common for Supabase default PKs.
                                # This should match the actual primary key of 'trading_history' table.
        if pk_column_name not in trade_record_data:
             logger.error(f"Primary key '{pk_column_name}' not found in fetched trade_record_data for order {order_id}. Available keys: {trade_record_data.keys()}")
             raise Exception(f"Internal error: Primary key for trading_history record not found for order {order_id}.")


        update_response = await self.supabase.table("trading_history") \
            .update(update_payload) \
            .eq(pk_column_name, trade_record_data[pk_column_name]) \
            .select("*") \
            .execute()

        if not update_response.data or len(update_response.data) == 0:
            err_msg = update_response.error.message if hasattr(update_response, 'error') and update_response.error else "Update failed"
            logger.error(f"Failed to update paper order {order_id} status to CANCELED: {err_msg}")
            raise Exception(f"Failed to cancel order {order_id}: {err_msg}")

        logger.info(f"Paper order {order_id} for user {user_id} successfully canceled.")

        updated_trade_record = TradeRecord(**update_response.data[0])

        if self.event_service:
            alert = AlertEvent(
                source_id=f"SimulatedTradeExecutor_Order_{order_id}",
                alert_level=AlertLevel.INFO,
                message=f"Paper trade order CANCELED for {updated_trade_record.symbol}.",
                details={"order_id": str(order_id), "user_id": str(user_id), "symbol": updated_trade_record.symbol}
            )
            try:
                await self.event_service.publish_event(alert, channel="alert_events")
                logger.info(f"Published CANCELED alert for order {order_id}")
            except Exception as e_pub:
                logger.error(f"Failed to publish CANCELED alert for order {order_id}: {e_pub}", exc_info=True)

        return PaperTradeOrder(
            order_id=uuid.UUID(updated_trade_record.order_id),
            user_id=updated_trade_record.user_id,
            symbol=updated_trade_record.symbol,
            side=TradeSide(updated_trade_record.side),
            order_type=PaperOrderType(updated_trade_record.order_type), # Assumes PaperOrderType enum matches values
            quantity=updated_trade_record.quantity_ordered,
            limit_price=updated_trade_record.limit_price,
            stop_price=updated_trade_record.stop_price,
            time_in_force=updated_trade_record.metadata.get("time_in_force", "GTC") if updated_trade_record.metadata else "GTC",
            order_request_timestamp=updated_trade_record.created_at,
            status=PaperOrderStatus.CANCELED, # Explicitly set to CANCELED
            notes=updated_trade_record.notes
        )

    # --- Legacy Methods ---
    def execute_trade(self, agent_id: str, user_id: str, symbol: str, direction: str, 
                      quantity: float, price: float, strategy_id: str, notes: str = ""):
        logger.warning("execute_trade method is legacy, consider using submit_paper_order.")
        print(f"SIMULATED TRADE EXECUTION for Agent {agent_id}: {direction} {quantity} {symbol} @ {price}")

        if price is None or price <= 0:
            print(f"Trade for {symbol} aborted due to invalid price: {price}")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Invalid market price for execution", strategy_id, None)
            return {"status": "failed", "reason": "Invalid market price"}

        required_capital = Decimal(str(price)) * Decimal(str(quantity))
        
        agent_wallet_info_resp = self.supabase.table('trading_agents').select('wallet_id').eq('agent_id', agent_id).single().execute()
        if not agent_wallet_info_resp.data or not agent_wallet_info_resp.data.get('wallet_id'):
            print(f"Error: Could not find wallet_id for agent {agent_id}")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Agent wallet_id not found", strategy_id, None)
            return {"status": "failed", "reason": "Agent wallet_id not found"}
        agent_wallet_id = agent_wallet_info_resp.data['wallet_id']

        wallet_resp = self.supabase.table('wallets').select('balance, currency, status').eq('wallet_id', agent_wallet_id).single().execute()
        if not wallet_resp.data:
            print(f"Error: Could not find wallet {agent_wallet_id} for agent {agent_id}")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Agent wallet not found", strategy_id, None)
            return {"status": "failed", "reason": "Agent wallet not found"}
        
        wallet = wallet_resp.data
        current_balance = Decimal(str(wallet['balance']))
        wallet_currency = wallet['currency']
        wallet_status = wallet['status']

        if wallet_status != 'active':
            print(f"Trade for {symbol} aborted. Wallet {agent_wallet_id} is not active (status: {wallet_status}).")
            self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', f"Wallet not active (status: {wallet_status})", strategy_id, None)
            return {"status": "failed", "reason": f"Wallet not active (status: {wallet_status})"}

        if direction.lower() == 'buy':
            if current_balance < required_capital:
                print(f"Trade for {symbol} aborted. Insufficient funds in wallet {agent_wallet_id}. Need {required_capital}, have {current_balance}")
                self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Insufficient funds", strategy_id, None)
                return {"status": "failed", "reason": "Insufficient funds"}
        
        new_balance_val = current_balance
        if direction.lower() == 'buy':
            new_balance_val = current_balance - required_capital
        
        update_resp = self.supabase.table('wallets').update({'balance': float(new_balance_val)}).eq('wallet_id', agent_wallet_id).execute()
        
        has_error = False
        error_message = 'Unknown error'
        if hasattr(update_resp, 'error') and update_resp.error is not None:
            has_error = True
            error_message = update_resp.error.message if hasattr(update_resp.error, 'message') else str(update_resp.error)

        if has_error:
             print(f"Error updating wallet balance for {agent_wallet_id}: {error_message}")
             self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'failed', "Wallet balance update failed", strategy_id, None)
             return {"status": "failed", "reason": "Wallet balance update failed"}

        if direction.lower() == 'buy':
            transaction_payload = {
                "source_wallet_id": agent_wallet_id, 
                "amount": float(required_capital),
                "currency": wallet_currency,
                "type": "trade_settlement",
                "status": "completed",
                "description": f"Simulated BUY {quantity} {symbol} @ {price} for agent {agent_id}"
            }
            tx_resp = self.supabase.table('wallet_transactions').insert(transaction_payload).execute()
            if hasattr(tx_resp, 'error') and tx_resp.error is not None:
                error_message_tx = tx_resp.error.message if hasattr(tx_resp.error, 'message') else str(tx_resp.error)
                print(f"Warning: Failed to log 'trade_settlement' wallet transaction: {error_message_tx}")

        trade_log_result = self.log_simulated_trade(agent_id, symbol, direction, quantity, price, 'simulated_open', notes, strategy_id, None)
        
        print(f"Simulated trade for {symbol} processed. Status: {'success' if trade_log_result.get('status') == 'success' else 'log_failed'}")
        return {"status": "success", "trade_id": trade_log_result.get("trade_id") if trade_log_result else None}


    def log_simulated_trade(self, agent_id, symbol, direction, quantity, entry_price, status, notes, strategy_id, pnl=None):
        logger.warning("log_simulated_trade method is legacy, consider using PaperTradeOrder and PaperTradeFill with a dedicated persistence service.")
        trade_payload = {
            "agent_id": agent_id,
            "symbol": symbol,
            "direction": direction.lower(),
            "quantity": quantity,
            "entry_price": entry_price,
            "status": status, 
            "notes": notes,
        }
        if strategy_id: 
            trade_payload["notes"] = f"{notes or ''} (Strategy: {strategy_id})".strip()
        
        if entry_price is None: # Should not happen if initial check is done
            trade_payload["entry_price"] = None 

        response = self.supabase.table('agent_trades').insert(trade_payload).select('trade_id').execute()
        
        if hasattr(response, 'data') and response.data and len(response.data) > 0:
            print(f"Logged trade {response.data[0]['trade_id']} to agent_trades.")
            return {"status": "success", "trade_id": response.data[0]['trade_id']}
        else:
            error_message_log = response.error.message if hasattr(response, 'error') and response.error else 'Unknown error during log'
            print(f"Error logging trade to agent_trades: {error_message_log}")
            return {"status": "log_failed", "error": error_message_log}

    # --- Paper Position Management Methods ---

    async def _get_paper_position(self, user_id: uuid.UUID, symbol: str) -> Optional[PaperPosition]:
        """Fetches an open paper position for a user and symbol."""
        try:
            response = await self.supabase.table("paper_positions") \
                .select("*") \
                .eq("user_id", str(user_id)) \
                .eq("symbol", symbol) \
                .maybe_single() \
                .execute()
            if response.data:
                return PaperPosition(**response.data)
            return None
        except Exception as e:
            logger.error(f"Error fetching paper position for user {user_id}, symbol {symbol}: {e}", exc_info=True)
            raise Exception(f"Database error fetching paper position: {str(e)}")


    async def _create_paper_position(self, position: PaperPosition) -> PaperPosition:
        """Creates a new paper position record in the database."""
        try:
            position.last_modified_at = datetime.now(timezone.utc)
            # Use model_dump for Pydantic v2, exclude_none=True is good practice
            response = await self.supabase.table("paper_positions") \
                .insert(position.model_dump(exclude_none=True)) \
                .select("*") \
                .execute()

            if response.data and len(response.data) > 0:
                logger.info(f"Paper position created: User {position.user_id}, Symbol {position.symbol}, Qty {position.quantity}")
                return PaperPosition(**response.data[0])
            else:
                err_msg = response.error.message if hasattr(response, 'error') and response.error else "No data returned after insert"
                logger.error(f"Failed to create paper position for User {position.user_id}, Symbol {position.symbol}: {err_msg}")
                raise Exception(f"Failed to create paper position: {err_msg}")
        except Exception as e:
            logger.error(f"Error creating paper position for user {position.user_id}, symbol {position.symbol}: {e}", exc_info=True)
            raise Exception(f"Database error creating paper position: {str(e)}")

    async def _update_paper_position_record(self, position: PaperPosition) -> PaperPosition:
        """Updates an existing paper position record in the database."""
        try:
            position.last_modified_at = datetime.now(timezone.utc)
            # Exclude primary key parts and fields that shouldn't change on every update from here
            update_data = position.model_dump(exclude={'position_id', 'user_id', 'symbol', 'created_at'}, exclude_none=True)

            response = await self.supabase.table("paper_positions") \
                .update(update_data) \
                .eq("position_id", str(position.position_id)) \
                .select("*") \
                .execute()
            if response.data and len(response.data) > 0:
                logger.info(f"Paper position updated: ID {position.position_id}, Qty {position.quantity}, AvgPrice {position.average_entry_price}")
                return PaperPosition(**response.data[0])
            else:
                err_msg = response.error.message if hasattr(response, 'error') and response.error else "No data returned or position not found for update"
                logger.error(f"Failed to update paper position {position.position_id}: {err_msg}")
                raise Exception(f"Failed to update paper position {position.position_id}: {err_msg}")
        except Exception as e:
            logger.error(f"Error updating paper position {position.position_id}: {e}", exc_info=True)
            raise Exception(f"Database error updating paper position: {str(e)}")

    async def _delete_paper_position(self, position_id: uuid.UUID) -> None:
        """Deletes a paper position record (e.g., when quantity becomes zero)."""
        try:
            # Supabase delete doesn't usually return data unless select() is chained,
            # but for delete, we primarily care about success/failure.
            await self.supabase.table("paper_positions") \
                .delete() \
                .eq("position_id", str(position_id)) \
                .execute()
            logger.info(f"Paper position deleted: ID {position_id}")
        except Exception as e:
            logger.error(f"Error deleting paper position {position_id}: {e}", exc_info=True)
            raise Exception(f"Database error deleting paper position: {str(e)}")

    async def apply_fill_to_position(self, fill: PaperTradeFill) -> Optional[PaperPosition]:
        """
        Applies a simulated trade fill to a paper trading position.
        Creates, updates, or closes/deletes a position based on the fill.
        """
        logger.info(f"Applying fill {fill.fill_id} to position for User {fill.user_id}, Symbol {fill.symbol}, Side {fill.side.value}, Qty {fill.quantity}, Price {fill.price}")

        existing_position = await self._get_paper_position(fill.user_id, fill.symbol)

        # Determine the change in quantity based on trade side
        signed_fill_quantity = fill.quantity if fill.side == TradeSide.BUY else -fill.quantity

        if existing_position is None:
            # New position
            if signed_fill_quantity == 0: # Should be caught by PaperTradeFill validation (quantity > 0)
                 logger.warning(f"Fill quantity is zero for new position {fill.symbol}. No position created.")
                 return None # Or raise error, as fill quantity should be > 0

            new_position = PaperPosition(
                user_id=fill.user_id,
                symbol=fill.symbol,
                quantity=signed_fill_quantity,
                average_entry_price=fill.price,
                # created_at and last_modified_at will be set by default_factory or by _create_paper_position
            )
            logger.info(f"Creating new paper position for {fill.symbol}: Qty {new_position.quantity}, AvgPrice {new_position.average_entry_price}")
            return await self._create_paper_position(new_position)
        else:
            # Update existing position
            current_total_value_of_position = existing_position.quantity * existing_position.average_entry_price
            value_of_fill = signed_fill_quantity * fill.price

            updated_quantity = existing_position.quantity + signed_fill_quantity

            if abs(updated_quantity) < 1e-9:
                updated_quantity = 0.0

            if updated_quantity == 0:
                logger.info(f"Paper position for {fill.symbol} (ID: {existing_position.position_id}) closed by fill {fill.fill_id}. Quantity becomes zero.")
                await self._delete_paper_position(existing_position.position_id)

                alert_closed = AlertEvent(
                    source_id=f"SimulatedTradeExecutor_Position_{existing_position.position_id}",
                    alert_level=AlertLevel.INFO,
                    message=f"Paper position CLOSED for {fill.symbol}.",
                    details={
                        "position_id": str(existing_position.position_id), "symbol": fill.symbol,
                        "closing_fill_id": str(fill.fill_id),
                        # TODO: Add realized P&L to details when available
                    }
                )
                if self.event_service:
                    try:
                        await self.event_service.publish_event(alert_closed, channel="alert_events")
                        logger.info(f"Published position CLOSED alert for {fill.symbol}, pos_id {existing_position.position_id}")
                    except Exception as e_pub:
                        logger.error(f"Failed to publish position CLOSED alert for {fill.symbol}: {e_pub}", exc_info=True)
                return None

            # If signs are different (position flipped) or if adding to a position in the same direction
            if (existing_position.quantity > 0 and signed_fill_quantity > 0) or \
               (existing_position.quantity < 0 and signed_fill_quantity < 0) or \
               (existing_position.quantity > 0 and updated_quantity < 0) or \
               (existing_position.quantity < 0 and updated_quantity > 0): # Adding to position or flipping

                if (existing_position.quantity > 0 and updated_quantity < 0) or \
                   (existing_position.quantity < 0 and updated_quantity > 0): # Position flipped
                    logger.info(f"Position for {fill.symbol} (ID: {existing_position.position_id}) flipped by fill {fill.fill_id}.")
                    # When a position is flipped, the new average entry price is simply the price of the flipping trade(s)
                    # for the new quantity in the new direction.
                    existing_position.average_entry_price = fill.price
                else: # Adding to existing position in the same direction
                    updated_avg_price = (current_total_value_of_position + value_of_fill) / updated_quantity
                    existing_position.average_entry_price = round(updated_avg_price, 8)
            # If reducing position size (but not closing or flipping), average_entry_price typically remains unchanged.
            # Realized P&L for the reduced part would be calculated elsewhere based on this avg_entry_price.

            existing_position.quantity = round(updated_quantity, 8) # Round final quantity
            logger.info(f"Updating paper position for {fill.symbol} (ID: {existing_position.position_id}): New Qty {existing_position.quantity}, New AvgPrice {existing_position.average_entry_price}")
            return await self._update_paper_position_record(existing_position)

    # --- Portfolio Valuation and P&L Methods ---

    async def get_current_market_price(self, symbol: str) -> Optional[float]:
        """Helper to get current market price for a symbol."""
        # Using the existing tool. Provider might need to be configurable or passed.
        # get_current_quote_tool is not async, so direct call is fine if it's efficient enough
        # or consider running in executor if it becomes IO bound significantly.
        # For now, direct call.
        from ..tools.market_data_tools import get_current_quote_tool # Ensure it's in scope

        quote_data = get_current_quote_tool(symbol=symbol, provider="yfinance")
        if quote_data and isinstance(quote_data.get("last_price"), (float, int)):
            return float(quote_data["last_price"])
        elif quote_data and isinstance(quote_data.get("price"), (float, int)):
            return float(quote_data["price"])
        elif quote_data and isinstance(quote_data.get("close"), (float, int)): # Some providers might use 'close' for latest
             return float(quote_data["close"])
        logger.warning(f"Could not determine current market price for {symbol} from quote: {str(quote_data)[:200]}")
        return None

    async def calculate_paper_portfolio_valuation(
        self,
        user_id: uuid.UUID,
        current_cash_balance: float
    ) -> Dict[str, Any]:
        """
        Calculates the current valuation of a user's paper trading portfolio,
        including current value of open positions and unrealized P&L.
        """
        logger.info(f"Calculating paper portfolio valuation for user {user_id}")

        open_positions_details = []
        total_positions_market_value = 0.0
        total_unrealized_pnl = 0.0

        try:
            response = await self.supabase.table("paper_positions") \
                .select("*") \
                .eq("user_id", str(user_id)) \
                .execute()

            open_positions: List[PaperPosition] = []
            if response.data:
                open_positions = [PaperPosition(**pos_data) for pos_data in response.data]

            if not open_positions:
                logger.info(f"No open paper positions found for user {user_id}.")

            for pos in open_positions:
                current_price = await self.get_current_market_price(pos.symbol)
                position_detail = {
                    "symbol": pos.symbol,
                    "quantity": pos.quantity,
                    "average_entry_price": pos.average_entry_price,
                    "current_market_price": None,
                    "current_market_value": None,
                    "unrealized_pnl": None,
                    "position_id": str(pos.position_id) # Added position_id for reference
                }
                if current_price is not None:
                    position_detail["current_market_price"] = current_price
                    market_value = pos.quantity * current_price
                    position_detail["current_market_value"] = round(market_value, 2)
                    total_positions_market_value += market_value

                    unrealized_pnl_for_pos = (current_price - pos.average_entry_price) * pos.quantity
                    position_detail["unrealized_pnl"] = round(unreal_pnl_for_pos, 2)
                    total_unrealized_pnl += unrealized_pnl_for_pos
                else:
                    logger.warning(f"Could not fetch current price for position {pos.symbol} (ID: {pos.position_id}). P&L and market value for this position will be None.")

                open_positions_details.append(position_detail)

            total_portfolio_value = current_cash_balance + total_positions_market_value

            return {
                "user_id": str(user_id),
                "current_cash_balance": round(current_cash_balance, 2),
                "total_positions_market_value": round(total_positions_market_value, 2),
                "total_unrealized_pnl": round(total_unrealized_pnl, 2),
                "total_portfolio_value": round(total_portfolio_value, 2),
                "open_positions": open_positions_details,
                "valuation_timestamp": datetime.now(timezone.utc).isoformat()
            }

        except Exception as e:
            logger.error(f"Error calculating paper portfolio valuation for user {user_id}: {e}", exc_info=True)
            # Consider what to return or if to re-raise a more specific error
            # For now, re-raising a generic exception to be handled by the caller.
            raise Exception(f"Database or calculation error during portfolio valuation: {str(e)}")

    async def calculate_realized_pnl_for_trades(
        self,
        user_id: uuid.UUID,
        trade_ids: Optional[List[uuid.UUID]] = None,
        symbol_filter: Optional[str] = None,
        start_date_filter: Optional[datetime] = None,
        end_date_filter: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculates realized P&L from trades. (Conceptual Placeholder)
        This is a simplified version. True P&L requires careful matching of buy/sell fills.
        """
        logger.info(f"Calculating realized P&L for user {user_id}, trades: {trade_ids}, symbol: {symbol_filter}, period: {start_date_filter}-{end_date_filter}")

        logger.warning("calculate_realized_pnl_for_trades is a conceptual placeholder and does not perform full P&L calculation yet.")

        # Placeholder logic. A real implementation would query 'paper_trade_fills' or a dedicated 'realized_trades' table,
        # group by symbol, and apply FIFO/LIFO or average cost basis accounting for closing trades.
        # For now, it returns a conceptual structure.

        return {
            "user_id": str(user_id),
            "total_realized_pnl": 0.00,
            "calculation_status": "Placeholder - Full P&L logic not yet implemented.",
            "number_of_trades_considered": 0, # Placeholder
            "filters_applied": {
                "trade_ids": [str(tid) for tid in trade_ids] if trade_ids else "All applicable",
                "symbol": symbol_filter or "All",
                "start_date": start_date_filter.isoformat() if start_date_filter else "N/A",
                "end_date": end_date_filter.isoformat() if end_date_filter else "N/A",
            }
        }

    # --- Historical Paper Trading Backtesting System ---

    async def _log_paper_trade_to_history(self, order: PaperTradeOrder, fill: Optional[PaperTradeFill] = None,
                                         strategy_id: Optional[uuid.UUID] = None,
                                         agent_id: Optional[uuid.UUID] = None) -> Optional[TradeRecord]:
        """
        Logs a paper trade order and its fill (if any) to the 'trading_history' table.
        """
        logger.info(f"Logging paper order {order.order_id} to trading_history. Status: {order.status.value}")

        # Map PaperOrderStatus to TradingHistoryOrderStatus
        history_status_map = {
            PaperOrderStatus.NEW: TradingHistoryOrderStatus.NEW,
            PaperOrderStatus.FILLED: TradingHistoryOrderStatus.FILLED,
            PaperOrderStatus.REJECTED: TradingHistoryOrderStatus.REJECTED,
            PaperOrderStatus.CANCELED: TradingHistoryOrderStatus.CANCELED,
            PaperOrderStatus.PARTIALLY_FILLED: TradingHistoryOrderStatus.PARTIALLY_FILLED, # Assuming this exists in TradingHistoryOrderStatus
            PaperOrderStatus.EXPIRED: TradingHistoryOrderStatus.EXPIRED, # Assuming this exists
            PaperOrderStatus.PENDING_CANCEL: TradingHistoryOrderStatus.PENDING_CANCEL, # Assuming this exists
        }
        history_status = history_status_map.get(order.status, TradingHistoryOrderStatus.NEW) # Default to NEW if unmapped

        # Map PaperOrderType to TradingHistoryOrderType (they might be identical but aliased)
        # For this example, assume direct value mapping is okay if enums are compatible.
        # If PaperOrderType and TradingHistoryOrderType are structurally different, specific mapping needed.
        history_order_type = order.order_type.value

        trade_record_payload = {
            "user_id": order.user_id,
            "agent_id": getattr(order, 'agent_id', None) or agent_id,
            "strategy_id": getattr(order, 'strategy_id', None) or strategy_id,
            "symbol": order.symbol,
            "exchange": "PAPER_BACKTEST",
            "order_id": str(order.order_id),
            "side": order.side.value,
            "order_type": history_order_type, # Use mapped/original value
            "status": history_status.value,
            "quantity_ordered": order.quantity,
            "quantity_filled": 0.0,
            "price": None,
            "limit_price": order.limit_price,
            "stop_price": order.stop_price,
            "commission": None,
            "commission_asset": None,
            "created_at": order.order_request_timestamp,
            "updated_at": datetime.now(timezone.utc),
            "filled_at": None,
            "notes": f"Paper Trade (Backtest): {order.notes or ''}".strip(),
            "metadata": {"source": "paper_backtest", "time_in_force": order.time_in_force}
        }

        if fill:
            trade_record_payload["quantity_filled"] = fill.quantity
            trade_record_payload["price"] = fill.price
            trade_record_payload["commission"] = fill.commission
            trade_record_payload["commission_asset"] = fill.commission_asset
            trade_record_payload["filled_at"] = fill.fill_timestamp
            trade_record_payload["updated_at"] = fill.fill_timestamp

        try:
            response = await self.supabase.table("trading_history") \
                .insert(trade_record_payload) \
                .select("*") \
                .execute()

            if response.error:
                err_msg = response.error.message
                logger.error(f"Supabase error logging paper trade {order.order_id} to trading_history: {err_msg}")
                return None
            if response.data and len(response.data) > 0:
                logger.info(f"Paper trade logged to trading_history with internal DB ID: {response.data[0].get('trade_id', 'N/A')} for order_id: {order.order_id}") # Assuming 'trade_id' is PK of trading_history
                return TradeRecord(**response.data[0])
            else:
                logger.error(f"Failed to log paper trade {order.order_id} to trading_history: No data returned, though no explicit error.")
                return None
        except Exception as e:
            logger.error(f"Unexpected error logging paper trade {order.order_id} to trading_history: {e}", exc_info=True)
            return None

    async def run_historical_paper_backtest(
        self,
        user_id: uuid.UUID,
        strategy_signal_func: Callable,
        strategy_params: Dict[str, Any],
        symbol: str,
        start_date: str,
        end_date: str,
        initial_cash: float,
        trade_quantity: float = 1.0, # Fixed quantity per trade for this simplified backtester
        data_provider: str = "yfinance" # Allow provider to be specified
    ) -> Dict[str, Any]:
        logger.info(f"Starting historical paper backtest for User {user_id}, Symbol {symbol}, Strategy {strategy_signal_func.__name__}")
        logger.info(f"Period: {start_date} to {end_date}, Initial Cash: {initial_cash}, Params: {strategy_params}")

        # 1. Fetch full historical data
        price_data_df_full = get_historical_price_data_tool(symbol, start_date, end_date, interval="1d", provider=data_provider)
        if price_data_df_full is None or price_data_df_full.empty:
            logger.error("Failed to fetch historical data for backtest.")
            return {"error": "Failed to fetch historical data for backtest.", "performance": None, "trades": []}

        if not all(col in price_data_df_full.columns for col in ['Open', 'High', 'Low', 'Close']): # Check for OHLC
            logger.error("Historical data must contain Open, High, Low, Close columns.")
            return {"error": "Historical data missing OHLC columns.", "performance": None, "trades": []}


        # 2. Generate all signals for the period
        signal_func_result = strategy_signal_func(
            symbol=symbol, start_date=start_date, end_date=end_date,
            data_provider=data_provider, **strategy_params
        )

        signal_df: Optional[pd.DataFrame] = None
        if isinstance(signal_func_result, tuple) and len(signal_func_result) > 0:
            signal_df = signal_func_result[0] # Assuming first element is the signals DataFrame
        elif isinstance(signal_func_result, pd.DataFrame):
            signal_df = signal_func_result

        if signal_df is None or signal_df.empty or not all(col in signal_df for col in ['entries', 'exits']):
            logger.error("Strategy failed to generate valid signals DataFrame with 'entries' and 'exits' columns.")
            return {"error": "Strategy failed to generate valid signals.", "performance": None, "trades": []}

        # Ensure signal_df index is DatetimeIndex and UTC for proper joining
        if not isinstance(signal_df.index, pd.DatetimeIndex):
            signal_df.index = pd.to_datetime(signal_df.index, utc=True)
        if signal_df.index.tz is None: signal_df.index = signal_df.index.tz_localize('UTC')
        elif signal_df.index.tz != timezone.utc: signal_df.index = signal_df.index.tz_convert('UTC')

        # Use price_data_df_full (which has OHLC) as the base for looping. Join signals to it.
        # Ensure price_data_df_full also has UTC DatetimeIndex.
        if not isinstance(price_data_df_full.index, pd.DatetimeIndex):
             price_data_df_full.index = pd.to_datetime(price_data_df_full.index, utc=True)
        if price_data_df_full.index.tz is None: price_data_df_full.index = price_data_df_full.index.tz_localize('UTC')
        elif price_data_df_full.index.tz != timezone.utc: price_data_df_full.index = price_data_df_full.index.tz_convert('UTC')

        loop_data = price_data_df_full.join(signal_df[['entries', 'exits']], how='left')
        loop_data[['entries', 'exits']] = loop_data[['entries', 'exits']].fillna(False)

        current_cash = initial_cash
        current_position: Optional[PaperPosition] = None
        backtest_strategy_id = uuid.uuid4() # A unique ID for this specific backtest run's strategy instance context
        logged_trades: List[TradeRecord] = []

        for timestamp, row in loop_data.iterrows():
            ts_utc = timestamp.to_pydatetime() # pd.Timestamp to datetime.datetime
            if ts_utc.tzinfo is None: ts_utc = ts_utc.replace(tzinfo=timezone.utc)
            else: ts_utc = ts_utc.astimezone(timezone.utc)

            # A. Process Exit Signals
            if current_position and row.get('exits'):
                exit_order = PaperTradeOrder(
                    user_id=user_id, symbol=symbol,
                    side=TradeSide.SELL if current_position.quantity > 0 else TradeSide.BUY,
                    order_type=PaperOrderType.MARKET, quantity=abs(current_position.quantity),
                    order_request_timestamp=ts_utc )

                updated_order, fills = await self.submit_paper_order(exit_order)
                logged_trade = await self._log_paper_trade_to_history(updated_order, fills[0] if fills else None, strategy_id=backtest_strategy_id)
                if logged_trade: logged_trades.append(logged_trade)

                if updated_order.status == PaperOrderStatus.FILLED and fills:
                    fill = fills[0]
                    # P&L calculation simplified
                    if current_position.quantity > 0: # Long closed by sell
                        current_cash += fill.price * fill.quantity
                    else: # Short closed by buy
                        current_cash -= fill.price * fill.quantity
                    current_cash -= fill.commission
                    logger.info(f"{ts_utc}: Position for {symbol} closed. Fill: {fill.price}x{fill.quantity}. Cash: {current_cash:.2f}")
                    current_position = await self.apply_fill_to_position(fill)
                else:
                    logger.warning(f"{ts_utc}: Exit order for {symbol} {updated_order.status.value if updated_order else 'N/A'}: {updated_order.notes if updated_order else 'N/A'}")

            # B. Process Entry Signals (only if no current position for this simple model)
            if current_position is None and row.get('entries'):
                entry_order = PaperTradeOrder(
                    user_id=user_id, symbol=symbol,
                    side=TradeSide.BUY, # Assuming 'entries' always means BUY for now
                    order_type=PaperOrderType.MARKET, quantity=trade_quantity,
                    order_request_timestamp=ts_utc)

                updated_order, fills = await self.submit_paper_order(entry_order)
                logged_trade = await self._log_paper_trade_to_history(updated_order, fills[0] if fills else None, strategy_id=backtest_strategy_id)
                if logged_trade: logged_trades.append(logged_trade)

                if updated_order.status == PaperOrderStatus.FILLED and fills:
                    fill = fills[0]
                    if entry_order.side == TradeSide.BUY:
                         current_cash -= (fill.price * fill.quantity)
                    current_cash -= fill.commission
                    logger.info(f"{ts_utc}: Position for {symbol} opened. Fill: {fill.price}x{fill.quantity}. Cash: {current_cash:.2f}")
                    current_position = await self.apply_fill_to_position(fill)
                else:
                     logger.warning(f"{ts_utc}: Entry order for {symbol} {updated_order.status.value if updated_order else 'N/A'}: {updated_order.notes if updated_order else 'N/A'}")

        final_portfolio_valuation = await self.calculate_paper_portfolio_valuation(user_id, current_cash)
        logger.info(f"Historical paper backtest completed for User {user_id}, Symbol {symbol}.")

        net_profit = final_portfolio_valuation.get('total_portfolio_value', initial_cash) - initial_cash
        return {
            "strategy_name": strategy_signal_func.__name__, "symbol": symbol,
            "period": f"{start_date} to {end_date}", "initial_cash": initial_cash,
            "final_portfolio_value": final_portfolio_valuation.get('total_portfolio_value'),
            "net_profit": round(net_profit, 2),
            "total_unrealized_pnl_final": final_portfolio_valuation.get('total_unrealized_pnl'),
            "final_cash": final_portfolio_valuation.get('current_cash_balance'),
            "final_open_positions": final_portfolio_valuation.get('open_positions'),
            "logged_trades_count": len(logged_trades)
            # For more detailed stats (trades, win rate etc.) analyze `logged_trades` or query "trading_history"
        }

    # --- Historical Paper Trading Backtesting System ---

    async def _log_paper_trade_to_history(self, order: PaperTradeOrder, fill: Optional[PaperTradeFill] = None,
                                         strategy_id: Optional[uuid.UUID] = None,
                                         agent_id: Optional[uuid.UUID] = None) -> Optional[TradeRecord]:
        """
        Logs a paper trade order and its fill (if any) to the 'trading_history' table.
        """
        logger.info(f"Logging paper order {order.order_id} to trading_history. Status: {order.status.value}")

        history_status_map = {
            PaperOrderStatus.NEW: TradingHistoryOrderStatus.NEW,
            PaperOrderStatus.FILLED: TradingHistoryOrderStatus.FILLED,
            PaperOrderStatus.REJECTED: TradingHistoryOrderStatus.REJECTED,
            PaperOrderStatus.CANCELED: TradingHistoryOrderStatus.CANCELED, # Assuming PaperOrderStatus has CANCELED
            PaperOrderStatus.PARTIALLY_FILLED: TradingHistoryOrderStatus.PARTIALLY_FILLED,
            PaperOrderStatus.EXPIRED: TradingHistoryOrderStatus.EXPIRED,
            PaperOrderStatus.PENDING_CANCEL: TradingHistoryOrderStatus.PENDING_CANCEL,
        }
        history_status = history_status_map.get(order.status, TradingHistoryOrderStatus.NEW)


        trade_record_payload = {
            "user_id": order.user_id,
            "agent_id": getattr(order, 'agent_id', None) or agent_id,
            "strategy_id": getattr(order, 'strategy_id', None) or strategy_id,
            "symbol": order.symbol,
            "exchange": "PAPER_BACKTEST",
            "order_id": str(order.order_id),
            "side": order.side.value,
            "order_type": order.order_type.value, # This should be PaperOrderType, map to TradingHistoryOrderType if different
            "status": history_status.value,
            "quantity_ordered": order.quantity,
            "quantity_filled": 0.0,
            "price": None,
            "limit_price": order.limit_price,
            "stop_price": order.stop_price,
            "commission": None,
            "commission_asset": None,
            "created_at": order.order_request_timestamp,
            "updated_at": datetime.now(timezone.utc),
            "filled_at": None,
            "notes": f"Paper Trade (Backtest): {order.notes or ''}".strip(),
            "metadata": {"source": "paper_backtest", "time_in_force": order.time_in_force}
        }

        if fill:
            trade_record_payload["quantity_filled"] = fill.quantity
            trade_record_payload["price"] = fill.price
            trade_record_payload["commission"] = fill.commission
            trade_record_payload["commission_asset"] = fill.commission_asset
            trade_record_payload["filled_at"] = fill.fill_timestamp
            trade_record_payload["updated_at"] = fill.fill_timestamp

        try:
            response = await self.supabase.table("trading_history") \
                .insert(trade_record_payload) \
                .select("*") \
                .execute()
            if response.data and len(response.data) > 0:
                logger.info(f"Paper trade logged to trading_history with internal DB ID: {response.data[0].get('id', 'N/A')} for order_id: {order.order_id}")
                return TradeRecord(**response.data[0])
            else:
                err_msg = response.error.message if hasattr(response, 'error') and response.error else "No data returned on history log"
                logger.error(f"Failed to log paper trade {order.order_id} to trading_history: {err_msg}")
                return None
        except Exception as e:
            logger.error(f"Error logging paper trade {order.order_id} to trading_history: {e}", exc_info=True)
            return None

    async def run_historical_paper_backtest(
        self,
        user_id: uuid.UUID,
        strategy_signal_func: Callable,
        strategy_params: Dict[str, Any],
        symbol: str,
        start_date: str,
        end_date: str,
        initial_cash: float,
        trade_quantity: float = 1.0
    ) -> Dict[str, Any]:
        logger.info(f"Starting historical paper backtest for User {user_id}, Symbol {symbol}, Strategy {strategy_signal_func.__name__}")
        logger.info(f"Period: {start_date} to {end_date}, Initial Cash: {initial_cash}, Params: {strategy_params}")

        # 1. Fetch full historical data using the market_data_tool for consistency
        price_data_df_full = get_historical_price_data_tool(symbol, start_date, end_date, interval="1d", provider="yfinance")
        if price_data_df_full is None or price_data_df_full.empty:
            logger.error("Failed to fetch historical data for backtest.")
            return {"error": "Failed to fetch historical data for backtest.", "performance": None}

        # Ensure Open prices are available for market order simulation
        if 'Open' not in price_data_df_full.columns:
            logger.error("'Open' column missing from historical data. Cannot simulate market orders accurately.")
            return {"error": "'Open' column missing from historical data.", "performance": None}


        # 2. Generate all signals for the period
        # The strategy_signal_func might return (signal_df, shapes_df) or just signal_df
        signal_func_result = strategy_signal_func(symbol=symbol, start_date=start_date, end_date=end_date, **strategy_params)

        signal_df: Optional[pd.DataFrame] = None
        if isinstance(signal_func_result, tuple) and len(signal_func_result) > 0:
            signal_df = signal_func_result[0]
        elif isinstance(signal_func_result, pd.DataFrame):
            signal_df = signal_func_result

        if signal_df is None or signal_df.empty or not all(col in signal_df for col in ['entries', 'exits']):
            logger.error("Strategy failed to generate valid signals DataFrame with 'entries' and 'exits' columns.")
            return {"error": "Strategy failed to generate valid signals.", "performance": None}

        # Align signal_df index with price_data_df_full if they are not already
        # This is crucial. Assuming both are daily and can be merged/aligned on DateTimeIndex.
        # For simplicity, let's ensure price_data_df_full is used as the base for iteration.
        # We need to merge signals onto the main price data that has Open prices.
        # The signal_df usually carries the 'Close' price used for signal generation.

        # Ensure signal_df index is DatetimeIndex if not already
        if not isinstance(signal_df.index, pd.DatetimeIndex):
            signal_df.index = pd.to_datetime(signal_df.index, utc=True)
        if signal_df.index.tz is None: signal_df.index = signal_df.index.tz_localize('UTC')
        elif signal_df.index.tz != timezone.utc: signal_df.index = signal_df.index.tz_convert('UTC')

        # Merge signals onto the full price data, ensuring 'Open' is available
        # We use the index of price_data_df_full as the master timeline.
        loop_data = price_data_df_full.join(signal_df[['entries', 'exits']], how='left')
        loop_data[['entries', 'exits']] = loop_data[['entries', 'exits']].fillna(False)


        current_cash = initial_cash
        current_position: Optional[PaperPosition] = None
        backtest_strategy_id = uuid.uuid4()

        for timestamp, row in loop_data.iterrows():
            # Ensure timestamp is timezone-aware (UTC)
            ts_utc = timestamp.to_pydatetime() # pd.Timestamp to datetime.datetime
            if ts_utc.tzinfo is None: ts_utc = ts_utc.replace(tzinfo=timezone.utc)
            else: ts_utc = ts_utc.astimezone(timezone.utc)

            if current_position and row.get('exits') == True:
                logger.debug(f"{ts_utc}: Exit signal for {symbol}. Current Qty: {current_position.quantity}")
                exit_order = PaperTradeOrder(
                    user_id=user_id, symbol=symbol,
                    side=TradeSide.SELL if current_position.quantity > 0 else TradeSide.BUY,
                    order_type=PaperOrderType.MARKET, quantity=abs(current_position.quantity),
                    order_request_timestamp=ts_utc )

                updated_order, fills = await self.submit_paper_order(exit_order)
                await self._log_paper_trade_to_history(updated_order, fills[0] if fills else None, strategy_id=backtest_strategy_id)

                if updated_order.status == PaperOrderStatus.FILLED and fills:
                    fill = fills[0]
                    pnl = 0
                    if current_position.quantity > 0: # Was long, closed by sell
                        pnl = (fill.price - current_position.average_entry_price) * fill.quantity
                        current_cash += fill.price * fill.quantity
                    else: # Was short, closed by buy
                        pnl = (current_position.average_entry_price - fill.price) * abs(fill.quantity)
                        current_cash -= fill.price * fill.quantity # Cost to buy back

                    current_cash -= fill.commission
                    logger.info(f"{ts_utc}: Position for {symbol} closed. Fill Price: {fill.price}. Realized P&L (approx): {pnl:.2f}. Cash: {current_cash:.2f}")
                    # apply_fill_to_position should handle deleting the position record
                    current_position = await self.apply_fill_to_position(fill) # This should set current_position to None
                else:
                    logger.warning(f"{ts_utc}: Exit order for {symbol} failed: {updated_order.status.value if updated_order else 'N/A'} - {updated_order.notes if updated_order else 'N/A'}")

            if current_position is None and row.get('entries') == True: # Only enter if no current position
                logger.debug(f"{ts_utc}: Entry signal for {symbol}")
                entry_order = PaperTradeOrder(
                    user_id=user_id, symbol=symbol,
                    side=TradeSide.BUY, # Assuming entries are BUY signals for now
                    order_type=PaperOrderType.MARKET, quantity=trade_quantity,
                    order_request_timestamp=ts_utc)

                updated_order, fills = await self.submit_paper_order(entry_order)
                await self._log_paper_trade_to_history(updated_order, fills[0] if fills else None, strategy_id=backtest_strategy_id)

                if updated_order.status == PaperOrderStatus.FILLED and fills:
                    fill = fills[0]
                    if entry_order.side == TradeSide.BUY:
                         current_cash -= (fill.price * fill.quantity) # Cost of buying
                    # else: # Selling short, cash increases initially (minus margin requirements not simulated here)
                    #    current_cash += (fill.price * fill.quantity)
                    current_cash -= fill.commission
                    logger.info(f"{ts_utc}: Position for {symbol} opened. Fill Price: {fill.price}. Cash: {current_cash:.2f}")
                    current_position = await self.apply_fill_to_position(fill)
                else:
                    logger.warning(f"{ts_utc}: Entry order for {symbol} failed: {updated_order.status.value if updated_order else 'N/A'} - {updated_order.notes if updated_order else 'N/A'}")

        final_portfolio_valuation = await self.calculate_paper_portfolio_valuation(user_id, current_cash)
        logger.info(f"Historical paper backtest completed for User {user_id}, Symbol {symbol}.")

        net_profit = final_portfolio_valuation.get('total_portfolio_value', initial_cash) - initial_cash
        return {
            "strategy_name": strategy_signal_func.__name__, "symbol": symbol,
            "period": f"{start_date} to {end_date}", "initial_cash": initial_cash,
            "final_portfolio_value": final_portfolio_valuation.get('total_portfolio_value'),
            "net_profit": net_profit,
            "total_unrealized_pnl_final": final_portfolio_valuation.get('total_unrealized_pnl'),
            "final_cash": final_portfolio_valuation.get('current_cash_balance'),
            "final_open_positions": final_portfolio_valuation.get('open_positions')
        }
