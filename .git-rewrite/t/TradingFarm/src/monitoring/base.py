import logging
import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Base class for collecting metrics from various sources."""
    
    def __init__(self, storage_path: str = None):
        """
        Initialize the metrics collector.
        
        Args:
            storage_path: Path to store collected metrics
        """
        self.storage_path = storage_path or "metrics"
        self.metrics = {}
        
        # Create storage directory if it doesn't exist
        if storage_path and not os.path.exists(storage_path):
            os.makedirs(storage_path)
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """
        Collect metrics from the source.
        
        Returns:
            Dictionary of collected metrics
        """
        raise NotImplementedError("Subclasses must implement collect_metrics")
    
    def save_metrics(self, metrics: Dict[str, Any], filename: str = None) -> None:
        """
        Save metrics to storage.
        
        Args:
            metrics: Dictionary of metrics to save
            filename: Custom filename to use, otherwise timestamp-based
        """
        if not self.storage_path:
            return
        
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"metrics_{timestamp}.json"
        
        file_path = os.path.join(self.storage_path, filename)
        
        try:
            with open(file_path, 'w') as f:
                json.dump(metrics, f, indent=2, default=str)
            
            logger.info(f"Saved metrics to {file_path}")
        except Exception as e:
            logger.error(f"Error saving metrics to {file_path}: {str(e)}", exc_info=True)
    
    def load_metrics(self, filename: str = None, timespan: timedelta = None) -> Dict[str, Any]:
        """
        Load metrics from storage.
        
        Args:
            filename: Specific file to load, or None to load the most recent
            timespan: If set, load all metrics within this timespan from now
            
        Returns:
            Dictionary of loaded metrics, or empty dict if not found
        """
        if not self.storage_path or not os.path.exists(self.storage_path):
            return {}
        
        try:
            if filename:
                file_path = os.path.join(self.storage_path, filename)
                if os.path.exists(file_path):
                    with open(file_path, 'r') as f:
                        return json.load(f)
                return {}
            
            if timespan:
                # Load all metrics files within the timespan
                cutoff_time = datetime.now() - timespan
                combined_metrics = {}
                
                for filename in os.listdir(self.storage_path):
                    if not filename.startswith("metrics_") or not filename.endswith(".json"):
                        continue
                    
                    try:
                        # Extract timestamp from filename (metrics_YYYYMMDD_HHMMSS.json)
                        timestamp_str = filename[8:-5]  # Remove "metrics_" and ".json"
                        file_time = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                        
                        if file_time >= cutoff_time:
                            file_path = os.path.join(self.storage_path, filename)
                            with open(file_path, 'r') as f:
                                metrics = json.load(f)
                                
                                # Merge metrics by timestamp
                                timestamp = metrics.get('timestamp', file_time.isoformat())
                                if timestamp not in combined_metrics:
                                    combined_metrics[timestamp] = metrics
                                else:
                                    # Merge dictionaries
                                    for key, value in metrics.items():
                                        if key != 'timestamp':
                                            combined_metrics[timestamp][key] = value
                    except Exception as e:
                        logger.error(f"Error processing metrics file {filename}: {str(e)}", exc_info=True)
                
                return combined_metrics
            
            # If no filename or timespan provided, load the most recent file
            metric_files = [f for f in os.listdir(self.storage_path) 
                           if f.startswith("metrics_") and f.endswith(".json")]
            
            if not metric_files:
                return {}
            
            # Sort by timestamp (newest first)
            metric_files.sort(reverse=True)
            latest_file = os.path.join(self.storage_path, metric_files[0])
            
            with open(latest_file, 'r') as f:
                return json.load(f)
        
        except Exception as e:
            logger.error(f"Error loading metrics: {str(e)}", exc_info=True)
            return {}


class SignalMetricsCollector(MetricsCollector):
    """Collect metrics about trading signals."""
    
    def __init__(self, signals_path: str, storage_path: str = None):
        """
        Initialize the signal metrics collector.
        
        Args:
            signals_path: Path to the signals JSON file
            storage_path: Path to store collected metrics
        """
        super().__init__(storage_path)
        self.signals_path = signals_path
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """
        Collect metrics about trading signals.
        
        Returns:
            Dictionary of signal metrics
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'signal_count': 0,
            'signal_types': {},
            'signal_by_symbol': {},
            'signal_by_strategy': {},
            'signal_by_timeframe': {},
            'avg_confidence': 0.0
        }
        
        try:
            if not os.path.exists(self.signals_path):
                logger.warning(f"Signals file not found: {self.signals_path}")
                return metrics
            
            with open(self.signals_path, 'r') as f:
                signals_data = json.load(f)
            
            # Process raw signals
            raw_signals = signals_data.get('raw_signals', {})
            filtered_signals = signals_data.get('filtered_signals', {})
            consensus_signals = signals_data.get('consensus_signals', {})
            
            # Count signals by type
            signal_count = 0
            confidence_sum = 0.0
            
            for symbol, signals in filtered_signals.items():
                if not isinstance(signals, list):
                    continue
                
                signal_count += len(signals)
                metrics['signal_by_symbol'][symbol] = len(signals)
                
                for signal in signals:
                    # Count by signal type
                    signal_type = signal.get('signal_type', 'unknown')
                    if signal_type not in metrics['signal_types']:
                        metrics['signal_types'][signal_type] = 0
                    metrics['signal_types'][signal_type] += 1
                    
                    # Count by strategy
                    strategy = signal.get('strategy_name', 'unknown')
                    if strategy not in metrics['signal_by_strategy']:
                        metrics['signal_by_strategy'][strategy] = 0
                    metrics['signal_by_strategy'][strategy] += 1
                    
                    # Count by timeframe
                    timeframe = signal.get('timeframe', 'unknown')
                    if timeframe not in metrics['signal_by_timeframe']:
                        metrics['signal_by_timeframe'][timeframe] = 0
                    metrics['signal_by_timeframe'][timeframe] += 1
                    
                    # Sum confidence for average
                    confidence_sum += signal.get('confidence', 0.0)
            
            # Calculate average confidence
            if signal_count > 0:
                metrics['avg_confidence'] = confidence_sum / signal_count
            
            metrics['signal_count'] = signal_count
            metrics['consensus_count'] = len(consensus_signals)
            
            # Count buy vs sell signals
            buy_signals = metrics['signal_types'].get('BUY', 0) + metrics['signal_types'].get('EXIT_SELL', 0)
            sell_signals = metrics['signal_types'].get('SELL', 0) + metrics['signal_types'].get('EXIT_BUY', 0)
            
            metrics['buy_sell_ratio'] = buy_signals / sell_signals if sell_signals > 0 else float('inf')
            
            return metrics
        
        except Exception as e:
            logger.error(f"Error collecting signal metrics: {str(e)}", exc_info=True)
            return metrics


class OrderMetricsCollector(MetricsCollector):
    """Collect metrics about executed orders."""
    
    def __init__(self, orders_path: str, storage_path: str = None):
        """
        Initialize the order metrics collector.
        
        Args:
            orders_path: Path to the orders JSON file
            storage_path: Path to store collected metrics
        """
        super().__init__(storage_path)
        self.orders_path = orders_path
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """
        Collect metrics about executed orders.
        
        Returns:
            Dictionary of order metrics
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'total_orders': 0,
            'successful_orders': 0,
            'failed_orders': 0,
            'orders_by_exchange': {},
            'orders_by_symbol': {},
            'orders_by_side': {
                'BUY': 0,
                'SELL': 0
            },
            'execution_success_rate': 0.0,
            'avg_execution_time': 0.0
        }
        
        try:
            if not os.path.exists(self.orders_path):
                logger.warning(f"Orders file not found: {self.orders_path}")
                return metrics
            
            with open(self.orders_path, 'r') as f:
                orders_data = json.load(f)
            
            orders = orders_data.get('orders', {})
            
            total_orders = 0
            successful_orders = 0
            execution_times = []
            
            for exchange, exchange_orders in orders.items():
                if exchange not in metrics['orders_by_exchange']:
                    metrics['orders_by_exchange'][exchange] = {
                        'total': 0,
                        'successful': 0,
                        'failed': 0
                    }
                
                for symbol, order in exchange_orders.items():
                    total_orders += 1
                    metrics['orders_by_exchange'][exchange]['total'] += 1
                    
                    # Count by symbol
                    if symbol not in metrics['orders_by_symbol']:
                        metrics['orders_by_symbol'][symbol] = 0
                    metrics['orders_by_symbol'][symbol] += 1
                    
                    # Count by order side
                    side = order.get('side', 'unknown').upper()
                    if side in ['BUY', 'SELL']:
                        metrics['orders_by_side'][side] += 1
                    
                    # Count successful/failed orders
                    status = order.get('status', '').lower()
                    verified = order.get('verified', False)
                    
                    if status in ['executed', 'filled', 'partially_filled'] or verified:
                        successful_orders += 1
                        metrics['orders_by_exchange'][exchange]['successful'] += 1
                    else:
                        metrics['orders_by_exchange'][exchange]['failed'] += 1
                    
                    # Calculate execution time if available
                    if 'timestamp' in order and order.get('verified_timestamp'):
                        try:
                            order_time = datetime.fromisoformat(order['timestamp'])
                            verify_time = datetime.fromisoformat(order['verified_timestamp'])
                            execution_time = (verify_time - order_time).total_seconds()
                            execution_times.append(execution_time)
                        except (ValueError, TypeError):
                            pass
            
            metrics['total_orders'] = total_orders
            metrics['successful_orders'] = successful_orders
            metrics['failed_orders'] = total_orders - successful_orders
            
            if total_orders > 0:
                metrics['execution_success_rate'] = successful_orders / total_orders
            
            if execution_times:
                metrics['avg_execution_time'] = sum(execution_times) / len(execution_times)
            
            return metrics
        
        except Exception as e:
            logger.error(f"Error collecting order metrics: {str(e)}", exc_info=True)
            return metrics


class PositionMetricsCollector(MetricsCollector):
    """Collect metrics about open trading positions."""
    
    def __init__(self, client_factories: Dict[str, callable], storage_path: str = None):
        """
        Initialize the position metrics collector.
        
        Args:
            client_factories: Dictionary mapping exchange names to functions that create clients
            storage_path: Path to store collected metrics
        """
        super().__init__(storage_path)
        self.client_factories = client_factories
        self.clients = {}
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """
        Collect metrics about open positions.
        
        Returns:
            Dictionary of position metrics
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'total_positions': 0,
            'total_position_value': 0.0,
            'positions_by_exchange': {},
            'positions_by_symbol': {},
            'positions_by_side': {
                'LONG': 0,
                'SHORT': 0
            },
            'unrealized_pnl': 0.0,
            'avg_position_age': 0.0
        }
        
        try:
            # Initialize clients if needed
            for exchange, factory in self.client_factories.items():
                if exchange not in self.clients:
                    self.clients[exchange] = factory()
            
            total_positions = 0
            total_position_value = 0.0
            total_unrealized_pnl = 0.0
            position_ages = []
            
            for exchange, client in self.clients.items():
                # Initialize exchange metrics
                if exchange not in metrics['positions_by_exchange']:
                    metrics['positions_by_exchange'][exchange] = {
                        'count': 0,
                        'value': 0.0,
                        'unrealized_pnl': 0.0
                    }
                
                # Fetch positions for this exchange
                try:
                    positions = await client.get_positions()
                    
                    for symbol, position in positions.items():
                        # Skip empty positions
                        size = float(position.get('size', 0))
                        if size == 0:
                            continue
                        
                        # Basic position data
                        entry_price = float(position.get('entry_price', 0))
                        current_price = float(position.get('mark_price', 0))
                        side = position.get('side', '').upper()
                        
                        # Calculate position value
                        position_value = size * current_price
                        
                        # Calculate unrealized PNL
                        if side == 'LONG':
                            unrealized_pnl = (current_price - entry_price) * size
                        elif side == 'SHORT':
                            unrealized_pnl = (entry_price - current_price) * size
                        else:
                            unrealized_pnl = 0.0
                        
                        # Update position counts
                        total_positions += 1
                        metrics['positions_by_exchange'][exchange]['count'] += 1
                        
                        if symbol not in metrics['positions_by_symbol']:
                            metrics['positions_by_symbol'][symbol] = 0
                        metrics['positions_by_symbol'][symbol] += 1
                        
                        if side in ['LONG', 'SHORT']:
                            metrics['positions_by_side'][side] += 1
                        
                        # Update position values
                        total_position_value += position_value
                        metrics['positions_by_exchange'][exchange]['value'] += position_value
                        
                        # Update unrealized PNL
                        total_unrealized_pnl += unrealized_pnl
                        metrics['positions_by_exchange'][exchange]['unrealized_pnl'] += unrealized_pnl
                        
                        # Calculate position age if available
                        if 'open_time' in position:
                            try:
                                open_time = datetime.fromisoformat(position['open_time'])
                                age = (datetime.now() - open_time).total_seconds() / 3600  # Age in hours
                                position_ages.append(age)
                            except (ValueError, TypeError):
                                pass
                
                except Exception as e:
                    logger.error(f"Error fetching positions from {exchange}: {str(e)}", exc_info=True)
            
            metrics['total_positions'] = total_positions
            metrics['total_position_value'] = total_position_value
            metrics['unrealized_pnl'] = total_unrealized_pnl
            
            if position_ages:
                metrics['avg_position_age'] = sum(position_ages) / len(position_ages)
            
            return metrics
        
        except Exception as e:
            logger.error(f"Error collecting position metrics: {str(e)}", exc_info=True)
            return metrics


class PerformanceMetricsCalculator:
    """Calculate trading performance metrics from historical data."""
    
    def __init__(self, order_history: List[Dict] = None, position_history: List[Dict] = None):
        """
        Initialize the performance metrics calculator.
        
        Args:
            order_history: Historical order data
            position_history: Historical position data
        """
        self.order_history = order_history or []
        self.position_history = position_history or []
    
    def calculate_metrics(self) -> Dict[str, Any]:
        """
        Calculate trading performance metrics.
        
        Returns:
            Dictionary of performance metrics
        """
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'win_rate': 0.0,
            'profit_factor': 0.0,
            'avg_win': 0.0,
            'avg_loss': 0.0,
            'largest_win': 0.0,
            'largest_loss': 0.0,
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'total_pnl': 0.0,
            'max_drawdown': 0.0,
            'max_drawdown_percent': 0.0,
            'sharpe_ratio': 0.0,
            'average_trade_duration': 0.0
        }
        
        try:
            # Extract closed trades from order history
            closed_trades = []
            
            for order in self.order_history:
                # Only include executed orders
                if order.get('status') not in ['filled', 'executed']:
                    continue
                
                # Extract trade data
                entry_price = float(order.get('entry_price', 0))
                exit_price = float(order.get('exit_price', 0))
                size = float(order.get('size', 0))
                side = order.get('side', '').upper()
                
                # Skip trades with incomplete data
                if entry_price == 0 or exit_price == 0 or size == 0:
                    continue
                
                # Calculate trade profit/loss
                if side == 'BUY':
                    pnl = (exit_price - entry_price) * size
                else:  # SELL
                    pnl = (entry_price - exit_price) * size
                
                # Calculate trade duration if available
                duration = 0.0
                if order.get('entry_time') and order.get('exit_time'):
                    try:
                        entry_time = datetime.fromisoformat(order['entry_time'])
                        exit_time = datetime.fromisoformat(order['exit_time'])
                        duration = (exit_time - entry_time).total_seconds() / 3600  # Duration in hours
                    except (ValueError, TypeError):
                        pass
                
                closed_trades.append({
                    'pnl': pnl,
                    'duration': duration,
                    'side': side,
                    'symbol': order.get('symbol', 'unknown')
                })
            
            # Calculate basic metrics
            total_trades = len(closed_trades)
            metrics['total_trades'] = total_trades
            
            if total_trades == 0:
                return metrics
            
            # Calculate profit/loss metrics
            winning_trades = [trade for trade in closed_trades if trade['pnl'] > 0]
            losing_trades = [trade for trade in closed_trades if trade['pnl'] < 0]
            
            metrics['winning_trades'] = len(winning_trades)
            metrics['losing_trades'] = len(losing_trades)
            
            if metrics['winning_trades'] > 0:
                metrics['win_rate'] = metrics['winning_trades'] / total_trades
                metrics['avg_win'] = sum(trade['pnl'] for trade in winning_trades) / metrics['winning_trades']
                metrics['largest_win'] = max(trade['pnl'] for trade in winning_trades)
            
            if metrics['losing_trades'] > 0:
                metrics['avg_loss'] = abs(sum(trade['pnl'] for trade in losing_trades) / metrics['losing_trades'])
                metrics['largest_loss'] = abs(min(trade['pnl'] for trade in losing_trades))
            
            # Calculate profit factor
            if metrics['losing_trades'] > 0 and metrics['avg_loss'] > 0:
                metrics['profit_factor'] = (metrics['avg_win'] * metrics['winning_trades']) / (metrics['avg_loss'] * metrics['losing_trades'])
            
            # Calculate total PnL
            metrics['total_pnl'] = sum(trade['pnl'] for trade in closed_trades)
            
            # Calculate average trade duration
            trade_durations = [trade['duration'] for trade in closed_trades if trade['duration'] > 0]
            if trade_durations:
                metrics['average_trade_duration'] = sum(trade_durations) / len(trade_durations)
            
            # Calculate drawdown metrics
            if self.position_history:
                # Calculate equity curve
                equity_curve = []
                balance = 10000.0  # Starting balance (placeholder)
                
                for position in self.position_history:
                    timestamp = position.get('timestamp')
                    unrealized_pnl = float(position.get('unrealized_pnl', 0.0))
                    
                    equity = balance + unrealized_pnl
                    equity_curve.append((timestamp, equity))
                
                if equity_curve:
                    # Sort by timestamp
                    equity_curve.sort(key=lambda x: x[0])
                    
                    # Calculate drawdown
                    max_equity = equity_curve[0][1]
                    max_drawdown = 0.0
                    max_drawdown_percent = 0.0
                    
                    for _, equity in equity_curve:
                        if equity > max_equity:
                            max_equity = equity
                        
                        drawdown = max_equity - equity
                        drawdown_percent = drawdown / max_equity if max_equity > 0 else 0
                        
                        if drawdown > max_drawdown:
                            max_drawdown = drawdown
                            max_drawdown_percent = drawdown_percent
                    
                    metrics['max_drawdown'] = max_drawdown
                    metrics['max_drawdown_percent'] = max_drawdown_percent
                    
                    # Calculate Sharpe ratio (if we have daily data)
                    if len(equity_curve) >= 30:  # Need at least a month of data
                        daily_returns = []
                        
                        for i in range(1, len(equity_curve)):
                            prev_equity = equity_curve[i-1][1]
                            curr_equity = equity_curve[i][1]
                            
                            daily_return = (curr_equity - prev_equity) / prev_equity if prev_equity > 0 else 0
                            daily_returns.append(daily_return)
                        
                        if daily_returns:
                            avg_return = sum(daily_returns) / len(daily_returns)
                            std_return = (sum((r - avg_return) ** 2 for r in daily_returns) / len(daily_returns)) ** 0.5
                            
                            if std_return > 0:
                                risk_free_rate = 0.01 / 365  # Assume 1% annual risk-free rate
                                metrics['sharpe_ratio'] = (avg_return - risk_free_rate) / std_return * (252 ** 0.5)  # Annualized
            
            return metrics
        
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {str(e)}", exc_info=True)
            return metrics
