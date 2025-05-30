"""
Strategy Backtesting Module

Provides functionality for backtesting trading strategies using historical data.
Implements an event-driven backtesting engine with realistic trading simulation.
"""

import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union, Any, Callable

from ..strategy_base import Strategy, StrategyStatus
from .performance_metrics import calculate_metrics, PerformanceMetrics


class BacktestOptions:
    """
    Configuration options for backtesting.
    
    Controls parameters such as:
    - Initial capital
    - Commission model
    - Slippage model
    - Position sizing rules
    - Data handling options
    """
    
    def __init__(
        self,
        initial_capital: float = 10000.0,
        commission_rate: float = 0.001,  # 0.1%
        slippage_rate: float = 0.0005,   # 0.05%
        max_position_size: float = 1.0,  # 100% of capital
        position_sizing: str = 'percent',  # 'percent', 'fixed'
        use_fractional_sizes: bool = True,
        handle_overlapping_signals: str = 'first'  # 'first', 'last', 'all'
    ):
        """
        Initialize backtest options.
        
        Args:
            initial_capital: Initial capital for backtesting
            commission_rate: Commission rate as a decimal
            slippage_rate: Slippage rate as a decimal
            max_position_size: Maximum position size as fraction of capital
            position_sizing: Position sizing method
            use_fractional_sizes: Allow fractional position sizes
            handle_overlapping_signals: How to handle overlapping signals
        """
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.slippage_rate = slippage_rate
        self.max_position_size = max_position_size
        self.position_sizing = position_sizing
        self.use_fractional_sizes = use_fractional_sizes
        self.handle_overlapping_signals = handle_overlapping_signals
        
        # Additional options
        self.risk_free_rate = 0.0
        self.trading_days_per_year = 252
        self.log_trades = True
        self.data_frequency = 'daily'  # 'daily', 'hourly', 'minute'
        self.price_type = 'close'  # 'open', 'close', 'average'
        self.enable_short_positions = True
        self.margin_requirement = 1.0  # No margin
        self.trade_delay = 0  # No delay in trade execution
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert options to dictionary."""
        return {
            'initial_capital': self.initial_capital,
            'commission_rate': self.commission_rate,
            'slippage_rate': self.slippage_rate,
            'max_position_size': self.max_position_size,
            'position_sizing': self.position_sizing,
            'use_fractional_sizes': self.use_fractional_sizes,
            'handle_overlapping_signals': self.handle_overlapping_signals,
            'risk_free_rate': self.risk_free_rate,
            'trading_days_per_year': self.trading_days_per_year,
            'log_trades': self.log_trades,
            'data_frequency': self.data_frequency,
            'price_type': self.price_type,
            'enable_short_positions': self.enable_short_positions,
            'margin_requirement': self.margin_requirement,
            'trade_delay': self.trade_delay
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BacktestOptions':
        """Create options from dictionary."""
        options = cls()
        for key, value in data.items():
            if hasattr(options, key):
                setattr(options, key, value)
        return options


class Trade:
    """
    Represents a completed trade in a backtest.
    
    A trade consists of an entry and exit, with associated metrics
    such as profit/loss, duration, and risk metrics.
    """
    
    def __init__(
        self,
        trade_id: str,
        symbol: str,
        entry_time: datetime,
        entry_price: float,
        position_size: float,
        direction: str,
        entry_capital: float,
        exit_time: Optional[datetime] = None,
        exit_price: Optional[float] = None,
        exit_reason: Optional[str] = None
    ):
        """
        Initialize a trade.
        
        Args:
            trade_id: Unique trade identifier
            symbol: Trading symbol
            entry_time: Time of entry
            entry_price: Entry price
            position_size: Position size (units/shares)
            direction: Trade direction ('long' or 'short')
            entry_capital: Capital at time of entry
            exit_time: Time of exit
            exit_price: Exit price
            exit_reason: Reason for exit
        """
        self.trade_id = trade_id
        self.symbol = symbol
        self.entry_time = entry_time
        self.entry_price = entry_price
        self.position_size = position_size
        self.direction = direction
        self.entry_capital = entry_capital
        self.exit_time = exit_time
        self.exit_price = exit_price
        self.exit_reason = exit_reason
        
        # Trade metrics (calculated when trade is completed)
        self.pnl = 0.0
        self.pnl_pct = 0.0
        self.duration = None
        self.commission = 0.0
        self.slippage = 0.0
        self.net_pnl = 0.0
        
        # Risk metrics
        self.max_adverse_excursion = 0.0
        self.max_favorable_excursion = 0.0
    
    def update_exit(self, exit_time: datetime, exit_price: float, exit_reason: str = "signal") -> None:
        """
        Update trade with exit information.
        
        Args:
            exit_time: Time of exit
            exit_price: Exit price
            exit_reason: Reason for exit
        """
        self.exit_time = exit_time
        self.exit_price = exit_price
        self.exit_reason = exit_reason
        
        # Calculate trade metrics
        self._calculate_metrics()
    
    def _calculate_metrics(self) -> None:
        """Calculate trade metrics after exit."""
        if self.exit_time is None or self.exit_price is None:
            return
        
        # Calculate duration
        self.duration = self.exit_time - self.entry_time
        
        # Calculate P&L
        if self.direction == 'long':
            self.pnl = (self.exit_price - self.entry_price) * self.position_size
        else:  # short
            self.pnl = (self.entry_price - self.exit_price) * self.position_size
        
        # Calculate percentage P&L
        trade_value = self.entry_price * self.position_size
        if trade_value > 0:
            self.pnl_pct = (self.pnl / trade_value) * 100
        
        # Net P&L after costs
        self.net_pnl = self.pnl - self.commission - self.slippage
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trade to dictionary."""
        return {
            'trade_id': self.trade_id,
            'symbol': self.symbol,
            'entry_time': self.entry_time.isoformat() if self.entry_time else None,
            'entry_price': self.entry_price,
            'position_size': self.position_size,
            'direction': self.direction,
            'entry_capital': self.entry_capital,
            'exit_time': self.exit_time.isoformat() if self.exit_time else None,
            'exit_price': self.exit_price,
            'exit_reason': self.exit_reason,
            'pnl': self.pnl,
            'pnl_pct': self.pnl_pct,
            'duration': str(self.duration) if self.duration else None,
            'commission': self.commission,
            'slippage': self.slippage,
            'net_pnl': self.net_pnl,
            'max_adverse_excursion': self.max_adverse_excursion,
            'max_favorable_excursion': self.max_favorable_excursion
        }


class BacktestResult:
    """
    Results of a strategy backtest.
    
    Contains comprehensive backtest information including:
    - Equity curve and drawdowns
    - Trade history and statistics
    - Performance metrics
    - Strategy parameters used
    """
    
    def __init__(
        self,
        strategy_id: str,
        symbol: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime,
        options: BacktestOptions
    ):
        """
        Initialize backtest result.
        
        Args:
            strategy_id: ID of the strategy
            symbol: Symbol that was traded
            timeframe: Timeframe of the data
            start_date: Start date of the backtest
            end_date: End date of the backtest
            options: Options used for the backtest
        """
        self.strategy_id = strategy_id
        self.symbol = symbol
        self.timeframe = timeframe
        self.start_date = start_date
        self.end_date = end_date
        self.options = options
        
        # Trade data
        self.trades: List[Trade] = []
        self.trade_df: Optional[pd.DataFrame] = None
        
        # Equity data
        self.equity_curve: Optional[pd.Series] = None
        self.drawdowns: Optional[pd.DataFrame] = None
        
        # Performance metrics
        self.metrics: Optional[PerformanceMetrics] = None
        
        # Additional statistics
        self.win_rate = 0.0
        self.profit_factor = 0.0
        self.total_pnl = 0.0
        self.max_drawdown = 0.0
        self.sharpe_ratio = 0.0
    
    def add_trade(self, trade: Trade) -> None:
        """
        Add a trade to the result.
        
        Args:
            trade: Completed trade
        """
        self.trades.append(trade)
    
    def build_trade_dataframe(self) -> pd.DataFrame:
        """
        Build a DataFrame of all trades.
        
        Returns:
            DataFrame with trade information
        """
        if not self.trades:
            return pd.DataFrame()
        
        # Convert trades to dictionaries
        trade_dicts = [trade.to_dict() for trade in self.trades]
        
        # Create DataFrame
        df = pd.DataFrame(trade_dicts)
        
        # Convert time columns to datetime
        if 'entry_time' in df.columns:
            df['entry_time'] = pd.to_datetime(df['entry_time'])
        if 'exit_time' in df.columns:
            df['exit_time'] = pd.to_datetime(df['exit_time'])
        
        self.trade_df = df
        return df
    
    def calculate_metrics(self) -> PerformanceMetrics:
        """
        Calculate performance metrics.
        
        Returns:
            PerformanceMetrics object
        """
        if self.equity_curve is None:
            raise ValueError("Equity curve not available")
        
        # Build trade DataFrame if not already built
        if self.trade_df is None:
            self.build_trade_dataframe()
        
        # Calculate metrics
        self.metrics = calculate_metrics(
            equity_curve=self.equity_curve,
            trades=self.trade_df,
            risk_free_rate=self.options.risk_free_rate,
            trading_days_per_year=self.options.trading_days_per_year
        )
        
        # Update summary statistics
        self.win_rate = self.metrics.win_rate
        self.profit_factor = self.metrics.profit_factor
        self.total_pnl = self.metrics.get('total_return', 0.0)
        self.max_drawdown = self.metrics.max_drawdown
        self.sharpe_ratio = self.metrics.sharpe_ratio
        
        return self.metrics
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        # Build trade DataFrame and calculate metrics if not already done
        if self.trade_df is None:
            self.build_trade_dataframe()
        
        if self.metrics is None and self.equity_curve is not None:
            self.calculate_metrics()
        
        result = {
            'strategy_id': self.strategy_id,
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'options': self.options.to_dict(),
            'summary': {
                'trade_count': len(self.trades),
                'win_rate': self.win_rate,
                'profit_factor': self.profit_factor,
                'total_pnl': self.total_pnl,
                'max_drawdown': self.max_drawdown,
                'sharpe_ratio': self.sharpe_ratio
            }
        }
        
        # Add metrics if available
        if self.metrics is not None:
            result['metrics'] = self.metrics.to_dict()
        
        return result
    
    def to_json(self) -> str:
        """Convert result to JSON string."""
        return json.dumps(self.to_dict(), default=str)


class BacktestEngine:
    """
    Engine for backtesting trading strategies.
    
    Implements event-driven backtesting with realistic trading simulation,
    including commissions, slippage, and position sizing.
    """
    
    def __init__(self, options: Optional[BacktestOptions] = None):
        """
        Initialize backtesting engine.
        
        Args:
            options: Backtest options
        """
        self.options = options or BacktestOptions()
    
    def backtest(
        self,
        strategy: Strategy,
        data: pd.DataFrame,
        symbol: str,
        timeframe: str
    ) -> BacktestResult:
        """
        Run a backtest for a strategy.
        
        Args:
            strategy: Strategy to backtest
            data: Historical price data (OHLCV)
            symbol: Symbol being traded
            timeframe: Timeframe of the data
            
        Returns:
            BacktestResult object with trade history and performance metrics
        """
        # Validate inputs
        if data is None or data.empty:
            raise ValueError("No data provided for backtesting")
        
        # Update strategy status
        original_status = strategy.status
        strategy.status = StrategyStatus.BACKTESTING
        
        # Initialize backtest state
        capital = self.options.initial_capital
        position = 0
        position_value = 0
        position_direction = None
        entry_price = 0
        entry_time = None
        
        # Initialize result
        start_date = data.index[0] if hasattr(data.index, '__getitem__') else None
        end_date = data.index[-1] if hasattr(data.index, '__getitem__') and len(data.index) > 0 else None
        
        result = BacktestResult(
            strategy_id=strategy.strategy_id,
            symbol=symbol,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date,
            options=self.options
        )
        
        # Initialize equity curve
        equity_history = [capital]
        equity_index = [data.index[0]] if hasattr(data.index, '__getitem__') else [0]
        
        # Generate signals
        signal_data = strategy.generate_signals(data.copy())
        
        # Check if signals were generated
        if 'signal' not in signal_data.columns:
            raise ValueError("Strategy did not generate 'signal' column in data")
        
        # Process data chronologically
        active_trade = None
        
        for i, (timestamp, row) in enumerate(signal_data.iterrows()):
            current_price = row['close']
            signal = row['signal'] if 'signal' in row else 0
            
            # Handle position entry
            if position == 0 and signal != 0:
                # Calculate position size
                if self.options.position_sizing == 'percent':
                    # Size based on percentage of capital
                    size_value = capital * min(1.0, self.options.max_position_size)
                    position = size_value / current_price
                else:  # fixed
                    # Fixed position size
                    position = self.options.max_position_size
                
                # Adjust for fractional sizes if needed
                if not self.options.use_fractional_sizes:
                    position = int(position)
                
                # Set position direction based on signal
                position_direction = 'long' if signal > 0 else 'short'
                
                # Apply slippage to entry price
                if position_direction == 'long':
                    entry_price = current_price * (1 + self.options.slippage_rate)
                else:  # short
                    entry_price = current_price * (1 - self.options.slippage_rate)
                
                # Calculate position value
                position_value = position * entry_price
                
                # Apply commission
                commission = position_value * self.options.commission_rate
                capital -= commission
                
                # Record entry
                entry_time = timestamp
                
                # Create active trade
                active_trade = Trade(
                    trade_id=f"{strategy.strategy_id}_{len(result.trades)}",
                    symbol=symbol,
                    entry_time=entry_time,
                    entry_price=entry_price,
                    position_size=position,
                    direction=position_direction,
                    entry_capital=capital
                )
                active_trade.commission = commission
                active_trade.slippage = position_value * self.options.slippage_rate
            
            # Handle position exit
            elif position != 0 and (
                (position_direction == 'long' and signal < 0) or
                (position_direction == 'short' and signal > 0) or
                i == len(signal_data) - 1  # Force exit at end of data
            ):
                # Apply slippage to exit price
                if position_direction == 'long':
                    exit_price = current_price * (1 - self.options.slippage_rate)
                else:  # short
                    exit_price = current_price * (1 + self.options.slippage_rate)
                
                # Calculate P&L
                if position_direction == 'long':
                    pnl = (exit_price - entry_price) * position
                else:  # short
                    pnl = (entry_price - exit_price) * position
                
                # Apply commission
                exit_value = position * exit_price
                commission = exit_value * self.options.commission_rate
                
                # Update capital
                capital += pnl - commission
                
                # Record exit reason
                exit_reason = "signal"
                if i == len(signal_data) - 1:
                    exit_reason = "end_of_data"
                
                # Complete the trade
                if active_trade:
                    active_trade.update_exit(timestamp, exit_price, exit_reason)
                    active_trade.commission += commission
                    active_trade.slippage += exit_value * self.options.slippage_rate
                    result.add_trade(active_trade)
                
                # Reset position
                position = 0
                position_value = 0
                position_direction = None
                entry_price = 0
                entry_time = None
                active_trade = None
            
            # Update equity for this timestamp
            if position == 0:
                # No position, equity is just cash
                current_equity = capital
            else:
                # Calculate current position value
                if position_direction == 'long':
                    position_value = position * current_price
                    unrealized_pnl = (current_price - entry_price) * position
                else:  # short
                    position_value = position * current_price
                    unrealized_pnl = (entry_price - current_price) * position
                
                # Equity is cash plus unrealized P&L
                current_equity = capital + unrealized_pnl
            
            # Record equity history
            equity_history.append(current_equity)
            equity_index.append(timestamp)
            
            # Update max adverse/favorable excursion for active trade
            if active_trade and position != 0:
                if position_direction == 'long':
                    mfe = ((current_price - entry_price) / entry_price) * 100
                    mae = ((entry_price - current_price) / entry_price) * 100
                else:  # short
                    mfe = ((entry_price - current_price) / entry_price) * 100
                    mae = ((current_price - entry_price) / entry_price) * 100
                
                # Update only if better than previous
                active_trade.max_favorable_excursion = max(
                    active_trade.max_favorable_excursion, mfe)
                active_trade.max_adverse_excursion = max(
                    active_trade.max_adverse_excursion, mae)
        
        # Create equity curve
        result.equity_curve = pd.Series(equity_history, index=equity_index)
        
        # Build trade dataframe
        result.build_trade_dataframe()
        
        # Calculate performance metrics
        result.calculate_metrics()
        
        # Restore strategy status
        strategy.status = original_status
        strategy.last_run = datetime.utcnow().isoformat()
        
        return result
    
    def get_optimal_position_size(
        self,
        capital: float,
        price: float,
        risk_per_trade: float,
        stop_loss_pct: float
    ) -> float:
        """
        Calculate optimal position size based on risk management rules.
        
        Args:
            capital: Available capital
            price: Current price
            risk_per_trade: Risk per trade as percentage of capital
            stop_loss_pct: Stop loss percentage
            
        Returns:
            Position size in units/shares
        """
        # Calculate maximum risk amount
        risk_amount = capital * (risk_per_trade / 100)
        
        # Calculate position size that risks this amount
        if stop_loss_pct > 0:
            # Price move for stop loss
            stop_price_move = price * (stop_loss_pct / 100)
            
            # Position size that risks the risk amount
            position_size = risk_amount / stop_price_move
            
            # Apply max position size limit
            max_position_value = capital * self.options.max_position_size
            max_position_size = max_position_value / price
            
            return min(position_size, max_position_size)
        else:
            # Fallback to standard sizing if no stop loss
            position_value = capital * min(1.0, self.options.max_position_size)
            return position_value / price
