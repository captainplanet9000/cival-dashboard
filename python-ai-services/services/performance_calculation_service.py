from typing import List, Optional
from datetime import datetime, timezone
from loguru import logger
import math # For checking isnan or isinf

from ..models.dashboard_models import TradeLogItem
from ..models.performance_models import PerformanceMetrics
from .trading_data_service import TradingDataService

class PerformanceCalculationService:
    def __init__(self, trading_data_service: TradingDataService):
        self.trading_data_service = trading_data_service
        logger.info("PerformanceCalculationService initialized.")

    async def calculate_performance_metrics(self, agent_id: str) -> PerformanceMetrics:
        logger.info(f"Calculating performance metrics for agent_id: {agent_id}")

        try:
            # Fetch all trades for calculation. Using a large limit.
            # In a real system, this might need pagination or date range filters.
            trade_history = await self.trading_data_service.get_trade_history(agent_id, limit=10000)
        except Exception as e:
            logger.error(f"Error fetching trade history for agent {agent_id}: {e}", exc_info=True)
            return PerformanceMetrics(
                agent_id=agent_id,
                notes=f"Failed to fetch trade history: {str(e)}"
            )

        if not trade_history:
            logger.warning(f"No trade history found for agent {agent_id}. Returning empty metrics.")
            return PerformanceMetrics(
                agent_id=agent_id,
                notes="No trade history available for calculation."
            )

        total_trades = 0
        winning_trades = 0
        losing_trades = 0
        neutral_trades = 0
        total_net_pnl = 0.0
        current_gross_profit = 0.0
        current_gross_loss = 0.0  # Store as positive sum of losses

        min_timestamp: Optional[datetime] = None
        max_timestamp: Optional[datetime] = None

        pnl_data_available = False

        for trade in trade_history:
            total_trades += 1
            if trade.timestamp:
                if min_timestamp is None or trade.timestamp < min_timestamp:
                    min_timestamp = trade.timestamp
                if max_timestamp is None or trade.timestamp > max_timestamp:
                    max_timestamp = trade.timestamp

            if trade.realized_pnl is not None:
                pnl_data_available = True
                if not (math.isnan(trade.realized_pnl) or math.isinf(trade.realized_pnl)):
                    total_net_pnl += trade.realized_pnl
                    if trade.realized_pnl > 1e-9: # Avoid floating point issues around zero
                        winning_trades += 1
                        current_gross_profit += trade.realized_pnl
                    elif trade.realized_pnl < -1e-9: # Avoid floating point issues around zero
                        losing_trades += 1
                        current_gross_loss += abs(trade.realized_pnl)
                    else:
                        neutral_trades += 1
                else:
                    logger.warning(f"Skipping trade {trade.trade_id} due to invalid PnL value: {trade.realized_pnl}")
                    neutral_trades +=1 # Or handle as error / skip count
            else:
                # If PnL is None, count as neutral or skip based on desired logic
                neutral_trades += 1


        win_rate: Optional[float] = None
        loss_rate: Optional[float] = None
        if total_trades > 0:
            # Calculate rates based on trades where PnL was determined (winning or losing)
            determined_trades = winning_trades + losing_trades
            if determined_trades > 0 :
                win_rate = winning_trades / determined_trades if determined_trades > 0 else 0.0
                loss_rate = losing_trades / determined_trades if determined_trades > 0 else 0.0
            else: # All trades were neutral or PnL was None
                 win_rate = 0.0
                 loss_rate = 0.0


        average_win_amount: Optional[float] = None
        if winning_trades > 0:
            average_win_amount = current_gross_profit / winning_trades

        average_loss_amount: Optional[float] = None
        if losing_trades > 0:
            average_loss_amount = current_gross_loss / losing_trades # current_gross_loss is positive

        profit_factor: Optional[float] = None
        if current_gross_loss > 1e-9: # Avoid division by zero
            profit_factor = current_gross_profit / current_gross_loss
        elif current_gross_profit > 1e-9 and current_gross_loss < 1e-9: # Profits but no losses
            profit_factor = float('inf') # Or a large number, or None, depending on convention

        notes_list = []
        if not pnl_data_available:
            notes_list.append("Realized PnL data was missing for all trades; most metrics will be zero or None.")
        if any(trade.realized_pnl is None for trade in trade_history):
             notes_list.append("Some trades were missing realized PnL; these were treated as neutral.")
        # Since TradeLogItem is mocked in TradingDataService, add a note about it.
        # This check is conceptual as the service itself doesn't know if data was mocked by its dependency.
        # This note should ideally be added if TradingDataService indicates mocked data.
        # For now, we assume it might be mocked.
        if "MOCK_COIN" in (trade_history[0].asset if trade_history else "") or \
           "PAPER_COIN" in (trade_history[0].asset if trade_history else ""):
            notes_list.append("Performance calculated using potentially mocked trade history data.")


        return PerformanceMetrics(
            agent_id=agent_id,
            data_start_time=min_timestamp,
            data_end_time=max_timestamp,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            neutral_trades=neutral_trades,
            win_rate=win_rate,
            loss_rate=loss_rate,
            total_net_pnl=total_net_pnl,
            gross_profit=current_gross_profit if pnl_data_available else None,
            gross_loss=current_gross_loss if pnl_data_available else None,
            average_win_amount=average_win_amount,
            average_loss_amount=average_loss_amount,
            profit_factor=profit_factor,
            # max_drawdown_percentage and sharpe_ratio are placeholders
            notes="; ".join(notes_list) if notes_list else None
        )

```
