"""
Signal Base Module

Defines the base classes and interfaces for signal generation.
Provides the foundation for all types of trading signals.
"""

from abc import ABC, abstractmethod
from enum import Enum
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Union, Any


class SignalType(Enum):
    """Types of trading signals."""
    BUY = 1
    SELL = -1
    HOLD = 0
    
    STRONG_BUY = 2
    STRONG_SELL = -2
    
    EXIT_LONG = -1
    EXIT_SHORT = 1
    
    # Special signal types
    RISK_ON = 100
    RISK_OFF = -100
    
    @classmethod
    def to_signal_value(cls, signal_type) -> int:
        """Convert signal type to numeric value."""
        if isinstance(signal_type, cls):
            return signal_type.value
        return 0
    
    @classmethod
    def from_signal_value(cls, value: int) -> 'SignalType':
        """Convert numeric value to signal type."""
        for signal_type in cls:
            if signal_type.value == value:
                return signal_type
        return cls.HOLD


class SignalStrength(Enum):
    """Strength or conviction level of a signal."""
    WEAK = 1
    MODERATE = 2
    STRONG = 3
    VERY_STRONG = 4
    
    @classmethod
    def to_multiplier(cls, strength: 'SignalStrength') -> float:
        """Convert signal strength to multiplier for position sizing."""
        if strength == cls.WEAK:
            return 0.25
        elif strength == cls.MODERATE:
            return 0.5
        elif strength == cls.STRONG:
            return 0.75
        elif strength == cls.VERY_STRONG:
            return 1.0
        return 0.0


class SignalGenerator(ABC):
    """
    Base class for all signal generators.
    
    Signal generators analyze market data and generate
    trading signals based on specific criteria.
    """
    
    def __init__(self, name: str = "", description: str = ""):
        """
        Initialize a signal generator.
        
        Args:
            name: Name of the signal generator
            description: Description of the signal generator
        """
        self.name = name
        self.description = description
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals for the given data.
        
        This method should add a 'signal' column to the DataFrame
        with values corresponding to SignalType values.
        
        Args:
            data: Market data frame with OHLCV and any indicators
            
        Returns:
            DataFrame with original data and added signal column
        """
        pass
    
    def process_parameters(self, **kwargs) -> Dict[str, Any]:
        """
        Process parameters for signal generation.
        
        This method allows for validating and normalizing parameters
        before they are used for signal generation.
        
        Args:
            **kwargs: Parameter name-value pairs
            
        Returns:
            Processed parameters
        """
        # Default implementation just returns the parameters
        return kwargs
    
    def combine_with(
        self,
        other_generator: 'SignalGenerator',
        data: pd.DataFrame,
        weight: float = 0.5
    ) -> pd.DataFrame:
        """
        Combine signals from this generator with another.
        
        This allows for creating composite signals by weighting
        multiple signal generators.
        
        Args:
            other_generator: Another signal generator
            data: Market data frame
            weight: Weight to apply to this generator's signals (0-1)
                   Other generator gets (1-weight)
            
        Returns:
            DataFrame with combined signals
        """
        # Generate signals from both generators
        signals1 = self.generate_signals(data.copy())
        signals2 = other_generator.generate_signals(data.copy())
        
        # Ensure both have 'signal' column
        if 'signal' not in signals1.columns or 'signal' not in signals2.columns:
            raise ValueError("Both signal generators must produce a 'signal' column")
        
        # Combine signals with weighting
        combined = data.copy()
        combined['signal'] = (weight * signals1['signal'] + 
                             (1 - weight) * signals2['signal'])
        
        # Threshold or round signals if needed
        # This is optional and depends on how signals should be interpreted
        
        return combined
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signal generator to dictionary."""
        return {
            'name': self.name,
            'description': self.description,
            'type': self.__class__.__name__
        }


class CompositeSignalGenerator(SignalGenerator):
    """
    Combines multiple signal generators with weights.
    
    This allows for creating complex signal generators by
    combining simpler ones with different weights.
    """
    
    def __init__(
        self,
        generators: List[Tuple[SignalGenerator, float]] = None,
        name: str = "Composite Signal Generator",
        description: str = "Combines multiple signal generators"
    ):
        """
        Initialize a composite signal generator.
        
        Args:
            generators: List of (generator, weight) tuples
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        self.generators = generators or []
        
        # Normalize weights to sum to 1.0
        self._normalize_weights()
    
    def _normalize_weights(self) -> None:
        """Normalize weights to sum to 1.0."""
        if not self.generators:
            return
        
        total_weight = sum(weight for _, weight in self.generators)
        
        if total_weight == 0:
            # If all weights are 0, set equal weights
            weight = 1.0 / len(self.generators)
            self.generators = [(gen, weight) for gen, _ in self.generators]
        elif total_weight != 1.0:
            # Normalize weights
            self.generators = [
                (gen, weight / total_weight) 
                for gen, weight in self.generators
            ]
    
    def add_generator(
        self,
        generator: SignalGenerator,
        weight: float = 1.0
    ) -> None:
        """
        Add a signal generator with a weight.
        
        Args:
            generator: Signal generator to add
            weight: Weight for the generator
        """
        self.generators.append((generator, weight))
        self._normalize_weights()
    
    def remove_generator(self, index: int) -> None:
        """
        Remove a signal generator by index.
        
        Args:
            index: Index of the generator to remove
        """
        if 0 <= index < len(self.generators):
            self.generators.pop(index)
            self._normalize_weights()
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals using all component generators.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with combined signals
        """
        if not self.generators:
            # No generators, return data with zero signals
            result = data.copy()
            result['signal'] = 0
            return result
        
        # Generate signals from each generator
        result = data.copy()
        result['signal'] = 0
        
        for generator, weight in self.generators:
            signals = generator.generate_signals(data.copy())
            
            if 'signal' in signals.columns:
                result['signal'] += weight * signals['signal']
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert composite signal generator to dictionary."""
        base_dict = super().to_dict()
        
        # Add information about component generators
        base_dict['generators'] = [
            {
                'generator': generator.to_dict(),
                'weight': weight
            }
            for generator, weight in self.generators
        ]
        
        return base_dict


class FilterSignalGenerator(SignalGenerator):
    """
    Filters signals from another generator based on conditions.
    
    This allows for creating signal filters that only pass through
    signals when certain conditions are met.
    """
    
    def __init__(
        self,
        base_generator: SignalGenerator,
        filter_func: Callable[[pd.DataFrame, pd.Series], pd.Series],
        name: str = "Filter Signal Generator",
        description: str = "Filters signals based on conditions"
    ):
        """
        Initialize a filter signal generator.
        
        Args:
            base_generator: The base signal generator to filter
            filter_func: Function that takes (data, signals) and returns filtered signals
            name: Name of the signal generator
            description: Description of the signal generator
        """
        super().__init__(name, description)
        self.base_generator = base_generator
        self.filter_func = filter_func
    
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate filtered trading signals.
        
        Args:
            data: Market data frame
            
        Returns:
            DataFrame with filtered signals
        """
        # Generate base signals
        base_signals = self.base_generator.generate_signals(data.copy())
        
        # Apply filter
        if 'signal' in base_signals.columns:
            filtered_signals = self.filter_func(data, base_signals['signal'])
            
            # Create result with filtered signals
            result = data.copy()
            result['signal'] = filtered_signals
            
            return result
        
        # If no signal column, just return the base signals
        return base_signals
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert filter signal generator to dictionary."""
        base_dict = super().to_dict()
        base_dict['base_generator'] = self.base_generator.to_dict()
        return base_dict
