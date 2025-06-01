"""
Signal Generator
==============
Base class for signal generators that analyze market data to produce trading signals.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class SignalGenerator(ABC):
    """
    Base class for components that generate trading signals from market data.
    
    Signal generators are responsible for analyzing market data and identifying
    potential trading opportunities based on specific criteria or indicators.
    """
    
    def __init__(self, name: str, parameters: Dict[str, Any] = None):
        """
        Initialize a signal generator.
        
        Args:
            name: Name of the signal generator
            parameters: Parameters for customizing the generator's behavior
        """
        self.name = name
        self.parameters = parameters or {}
        self.signals = []
        logger.info(f"Signal generator '{name}' initialized")
    
    @abstractmethod
    def generate(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals from market data.
        
        Args:
            data: Market data as a pandas DataFrame
            
        Returns:
            DataFrame with signals added
        """
        pass
    
    def set_parameters(self, parameters: Dict[str, Any]) -> None:
        """
        Update the signal generator parameters.
        
        Args:
            parameters: New parameters to update
        """
        self.parameters.update(parameters)
        logger.info(f"Signal generator '{self.name}' parameters updated")
    
    def get_last_signal(self) -> Optional[Dict[str, Any]]:
        """
        Get the most recent signal.
        
        Returns:
            The most recent signal or None if no signals have been generated
        """
        if self.signals:
            return self.signals[-1]
        return None
    
    def get_signals(self, n: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get recent signals.
        
        Args:
            n: Number of recent signals to return, or None for all signals
            
        Returns:
            List of recent signals
        """
        if n is None:
            return self.signals
        return self.signals[-n:]
    
    def clear_signals(self) -> None:
        """Clear all stored signals."""
        self.signals = []
        logger.info(f"Signal generator '{self.name}' signals cleared")
    
    def __str__(self) -> str:
        """String representation of the signal generator."""
        return f"SignalGenerator(name={self.name}, parameters={self.parameters})"
