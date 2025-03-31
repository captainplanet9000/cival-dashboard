"""
Strategy Framework Package
========================
Provides the base classes and abstractions for building trading strategies within
the Trading Farm ecosystem.
"""

from .base_strategy import BaseStrategy
from .signal_generator import SignalGenerator
from .entry_exit_rules import EntryExitRules
from .risk_management import RiskManagement

__all__ = [
    'BaseStrategy',
    'SignalGenerator',
    'EntryExitRules',
    'RiskManagement'
]
