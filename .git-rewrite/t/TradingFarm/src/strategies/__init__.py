"""
Strategy Management System

Provides tools for creating, testing, optimizing and executing trading strategies
with integration to the ElizaOS agent framework.
"""

from .strategy_base import Strategy, StrategyParameters, StrategyStatus, StrategyType
from .strategy_engine import (
    StrategyEngine, 
    BacktestResult, 
    PerformanceMetrics, 
    OptimizationResult
)
from .signal_generator import (
    SignalGenerator, 
    TechnicalSignalGenerator,
    FundamentalSignalGenerator,
    SentimentSignalGenerator,
    SignalType
)
from .execution_rules import (
    ExecutionRule,
    EntryRule,
    ExitRule,
    TrailingStopRule,
    ProfitTargetRule,
    RiskManagementRule
)
from .strategy_manager import StrategyManager

__all__ = [
    # Base strategy components
    'Strategy', 'StrategyParameters', 'StrategyStatus', 'StrategyType',
    
    # Strategy engine
    'StrategyEngine', 'BacktestResult', 'PerformanceMetrics', 'OptimizationResult',
    
    # Signal generators
    'SignalGenerator', 'TechnicalSignalGenerator', 'FundamentalSignalGenerator',
    'SentimentSignalGenerator', 'SignalType',
    
    # Execution rules
    'ExecutionRule', 'EntryRule', 'ExitRule', 'TrailingStopRule',
    'ProfitTargetRule', 'RiskManagementRule',
    
    # Strategy management
    'StrategyManager'
]
