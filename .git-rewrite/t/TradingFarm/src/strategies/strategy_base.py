"""
Strategy Base Module

Defines the core interfaces and base classes for trading strategies.
Provides the foundation for strategy creation, parameterization, and execution.
"""

import json
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional, Union, Tuple

import numpy as np
import pandas as pd


class StrategyType(Enum):
    """Types of trading strategies"""
    TREND_FOLLOWING = "trend_following"
    MEAN_REVERSION = "mean_reversion"
    BREAKOUT = "breakout"
    MOMENTUM = "momentum"
    PATTERN_RECOGNITION = "pattern_recognition"
    STATISTICAL_ARBITRAGE = "statistical_arbitrage"
    MACHINE_LEARNING = "machine_learning"
    SENTIMENT_BASED = "sentiment_based"
    MULTI_FACTOR = "multi_factor"
    CUSTOM = "custom"


class StrategyStatus(Enum):
    """Status of a strategy"""
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    BACKTESTING = "backtesting"
    OPTIMIZING = "optimizing"
    ERROR = "error"
    DRAFT = "draft"


class StrategyParameters:
    """
    Container for strategy parameters with validation and serialization.
    
    This class provides a structured way to define, validate, and manage
    parameters for trading strategies. It includes support for different
    parameter types, validation rules, and serialization.
    """
    
    def __init__(self, **kwargs):
        """
        Initialize strategy parameters with provided values.
        
        Args:
            **kwargs: Parameter name-value pairs
        """
        self._parameters = {}
        self._metadata = {}
        
        for name, value in kwargs.items():
            self.set(name, value)
    
    def define(
        self,
        name: str,
        default_value: Any,
        param_type: type,
        description: str = "",
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        choices: Optional[List[Any]] = None,
        is_required: bool = False,
        is_optimizable: bool = False
    ) -> None:
        """
        Define a parameter with metadata.
        
        Args:
            name: Parameter name
            default_value: Default value
            param_type: Parameter type
            description: Description of the parameter
            min_value: Minimum value (for numeric types)
            max_value: Maximum value (for numeric types)
            choices: Allowed values
            is_required: Whether parameter is required
            is_optimizable: Whether parameter can be optimized
        """
        self._metadata[name] = {
            "type": param_type,
            "description": description,
            "min_value": min_value,
            "max_value": max_value,
            "choices": choices,
            "required": is_required,
            "optimizable": is_optimizable
        }
        
        # Set default value if parameter doesn't exist yet
        if name not in self._parameters:
            self.set(name, default_value)
    
    def set(self, name: str, value: Any) -> None:
        """
        Set a parameter value with validation.
        
        Args:
            name: Parameter name
            value: Parameter value
            
        Raises:
            ValueError: If validation fails
        """
        # Validate if metadata exists
        if name in self._metadata:
            self._validate_parameter(name, value)
        
        self._parameters[name] = value
    
    def get(self, name: str, default: Any = None) -> Any:
        """
        Get a parameter value.
        
        Args:
            name: Parameter name
            default: Default value if parameter does not exist
            
        Returns:
            Parameter value or default
        """
        return self._parameters.get(name, default)
    
    def keys(self) -> List[str]:
        """Get all parameter names."""
        return list(self._parameters.keys())
    
    def items(self):
        """Get all parameter name-value pairs."""
        return self._parameters.items()
    
    def get_optimizable_params(self) -> Dict[str, Dict[str, Any]]:
        """
        Get parameters that can be optimized.
        
        Returns:
            Dictionary of optimizable parameters with their metadata
        """
        optimizable = {}
        for name, metadata in self._metadata.items():
            if metadata.get("optimizable", False):
                optimizable[name] = {
                    "current_value": self._parameters.get(name),
                    **metadata
                }
        return optimizable
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert parameters to dictionary."""
        return {
            "parameters": self._parameters.copy(),
            "metadata": self._metadata.copy()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StrategyParameters':
        """Create parameters from dictionary."""
        instance = cls()
        instance._parameters = data.get("parameters", {}).copy()
        instance._metadata = data.get("metadata", {}).copy()
        return instance
    
    def to_json(self) -> str:
        """Convert parameters to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_json(cls, json_str: str) -> 'StrategyParameters':
        """Create parameters from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def _validate_parameter(self, name: str, value: Any) -> None:
        """
        Validate a parameter value against its metadata.
        
        Args:
            name: Parameter name
            value: Parameter value
            
        Raises:
            ValueError: If validation fails
        """
        metadata = self._metadata[name]
        
        # Check type
        expected_type = metadata["type"]
        if not isinstance(value, expected_type) and value is not None:
            # Special handling for numeric types
            if expected_type in (int, float) and isinstance(value, (int, float)):
                # Allow int for float and vice versa
                pass
            else:
                raise ValueError(
                    f"Parameter '{name}' has invalid type. "
                    f"Expected {expected_type.__name__}, got {type(value).__name__}"
                )
        
        # Skip further validation if value is None
        if value is None:
            # Check if required
            if metadata.get("required", False):
                raise ValueError(f"Parameter '{name}' is required but value is None")
            return
        
        # Check min/max for numeric types
        if isinstance(value, (int, float)):
            min_value = metadata.get("min_value")
            if min_value is not None and value < min_value:
                raise ValueError(
                    f"Parameter '{name}' value {value} is less than minimum {min_value}"
                )
            
            max_value = metadata.get("max_value")
            if max_value is not None and value > max_value:
                raise ValueError(
                    f"Parameter '{name}' value {value} is greater than maximum {max_value}"
                )
        
        # Check choices
        choices = metadata.get("choices")
        if choices is not None and value not in choices:
            raise ValueError(
                f"Parameter '{name}' value {value} is not in allowed choices: {choices}"
            )


class Strategy(ABC):
    """
    Abstract base class for trading strategies.
    
    This class defines the interface for all trading strategies in the system.
    It provides methods for initialization, signal generation, parameter management,
    and serialization.
    """
    
    def __init__(
        self, 
        strategy_id: Optional[str] = None,
        name: str = "",
        description: str = "",
        strategy_type: StrategyType = StrategyType.CUSTOM,
        parameters: Optional[StrategyParameters] = None,
        symbols: Optional[List[str]] = None,
        timeframes: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize a strategy.
        
        Args:
            strategy_id: Unique identifier for the strategy
            name: Strategy name
            description: Strategy description
            strategy_type: Type of strategy
            parameters: Strategy parameters
            symbols: Trading symbols
            timeframes: Timeframes for analysis
            tags: Tags for categorization
            metadata: Additional metadata
        """
        self.strategy_id = strategy_id or str(uuid.uuid4())
        self.name = name
        self.description = description
        self.strategy_type = strategy_type
        self.parameters = parameters or StrategyParameters()
        self.symbols = symbols or []
        self.timeframes = timeframes or []
        self.tags = tags or []
        self.metadata = metadata or {}
        
        self.status = StrategyStatus.DRAFT
        self.created_at = datetime.utcnow().isoformat()
        self.updated_at = self.created_at
        self.last_run = None
        
        # Initialize parameter definitions
        self._initialize_parameters()
    
    @abstractmethod
    def _initialize_parameters(self) -> None:
        """
        Initialize parameter definitions.
        
        This method should define all parameters used by the strategy,
        including default values, types, and validation rules.
        """
        pass
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals for the given data.
        
        Args:
            data: Market data frame with OHLCV and any indicators
            
        Returns:
            DataFrame with original data and added signal columns
        """
        pass
    
    def update_parameters(self, **kwargs) -> None:
        """
        Update strategy parameters.
        
        Args:
            **kwargs: Parameter name-value pairs
        """
        for name, value in kwargs.items():
            self.parameters.set(name, value)
        
        self.updated_at = datetime.utcnow().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert strategy to dictionary."""
        return {
            "strategy_id": self.strategy_id,
            "name": self.name,
            "description": self.description,
            "strategy_type": self.strategy_type.value,
            "parameters": self.parameters.to_dict(),
            "symbols": self.symbols,
            "timeframes": self.timeframes,
            "tags": self.tags,
            "metadata": self.metadata,
            "status": self.status.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_run": self.last_run,
            "class_name": self.__class__.__name__
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Strategy':
        """
        Create a strategy from dictionary.
        
        This is a factory method that creates the appropriate strategy 
        subclass based on the class_name field in the data.
        
        Args:
            data: Strategy data
            
        Returns:
            Strategy instance
        """
        # This should be implemented by a factory that knows all strategy types
        # For now, just return a basic implementation for the specific class
        strategy_class = cls
        
        # Create new strategy instance
        strategy = strategy_class(
            strategy_id=data.get("strategy_id"),
            name=data.get("name", ""),
            description=data.get("description", ""),
            strategy_type=StrategyType(data.get("strategy_type", "custom")),
            parameters=StrategyParameters.from_dict(data.get("parameters", {})),
            symbols=data.get("symbols", []),
            timeframes=data.get("timeframes", []),
            tags=data.get("tags", []),
            metadata=data.get("metadata", {})
        )
        
        # Set timestamps and status
        strategy.created_at = data.get("created_at", strategy.created_at)
        strategy.updated_at = data.get("updated_at", strategy.updated_at)
        strategy.last_run = data.get("last_run")
        
        try:
            strategy.status = StrategyStatus(data.get("status", "draft"))
        except ValueError:
            strategy.status = StrategyStatus.DRAFT
        
        return strategy
    
    def to_json(self) -> str:
        """Convert strategy to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Strategy':
        """Create strategy from JSON string."""
        data = json.loads(json_str)
        return cls.from_dict(data)
    
    def clone(self, new_id: bool = True, new_name: Optional[str] = None) -> 'Strategy':
        """
        Create a clone of this strategy.
        
        Args:
            new_id: Whether to generate a new ID
            new_name: New name for the clone
            
        Returns:
            Cloned strategy
        """
        data = self.to_dict()
        
        if new_id:
            data["strategy_id"] = str(uuid.uuid4())
        
        if new_name:
            data["name"] = new_name
        elif new_id:
            data["name"] = f"{data['name']} (Copy)"
        
        # Reset timestamps
        data["created_at"] = datetime.utcnow().isoformat()
        data["updated_at"] = data["created_at"]
        data["last_run"] = None
        data["status"] = StrategyStatus.DRAFT.value
        
        return self.__class__.from_dict(data)
