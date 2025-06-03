from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timezone
import uuid # For mock data generation
from loguru import logger

from ..models.agent_models import AgentConfigOutput
from ..models.dashboard_models import (
    AssetPositionSummary,
    PortfolioSummary,
    TradeLogItem,
    OrderLogItem
)
from ..models.hyperliquid_models import HyperliquidAccountSnapshot, HyperliquidAssetPosition, HyperliquidOpenOrderItem, HyperliquidMarginSummary
from .agent_management_service import AgentManagementService
from .hyperliquid_execution_service import HyperliquidExecutionService, HyperliquidExecutionServiceError

# Define a type for the HyperliquidExecutionService factory
HyperliquidServiceFactory = Callable[[str], Optional[HyperliquidExecutionService]] # Takes cred_id, returns HLES or None

class TradingDataService:
    def __init__(
        self,
        agent_service: AgentManagementService,
        hyperliquid_service_factory: HyperliquidServiceFactory
    ):
        self.agent_service = agent_service
        self.hyperliquid_service_factory = hyperliquid_service_factory
        logger.info("TradingDataService initialized.")

    async def _get_hles_instance(self, agent_id: str) -> Optional[HyperliquidExecutionService]:
        """Helper to get HLES instance for an agent."""
        agent_config = await self.agent_service.get_agent(agent_id)
        if not agent_config or agent_config.execution_provider != "hyperliquid":
            logger.warning(f"Agent {agent_id} not found or not a hyperliquid agent.")
            return None
        if not agent_config.hyperliquid_credentials_id:
            logger.warning(f"Hyperliquid agent {agent_id} has no credentials_id set.")
            return None

        # The factory is responsible for creating/fetching HLES with actual credentials
        # This part needs proper implementation of credential fetching and HLES instantiation
        # For now, it relies on the factory passed in.
        hles = self.hyperliquid_service_factory(agent_config.hyperliquid_credentials_id)
        if not hles:
             logger.error(f"Failed to get HyperliquidExecutionService for agent {agent_id} using cred_id {agent_config.hyperliquid_credentials_id}.")
        return hles

    def _safe_float(self, value: Optional[str]) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    async def get_portfolio_summary(self, agent_id: str) -> Optional[PortfolioSummary]:
        logger.info(f"Fetching portfolio summary for agent {agent_id}.")
        agent_config = await self.agent_service.get_agent(agent_id)
        if not agent_config:
            logger.warning(f"Agent {agent_id} not found for portfolio summary.")
            return None

        now_utc = datetime.now(timezone.utc)

        if agent_config.execution_provider == "hyperliquid":
            hles = await self._get_hles_instance(agent_id)
            if not hles:
                return None # Error already logged by _get_hles_instance

            try:
                # We need both account snapshot (for positions) and margin summary (for overall values)
                # The HyperliquidExecutionService.get_detailed_account_summary() returns HyperliquidAccountSnapshot
                # which includes parsed positions and some margin summary fields.
                # Let's assume get_account_margin_summary() gives the most direct HyperliquidMarginSummary.

                hl_margin_summary: Optional[HyperliquidMarginSummary] = await hles.get_account_margin_summary()
                hl_account_snapshot: Optional[HyperliquidAccountSnapshot] = await hles.get_detailed_account_summary(hles.wallet_address)

                if not hl_margin_summary or not hl_account_snapshot:
                    logger.error(f"Failed to fetch complete Hyperliquid data for agent {agent_id}.")
                    return None

                open_positions_summary: List[AssetPositionSummary] = []
                if hl_account_snapshot.parsed_positions:
                    for pos in hl_account_snapshot.parsed_positions:
                        open_positions_summary.append(AssetPositionSummary(
                            asset=pos.asset,
                            size=self._safe_float(pos.szi) or 0.0,
                            entry_price=self._safe_float(pos.entry_px),
                            # current_price: # Needs a separate market data feed
                            unrealized_pnl=self._safe_float(pos.unrealized_pnl),
                            margin_used=self._safe_float(pos.margin_used)
                        ))

                return PortfolioSummary(
                    agent_id=agent_id,
                    timestamp=now_utc,
                    account_value_usd=self._safe_float(hl_margin_summary.account_value) or 0.0,
                    total_pnl_usd=self._safe_float(hl_margin_summary.total_ntl_pos) or 0.0, # totalNtlPos is often used as total PnL
                    available_balance_usd=self._safe_float(hl_margin_summary.available_balance_for_new_orders), # Mapped from 'withdrawable'
                    margin_used_usd=self._safe_float(hl_margin_summary.total_margin_used),
                    open_positions=open_positions_summary
                )

            except HyperliquidExecutionServiceError as e:
                logger.error(f"Hyperliquid service error for agent {agent_id}: {e}", exc_info=True)
                return None
            except Exception as e:
                logger.error(f"Unexpected error fetching Hyperliquid portfolio for agent {agent_id}: {e}", exc_info=True)
                return None

        elif agent_config.execution_provider == "paper":
            logger.info(f"Returning mocked paper portfolio summary for agent {agent_id}.")
            return PortfolioSummary(
                agent_id=agent_id,
                timestamp=now_utc,
                account_value_usd=10000.0,
                total_pnl_usd=150.75,
                available_balance_usd=9800.0,
                margin_used_usd=200.0,
                open_positions=[
                    AssetPositionSummary(asset="PAPER_BTC", size=0.1, entry_price=50000.0, unrealized_pnl=100.0),
                    AssetPositionSummary(asset="PAPER_ETH", size=1.0, entry_price=3000.0, unrealized_pnl=50.75)
                ]
            )
        else:
            logger.warning(f"Unknown execution provider '{agent_config.execution_provider}' for agent {agent_id}.")
            return None

    async def get_trade_history(self, agent_id: str, limit: int = 100, offset: int = 0) -> List[TradeLogItem]:
        logger.info(f"Fetching trade history for agent {agent_id} (limit={limit}, offset={offset}).")
        agent_config = await self.agent_service.get_agent(agent_id)
        if not agent_config:
            logger.warning(f"Agent {agent_id} not found for trade history.")
            return []

        # For this subtask, both Hyperliquid and Paper will return mocked data.
        # Real implementation for Hyperliquid would involve processing fills from info.user_fills_by_time()
        # and matching them to create "trades" with P&L, which is complex.
        mock_trades: List[TradeLogItem] = []
        provider = agent_config.execution_provider
        logger.info(f"Provider for agent {agent_id} is {provider}. Returning mocked trade history.")

        for i in range(5): # Create 5 mock trades
            is_buy = (i % 2 == 0)
            asset = "MOCK_COIN" if provider == "hyperliquid" else "PAPER_COIN"
            price = 100.0 + i * 5
            qty = 1.0 + i * 0.1
            mock_trades.append(TradeLogItem(
                trade_id=str(uuid.uuid4()),
                timestamp=datetime.now(timezone.utc) - datetime.timedelta(hours=i),
                agent_id=agent_id,
                asset=asset,
                side="buy" if is_buy else "sell",
                order_type="limit" if i % 3 == 0 else "market",
                quantity=qty,
                price=price,
                total_value=qty * price,
                realized_pnl=10.0 - i if not is_buy else None, # Mock PnL on sells
                fees=0.1
            ))

        # Apply limit and offset (conceptual for mock data)
        return mock_trades[offset : offset + limit]

    async def get_open_orders(self, agent_id: str) -> List[OrderLogItem]:
        logger.info(f"Fetching open orders for agent {agent_id}.")
        agent_config = await self.agent_service.get_agent(agent_id)
        if not agent_config:
            logger.warning(f"Agent {agent_id} not found for open orders.")
            return []

        if agent_config.execution_provider == "hyperliquid":
            hles = await self._get_hles_instance(agent_id)
            if not hles:
                return []
            try:
                hl_open_orders: List[HyperliquidOpenOrderItem] = await hles.get_all_open_orders(hles.wallet_address)
                adapted_orders: List[OrderLogItem] = []
                for hl_order in hl_open_orders:
                    # Determine order type based on common patterns or if more info is in raw_order_data
                    order_type_dashboard: Literal["market", "limit", "stop_loss", "take_profit", "trigger"] = "limit" # Default
                    # Example: if 'trigger' in hl_order.raw_order_data.get('orderType', {}): order_type_dashboard = "trigger"
                    # This part needs more robust mapping based on actual raw_order_data structure for SL/TP etc.

                    adapted_orders.append(OrderLogItem(
                        order_id=str(hl_order.oid),
                        agent_id=agent_id,
                        timestamp=datetime.fromtimestamp(hl_order.timestamp / 1000, tz=timezone.utc),
                        asset=hl_order.asset,
                        side="buy" if hl_order.side.lower() == 'b' else "sell",
                        order_type=order_type_dashboard,
                        quantity=self._safe_float(hl_order.sz) or 0.0,
                        limit_price=self._safe_float(hl_order.limit_px),
                        # filled_quantity: # HyperliquidOpenOrderItem doesn't directly have filled qty, needs combining with fills
                        # avg_fill_price: # Same as above
                        status="open", # By definition from get_all_open_orders
                        raw_details=hl_order.raw_order_data
                    ))
                return adapted_orders
            except HyperliquidExecutionServiceError as e:
                logger.error(f"Hyperliquid service error fetching open orders for {agent_id}: {e}", exc_info=True)
                return []
            except Exception as e:
                logger.error(f"Unexpected error fetching Hyperliquid open orders for {agent_id}: {e}", exc_info=True)
                return []

        elif agent_config.execution_provider == "paper":
            logger.info(f"Returning mocked open orders for paper agent {agent_id}.")
            return [
                OrderLogItem(order_id=str(uuid.uuid4()), agent_id=agent_id, timestamp=datetime.now(timezone.utc), asset="PAPER_XRP", side="buy", order_type="limit", quantity=100, limit_price=0.50, status="open"),
                OrderLogItem(order_id=str(uuid.uuid4()), agent_id=agent_id, timestamp=datetime.now(timezone.utc), asset="PAPER_DOGE", side="sell", order_type="stop_loss", quantity=1000, limit_price=0.12, status="open")
            ]
        return []

    async def get_order_history(self, agent_id: str, limit: int = 100, offset: int = 0) -> List[OrderLogItem]:
        logger.info(f"Fetching order history for agent {agent_id} (limit={limit}, offset={offset}).")
        agent_config = await self.agent_service.get_agent(agent_id)
        if not agent_config:
            logger.warning(f"Agent {agent_id} not found for order history.")
            return []

        # Mocked for both providers in this subtask
        logger.info(f"Provider for agent {agent_id} is {agent_config.execution_provider}. Returning mocked order history.")
        mock_orders: List[OrderLogItem] = []
        statuses: List[Any] = ["filled", "canceled", "partially_filled", "filled"]
        order_types: List[Any] = ["limit", "market", "limit", "stop_loss"]

        for i in range(4): # Create 4 mock historical orders
            asset = "MOCK_COIN_HIST" if agent_config.execution_provider == "hyperliquid" else "PAPER_COIN_HIST"
            qty = 5.0 - i
            price = 200.0 - i * 10
            mock_orders.append(OrderLogItem(
                order_id=str(uuid.uuid4()),
                agent_id=agent_id,
                timestamp=datetime.now(timezone.utc) - datetime.timedelta(days=i + 1),
                asset=asset,
                side="buy" if i % 2 == 0 else "sell",
                order_type=order_types[i],
                quantity=qty,
                limit_price=price if order_types[i] != "market" else None,
                filled_quantity=qty if statuses[i] in ["filled", "partially_filled"] else 0,
                avg_fill_price=price if statuses[i] in ["filled", "partially_filled"] else None,
                status=statuses[i]
            ))
        return mock_orders[offset : offset + limit]

```
