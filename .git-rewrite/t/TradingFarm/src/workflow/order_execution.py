import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

from ..blockchain.base import OrderSide, OrderType
from ..blockchain.hyperliquid import HyperliquidClient
from ..blockchain.sonic import SonicClient
from ..blockchain.vertex import VertexClient
from ..strategies.base import Signal, SignalType
from .base import WorkflowStep

logger = logging.getLogger(__name__)

class OrderExecutionStep(WorkflowStep):
    """Base class for executing orders on exchanges."""
    
    def __init__(self, name: str, exchange: str):
        super().__init__(name)
        self.exchange = exchange.lower()
        
        # Initialize the appropriate client
        if self.exchange == 'hyperliquid':
            self.client = HyperliquidClient()
        elif self.exchange == 'sonic':
            self.client = SonicClient()
        elif self.exchange == 'vertex':
            self.client = VertexClient()
        else:
            raise ValueError(f"Unsupported exchange: {exchange}")
        
        self.executed_orders = {}
    
    def _signal_to_order_side(self, signal_type: SignalType) -> OrderSide:
        """Convert a signal type to an order side."""
        if signal_type == SignalType.BUY:
            return OrderSide.BUY
        elif signal_type == SignalType.SELL:
            return OrderSide.SELL
        elif signal_type == SignalType.EXIT_BUY:
            return OrderSide.SELL  # To exit a buy position, we sell
        elif signal_type == SignalType.EXIT_SELL:
            return OrderSide.BUY   # To exit a sell position, we buy
        else:
            raise ValueError(f"Unsupported signal type: {signal_type}")


class SignalBasedOrderExecutionStep(OrderExecutionStep):
    """Execute orders based on trading signals."""
    
    def __init__(self, exchange: str, order_type: OrderType = OrderType.MARKET, 
                 position_sizing: float = 0.1, max_slippage_percent: float = 0.5):
        super().__init__(f"{exchange} Signal-Based Order Execution", exchange)
        self.order_type = order_type
        self.position_sizing = position_sizing  # Fraction of available balance to use
        self.max_slippage_percent = max_slippage_percent  # Maximum allowed slippage percentage
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute orders based on consensus signals."""
        if 'consensus_signals' not in context:
            logger.warning("No consensus signals found in context. Skipping order execution.")
            return context
        
        consensus_signals = context['consensus_signals']
        executed_orders = {}
        
        # Fetch account balance to determine position sizes
        try:
            balance = await self.client.get_account_balance()
            logger.info(f"Retrieved account balance from {self.exchange}: {balance}")
        except Exception as e:
            logger.error(f"Error fetching account balance from {self.exchange}: {str(e)}", exc_info=True)
            # Set a safe default
            balance = 0
        
        if balance <= 0:
            logger.warning(f"Insufficient balance on {self.exchange}. Skipping order execution.")
            return context
        
        for symbol, signal in consensus_signals.items():
            try:
                # Calculate position size
                if self.exchange == 'hyperliquid' or self.exchange == 'vertex':
                    # For perpetual futures, use leverage (future implementation)
                    position_size = balance * self.position_sizing
                else:
                    # For spot trading
                    position_size = balance * self.position_sizing
                
                # Calculate price with slippage buffer
                price = signal.price
                if self.order_type == OrderType.LIMIT:
                    # Add slippage buffer for limit orders
                    if signal.signal_type in [SignalType.BUY, SignalType.EXIT_SELL]:
                        # For buy orders, we're willing to pay slightly more
                        price = price * (1 + self.max_slippage_percent / 100)
                    else:
                        # For sell orders, we're willing to accept slightly less
                        price = price * (1 - self.max_slippage_percent / 100)
                
                # Convert signal type to order side
                order_side = self._signal_to_order_side(signal.signal_type)
                
                # Execute the order
                order_result = await self.client.place_order(
                    symbol=symbol,
                    side=order_side,
                    order_type=self.order_type,
                    quantity=position_size,
                    price=price if self.order_type == OrderType.LIMIT else None
                )
                
                executed_orders[symbol] = {
                    'order_id': order_result.get('order_id'),
                    'symbol': symbol,
                    'side': order_side.value,
                    'quantity': position_size,
                    'price': price,
                    'timestamp': datetime.now().isoformat(),
                    'signal': signal.to_dict(),
                    'status': 'executed'
                }
                
                logger.info(f"Executed {order_side.value} order for {symbol} at {price:.4f} with size {position_size:.4f}")
            
            except Exception as e:
                logger.error(f"Error executing order for {symbol}: {str(e)}", exc_info=True)
                executed_orders[symbol] = {
                    'symbol': symbol,
                    'side': self._signal_to_order_side(signal.signal_type).value,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat(),
                    'signal': signal.to_dict(),
                    'status': 'failed'
                }
        
        self.executed_orders = executed_orders
        
        # Add executed orders to the context
        if 'executed_orders' not in context:
            context['executed_orders'] = {}
        
        context['executed_orders'][self.exchange] = executed_orders
        
        # Log summary of order execution
        success_count = len([o for o in executed_orders.values() if o['status'] == 'executed'])
        total_count = len(executed_orders)
        logger.info(f"Executed {success_count}/{total_count} orders on {self.exchange}")
        
        return context


class OrderVerificationStep(WorkflowStep):
    """Verify that orders were executed successfully and track their status."""
    
    def __init__(self, exchange: str, verification_retries: int = 3, retry_delay_seconds: int = 2):
        super().__init__(f"{exchange} Order Verification")
        self.exchange = exchange.lower()
        self.verification_retries = verification_retries
        self.retry_delay_seconds = retry_delay_seconds
        
        # Initialize the appropriate client
        if self.exchange == 'hyperliquid':
            self.client = HyperliquidClient()
        elif self.exchange == 'sonic':
            self.client = SonicClient()
        elif self.exchange == 'vertex':
            self.client = VertexClient()
        else:
            raise ValueError(f"Unsupported exchange: {exchange}")
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Verify the status of executed orders."""
        if ('executed_orders' not in context or
            self.exchange not in context['executed_orders']):
            logger.warning(f"No executed orders found for {self.exchange}. Skipping verification.")
            return context
        
        executed_orders = context['executed_orders'][self.exchange]
        verified_orders = {}
        
        for symbol, order_info in executed_orders.items():
            if order_info['status'] == 'failed' or 'order_id' not in order_info:
                # Skip failed orders or orders without an ID
                verified_orders[symbol] = order_info
                continue
            
            order_id = order_info['order_id']
            verified = False
            
            # Try to verify the order status multiple times
            for attempt in range(self.verification_retries):
                try:
                    order_status = await self.client.get_order_status(symbol, order_id)
                    
                    order_info['status'] = order_status.get('status', 'unknown')
                    order_info['filled_quantity'] = order_status.get('filled_quantity', 0)
                    order_info['average_price'] = order_status.get('average_price')
                    
                    if order_info['status'] in ['filled', 'partially_filled']:
                        order_info['verified'] = True
                        verified = True
                        logger.info(f"Verified order {order_id} for {symbol}: {order_info['status']}")
                        break
                    elif order_info['status'] in ['canceled', 'expired', 'rejected']:
                        order_info['verified'] = False
                        logger.warning(f"Order {order_id} for {symbol} has failed status: {order_info['status']}")
                        break
                    
                    # If status is still open/pending, wait and retry
                    await asyncio.sleep(self.retry_delay_seconds)
                
                except Exception as e:
                    logger.error(f"Error verifying order {order_id} for {symbol}: {str(e)}", exc_info=True)
                    await asyncio.sleep(self.retry_delay_seconds)
            
            if not verified:
                logger.warning(f"Could not verify order {order_id} for {symbol} after {self.verification_retries} attempts")
                order_info['verified'] = False
            
            verified_orders[symbol] = order_info
        
        # Update the context with verified orders
        context['executed_orders'][self.exchange] = verified_orders
        
        # Log summary of order verification
        verified_count = len([o for o in verified_orders.values() if o.get('verified', False)])
        total_count = len(verified_orders)
        logger.info(f"Verified {verified_count}/{total_count} orders on {self.exchange}")
        
        return context


class OrderPersistenceStep(WorkflowStep):
    """Persist executed orders to storage for record-keeping and analysis."""
    
    def __init__(self, save_to_file: bool = True, file_path: str = None):
        super().__init__("Order Persistence")
        self.save_to_file = save_to_file
        self.file_path = file_path or "orders.json"
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Persist executed orders to storage."""
        if 'executed_orders' not in context:
            logger.warning("No executed orders found in context. Skipping persistence.")
            return context
        
        executed_orders = context['executed_orders']
        
        if not executed_orders:
            logger.warning("No orders to persist.")
            return context
        
        if self.save_to_file:
            try:
                # Add timestamp to the orders data
                orders_to_save = {
                    'orders': executed_orders,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Save to file
                import json
                with open(self.file_path, 'w') as f:
                    json.dump(orders_to_save, f, indent=2)
                
                logger.info(f"Saved orders to {self.file_path}")
            
            except Exception as e:
                logger.error(f"Error saving orders to file: {str(e)}", exc_info=True)
        
        return context
