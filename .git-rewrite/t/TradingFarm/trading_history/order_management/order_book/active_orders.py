"""
Active Orders Module

Manages and tracks all active (open) orders in the trading system.
Provides functionality to query, filter, and monitor orders that are currently in the market.
"""

import pandas as pd
from typing import Dict, List, Optional, Union
from datetime import datetime


class ActiveOrders:
    """
    Tracks and manages all active orders in the system.
    
    Provides methods to:
    - Add new orders
    - Remove orders (when filled or canceled)
    - Query orders by various criteria
    - Monitor order status and lifetime
    """
    
    def __init__(self):
        """Initialize an empty active orders container."""
        self._orders = {}  # order_id -> order_details
        
    def add_order(self, order_id: str, symbol: str, side: str, order_type: str, 
                 quantity: float, price: Optional[float], timestamp: datetime,
                 strategy_id: str, **kwargs) -> bool:
        """
        Add a new active order to the order book.
        
        Parameters:
        -----------
        order_id : str
            Unique identifier for the order
        symbol : str
            The trading symbol/instrument
        side : str
            'buy' or 'sell'
        order_type : str
            Type of order (market, limit, etc.)
        quantity : float
            Size of the order
        price : float, optional
            Limit price (if applicable)
        timestamp : datetime
            Time the order was placed
        strategy_id : str
            ID of the strategy that placed the order
        **kwargs : dict
            Any additional order parameters
            
        Returns:
        --------
        bool
            True if order was added successfully, False otherwise
        """
        if order_id in self._orders:
            return False
        
        self._orders[order_id] = {
            'order_id': order_id,
            'symbol': symbol,
            'side': side,
            'order_type': order_type,
            'quantity': quantity,
            'price': price,
            'timestamp': timestamp,
            'strategy_id': strategy_id,
            'status': 'active',
            'age': 0,  # Will be updated with monitor
            **kwargs
        }
        return True
    
    def remove_order(self, order_id: str) -> Dict:
        """
        Remove an order from active orders.
        
        Parameters:
        -----------
        order_id : str
            ID of the order to remove
            
        Returns:
        --------
        dict
            The order details that was removed, or empty dict if not found
        """
        if order_id in self._orders:
            order = self._orders.pop(order_id)
            return order
        return {}
    
    def get_order(self, order_id: str) -> Dict:
        """
        Get details of a specific active order.
        
        Parameters:
        -----------
        order_id : str
            ID of the order to retrieve
            
        Returns:
        --------
        dict
            Order details or empty dict if not found
        """
        return self._orders.get(order_id, {})
    
    def get_orders_by_symbol(self, symbol: str) -> List[Dict]:
        """
        Get all active orders for a specific trading symbol.
        
        Parameters:
        -----------
        symbol : str
            The trading symbol to filter by
            
        Returns:
        --------
        list
            List of order details for the given symbol
        """
        return [order for order in self._orders.values() if order['symbol'] == symbol]
    
    def get_orders_by_strategy(self, strategy_id: str) -> List[Dict]:
        """
        Get all active orders for a specific strategy.
        
        Parameters:
        -----------
        strategy_id : str
            The strategy ID to filter by
            
        Returns:
        --------
        list
            List of order details for the given strategy
        """
        return [order for order in self._orders.values() if order['strategy_id'] == strategy_id]
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert active orders to a pandas DataFrame for analysis.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all active orders
        """
        if not self._orders:
            return pd.DataFrame()
        return pd.DataFrame(list(self._orders.values()))
    
    def monitor_orders(self, current_time: datetime) -> List[Dict]:
        """
        Update order age and identify orders that might need attention.
        
        Parameters:
        -----------
        current_time : datetime
            Current system time for age calculation
            
        Returns:
        --------
        list
            List of orders that need attention (e.g., too old)
        """
        attention_needed = []
        
        for order_id, order in self._orders.items():
            # Calculate order age in seconds
            age_seconds = (current_time - order['timestamp']).total_seconds()
            order['age'] = age_seconds
            
            # Orders over 30 minutes old might need attention
            if age_seconds > 1800:  # 30 minutes in seconds
                attention_needed.append(order)
                
        return attention_needed
    
    def count(self) -> int:
        """
        Get the number of active orders.
        
        Returns:
        --------
        int
            Count of active orders
        """
        return len(self._orders)
    
    def clear(self) -> None:
        """
        Clear all active orders (use with caution).
        """
        self._orders.clear()
