"""
Entry and Exit Rules
==================
Base class for defining entry and exit conditions for trading strategies.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union, Tuple
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class EntryExitRules(ABC):
    """
    Base class for components that define trade entry and exit conditions.
    
    Entry/Exit rules determine when a strategy should enter or exit a position
    based on signals, current market conditions, and risk parameters.
    """
    
    def __init__(self, name: str, parameters: Dict[str, Any] = None):
        """
        Initialize entry and exit rules.
        
        Args:
            name: Name of the entry/exit rule set
            parameters: Parameters for customizing the rules' behavior
        """
        self.name = name
        self.parameters = parameters or {}
        self.entries = []
        self.exits = []
        logger.info(f"Entry/Exit rule set '{name}' initialized")
    
    @abstractmethod
    def should_enter(self, current_price: float, signal: Dict[str, Any], 
                    context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Determine if a trade entry should be executed.
        
        Args:
            current_price: Current market price
            signal: Signal dictionary with trade information
            context: Additional context information
            
        Returns:
            Tuple of (should_enter, entry_details)
        """
        pass
    
    @abstractmethod
    def should_exit(self, current_price: float, entry_price: float,
                  position_data: Dict[str, Any], context: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Determine if a trade exit should be executed.
        
        Args:
            current_price: Current market price
            entry_price: Price at which the trade was entered
            position_data: Data about the current position
            context: Additional context information
            
        Returns:
            Tuple of (should_exit, exit_details)
        """
        pass
    
    def set_parameters(self, parameters: Dict[str, Any]) -> None:
        """
        Update the entry/exit rules parameters.
        
        Args:
            parameters: New parameters to update
        """
        self.parameters.update(parameters)
        logger.info(f"Entry/Exit rule set '{self.name}' parameters updated")
    
    def calculate_stop_loss(self, entry_price: float, direction: str, 
                          risk_percentage: float = None) -> float:
        """
        Calculate stop loss price based on entry price and risk.
        
        Args:
            entry_price: Entry price of the trade
            direction: Trade direction ('long' or 'short')
            risk_percentage: Optional percentage-based risk (e.g., 0.01 = 1%)
            
        Returns:
            Calculated stop loss price
        """
        # Use provided risk percentage or default from parameters
        risk_pct = risk_percentage or self.parameters.get('default_stop_loss_pct', 0.02)
        
        if direction.lower() == 'long':
            return entry_price * (1 - risk_pct)
        else:  # Short
            return entry_price * (1 + risk_pct)
    
    def calculate_take_profit(self, entry_price: float, direction: str,
                            reward_risk_ratio: float = None) -> float:
        """
        Calculate take profit price based on entry price and reward/risk ratio.
        
        Args:
            entry_price: Entry price of the trade
            direction: Trade direction ('long' or 'short')
            reward_risk_ratio: Optional reward-to-risk ratio (default: 2.0)
            
        Returns:
            Calculated take profit price
        """
        # Use provided ratio or default from parameters
        ratio = reward_risk_ratio or self.parameters.get('default_reward_risk_ratio', 2.0)
        risk_pct = self.parameters.get('default_stop_loss_pct', 0.02)
        
        if direction.lower() == 'long':
            return entry_price * (1 + (risk_pct * ratio))
        else:  # Short
            return entry_price * (1 - (risk_pct * ratio))
    
    def record_entry(self, entry_data: Dict[str, Any]) -> None:
        """
        Record an entry for analysis and tracking.
        
        Args:
            entry_data: Data about the trade entry
        """
        self.entries.append(entry_data)
    
    def record_exit(self, exit_data: Dict[str, Any]) -> None:
        """
        Record an exit for analysis and tracking.
        
        Args:
            exit_data: Data about the trade exit
        """
        self.exits.append(exit_data)
    
    def get_entries(self, n: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get recent entries.
        
        Args:
            n: Number of recent entries to return, or None for all entries
            
        Returns:
            List of recent entries
        """
        if n is None:
            return self.entries
        return self.entries[-n:]
    
    def get_exits(self, n: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get recent exits.
        
        Args:
            n: Number of recent exits to return, or None for all exits
            
        Returns:
            List of recent exits
        """
        if n is None:
            return self.exits
        return self.exits[-n:]
    
    def __str__(self) -> str:
        """String representation of the entry/exit rules."""
        return f"EntryExitRules(name={self.name}, parameters={self.parameters})"
