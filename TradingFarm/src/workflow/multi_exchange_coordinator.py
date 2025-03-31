"""
Multi-Exchange Coordination Module

Provides coordination of trading operations across multiple exchanges including:
- Order synchronization
- Position balancing
- Cross-exchange arbitrage
- Consolidated account views
- Position reconciliation
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union, Set
from datetime import datetime
import json

from ..blockchain.base import Order, OrderSide, OrderType, Position
from ..blockchain.hyperliquid import HyperliquidClient
from ..blockchain.sonic import SonicClient
from ..blockchain.vertex import VertexClient
from .base import WorkflowStep
from .advanced_order_execution import AdvancedOrderExecutionStep
from ..risk.risk_manager import RiskManager

logger = logging.getLogger(__name__)

class ExchangeClientFactory:
    """Factory for creating exchange clients."""
    
    @staticmethod
    def create_client(exchange: str) -> Any:
        """Create an exchange client based on exchange name."""
        exchange = exchange.lower()
        
        if exchange == 'hyperliquid':
            return HyperliquidClient()
        elif exchange == 'sonic':
            return SonicClient()
        elif exchange == 'vertex':
            return VertexClient()
        else:
            raise ValueError(f"Unsupported exchange: {exchange}")


class PositionReconciler:
    """
    Reconciles positions across exchanges to ensure consistency.
    
    Features:
    - Detect discrepancies between expected and actual positions
    - Reconcile inconsistencies with corrective actions
    - Generate reconciliation reports
    """
    
    def __init__(self, exchange_clients: Dict[str, Any]):
        """
        Initialize position reconciler.
        
        Args:
            exchange_clients: Dictionary of exchange clients by exchange name
        """
        self.exchange_clients = exchange_clients
        self.reconciliation_history = []
    
    async def get_actual_positions(self) -> Dict[str, Dict[str, Position]]:
        """
        Get actual positions from all exchanges.
        
        Returns:
            Dictionary of positions by exchange and symbol
        """
        positions = {}
        
        for exchange, client in self.exchange_clients.items():
            try:
                exchange_positions = await client.get_positions()
                positions[exchange] = {pos.symbol: pos for pos in exchange_positions}
                logger.info(f"Retrieved {len(exchange_positions)} positions from {exchange}")
            except Exception as e:
                logger.error(f"Error retrieving positions from {exchange}: {str(e)}")
                positions[exchange] = {}
        
        return positions
    
    async def get_expected_positions(self) -> Dict[str, Dict[str, Position]]:
        """
        Get expected positions from trading database.
        
        Returns:
            Dictionary of expected positions by exchange and symbol
        """
        # This would typically query a trading database for expected positions
        # For now, we'll return a placeholder
        logger.info("Retrieving expected positions from database")
        
        # Placeholder implementation
        expected_positions = {}
        
        # TODO: Implement actual position tracking database integration
        
        return expected_positions
    
    async def reconcile_positions(self) -> Dict[str, Any]:
        """
        Reconcile positions across exchanges.
        
        Returns:
            Reconciliation report
        """
        actual_positions = await self.get_actual_positions()
        expected_positions = await self.get_expected_positions()
        
        discrepancies = {}
        actions_taken = {}
        
        # Check each exchange for discrepancies
        for exchange in self.exchange_clients.keys():
            exchange_discrepancies = []
            exchange_actions = []
            
            actual = actual_positions.get(exchange, {})
            expected = expected_positions.get(exchange, {})
            
            # Check for missing positions (expected but not actual)
            for symbol, expected_pos in expected.items():
                if symbol not in actual:
                    exchange_discrepancies.append({
                        "type": "missing",
                        "symbol": symbol,
                        "expected": expected_pos.__dict__,
                        "actual": None
                    })
                    
                    # Action: Log the discrepancy, could implement automatic correction
                    exchange_actions.append({
                        "type": "log",
                        "description": f"Position for {symbol} not found on {exchange}"
                    })
                    
                else:
                    # Position exists but may have different attributes
                    actual_pos = actual[symbol]
                    
                    if abs(actual_pos.quantity - expected_pos.quantity) > 0.001:
                        exchange_discrepancies.append({
                            "type": "quantity_mismatch",
                            "symbol": symbol,
                            "expected": expected_pos.__dict__,
                            "actual": actual_pos.__dict__
                        })
                        
                        # Action: Log the discrepancy, could implement automatic correction
                        exchange_actions.append({
                            "type": "log",
                            "description": f"Quantity mismatch for {symbol} on {exchange}: "
                                         f"expected {expected_pos.quantity}, actual {actual_pos.quantity}"
                        })
            
            # Check for unexpected positions (actual but not expected)
            for symbol, actual_pos in actual.items():
                if symbol not in expected:
                    exchange_discrepancies.append({
                        "type": "unexpected",
                        "symbol": symbol,
                        "expected": None,
                        "actual": actual_pos.__dict__
                    })
                    
                    # Action: Log the discrepancy, could implement automatic correction
                    exchange_actions.append({
                        "type": "log",
                        "description": f"Unexpected position for {symbol} found on {exchange}"
                    })
            
            if exchange_discrepancies:
                discrepancies[exchange] = exchange_discrepancies
                actions_taken[exchange] = exchange_actions
        
        # Generate reconciliation report
        report = {
            "timestamp": datetime.now().isoformat(),
            "discrepancies": discrepancies,
            "actions_taken": actions_taken,
            "summary": {
                "exchanges_checked": len(self.exchange_clients),
                "exchanges_with_discrepancies": len(discrepancies),
                "total_discrepancies": sum(len(discs) for discs in discrepancies.values()),
                "total_actions": sum(len(acts) for acts in actions_taken.values())
            }
        }
        
        # Add to history
        self.reconciliation_history.append(report)
        
        # Log summary
        logger.info(f"Position reconciliation complete: "
                   f"{report['summary']['total_discrepancies']} discrepancies found across "
                   f"{report['summary']['exchanges_with_discrepancies']} exchanges")
        
        return report


class MultiExchangeCoordinator(WorkflowStep):
    """
    Coordinates trading operations across multiple exchanges.
    
    Features:
    - Synchronized order placement
    - Position balancing
    - Risk distribution
    - Consolidated reporting
    """
    
    def __init__(self, 
                 exchanges: List[str], 
                 risk_manager: Optional[RiskManager] = None,
                 position_balancing: bool = True,
                 automatic_reconciliation: bool = True):
        """
        Initialize multi-exchange coordinator.
        
        Args:
            exchanges: List of exchanges to coordinate
            risk_manager: Risk manager for validating orders
            position_balancing: Whether to balance positions across exchanges
            automatic_reconciliation: Whether to automatically reconcile positions
        """
        super().__init__("Multi-Exchange Coordinator")
        self.exchanges = exchanges
        self.risk_manager = risk_manager
        self.position_balancing = position_balancing
        self.automatic_reconciliation = automatic_reconciliation
        
        # Initialize exchange clients
        self.exchange_clients = {}
        for exchange in exchanges:
            try:
                self.exchange_clients[exchange] = ExchangeClientFactory.create_client(exchange)
                logger.info(f"Initialized {exchange} client")
            except Exception as e:
                logger.error(f"Error initializing {exchange} client: {str(e)}")
        
        # Initialize advanced order execution steps
        self.execution_steps = {}
        for exchange in exchanges:
            if exchange in self.exchange_clients:
                self.execution_steps[exchange] = AdvancedOrderExecutionStep(
                    f"{exchange} Advanced Order Execution", 
                    exchange,
                    risk_manager
                )
                logger.info(f"Initialized execution step for {exchange}")
        
        # Initialize position reconciler
        self.position_reconciler = PositionReconciler(self.exchange_clients)
        
        logger.info(f"MultiExchangeCoordinator initialized with {len(exchanges)} exchanges")
    
    async def get_consolidated_balances(self) -> Dict[str, float]:
        """
        Get consolidated balances across all exchanges.
        
        Returns:
            Dictionary of asset balances
        """
        consolidated = {}
        
        for exchange, client in self.exchange_clients.items():
            try:
                balances = await client.get_account_balance()
                
                # Add balances to consolidated view
                for asset, amount in balances.items():
                    if asset in consolidated:
                        consolidated[asset] += amount
                    else:
                        consolidated[asset] = amount
                
                logger.info(f"Retrieved balances from {exchange}")
            except Exception as e:
                logger.error(f"Error retrieving balances from {exchange}: {str(e)}")
        
        return consolidated
    
    async def distribute_order(self, order: Order, distribution: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Distribute an order across multiple exchanges.
        
        Args:
            order: Order to distribute
            distribution: Distribution percentages by exchange (if None, equal distribution)
            
        Returns:
            Order results by exchange
        """
        if not self.exchange_clients:
            logger.error("No exchange clients available")
            return {"status": "failed", "reason": "no_exchanges_available"}
        
        # Calculate distribution if not provided
        if distribution is None:
            exchange_count = len(self.exchange_clients)
            distribution = {exchange: 1.0 / exchange_count for exchange in self.exchange_clients.keys()}
        
        # Validate distribution
        total_pct = sum(distribution.values())
        if abs(total_pct - 1.0) > 0.001:
            logger.warning(f"Distribution percentages do not sum to 1.0: {total_pct}")
            # Normalize
            distribution = {ex: pct / total_pct for ex, pct in distribution.items()}
        
        # Distribute orders
        results = {}
        order_tasks = []
        
        for exchange, percentage in distribution.items():
            if exchange not in self.exchange_clients:
                logger.warning(f"Exchange {exchange} not available")
                continue
            
            # Create a copy of the order with adjusted quantity
            distributed_order = Order(
                symbol=order.symbol,
                side=order.side,
                order_type=order.order_type,
                quantity=order.quantity * percentage,
                price=order.price,
                stop_price=order.stop_price,
                time_in_force=order.time_in_force,
                client_order_id=f"{order.client_order_id or 'multi'}_{exchange}" if order.client_order_id else None,
                leverage=order.leverage,
                reduce_only=order.reduce_only,
                post_only=order.post_only,
                trailing_delta=order.trailing_delta,
                take_profit_price=order.take_profit_price,
                iceberg_qty=order.iceberg_qty if order.iceberg_qty is not None else None,
                linked_order_id=order.linked_order_id,
                activation_price=order.activation_price,
                callback_rate=order.callback_rate
            )
            
            # Skip if quantity is too small
            if distributed_order.quantity <= 0:
                logger.warning(f"Skipping order on {exchange} due to zero quantity")
                continue
            
            # Check if order complies with risk limits
            if self.risk_manager and not self.risk_manager.validate_order(distributed_order):
                logger.warning(f"Order rejected by risk manager for {exchange}")
                results[exchange] = {"status": "rejected", "reason": "risk_limits"}
                continue
            
            # Place order asynchronously
            task = asyncio.create_task(
                self.exchange_clients[exchange].create_order(distributed_order)
            )
            order_tasks.append((exchange, task))
        
        # Wait for all order tasks to complete
        for exchange, task in order_tasks:
            try:
                result = await task
                results[exchange] = result
                logger.info(f"Order placed on {exchange}: {result}")
            except Exception as e:
                logger.error(f"Error placing order on {exchange}: {str(e)}")
                results[exchange] = {"status": "failed", "error": str(e)}
        
        return results
    
    async def balance_positions(self) -> Dict[str, Any]:
        """
        Balance positions across exchanges.
        
        Returns:
            Position balancing results
        """
        if not self.position_balancing:
            logger.info("Position balancing is disabled")
            return {"status": "skipped", "reason": "feature_disabled"}
        
        # Get positions from all exchanges
        positions_by_exchange = {}
        for exchange, client in self.exchange_clients.items():
            try:
                positions = await client.get_positions()
                positions_by_exchange[exchange] = {pos.symbol: pos for pos in positions}
                logger.info(f"Retrieved {len(positions)} positions from {exchange}")
            except Exception as e:
                logger.error(f"Error retrieving positions from {exchange}: {str(e)}")
                positions_by_exchange[exchange] = {}
        
        # Calculate imbalances
        symbols = set()
        for exchange_positions in positions_by_exchange.values():
            symbols.update(exchange_positions.keys())
        
        imbalances = {}
        for symbol in symbols:
            # Calculate average position across exchanges
            total_quantity = 0
            exchange_count = 0
            
            for exchange, positions in positions_by_exchange.items():
                if symbol in positions:
                    total_quantity += positions[symbol].quantity
                    exchange_count += 1
            
            if exchange_count == 0:
                continue
            
            avg_quantity = total_quantity / exchange_count
            
            # Calculate imbalances
            symbol_imbalances = {}
            for exchange, positions in positions_by_exchange.items():
                if symbol in positions:
                    imbalance = positions[symbol].quantity - avg_quantity
                    if abs(imbalance) > 0.001:  # Only consider significant imbalances
                        symbol_imbalances[exchange] = imbalance
            
            if symbol_imbalances:
                imbalances[symbol] = symbol_imbalances
        
        # Take balancing actions if needed
        balancing_actions = []
        
        for symbol, symbol_imbalances in imbalances.items():
            # For now, just log imbalances
            # TODO: Implement automatic balancing actions
            
            logger.info(f"Position imbalances for {symbol}: {symbol_imbalances}")
            balancing_actions.append({
                "symbol": symbol,
                "imbalances": symbol_imbalances,
                "action": "log",  # No actual balancing yet
                "description": f"Position imbalances detected for {symbol}"
            })
        
        return {
            "timestamp": datetime.now().isoformat(),
            "imbalances": imbalances,
            "actions": balancing_actions
        }
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the multi-exchange coordination workflow.
        
        Args:
            context: Workflow context
            
        Returns:
            Updated context
        """
        # Process orders
        if 'orders' in context:
            orders = context['orders']
            executed_orders = {}
            
            for order_id, order_data in orders.items():
                distribution = order_data.get('distribution')
                
                # Create Order object
                order = Order(
                    symbol=order_data.get('symbol'),
                    side=OrderSide.BUY if order_data.get('side', 'BUY').upper() == 'BUY' else OrderSide.SELL,
                    order_type=OrderType(order_data.get('order_type', 'MARKET')),
                    quantity=order_data.get('quantity', 0),
                    price=order_data.get('price'),
                    stop_price=order_data.get('stop_price'),
                    time_in_force=TimeInForce(order_data.get('time_in_force', 'GTC')),
                    client_order_id=order_data.get('client_order_id'),
                    leverage=order_data.get('leverage'),
                    reduce_only=order_data.get('reduce_only', False),
                    post_only=order_data.get('post_only', False),
                    trailing_delta=order_data.get('trailing_delta'),
                    take_profit_price=order_data.get('take_profit_price'),
                    iceberg_qty=order_data.get('iceberg_qty'),
                    linked_order_id=order_data.get('linked_order_id'),
                    activation_price=order_data.get('activation_price'),
                    callback_rate=order_data.get('callback_rate')
                )
                
                # Distribute order
                results = await self.distribute_order(order, distribution)
                executed_orders[order_id] = results
                
                logger.info(f"Distributed order {order_id} across {len(results)} exchanges")
            
            # Add executed orders to context
            if 'executed_orders' not in context:
                context['executed_orders'] = {}
            
            context['executed_orders']['multi_exchange'] = executed_orders
        
        # Perform position reconciliation if enabled
        if self.automatic_reconciliation:
            reconciliation_report = await self.position_reconciler.reconcile_positions()
            
            # Add reconciliation report to context
            if 'reconciliation' not in context:
                context['reconciliation'] = {}
            
            context['reconciliation']['latest'] = reconciliation_report
            
            logger.info(f"Performed position reconciliation with {reconciliation_report['summary']['total_discrepancies']} discrepancies")
        
        # Balance positions if enabled
        if self.position_balancing:
            balancing_results = await self.balance_positions()
            
            # Add balancing results to context
            if 'position_balancing' not in context:
                context['position_balancing'] = {}
            
            context['position_balancing']['latest'] = balancing_results
            
            logger.info(f"Performed position balancing across exchanges")
        
        # Get consolidated balances
        consolidated_balances = await self.get_consolidated_balances()
        
        # Add consolidated balances to context
        context['consolidated_balances'] = consolidated_balances
        
        logger.info(f"Multi-exchange coordination workflow completed")
        
        return context
