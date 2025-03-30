import logging
import asyncio
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta

from ..blockchain.base import OrderSide, OrderType
from ..blockchain.hyperliquid import HyperliquidClient
from ..blockchain.sonic import SonicClient
from ..blockchain.vertex import VertexClient
from ..strategies.base import Signal, SignalType
from .base import WorkflowStep

logger = logging.getLogger(__name__)

class PositionMonitoringStep(WorkflowStep):
    """Monitor open positions and track their performance metrics."""
    
    def __init__(self, exchange: str, monitoring_interval_seconds: int = 60):
        super().__init__(f"{exchange} Position Monitoring")
        self.exchange = exchange.lower()
        self.monitoring_interval_seconds = monitoring_interval_seconds
        self.positions = {}  # Symbol -> Position details
        
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
        """Monitor open positions and update their status."""
        try:
            # Fetch current positions
            positions = await self.client.get_positions()
            self.positions = positions
            
            # Calculate position metrics
            position_metrics = {}
            
            for symbol, position in positions.items():
                # Skip empty positions
                if float(position.get('size', 0)) == 0:
                    continue
                
                # Get current market price
                try:
                    ticker = await self.client.get_ticker(symbol)
                    current_price = float(ticker.get('last_price', 0))
                    
                    # Calculate unrealized PNL
                    entry_price = float(position.get('entry_price', 0))
                    size = float(position.get('size', 0))
                    side = position.get('side', '').upper()
                    
                    if side == 'LONG' or side == 'BUY':
                        unrealized_pnl_pct = (current_price - entry_price) / entry_price * 100
                    elif side == 'SHORT' or side == 'SELL':
                        unrealized_pnl_pct = (entry_price - current_price) / entry_price * 100
                    else:
                        unrealized_pnl_pct = 0
                    
                    # Calculate risk metrics
                    position_metrics[symbol] = {
                        'entry_price': entry_price,
                        'current_price': current_price,
                        'size': size,
                        'side': side,
                        'unrealized_pnl_pct': unrealized_pnl_pct,
                        'updated_at': datetime.now().isoformat()
                    }
                    
                    logger.info(f"Monitoring position for {symbol}: {side} {size} @ {entry_price}, "
                                f"current price: {current_price}, unrealized P/L: {unrealized_pnl_pct:.2f}%")
                
                except Exception as e:
                    logger.error(f"Error calculating metrics for {symbol}: {str(e)}", exc_info=True)
            
            # Store position metrics in context
            if 'position_metrics' not in context:
                context['position_metrics'] = {}
            
            context['position_metrics'][self.exchange] = position_metrics
            
            # Log summary
            logger.info(f"Monitoring {len(position_metrics)} active positions on {self.exchange}")
        
        except Exception as e:
            logger.error(f"Error monitoring positions on {self.exchange}: {str(e)}", exc_info=True)
        
        return context


class StopLossManagementStep(WorkflowStep):
    """Manage stop-loss orders for open positions."""
    
    def __init__(self, exchange: str, default_stop_loss_pct: float = 5.0,
                trailing_stop_enabled: bool = True, trailing_activation_pct: float = 2.0,
                trailing_distance_pct: float = 2.0):
        super().__init__(f"{exchange} Stop-Loss Management")
        self.exchange = exchange.lower()
        self.default_stop_loss_pct = default_stop_loss_pct
        self.trailing_stop_enabled = trailing_stop_enabled
        self.trailing_activation_pct = trailing_activation_pct
        self.trailing_distance_pct = trailing_distance_pct
        self.stop_orders = {}  # Symbol -> Stop order details
        
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
        """Manage stop-loss orders for open positions."""
        if ('position_metrics' not in context or
            self.exchange not in context['position_metrics']):
            logger.warning(f"No position metrics found for {self.exchange}. Skipping stop-loss management.")
            return context
        
        position_metrics = context['position_metrics'][self.exchange]
        
        # Fetch existing stop orders
        try:
            existing_stops = await self.client.get_open_orders(order_type=OrderType.STOP_MARKET)
            # Index by symbol for easy lookup
            existing_stops_by_symbol = {order.get('symbol'): order for order in existing_stops}
        except Exception as e:
            logger.error(f"Error fetching existing stop orders on {self.exchange}: {str(e)}", exc_info=True)
            existing_stops_by_symbol = {}
        
        for symbol, metrics in position_metrics.items():
            try:
                # Skip if there's no position
                if float(metrics.get('size', 0)) == 0:
                    continue
                
                entry_price = metrics['entry_price']
                current_price = metrics['current_price']
                side = metrics['side']
                unrealized_pnl_pct = metrics['unrealized_pnl_pct']
                
                # Calculate stop price
                stop_price = self._calculate_stop_price(entry_price, current_price, side, unrealized_pnl_pct)
                
                # Check if we already have a stop order for this symbol
                if symbol in existing_stops_by_symbol:
                    existing_stop = existing_stops_by_symbol[symbol]
                    existing_stop_price = float(existing_stop.get('price', 0))
                    
                    # Update stop order if needed
                    if self._should_update_stop(side, stop_price, existing_stop_price):
                        # Cancel existing stop
                        await self.client.cancel_order(symbol, existing_stop.get('order_id'))
                        
                        # Place new stop order
                        new_stop = await self._place_stop_order(symbol, side, metrics['size'], stop_price)
                        self.stop_orders[symbol] = new_stop
                        
                        logger.info(f"Updated stop order for {symbol} from {existing_stop_price} to {stop_price}")
                else:
                    # Place new stop order
                    new_stop = await self._place_stop_order(symbol, side, metrics['size'], stop_price)
                    self.stop_orders[symbol] = new_stop
                    
                    logger.info(f"Placed new stop order for {symbol} at {stop_price}")
            
            except Exception as e:
                logger.error(f"Error managing stop-loss for {symbol}: {str(e)}", exc_info=True)
        
        # Store stop orders in context
        if 'stop_orders' not in context:
            context['stop_orders'] = {}
        
        context['stop_orders'][self.exchange] = self.stop_orders
        
        # Log summary
        logger.info(f"Managing {len(self.stop_orders)} stop-loss orders on {self.exchange}")
        
        return context
    
    def _calculate_stop_price(self, entry_price: float, current_price: float,
                             side: str, unrealized_pnl_pct: float) -> float:
        """Calculate stop price based on position and market conditions."""
        side = side.upper()
        
        if side == 'LONG' or side == 'BUY':
            # For long positions
            if unrealized_pnl_pct >= self.trailing_activation_pct and self.trailing_stop_enabled:
                # Trailing stop activated
                return current_price * (1 - self.trailing_distance_pct / 100)
            else:
                # Regular stop-loss
                return entry_price * (1 - self.default_stop_loss_pct / 100)
        
        elif side == 'SHORT' or side == 'SELL':
            # For short positions
            if unrealized_pnl_pct >= self.trailing_activation_pct and self.trailing_stop_enabled:
                # Trailing stop activated
                return current_price * (1 + self.trailing_distance_pct / 100)
            else:
                # Regular stop-loss
                return entry_price * (1 + self.default_stop_loss_pct / 100)
        
        # Fallback
        return entry_price * (1 - self.default_stop_loss_pct / 100)
    
    def _should_update_stop(self, side: str, new_stop: float, existing_stop: float) -> bool:
        """Determine if the stop order should be updated."""
        side = side.upper()
        
        if side == 'LONG' or side == 'BUY':
            # For long positions, raise the stop price if new stop is higher
            return new_stop > existing_stop
        
        elif side == 'SHORT' or side == 'SELL':
            # For short positions, lower the stop price if new stop is lower
            return new_stop < existing_stop
        
        return False
    
    async def _place_stop_order(self, symbol: str, side: str, size: float, stop_price: float) -> Dict:
        """Place a stop-loss order."""
        # Convert position side to order side (opposite for stop-loss)
        side = side.upper()
        order_side = OrderSide.SELL if side == 'LONG' or side == 'BUY' else OrderSide.BUY
        
        try:
            order_result = await self.client.place_order(
                symbol=symbol,
                side=order_side,
                order_type=OrderType.STOP_MARKET,
                quantity=size,
                price=stop_price
            )
            
            return {
                'order_id': order_result.get('order_id'),
                'symbol': symbol,
                'side': order_side.value,
                'quantity': size,
                'stop_price': stop_price,
                'timestamp': datetime.now().isoformat(),
                'status': 'active'
            }
        
        except Exception as e:
            logger.error(f"Error placing stop order for {symbol}: {str(e)}", exc_info=True)
            return {
                'symbol': symbol,
                'side': order_side.value,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'status': 'failed'
            }


class TakeProfitManagementStep(WorkflowStep):
    """Manage take-profit orders for open positions."""
    
    def __init__(self, exchange: str, default_take_profit_pct: float = 10.0,
                partial_tp_enabled: bool = True, partial_tp_levels: List[Dict[str, float]] = None):
        super().__init__(f"{exchange} Take-Profit Management")
        self.exchange = exchange.lower()
        self.default_take_profit_pct = default_take_profit_pct
        self.partial_tp_enabled = partial_tp_enabled
        
        # Default partial take-profit levels if not provided
        self.partial_tp_levels = partial_tp_levels or [
            {'percent': 5.0, 'size_percent': 30.0},  # Take 30% of position off at 5% profit
            {'percent': 10.0, 'size_percent': 30.0},  # Take another 30% off at 10% profit
            {'percent': 15.0, 'size_percent': 20.0},  # Take another 20% off at 15% profit
            {'percent': 20.0, 'size_percent': 20.0}   # Take the final 20% off at 20% profit
        ]
        
        self.tp_orders = {}  # Symbol -> Take-profit order details
        
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
        """Manage take-profit orders for open positions."""
        if ('position_metrics' not in context or
            self.exchange not in context['position_metrics']):
            logger.warning(f"No position metrics found for {self.exchange}. Skipping take-profit management.")
            return context
        
        position_metrics = context['position_metrics'][self.exchange]
        
        # Fetch existing limit orders (potential take-profit orders)
        try:
            existing_tps = await self.client.get_open_orders(order_type=OrderType.LIMIT)
            # Index by symbol for easy lookup
            existing_tps_by_symbol = {}
            for order in existing_tps:
                symbol = order.get('symbol')
                if symbol not in existing_tps_by_symbol:
                    existing_tps_by_symbol[symbol] = []
                existing_tps_by_symbol[symbol].append(order)
        except Exception as e:
            logger.error(f"Error fetching existing take-profit orders on {self.exchange}: {str(e)}", exc_info=True)
            existing_tps_by_symbol = {}
        
        for symbol, metrics in position_metrics.items():
            try:
                # Skip if there's no position
                if float(metrics.get('size', 0)) == 0:
                    continue
                
                entry_price = metrics['entry_price']
                side = metrics['side']
                size = metrics['size']
                
                # Calculate take-profit prices and sizes
                if self.partial_tp_enabled:
                    tp_orders = self._calculate_partial_take_profits(symbol, side, entry_price, size)
                else:
                    # Single take-profit
                    tp_price = self._calculate_take_profit_price(entry_price, side)
                    tp_orders = [{
                        'symbol': symbol,
                        'price': tp_price,
                        'size': size,
                        'level': 1
                    }]
                
                # Cancel existing take-profit orders if they don't match our targets
                existing_tp_orders = existing_tps_by_symbol.get(symbol, [])
                if existing_tp_orders:
                    for order in existing_tp_orders:
                        await self.client.cancel_order(symbol, order.get('order_id'))
                    logger.info(f"Cancelled {len(existing_tp_orders)} existing take-profit orders for {symbol}")
                
                # Place new take-profit orders
                placed_tp_orders = []
                for tp in tp_orders:
                    order_result = await self._place_take_profit_order(
                        symbol=tp['symbol'],
                        side=side,
                        size=tp['size'],
                        price=tp['price']
                    )
                    
                    placed_tp_orders.append({
                        'order_id': order_result.get('order_id'),
                        'symbol': symbol,
                        'price': tp['price'],
                        'size': tp['size'],
                        'level': tp.get('level', 1),
                        'timestamp': datetime.now().isoformat(),
                        'status': 'active' if 'order_id' in order_result else 'failed'
                    })
                
                self.tp_orders[symbol] = placed_tp_orders
                logger.info(f"Placed {len(placed_tp_orders)} take-profit orders for {symbol}")
            
            except Exception as e:
                logger.error(f"Error managing take-profit for {symbol}: {str(e)}", exc_info=True)
        
        # Store take-profit orders in context
        if 'tp_orders' not in context:
            context['tp_orders'] = {}
        
        context['tp_orders'][self.exchange] = self.tp_orders
        
        # Log summary
        total_tps = sum(len(orders) for orders in self.tp_orders.values())
        logger.info(f"Managing {total_tps} take-profit orders across {len(self.tp_orders)} symbols on {self.exchange}")
        
        return context
    
    def _calculate_take_profit_price(self, entry_price: float, side: str) -> float:
        """Calculate a single take-profit price based on entry price and position side."""
        side = side.upper()
        
        if side == 'LONG' or side == 'BUY':
            # For long positions, take profit is above entry
            return entry_price * (1 + self.default_take_profit_pct / 100)
        
        elif side == 'SHORT' or side == 'SELL':
            # For short positions, take profit is below entry
            return entry_price * (1 - self.default_take_profit_pct / 100)
        
        # Fallback
        return entry_price * (1 + self.default_take_profit_pct / 100)
    
    def _calculate_partial_take_profits(self, symbol: str, side: str, entry_price: float, total_size: float) -> List[Dict]:
        """Calculate partial take-profit orders with different price levels and sizes."""
        side = side.upper()
        tp_orders = []
        
        for i, level in enumerate(self.partial_tp_levels):
            tp_percent = level['percent']
            size_percent = level['size_percent']
            
            # Calculate take-profit price
            if side == 'LONG' or side == 'BUY':
                tp_price = entry_price * (1 + tp_percent / 100)
            else:  # SHORT or SELL
                tp_price = entry_price * (1 - tp_percent / 100)
            
            # Calculate size for this level
            tp_size = total_size * (size_percent / 100)
            
            tp_orders.append({
                'symbol': symbol,
                'price': tp_price,
                'size': tp_size,
                'level': i + 1
            })
        
        return tp_orders
    
    async def _place_take_profit_order(self, symbol: str, side: str, size: float, price: float) -> Dict:
        """Place a take-profit limit order."""
        # Convert position side to order side (opposite for take-profit)
        side = side.upper()
        order_side = OrderSide.SELL if side == 'LONG' or side == 'BUY' else OrderSide.BUY
        
        try:
            order_result = await self.client.place_order(
                symbol=symbol,
                side=order_side,
                order_type=OrderType.LIMIT,
                quantity=size,
                price=price
            )
            
            return {
                'order_id': order_result.get('order_id'),
                'symbol': symbol,
                'side': order_side.value,
                'quantity': size,
                'price': price,
                'timestamp': datetime.now().isoformat(),
                'status': 'active'
            }
        
        except Exception as e:
            logger.error(f"Error placing take-profit order for {symbol}: {str(e)}", exc_info=True)
            return {
                'symbol': symbol,
                'side': order_side.value,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'status': 'failed'
            }


class RiskMetricsCalculationStep(WorkflowStep):
    """Calculate portfolio-wide risk metrics for monitoring."""
    
    def __init__(self, exchanges: List[str]):
        super().__init__("Risk Metrics Calculation")
        self.exchanges = exchanges
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate portfolio-wide risk metrics."""
        risk_metrics = {
            'timestamp': datetime.now().isoformat(),
            'portfolio_exposure': 0.0,
            'margin_usage_percent': 0.0,
            'unrealized_pnl': 0.0,
            'daily_drawdown': 0.0,
            'position_concentration': {},
            'exchanges': {}
        }
        
        total_balance = 0.0
        total_position_value = 0.0
        total_unrealized_pnl = 0.0
        position_values_by_symbol = {}
        
        # Calculate metrics for each exchange
        for exchange in self.exchanges:
            exchange_metrics = {
                'balance': 0.0,
                'position_value': 0.0,
                'margin_used': 0.0,
                'unrealized_pnl': 0.0,
                'margin_ratio': 0.0
            }
            
            # Extract position metrics
            if ('position_metrics' in context and 
                exchange in context['position_metrics']):
                position_metrics = context['position_metrics'][exchange]
                
                for symbol, metrics in position_metrics.items():
                    size = float(metrics.get('size', 0))
                    price = float(metrics.get('current_price', 0))
                    
                    if size == 0 or price == 0:
                        continue
                    
                    # Calculate position value
                    position_value = size * price
                    exchange_metrics['position_value'] += position_value
                    total_position_value += position_value
                    
                    # Track position value by symbol
                    if symbol not in position_values_by_symbol:
                        position_values_by_symbol[symbol] = 0.0
                    position_values_by_symbol[symbol] += position_value
                    
                    # Sum unrealized PNL
                    unrealized_pnl_pct = float(metrics.get('unrealized_pnl_pct', 0.0))
                    unrealized_pnl = position_value * (unrealized_pnl_pct / 100)
                    exchange_metrics['unrealized_pnl'] += unrealized_pnl
                    total_unrealized_pnl += unrealized_pnl
            
            # Extract balance
            # Note: In a real implementation, we would get this from the exchange
            # For now, we'll use a placeholder value
            exchange_metrics['balance'] = 10000.0  # Placeholder
            total_balance += exchange_metrics['balance']
            
            # Calculate margin ratio
            if exchange_metrics['balance'] > 0:
                exchange_metrics['margin_ratio'] = (
                    exchange_metrics['position_value'] / exchange_metrics['balance']
                )
            
            risk_metrics['exchanges'][exchange] = exchange_metrics
        
        # Calculate portfolio-wide metrics
        if total_balance > 0:
            risk_metrics['portfolio_exposure'] = total_position_value / total_balance
            risk_metrics['margin_usage_percent'] = (total_position_value / total_balance) * 100
        
        risk_metrics['unrealized_pnl'] = total_unrealized_pnl
        
        # Calculate position concentration
        if total_position_value > 0:
            for symbol, value in position_values_by_symbol.items():
                risk_metrics['position_concentration'][symbol] = (value / total_position_value) * 100
        
        # Store risk metrics in context
        context['risk_metrics'] = risk_metrics
        
        # Log summary of risk metrics
        logger.info(f"Portfolio exposure: {risk_metrics['portfolio_exposure']:.2f}x, "
                    f"Margin usage: {risk_metrics['margin_usage_percent']:.2f}%, "
                    f"Unrealized P/L: {risk_metrics['unrealized_pnl']:.2f}")
        
        return context


class RiskAlertStep(WorkflowStep):
    """Generate alerts when risk thresholds are exceeded."""
    
    def __init__(self, max_portfolio_exposure: float = 2.0, max_position_concentration: float = 30.0,
                max_drawdown_percent: float = 5.0, alert_methods: List[str] = None):
        super().__init__("Risk Alerts")
        self.max_portfolio_exposure = max_portfolio_exposure
        self.max_position_concentration = max_position_concentration
        self.max_drawdown_percent = max_drawdown_percent
        self.alert_methods = alert_methods or ['log']  # Default to logging only
        self.alerts = []
    
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Check risk metrics against thresholds and generate alerts."""
        if 'risk_metrics' not in context:
            logger.warning("No risk metrics found in context. Skipping risk alerts.")
            return context
        
        risk_metrics = context['risk_metrics']
        alerts = []
        
        # Check portfolio exposure
        if risk_metrics['portfolio_exposure'] > self.max_portfolio_exposure:
            alert = {
                'type': 'portfolio_exposure',
                'level': 'warning',
                'message': f"Portfolio exposure ({risk_metrics['portfolio_exposure']:.2f}x) exceeds threshold ({self.max_portfolio_exposure:.2f}x)",
                'timestamp': datetime.now().isoformat()
            }
            alerts.append(alert)
        
        # Check position concentration
        for symbol, concentration in risk_metrics['position_concentration'].items():
            if concentration > self.max_position_concentration:
                alert = {
                    'type': 'position_concentration',
                    'level': 'warning',
                    'message': f"Position concentration for {symbol} ({concentration:.2f}%) exceeds threshold ({self.max_position_concentration:.2f}%)",
                    'timestamp': datetime.now().isoformat()
                }
                alerts.append(alert)
        
        # Check drawdown
        if risk_metrics.get('daily_drawdown', 0) > self.max_drawdown_percent:
            alert = {
                'type': 'drawdown',
                'level': 'warning',
                'message': f"Daily drawdown ({risk_metrics['daily_drawdown']:.2f}%) exceeds threshold ({self.max_drawdown_percent:.2f}%)",
                'timestamp': datetime.now().isoformat()
            }
            alerts.append(alert)
        
        # Process alerts
        for alert in alerts:
            # Log the alert
            if 'log' in self.alert_methods:
                if alert['level'] == 'warning':
                    logger.warning(alert['message'])
                elif alert['level'] == 'critical':
                    logger.critical(alert['message'])
            
            # Additional alert methods could be implemented here
            # For example, sending email, SMS, or push notifications
        
        self.alerts = alerts
        
        # Store alerts in context
        if 'risk_alerts' not in context:
            context['risk_alerts'] = []
        
        context['risk_alerts'].extend(alerts)
        
        # Log summary of alerts
        if alerts:
            logger.warning(f"Generated {len(alerts)} risk alerts")
        else:
            logger.info("No risk thresholds exceeded")
        
        return context
