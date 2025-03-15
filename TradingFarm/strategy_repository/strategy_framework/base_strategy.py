"""
Base Strategy Definition
======================
Abstract base class for all trading strategies in the Trading Farm ecosystem.
Defines the required interface and common functionality.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union
import pandas as pd
import numpy as np
import logging
from datetime import datetime

from .signal_generator import SignalGenerator
from .entry_exit_rules import EntryExitRules
from .risk_management import RiskManagement

logger = logging.getLogger(__name__)

class BaseStrategy(ABC):
    """
    Abstract base class for all trading strategies.
    
    All strategy implementations must inherit from this class and implement
    its abstract methods to ensure compatibility with the Trading Farm system.
    """
    
    def __init__(self, 
                 name: str,
                 description: str,
                 version: str = "1.0.0",
                 asset_class: str = "crypto",
                 timeframe: str = "1h",
                 parameters: Dict[str, Any] = None,
                 tags: List[str] = None):
        """
        Initialize a trading strategy with basic metadata.
        
        Args:
            name: Strategy name
            description: Strategy description
            version: Strategy version
            asset_class: Asset class (crypto, forex, stocks, etc.)
            timeframe: Default timeframe for the strategy
            parameters: Strategy parameters dictionary
            tags: List of tags for categorization
        """
        self.name = name
        self.description = description
        self.version = version
        self.asset_class = asset_class
        self.timeframe = timeframe
        self.parameters = parameters or {}
        self.tags = tags or []
        
        # Core components
        self.signal_generator: Optional[SignalGenerator] = None
        self.entry_exit_rules: Optional[EntryExitRules] = None
        self.risk_management: Optional[RiskManagement] = None
        
        # Strategy state
        self.is_active = False
        self.last_update_time = None
        self.metadata = {
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "performance_metrics": {},
            "compatibility": {
                "exchanges": [],
                "chains": []
            }
        }
        
        # Initialize strategy
        self._initialize()
        
        logger.info(f"Strategy {self.name} (v{self.version}) initialized")
    
    def _initialize(self):
        """Initialize strategy components and validate configuration."""
        # To be implemented by subclasses or can be used for common initialization
        pass
    
    @abstractmethod
    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Generate trading signals from market data.
        
        Args:
            data: Market data as a pandas DataFrame
            
        Returns:
            DataFrame with signals added
        """
        pass
    
    @abstractmethod
    def should_enter_trade(self, current_price: float, context: Dict[str, Any]) -> bool:
        """
        Determine if a trade entry should be executed.
        
        Args:
            current_price: Current market price
            context: Additional context information
            
        Returns:
            True if a trade should be entered, False otherwise
        """
        pass
    
    @abstractmethod
    def should_exit_trade(self, current_price: float, entry_price: float, 
                          context: Dict[str, Any]) -> bool:
        """
        Determine if a trade exit should be executed.
        
        Args:
            current_price: Current market price
            entry_price: Price at which the trade was entered
            context: Additional context information
            
        Returns:
            True if a trade should be exited, False otherwise
        """
        pass
    
    @abstractmethod
    def calculate_position_size(self, account_size: float, risk_per_trade: float, 
                               stop_loss: Optional[float] = None) -> float:
        """
        Calculate the position size for a trade.
        
        Args:
            account_size: Total account size in base currency
            risk_per_trade: Risk percentage per trade (0.01 = 1%)
            stop_loss: Optional stop loss price
            
        Returns:
            Recommended position size
        """
        pass
    
    def update_parameters(self, parameters: Dict[str, Any]) -> None:
        """
        Update strategy parameters.
        
        Args:
            parameters: New parameters to update
        """
        self.parameters.update(parameters)
        self.metadata["updated_at"] = datetime.now().isoformat()
        logger.info(f"Strategy {self.name} parameters updated")
    
    def activate(self) -> None:
        """Activate the strategy."""
        self.is_active = True
        logger.info(f"Strategy {self.name} activated")
    
    def deactivate(self) -> None:
        """Deactivate the strategy."""
        self.is_active = False
        logger.info(f"Strategy {self.name} deactivated")
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get strategy information.
        
        Returns:
            Dictionary containing strategy information
        """
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "asset_class": self.asset_class,
            "timeframe": self.timeframe,
            "parameters": self.parameters,
            "tags": self.tags,
            "is_active": self.is_active,
            "metadata": self.metadata
        }
    
    def validate(self) -> bool:
        """
        Validate the strategy configuration.
        
        Returns:
            True if the strategy is valid, False otherwise
        """
        # Basic validation
        is_valid = (
            self.name is not None and
            self.description is not None and
            self.signal_generator is not None and
            self.entry_exit_rules is not None and
            self.risk_management is not None
        )
        
        if not is_valid:
            logger.warning(f"Strategy {self.name} validation failed")
        
        return is_valid
    
    def __str__(self) -> str:
        """String representation of the strategy."""
        return f"Strategy(name={self.name}, version={self.version}, active={self.is_active})"
    
    def __repr__(self) -> str:
        """Representation of the strategy."""
        return self.__str__()
