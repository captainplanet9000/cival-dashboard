"""
Strategy Engine Module

Provides functionality for backtesting, optimization, and performance analysis
of trading strategies.
"""

from .backtest import BacktestEngine, BacktestResult, BacktestOptions
from .performance_metrics import PerformanceMetrics, calculate_metrics
from .optimization import (
    OptimizationEngine, 
    OptimizationResult, 
    OptimizationMethod,
    ParameterSpace
)
from .strategy_engine import StrategyEngine

__all__ = [
    'BacktestEngine', 
    'BacktestResult', 
    'BacktestOptions',
    'PerformanceMetrics', 
    'calculate_metrics',
    'OptimizationEngine', 
    'OptimizationResult', 
    'OptimizationMethod',
    'ParameterSpace',
    'StrategyEngine'
]
