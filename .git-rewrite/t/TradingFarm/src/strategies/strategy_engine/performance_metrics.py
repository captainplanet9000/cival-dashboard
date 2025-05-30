"""
Strategy Performance Metrics

Provides functionality for calculating and analyzing trading strategy performance.
Implements various metrics for evaluating strategy effectiveness and risk.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Union, Any


class PerformanceMetrics:
    """
    Container for strategy performance metrics with analysis methods.
    
    Includes metrics for:
    - Returns (total, annualized, daily/monthly)
    - Risk-adjusted returns (Sharpe, Sortino, Calmar)
    - Drawdowns (maximum, average, duration)
    - Win/loss statistics (rates, ratios, streaks)
    - Volatility and consistency measures
    """
    
    def __init__(self, metrics_dict: Optional[Dict[str, Any]] = None):
        """
        Initialize performance metrics container.
        
        Args:
            metrics_dict: Optional dictionary of pre-calculated metrics
        """
        self._metrics = metrics_dict or {}
    
    def __getitem__(self, key: str) -> Any:
        """Get a metric by key."""
        return self._metrics.get(key)
    
    def __setitem__(self, key: str, value: Any) -> None:
        """Set a metric by key."""
        self._metrics[key] = value
    
    def __contains__(self, key: str) -> bool:
        """Check if a metric exists."""
        return key in self._metrics
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a metric with default fallback."""
        return self._metrics.get(key, default)
    
    def update(self, metrics_dict: Dict[str, Any]) -> None:
        """Update metrics with a dictionary."""
        self._metrics.update(metrics_dict)
    
    @property
    def total_return(self) -> float:
        """Total return percentage."""
        return self.get('total_return', 0.0)
    
    @property
    def annualized_return(self) -> float:
        """Annualized return percentage."""
        return self.get('annualized_return', 0.0)
    
    @property
    def sharpe_ratio(self) -> float:
        """Sharpe ratio."""
        return self.get('sharpe_ratio', 0.0)
    
    @property
    def sortino_ratio(self) -> float:
        """Sortino ratio."""
        return self.get('sortino_ratio', 0.0)
    
    @property
    def max_drawdown(self) -> float:
        """Maximum drawdown percentage."""
        return self.get('max_drawdown', 0.0)
    
    @property
    def win_rate(self) -> float:
        """Win rate percentage."""
        return self.get('win_rate', 0.0)
    
    @property
    def profit_factor(self) -> float:
        """Profit factor (gross profit / gross loss)."""
        return self.get('profit_factor', 0.0)
    
    @property
    def trade_count(self) -> int:
        """Total number of trades."""
        return self.get('trade_count', 0)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return self._metrics.copy()
    
    def to_series(self) -> pd.Series:
        """Convert metrics to pandas Series."""
        return pd.Series(self._metrics)
    
    def summary(self) -> str:
        """Generate a text summary of key metrics."""
        lines = [
            "Performance Metrics Summary:",
            f"Total Return: {self.total_return:.2f}%",
            f"Annualized Return: {self.annualized_return:.2f}%",
            f"Sharpe Ratio: {self.sharpe_ratio:.2f}",
            f"Sortino Ratio: {self.sortino_ratio:.2f}",
            f"Maximum Drawdown: {self.max_drawdown:.2f}%",
            f"Win Rate: {self.win_rate:.2f}%",
            f"Profit Factor: {self.profit_factor:.2f}",
            f"Trade Count: {self.trade_count}"
        ]
        
        return "\n".join(lines)


def calculate_metrics(
    equity_curve: pd.Series,
    trades: pd.DataFrame = None,
    risk_free_rate: float = 0.0,
    trading_days_per_year: int = 252,
    include_trade_metrics: bool = True
) -> PerformanceMetrics:
    """
    Calculate comprehensive performance metrics from equity curve and trades.
    
    Args:
        equity_curve: Series of equity values over time
        trades: DataFrame of trade details
        risk_free_rate: Annual risk-free rate for risk-adjusted metrics
        trading_days_per_year: Number of trading days per year
        include_trade_metrics: Whether to calculate trade-based metrics
        
    Returns:
        PerformanceMetrics object with calculated metrics
    """
    metrics = PerformanceMetrics()
    
    if equity_curve.empty:
        return metrics
    
    # Calculate returns
    returns = equity_curve.pct_change().dropna()
    
    # Basic return metrics
    start_equity = equity_curve.iloc[0]
    end_equity = equity_curve.iloc[-1]
    total_return_pct = ((end_equity / start_equity) - 1) * 100
    
    metrics['start_equity'] = start_equity
    metrics['end_equity'] = end_equity
    metrics['total_return'] = total_return_pct
    
    # Calculate trading period in years
    if len(equity_curve) > 1:
        years = len(equity_curve) / trading_days_per_year
        metrics['trading_period_years'] = years
        
        # Annualized return
        if years > 0:
            annualized_return = ((1 + total_return_pct / 100) ** (1 / years) - 1) * 100
            metrics['annualized_return'] = annualized_return
    
    # Volatility and risk metrics
    if len(returns) > 1:
        daily_return_mean = returns.mean()
        daily_return_std = returns.std()
        
        metrics['daily_return_mean'] = daily_return_mean
        metrics['daily_return_std'] = daily_return_std
        metrics['annualized_volatility'] = daily_return_std * np.sqrt(trading_days_per_year) * 100
        
        # Sharpe Ratio
        daily_risk_free = (1 + risk_free_rate) ** (1 / trading_days_per_year) - 1
        excess_return = daily_return_mean - daily_risk_free
        sharpe_ratio = 0.0
        if daily_return_std > 0:
            sharpe_ratio = excess_return / daily_return_std * np.sqrt(trading_days_per_year)
        metrics['sharpe_ratio'] = sharpe_ratio
        
        # Sortino Ratio
        downside_returns = returns[returns < 0]
        downside_deviation = downside_returns.std()
        sortino_ratio = 0.0
        if downside_deviation > 0 and not np.isnan(downside_deviation):
            sortino_ratio = excess_return / downside_deviation * np.sqrt(trading_days_per_year)
        metrics['sortino_ratio'] = sortino_ratio
    
    # Drawdown analysis
    running_max = equity_curve.cummax()
    drawdowns = (equity_curve / running_max - 1) * 100
    max_drawdown = drawdowns.min()
    metrics['max_drawdown'] = max_drawdown
    
    # Calmar Ratio
    if 'annualized_return' in metrics and max_drawdown < 0:
        metrics['calmar_ratio'] = metrics['annualized_return'] / abs(max_drawdown)
    
    # Monthly and yearly returns
    if hasattr(equity_curve.index, 'month') and len(equity_curve) > 20:
        monthly_returns = equity_curve.resample('M').last().pct_change().dropna() * 100
        metrics['monthly_returns_mean'] = monthly_returns.mean()
        metrics['monthly_returns_std'] = monthly_returns.std()
        
        if hasattr(equity_curve.index, 'year') and len(monthly_returns) >= 12:
            yearly_returns = equity_curve.resample('Y').last().pct_change().dropna() * 100
            metrics['yearly_returns_mean'] = yearly_returns.mean()
            metrics['yearly_returns_std'] = yearly_returns.std()
    
    # Trade-based metrics
    if include_trade_metrics and trades is not None and not trades.empty:
        winning_trades = trades[trades['pnl'] > 0]
        losing_trades = trades[trades['pnl'] < 0]
        
        metrics['trade_count'] = len(trades)
        metrics['winning_trades'] = len(winning_trades)
        metrics['losing_trades'] = len(losing_trades)
        
        win_rate = len(winning_trades) / len(trades) * 100 if len(trades) > 0 else 0
        metrics['win_rate'] = win_rate
        
        if not winning_trades.empty:
            metrics['avg_win'] = winning_trades['pnl'].mean()
            metrics['max_win'] = winning_trades['pnl'].max()
        
        if not losing_trades.empty:
            metrics['avg_loss'] = losing_trades['pnl'].mean()
            metrics['max_loss'] = losing_trades['pnl'].min()
        
        if 'avg_win' in metrics and 'avg_loss' in metrics and metrics['avg_loss'] != 0:
            metrics['win_loss_ratio'] = abs(metrics['avg_win'] / metrics['avg_loss'])
        
        gross_profit = winning_trades['pnl'].sum() if not winning_trades.empty else 0
        gross_loss = abs(losing_trades['pnl'].sum()) if not losing_trades.empty else 0
        
        metrics['gross_profit'] = gross_profit
        metrics['gross_loss'] = gross_loss
        
        if gross_loss > 0:
            metrics['profit_factor'] = gross_profit / gross_loss
        else:
            metrics['profit_factor'] = float('inf') if gross_profit > 0 else 0.0
        
        # Consecutive wins/losses
        if len(trades) > 0 and 'pnl' in trades.columns:
            win_streak = 0
            loss_streak = 0
            max_win_streak = 0
            max_loss_streak = 0
            current_win_streak = 0
            current_loss_streak = 0
            
            for pnl in trades['pnl']:
                if pnl > 0:
                    current_win_streak += 1
                    current_loss_streak = 0
                    max_win_streak = max(max_win_streak, current_win_streak)
                elif pnl < 0:
                    current_loss_streak += 1
                    current_win_streak = 0
                    max_loss_streak = max(max_loss_streak, current_loss_streak)
            
            metrics['max_win_streak'] = max_win_streak
            metrics['max_loss_streak'] = max_loss_streak
        
        # Average trade duration if timestamps are available
        if 'entry_time' in trades.columns and 'exit_time' in trades.columns:
            durations = (trades['exit_time'] - trades['entry_time']).dt.total_seconds() / 3600  # in hours
            metrics['avg_trade_duration_hours'] = durations.mean()
            metrics['max_trade_duration_hours'] = durations.max()
            metrics['min_trade_duration_hours'] = durations.min()
    
    return metrics


def calculate_drawdowns(equity_curve: pd.Series) -> pd.DataFrame:
    """
    Calculate drawdowns from an equity curve.
    
    Args:
        equity_curve: Series of equity values over time
        
    Returns:
        DataFrame with drawdown details
    """
    # Calculate running maximum
    running_max = equity_curve.cummax()
    
    # Calculate drawdowns
    drawdowns = (equity_curve / running_max - 1) * 100
    
    # Identify drawdown periods
    is_drawdown = drawdowns < 0
    
    # Identify start of drawdown periods
    starts = (is_drawdown & ~is_drawdown.shift(1).fillna(False))
    start_dates = equity_curve.index[starts]
    
    # Identify end of drawdown periods
    ends = (~is_drawdown & is_drawdown.shift(1).fillna(False))
    end_dates = equity_curve.index[ends]
    
    # Handle ongoing drawdown
    if len(start_dates) > len(end_dates):
        end_dates = end_dates.append(pd.Index([equity_curve.index[-1]]))
    
    # Create drawdown data
    data = []
    for i in range(len(start_dates)):
        if i >= len(end_dates):
            break
            
        start_date = start_dates[i]
        end_date = end_dates[i]
        
        period_min = drawdowns[start_date:end_date].min()
        period_min_date = drawdowns[start_date:end_date].idxmin()
        
        recovery_days = (end_date - period_min_date).days
        total_days = (end_date - start_date).days
        
        data.append({
            'start_date': start_date,
            'end_date': end_date,
            'max_drawdown': period_min,
            'max_drawdown_date': period_min_date,
            'recovery_days': recovery_days,
            'total_days': total_days
        })
    
    # Create DataFrame
    if not data:
        return pd.DataFrame(columns=['start_date', 'end_date', 'max_drawdown', 
                                    'max_drawdown_date', 'recovery_days', 'total_days'])
    
    return pd.DataFrame(data).sort_values('max_drawdown')
