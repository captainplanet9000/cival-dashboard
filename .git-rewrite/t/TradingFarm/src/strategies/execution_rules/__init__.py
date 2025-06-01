"""
Execution Rules Package

Provides components for defining entry and exit conditions and trade management rules
for trading strategies.
"""

from .rule_base import (
    ExecutionRule, ExecutionRuleResult, 
    RuleType, RuleAction, RuleTrigger
)
from .entry_rules import (
    EntryRule, SignalBasedEntry, 
    PriceBasedEntry, VolatilityBreakoutEntry,
    TimeBasedEntry, MultiConditionEntry
)
from .exit_rules import (
    ExitRule, StopLossRule, TakeProfitRule,
    TrailingStopRule, TimeBasedExit,
    SignalBasedExit, MultiConditionExit
)
from .position_sizing import (
    PositionSizingRule, FixedSizeRule,
    PercentageRiskRule, VolatilityAdjustedRule,
    KellyPositionSizingRule
)
from .rule_manager import ExecutionRuleManager

__all__ = [
    # Base components
    'ExecutionRule', 'ExecutionRuleResult', 'RuleType', 'RuleAction', 'RuleTrigger',
    
    # Entry rules
    'EntryRule', 'SignalBasedEntry', 'PriceBasedEntry', 
    'VolatilityBreakoutEntry', 'TimeBasedEntry', 'MultiConditionEntry',
    
    # Exit rules
    'ExitRule', 'StopLossRule', 'TakeProfitRule', 'TrailingStopRule',
    'TimeBasedExit', 'SignalBasedExit', 'MultiConditionExit',
    
    # Position sizing rules
    'PositionSizingRule', 'FixedSizeRule', 'PercentageRiskRule',
    'VolatilityAdjustedRule', 'KellyPositionSizingRule',
    
    # Rule manager
    'ExecutionRuleManager'
]
