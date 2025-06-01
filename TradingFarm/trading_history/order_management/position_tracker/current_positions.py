"""
Current Positions Module

Tracks all open positions across different assets and strategies.
Provides real-time position data and analysis for active risk management.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime


class CurrentPositions:
    """
    Tracks and manages all current open positions.
    
    Provides methods to:
    - Add and update positions
    - Calculate position values and P&L
    - Monitor position age and performance
    - Support for multi-asset position tracking
    - Integration with ElizaOS agents for autonomous monitoring
    """
    
    def __init__(self):
        """Initialize an empty current positions tracker."""
        self._positions = {}  # position_id -> position_details
        self._last_prices = {}  # symbol -> last_price
        self._elizaos_agents = {}  # position_id -> monitoring_agent
        
    def add_position(self, position_id: str, symbol: str, quantity: float, 
                   entry_price: float, entry_time: datetime, 
                   strategy_id: str, side: str = 'long',
                   stop_loss: Optional[float] = None, 
                   take_profit: Optional[float] = None,
                   trading_pair: Optional[str] = None,
                   chain_id: Optional[str] = None,
                   tags: Optional[List[str]] = None,
                   elizaos_monitor: bool = False,
                   **kwargs) -> bool:
        """
        Add a new position to the tracker.
        
        Parameters:
        -----------
        position_id : str
            Unique identifier for the position
        symbol : str
            The trading symbol/instrument
        quantity : float
            Size of the position
        entry_price : float
            Average entry price
        entry_time : datetime
            Time the position was entered
        strategy_id : str
            ID of the strategy that opened the position
        side : str
            'long' or 'short'
        stop_loss : float, optional
            Stop loss price level
        take_profit : float, optional
            Take profit price level
        trading_pair : str, optional
            Base/quote pair for crypto assets
        chain_id : str, optional
            Blockchain ID for crypto assets
        tags : list, optional
            Custom tags for position categorization
        elizaos_monitor : bool
            Whether to enable autonomous ElizaOS monitoring
        **kwargs : dict
            Any additional position parameters
            
        Returns:
        --------
        bool
            True if position was added successfully, False if already exists
        """
        if position_id in self._positions:
            return False
        
        if tags is None:
            tags = []
        
        self._positions[position_id] = {
            'position_id': position_id,
            'symbol': symbol,
            'quantity': quantity,
            'entry_price': entry_price,
            'current_price': entry_price,  # Initialize with entry price
            'entry_time': entry_time,
            'strategy_id': strategy_id,
            'side': side.lower(),
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'trading_pair': trading_pair,
            'chain_id': chain_id,
            'tags': tags,
            'age': 0,  # Will be updated
            'unrealized_pnl': 0.0,  # Will be updated
            'unrealized_pnl_percent': 0.0,  # Will be updated
            'market_value': quantity * entry_price,
            'elizaos_monitor': elizaos_monitor,
            'last_update': entry_time,
            **kwargs
        }
        
        # If ElizaOS monitoring is requested, set up an agent
        if elizaos_monitor:
            self._setup_elizaos_monitor(position_id)
        
        return True
    
    def update_position(self, position_id: str, 
                      current_price: Optional[float] = None,
                      additional_quantity: Optional[float] = None,
                      stop_loss: Optional[float] = None,
                      take_profit: Optional[float] = None,
                      **kwargs) -> bool:
        """
        Update an existing position.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to update
        current_price : float, optional
            Update the current market price
        additional_quantity : float, optional
            Add to position quantity (can be negative to reduce)
        stop_loss : float, optional
            Update stop loss price
        take_profit : float, optional
            Update take profit price
        **kwargs : dict
            Any other position parameters to update
            
        Returns:
        --------
        bool
            True if update was successful, False if position not found
        """
        if position_id not in self._positions:
            return False
        
        position = self._positions[position_id]
        
        # Update price if provided
        if current_price is not None:
            position['current_price'] = current_price
            # Also update in the last_prices cache
            self._last_prices[position['symbol']] = current_price
        
        # Update quantity if provided
        if additional_quantity is not None:
            new_quantity = position['quantity'] + additional_quantity
            if new_quantity <= 0:
                # Position closed
                return self.close_position(position_id)
            
            # Calculate new average entry price if adding to position
            if additional_quantity > 0:
                old_value = position['quantity'] * position['entry_price']
                new_value = additional_quantity * current_price
                position['entry_price'] = (old_value + new_value) / new_quantity
            
            position['quantity'] = new_quantity
        
        # Update stop loss if provided
        if stop_loss is not None:
            position['stop_loss'] = stop_loss
        
        # Update take profit if provided
        if take_profit is not None:
            position['take_profit'] = take_profit
        
        # Update other parameters
        for key, value in kwargs.items():
            position[key] = value
        
        # Update timestamp
        position['last_update'] = datetime.now()
        
        # Recalculate derived values
        self._update_position_metrics(position_id)
        
        return True
    
    def update_prices(self, price_dict: Dict[str, float]) -> None:
        """
        Update prices for multiple symbols at once.
        
        Parameters:
        -----------
        price_dict : dict
            Dictionary mapping symbols to their current prices
        """
        # Update the last_prices cache
        self._last_prices.update(price_dict)
        
        # Update all relevant positions
        for position_id, position in self._positions.items():
            if position['symbol'] in price_dict:
                position['current_price'] = price_dict[position['symbol']]
                self._update_position_metrics(position_id)
    
    def close_position(self, position_id: str, exit_price: Optional[float] = None,
                     exit_time: Optional[datetime] = None) -> Dict:
        """
        Close a position and return its details.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to close
        exit_price : float, optional
            Price at which the position was closed
        exit_time : datetime, optional
            Time of position closure
            
        Returns:
        --------
        dict
            Closed position details or empty dict if not found
        """
        if position_id not in self._positions:
            return {}
        
        position = self._positions.pop(position_id)
        
        # If exit price not provided, use current price
        if exit_price is None:
            exit_price = position.get('current_price', position['entry_price'])
        
        # If exit time not provided, use current time
        if exit_time is None:
            exit_time = datetime.now()
        
        # Calculate realized P&L
        if position['side'] == 'long':
            pnl = (exit_price - position['entry_price']) * position['quantity']
        else:  # short
            pnl = (position['entry_price'] - exit_price) * position['quantity']
        
        pnl_percent = (pnl / (position['entry_price'] * position['quantity'])) * 100
        
        # Add exit details to the position
        position['exit_price'] = exit_price
        position['exit_time'] = exit_time
        position['realized_pnl'] = pnl
        position['realized_pnl_percent'] = pnl_percent
        position['position_status'] = 'closed'
        
        # Remove from ElizaOS monitoring if enabled
        if position.get('elizaos_monitor') and position_id in self._elizaos_agents:
            self._cleanup_elizaos_monitor(position_id)
        
        return position
    
    def get_position(self, position_id: str) -> Dict:
        """
        Get details of a specific position.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to retrieve
            
        Returns:
        --------
        dict
            Position details or empty dict if not found
        """
        return self._positions.get(position_id, {})
    
    def get_positions_by_symbol(self, symbol: str) -> List[Dict]:
        """
        Get all positions for a specific symbol.
        
        Parameters:
        -----------
        symbol : str
            The trading symbol to filter by
            
        Returns:
        --------
        list
            List of position details for the given symbol
        """
        return [p for p in self._positions.values() if p['symbol'] == symbol]
    
    def get_positions_by_strategy(self, strategy_id: str) -> List[Dict]:
        """
        Get all positions for a specific strategy.
        
        Parameters:
        -----------
        strategy_id : str
            The strategy ID to filter by
            
        Returns:
        --------
        list
            List of position details for the given strategy
        """
        return [p for p in self._positions.values() if p['strategy_id'] == strategy_id]
    
    def get_positions_by_side(self, side: str) -> List[Dict]:
        """
        Get all positions with a specific side (long/short).
        
        Parameters:
        -----------
        side : str
            'long' or 'short'
            
        Returns:
        --------
        list
            List of position details for the given side
        """
        return [p for p in self._positions.values() if p['side'].lower() == side.lower()]
    
    def get_positions_by_tag(self, tag: str) -> List[Dict]:
        """
        Get all positions with a specific tag.
        
        Parameters:
        -----------
        tag : str
            Tag to filter by
            
        Returns:
        --------
        list
            List of position details with the given tag
        """
        return [p for p in self._positions.values() if tag in p.get('tags', [])]
    
    def get_positions_by_chain(self, chain_id: str) -> List[Dict]:
        """
        Get all positions for a specific blockchain.
        
        Parameters:
        -----------
        chain_id : str
            The blockchain ID to filter by
            
        Returns:
        --------
        list
            List of position details for the given blockchain
        """
        return [p for p in self._positions.values() if p.get('chain_id') == chain_id]
    
    def calculate_total_exposure(self) -> Dict:
        """
        Calculate total exposure across all positions.
        
        Returns:
        --------
        dict
            Dictionary with total exposure metrics
        """
        if not self._positions:
            return {
                'total_market_value': 0.0,
                'long_exposure': 0.0,
                'short_exposure': 0.0,
                'net_exposure': 0.0,
                'gross_exposure': 0.0
            }
        
        long_positions = self.get_positions_by_side('long')
        short_positions = self.get_positions_by_side('short')
        
        long_exposure = sum(p['quantity'] * p['current_price'] for p in long_positions)
        short_exposure = sum(p['quantity'] * p['current_price'] for p in short_positions)
        
        return {
            'total_market_value': long_exposure + short_exposure,
            'long_exposure': long_exposure,
            'short_exposure': short_exposure,
            'net_exposure': long_exposure - short_exposure,
            'gross_exposure': long_exposure + short_exposure
        }
    
    def calculate_overall_pnl(self) -> Dict:
        """
        Calculate overall P&L for all current positions.
        
        Returns:
        --------
        dict
            Dictionary with P&L metrics
        """
        if not self._positions:
            return {
                'total_unrealized_pnl': 0.0,
                'total_unrealized_pnl_percent': 0.0,
                'winning_positions': 0,
                'losing_positions': 0
            }
        
        total_pnl = sum(p['unrealized_pnl'] for p in self._positions.values())
        total_investment = sum(p['quantity'] * p['entry_price'] for p in self._positions.values())
        
        if total_investment == 0:
            total_pnl_percent = 0.0
        else:
            total_pnl_percent = (total_pnl / total_investment) * 100
        
        winning_positions = sum(1 for p in self._positions.values() if p['unrealized_pnl'] > 0)
        losing_positions = sum(1 for p in self._positions.values() if p['unrealized_pnl'] < 0)
        
        return {
            'total_unrealized_pnl': total_pnl,
            'total_unrealized_pnl_percent': total_pnl_percent,
            'winning_positions': winning_positions,
            'losing_positions': losing_positions
        }
    
    def check_stop_levels(self) -> List[Dict]:
        """
        Check for positions that have hit their stop loss or take profit levels.
        
        Returns:
        --------
        list
            List of positions that have hit their stop levels
        """
        hit_stops = []
        
        for position_id, position in self._positions.items():
            current_price = position['current_price']
            
            # Check stop loss
            if position['stop_loss'] is not None:
                if (position['side'] == 'long' and current_price <= position['stop_loss']) or \
                   (position['side'] == 'short' and current_price >= position['stop_loss']):
                    hit_stops.append({
                        'position_id': position_id,
                        'symbol': position['symbol'],
                        'level_type': 'stop_loss',
                        'level_price': position['stop_loss'],
                        'current_price': current_price
                    })
            
            # Check take profit
            if position['take_profit'] is not None:
                if (position['side'] == 'long' and current_price >= position['take_profit']) or \
                   (position['side'] == 'short' and current_price <= position['take_profit']):
                    hit_stops.append({
                        'position_id': position_id,
                        'symbol': position['symbol'],
                        'level_type': 'take_profit',
                        'level_price': position['take_profit'],
                        'current_price': current_price
                    })
        
        return hit_stops
    
    def update_all_positions(self, current_time: Optional[datetime] = None) -> Dict:
        """
        Update metrics for all positions and check for alerts.
        
        Parameters:
        -----------
        current_time : datetime, optional
            Current time for age calculation
            
        Returns:
        --------
        dict
            Summary of updates and alerts
        """
        if current_time is None:
            current_time = datetime.now()
        
        stop_alerts = self.check_stop_levels()
        
        # Update age and check for other conditions
        age_alerts = []
        for position_id, position in self._positions.items():
            # Update age in days
            age_days = (current_time - position['entry_time']).total_seconds() / (60 * 60 * 24)
            position['age'] = age_days
            
            # Alert for positions older than 30 days
            if age_days >= 30:
                age_alerts.append({
                    'position_id': position_id,
                    'symbol': position['symbol'],
                    'age_days': age_days
                })
            
            # Update metrics
            self._update_position_metrics(position_id)
        
        return {
            'stop_alerts': stop_alerts,
            'age_alerts': age_alerts,
            'total_positions': len(self._positions)
        }
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert all current positions to a pandas DataFrame.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all current positions
        """
        if not self._positions:
            return pd.DataFrame()
        return pd.DataFrame(list(self._positions.values()))
    
    def _update_position_metrics(self, position_id: str) -> None:
        """
        Update calculated metrics for a specific position.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to update
        """
        if position_id not in self._positions:
            return
        
        position = self._positions[position_id]
        
        # Calculate market value
        position['market_value'] = position['quantity'] * position['current_price']
        
        # Calculate unrealized P&L
        if position['side'] == 'long':
            pnl = (position['current_price'] - position['entry_price']) * position['quantity']
        else:  # short
            pnl = (position['entry_price'] - position['current_price']) * position['quantity']
        
        position['unrealized_pnl'] = pnl
        
        # Calculate P&L as percentage
        investment = position['quantity'] * position['entry_price']
        if investment > 0:
            position['unrealized_pnl_percent'] = (pnl / investment) * 100
        else:
            position['unrealized_pnl_percent'] = 0.0
    
    def _setup_elizaos_monitor(self, position_id: str) -> None:
        """
        Set up an ElizaOS agent to monitor a position.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to monitor
        """
        # This is a placeholder for actual ElizaOS agent setup
        # Would integrate with the ElizaOS API to create a new agent
        self._elizaos_agents[position_id] = {
            'agent_id': f"position_monitor_{position_id}",
            'status': 'active',
            'created_at': datetime.now()
        }
    
    def _cleanup_elizaos_monitor(self, position_id: str) -> None:
        """
        Clean up an ElizaOS monitoring agent.
        
        Parameters:
        -----------
        position_id : str
            ID of the position being monitored
        """
        # This is a placeholder for actual ElizaOS agent cleanup
        if position_id in self._elizaos_agents:
            # Would integrate with the ElizaOS API to deactivate the agent
            self._elizaos_agents.pop(position_id)
    
    def count(self) -> int:
        """
        Get the number of current positions.
        
        Returns:
        --------
        int
            Count of current positions
        """
        return len(self._positions)
    
    def clear(self) -> None:
        """
        Clear all current positions (use with caution).
        """
        for position_id in list(self._elizaos_agents.keys()):
            self._cleanup_elizaos_monitor(position_id)
            
        self._positions.clear()
        self._last_prices.clear()
