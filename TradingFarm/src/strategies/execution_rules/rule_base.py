"""
Execution Rule Base Module

Defines the base classes and interfaces for execution rules.
Provides the foundation for all types of entry and exit rules.
"""

from abc import ABC, abstractmethod
from enum import Enum
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union, Any, Callable


class RuleType(Enum):
    """Types of execution rules."""
    ENTRY = 'entry'
    EXIT = 'exit'
    POSITION_SIZING = 'position_sizing'
    RISK_MANAGEMENT = 'risk_management'
    CUSTOM = 'custom'


class RuleAction(Enum):
    """Actions that can be taken by rules."""
    BUY = 'buy'
    SELL = 'sell'
    HOLD = 'hold'
    INCREASE_POSITION = 'increase_position'
    DECREASE_POSITION = 'decrease_position'
    CLOSE_POSITION = 'close_position'
    CANCEL_ORDER = 'cancel_order'
    MODIFY_ORDER = 'modify_order'
    CUSTOM = 'custom'


class RuleTrigger(Enum):
    """Trigger types for rules."""
    PRICE = 'price'
    TIME = 'time'
    SIGNAL = 'signal'
    INDICATOR = 'indicator'
    VOLATILITY = 'volatility'
    PATTERN = 'pattern'
    CUSTOM = 'custom'


class ExecutionRuleResult:
    """
    Result of an execution rule evaluation.
    
    Contains the action to take, parameters, and metadata.
    """
    
    def __init__(
        self,
        triggered: bool = False,
        action: Optional[RuleAction] = None,
        parameters: Dict[str, Any] = None,
        message: str = "",
        confidence: float = 1.0,
        metadata: Dict[str, Any] = None
    ):
        """
        Initialize an execution rule result.
        
        Args:
            triggered: Whether the rule was triggered
            action: Action to take if triggered
            parameters: Parameters for the action
            message: Human-readable message about the result
            confidence: Confidence level of the decision (0-1)
            metadata: Additional metadata about the decision
        """
        self.triggered = triggered
        self.action = action
        self.parameters = parameters or {}
        self.message = message
        self.confidence = confidence
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary."""
        return {
            'triggered': self.triggered,
            'action': self.action.value if self.action else None,
            'parameters': self.parameters,
            'message': self.message,
            'confidence': self.confidence,
            'metadata': self.metadata,
            'timestamp': self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExecutionRuleResult':
        """Create result from dictionary."""
        action = None
        if data.get('action'):
            try:
                action = RuleAction(data['action'])
            except ValueError:
                action = None
        
        return cls(
            triggered=data.get('triggered', False),
            action=action,
            parameters=data.get('parameters', {}),
            message=data.get('message', ""),
            confidence=data.get('confidence', 1.0),
            metadata=data.get('metadata', {})
        )
    
    @classmethod
    def no_action(cls, message: str = "No action taken") -> 'ExecutionRuleResult':
        """Create a result indicating no action."""
        return cls(
            triggered=False,
            action=RuleAction.HOLD,
            message=message
        )


class ExecutionRule(ABC):
    """
    Base class for all execution rules.
    
    Execution rules define when to enter or exit trades
    and how to manage positions.
    """
    
    def __init__(
        self,
        rule_id: str = "",
        name: str = "",
        description: str = "",
        rule_type: RuleType = RuleType.CUSTOM,
        enabled: bool = True,
        priority: int = 0
    ):
        """
        Initialize an execution rule.
        
        Args:
            rule_id: Unique identifier for the rule
            name: Name of the rule
            description: Description of the rule
            rule_type: Type of the rule
            enabled: Whether the rule is enabled
            priority: Priority of the rule (higher numbers = higher priority)
        """
        self.rule_id = rule_id
        self.name = name
        self.description = description
        self.rule_type = rule_type
        self.enabled = enabled
        self.priority = priority
        self.created_at = datetime.utcnow().isoformat()
        self.updated_at = self.created_at
        self.execution_history: List[ExecutionRuleResult] = []
    
    @abstractmethod
    def evaluate(
        self,
        data: pd.DataFrame,
        position: Dict[str, Any] = None,
        context: Dict[str, Any] = None
    ) -> ExecutionRuleResult:
        """
        Evaluate the rule based on market data and context.
        
        Args:
            data: Market data DataFrame
            position: Current position information
            context: Additional context information
            
        Returns:
            ExecutionRuleResult with the decision
        """
        pass
    
    def should_execute(
        self,
        result: ExecutionRuleResult,
        current_position: Dict[str, Any],
        context: Dict[str, Any]
    ) -> bool:
        """
        Determine if the rule result should be executed.
        
        This can be overridden to implement additional checks
        before executing a rule that has been triggered.
        
        Args:
            result: Result from evaluate method
            current_position: Current position information
            context: Additional context information
            
        Returns:
            True if the rule should be executed, False otherwise
        """
        return result.triggered and self.enabled
    
    def on_execution(self, result: ExecutionRuleResult) -> None:
        """
        Called when a rule is executed.
        
        This can be overridden to implement additional logic
        that should run when a rule is executed.
        
        Args:
            result: Result that was executed
        """
        self.execution_history.append(result)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert rule to dictionary."""
        return {
            'rule_id': self.rule_id,
            'name': self.name,
            'description': self.description,
            'rule_type': self.rule_type.value,
            'enabled': self.enabled,
            'priority': self.priority,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'class': self.__class__.__name__
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExecutionRule':
        """
        Create a rule from a dictionary.
        
        This base implementation needs to be overridden by subclasses
        to handle their specific parameters.
        
        Args:
            data: Dictionary with rule data
            
        Returns:
            ExecutionRule instance
        """
        rule = cls(
            rule_id=data.get('rule_id', ""),
            name=data.get('name', ""),
            description=data.get('description', ""),
            rule_type=RuleType(data.get('rule_type', RuleType.CUSTOM.value)),
            enabled=data.get('enabled', True),
            priority=data.get('priority', 0)
        )
        
        rule.created_at = data.get('created_at', rule.created_at)
        rule.updated_at = data.get('updated_at', rule.updated_at)
        
        return rule


class CompositeRule(ExecutionRule):
    """
    Combines multiple rules into a single rule.
    
    This allows for creating complex execution logic by
    combining simpler rules.
    """
    
    def __init__(
        self,
        rules: List[ExecutionRule] = None,
        rule_id: str = "",
        name: str = "Composite Rule",
        description: str = "Combines multiple rules",
        rule_type: RuleType = RuleType.CUSTOM,
        enabled: bool = True,
        priority: int = 0,
        require_all: bool = False
    ):
        """
        Initialize a composite rule.
        
        Args:
            rules: List of rules to combine
            rule_id: Unique identifier for the rule
            name: Name of the rule
            description: Description of the rule
            rule_type: Type of the rule
            enabled: Whether the rule is enabled
            priority: Priority of the rule
            require_all: If True, all rules must be triggered for this rule to trigger
                        If False, any rule being triggered will trigger this rule
        """
        super().__init__(
            rule_id=rule_id,
            name=name,
            description=description,
            rule_type=rule_type,
            enabled=enabled,
            priority=priority
        )
        
        self.rules = rules or []
        self.require_all = require_all
    
    def add_rule(self, rule: ExecutionRule) -> None:
        """
        Add a rule to the composite.
        
        Args:
            rule: Rule to add
        """
        self.rules.append(rule)
        self.updated_at = datetime.utcnow().isoformat()
    
    def remove_rule(self, rule_id: str) -> bool:
        """
        Remove a rule from the composite.
        
        Args:
            rule_id: ID of the rule to remove
            
        Returns:
            True if the rule was removed, False otherwise
        """
        initial_count = len(self.rules)
        self.rules = [rule for rule in self.rules if rule.rule_id != rule_id]
        
        if len(self.rules) < initial_count:
            self.updated_at = datetime.utcnow().isoformat()
            return True
        
        return False
    
    def evaluate(
        self,
        data: pd.DataFrame,
        position: Dict[str, Any] = None,
        context: Dict[str, Any] = None
    ) -> ExecutionRuleResult:
        """
        Evaluate all rules and combine results.
        
        Args:
            data: Market data DataFrame
            position: Current position information
            context: Additional context information
            
        Returns:
            Combined ExecutionRuleResult
        """
        position = position or {}
        context = context or {}
        
        if not self.rules:
            return ExecutionRuleResult.no_action("No rules to evaluate")
        
        # Evaluate all rules
        results = []
        for rule in self.rules:
            if rule.enabled:
                result = rule.evaluate(data, position, context)
                results.append(result)
        
        # Check if any rules were evaluated
        if not results:
            return ExecutionRuleResult.no_action("No enabled rules to evaluate")
        
        # Determine if the composite rule is triggered
        if self.require_all:
            # All rules must be triggered
            triggered = all(result.triggered for result in results)
        else:
            # Any rule being triggered is enough
            triggered = any(result.triggered for result in results)
        
        if not triggered:
            return ExecutionRuleResult.no_action("Composite rule conditions not met")
        
        # Find the highest priority result from triggered rules
        triggered_results = [r for r in results if r.triggered]
        if not triggered_results:
            return ExecutionRuleResult.no_action("No rules were triggered")
        
        # Sort by rule priority if available, otherwise use order in the list
        result_with_rule = [(results[i], self.rules[i]) for i in range(len(results)) 
                           if results[i].triggered and i < len(self.rules)]
        
        if result_with_rule:
            highest_priority = max(result_with_rule, key=lambda x: x[1].priority)
            primary_result = highest_priority[0]
        else:
            # Fallback to the first triggered result
            primary_result = triggered_results[0]
        
        # Create the composite result
        composite_result = ExecutionRuleResult(
            triggered=True,
            action=primary_result.action,
            parameters=primary_result.parameters.copy(),
            message=f"Composite rule triggered: {primary_result.message}",
            confidence=primary_result.confidence,
            metadata={
                'composite_rule_id': self.rule_id,
                'primary_result': primary_result.to_dict(),
                'all_results': [r.to_dict() for r in results],
                'require_all': self.require_all
            }
        )
        
        return composite_result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert composite rule to dictionary."""
        rule_dict = super().to_dict()
        rule_dict.update({
            'rules': [rule.to_dict() for rule in self.rules],
            'require_all': self.require_all
        })
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CompositeRule':
        """Create a composite rule from a dictionary."""
        base_rule = super().from_dict(data)
        
        # Create the composite rule
        composite = cls(
            rules=[],  # We'll add the rules below
            rule_id=base_rule.rule_id,
            name=base_rule.name,
            description=base_rule.description,
            rule_type=base_rule.rule_type,
            enabled=base_rule.enabled,
            priority=base_rule.priority,
            require_all=data.get('require_all', False)
        )
        
        # Set timestamps
        composite.created_at = base_rule.created_at
        composite.updated_at = base_rule.updated_at
        
        # Add rules if provided
        rule_dicts = data.get('rules', [])
        for rule_dict in rule_dicts:
            # This would need a rule factory to instantiate the correct rule type
            # Here we're assuming such a factory function exists
            rule_class_name = rule_dict.get('class')
            if rule_class_name and rule_class_name in globals():
                rule_class = globals()[rule_class_name]
                rule = rule_class.from_dict(rule_dict)
                composite.rules.append(rule)
        
        return composite


class ConditionalRule(ExecutionRule):
    """
    Rule that uses a custom condition function.
    
    This allows for flexible rule creation without creating
    new rule classes for every scenario.
    """
    
    def __init__(
        self,
        condition_func: Callable[[pd.DataFrame, Dict[str, Any], Dict[str, Any]], bool],
        action_func: Callable[[pd.DataFrame, Dict[str, Any], Dict[str, Any]], Dict[str, Any]],
        rule_id: str = "",
        name: str = "Conditional Rule",
        description: str = "Rule with custom condition function",
        rule_type: RuleType = RuleType.CUSTOM,
        enabled: bool = True,
        priority: int = 0
    ):
        """
        Initialize a conditional rule.
        
        Args:
            condition_func: Function that takes (data, position, context) and returns
                          True if the rule should be triggered
            action_func: Function that takes (data, position, context) and returns
                       a dictionary with 'action' (RuleAction) and any parameters
            rule_id: Unique identifier for the rule
            name: Name of the rule
            description: Description of the rule
            rule_type: Type of the rule
            enabled: Whether the rule is enabled
            priority: Priority of the rule
        """
        super().__init__(
            rule_id=rule_id,
            name=name,
            description=description,
            rule_type=rule_type,
            enabled=enabled,
            priority=priority
        )
        
        self.condition_func = condition_func
        self.action_func = action_func
    
    def evaluate(
        self,
        data: pd.DataFrame,
        position: Dict[str, Any] = None,
        context: Dict[str, Any] = None
    ) -> ExecutionRuleResult:
        """
        Evaluate the rule using the condition function.
        
        Args:
            data: Market data DataFrame
            position: Current position information
            context: Additional context information
            
        Returns:
            ExecutionRuleResult with the decision
        """
        position = position or {}
        context = context or {}
        
        try:
            # Check if the condition is met
            triggered = self.condition_func(data, position, context)
            
            if not triggered:
                return ExecutionRuleResult.no_action("Condition not met")
            
            # Get action details
            action_details = self.action_func(data, position, context)
            
            # Extract action and parameters
            action = action_details.get('action')
            if isinstance(action, str):
                try:
                    action = RuleAction(action)
                except ValueError:
                    action = RuleAction.CUSTOM
            
            parameters = action_details.get('parameters', {})
            message = action_details.get('message', f"Rule {self.name} triggered")
            confidence = action_details.get('confidence', 1.0)
            metadata = action_details.get('metadata', {})
            
            # Create the result
            result = ExecutionRuleResult(
                triggered=True,
                action=action,
                parameters=parameters,
                message=message,
                confidence=confidence,
                metadata=metadata
            )
            
            return result
            
        except Exception as e:
            # Handle any errors in the condition or action function
            return ExecutionRuleResult(
                triggered=False,
                action=RuleAction.HOLD,
                message=f"Error evaluating rule: {str(e)}",
                confidence=0.0,
                metadata={'error': str(e)}
            )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert conditional rule to dictionary.
        
        Note: This cannot serialize the functions, so they
        will need to be re-created when loading from dict.
        """
        rule_dict = super().to_dict()
        rule_dict.update({
            'condition_func_present': True,
            'action_func_present': True
        })
        return rule_dict
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConditionalRule':
        """
        Create a conditional rule from a dictionary.
        
        Note: This needs the functions to be supplied separately,
        as they cannot be serialized/deserialized directly.
        """
        return cls(
            # Placeholder functions that always return False/empty
            condition_func=lambda data, position, context: False,
            action_func=lambda data, position, context: {'action': RuleAction.HOLD},
            rule_id=data.get('rule_id', ""),
            name=data.get('name', ""),
            description=data.get('description', ""),
            rule_type=RuleType(data.get('rule_type', RuleType.CUSTOM.value)),
            enabled=data.get('enabled', True),
            priority=data.get('priority', 0)
        )
