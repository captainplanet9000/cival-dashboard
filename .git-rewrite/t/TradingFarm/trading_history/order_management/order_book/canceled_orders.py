"""
Canceled Orders Module

Manages and tracks all canceled orders in the trading system.
Provides functionality to record, analyze, and query canceled orders with their reasons.
"""

import pandas as pd
from typing import Dict, List, Optional, Union
from datetime import datetime


class CanceledOrders:
    """
    Tracks and manages all canceled orders in the system.
    
    Provides methods to:
    - Record order cancellations
    - Store cancellation reasons
    - Query cancellations by various criteria
    - Analyze cancellation patterns
    """
    
    def __init__(self):
        """Initialize an empty canceled orders container."""
        self._canceled_orders = {}  # order_id -> order_details
        
    def record_cancellation(self, order_id: str, symbol: str, side: str, order_type: str, 
                          quantity: float, price: Optional[float], 
                          original_timestamp: datetime, cancel_timestamp: datetime,
                          strategy_id: str, reason: str, original_order: Optional[Dict] = None, 
                          **kwargs) -> bool:
        """
        Record a canceled order in the order book.
        
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
            Size of the order that was canceled
        price : float, optional
            The limit price (if applicable)
        original_timestamp : datetime
            Time the order was originally placed
        cancel_timestamp : datetime
            Time the order was canceled
        strategy_id : str
            ID of the strategy that placed the order
        reason : str
            Reason for cancellation
        original_order : dict, optional
            The original order details (if available)
        **kwargs : dict
            Any additional cancellation parameters
            
        Returns:
        --------
        bool
            True if cancellation was recorded successfully, False if already exists
        """
        if order_id in self._canceled_orders:
            return False
        
        # Calculate time in market before cancellation
        time_in_market = (cancel_timestamp - original_timestamp).total_seconds()
        
        self._canceled_orders[order_id] = {
            'order_id': order_id,
            'symbol': symbol,
            'side': side,
            'order_type': order_type,
            'quantity': quantity,
            'price': price,
            'original_timestamp': original_timestamp,
            'cancel_timestamp': cancel_timestamp,
            'time_in_market': time_in_market,
            'strategy_id': strategy_id,
            'cancel_reason': reason,
            **kwargs
        }
        return True
    
    def get_cancellation(self, order_id: str) -> Dict:
        """
        Get details of a specific canceled order.
        
        Parameters:
        -----------
        order_id : str
            ID of the canceled order to retrieve
            
        Returns:
        --------
        dict
            Order cancellation details or empty dict if not found
        """
        return self._canceled_orders.get(order_id, {})
    
    def get_cancellations_by_symbol(self, symbol: str) -> List[Dict]:
        """
        Get all cancellations for a specific trading symbol.
        
        Parameters:
        -----------
        symbol : str
            The trading symbol to filter by
            
        Returns:
        --------
        list
            List of cancellation details for the given symbol
        """
        return [order for order in self._canceled_orders.values() if order['symbol'] == symbol]
    
    def get_cancellations_by_strategy(self, strategy_id: str) -> List[Dict]:
        """
        Get all cancellations for a specific strategy.
        
        Parameters:
        -----------
        strategy_id : str
            The strategy ID to filter by
            
        Returns:
        --------
        list
            List of cancellation details for the given strategy
        """
        return [order for order in self._canceled_orders.values() if order['strategy_id'] == strategy_id]
    
    def get_cancellations_by_reason(self, reason: str) -> List[Dict]:
        """
        Get all cancellations with a specific reason.
        
        Parameters:
        -----------
        reason : str
            The cancellation reason to filter by
            
        Returns:
        --------
        list
            List of cancellation details for the given reason
        """
        return [
            order for order in self._canceled_orders.values() 
            if order['cancel_reason'] == reason
        ]
    
    def get_cancellations_by_timerange(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """
        Get all cancellations within a specific time range.
        
        Parameters:
        -----------
        start_time : datetime
            Start of the time range
        end_time : datetime
            End of the time range
            
        Returns:
        --------
        list
            List of cancellation details within the given time range
        """
        return [
            order for order in self._canceled_orders.values() 
            if start_time <= order['cancel_timestamp'] <= end_time
        ]
    
    def analyze_cancellation_reasons(self) -> Dict[str, int]:
        """
        Analyze the distribution of cancellation reasons.
        
        Returns:
        --------
        dict
            Dictionary mapping cancellation reasons to their frequency
        """
        reasons = {}
        for order in self._canceled_orders.values():
            reason = order['cancel_reason']
            reasons[reason] = reasons.get(reason, 0) + 1
        return reasons
    
    def calculate_average_time_in_market(self, symbol: Optional[str] = None, 
                                       strategy_id: Optional[str] = None) -> float:
        """
        Calculate the average time orders spent in the market before cancellation.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        strategy_id : str, optional
            Filter by strategy
            
        Returns:
        --------
        float
            Average time in market in seconds
        """
        cancellations = self._canceled_orders.values()
        
        if symbol:
            cancellations = [c for c in cancellations if c['symbol'] == symbol]
            
        if strategy_id:
            cancellations = [c for c in cancellations if c['strategy_id'] == strategy_id]
            
        if not cancellations:
            return 0.0
            
        total_time = sum(c['time_in_market'] for c in cancellations)
        return total_time / len(cancellations)
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert canceled orders to a pandas DataFrame for analysis.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all canceled orders
        """
        if not self._canceled_orders:
            return pd.DataFrame()
        return pd.DataFrame(list(self._canceled_orders.values()))
    
    def export_csv(self, filepath: str) -> bool:
        """
        Export canceled orders data to a CSV file.
        
        Parameters:
        -----------
        filepath : str
            Path to save the CSV file
            
        Returns:
        --------
        bool
            True if export was successful, False otherwise
        """
        try:
            df = self.to_dataframe()
            if not df.empty:
                df.to_csv(filepath, index=False)
                return True
        except Exception:
            return False
        return False
    
    def count(self) -> int:
        """
        Get the number of canceled orders.
        
        Returns:
        --------
        int
            Count of canceled orders
        """
        return len(self._canceled_orders)
