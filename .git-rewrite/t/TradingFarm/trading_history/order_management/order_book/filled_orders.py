"""
Filled Orders Module

Manages and tracks all filled orders in the trading system.
Provides functionality to record, analyze, and query order fills and execution details.
"""

import pandas as pd
from typing import Dict, List, Optional, Union
from datetime import datetime


class FilledOrders:
    """
    Tracks and manages all filled orders in the system.
    
    Provides methods to:
    - Record order fills
    - Calculate fill metrics (VWAP, slippage)
    - Query fills by various criteria
    - Export fill data for analysis
    """
    
    def __init__(self):
        """Initialize an empty filled orders container."""
        self._filled_orders = {}  # order_id -> order_details
        
    def record_fill(self, order_id: str, symbol: str, side: str, order_type: str, 
                   quantity: float, filled_price: float, fill_timestamp: datetime,
                   strategy_id: str, original_order: Optional[Dict] = None, **kwargs) -> bool:
        """
        Record a filled order in the order book.
        
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
            Size of the order that was filled
        filled_price : float
            The executed price
        fill_timestamp : datetime
            Time the order was filled
        strategy_id : str
            ID of the strategy that placed the order
        original_order : dict, optional
            The original order details (if available)
        **kwargs : dict
            Any additional fill parameters
            
        Returns:
        --------
        bool
            True if fill was recorded successfully, False if already exists
        """
        if order_id in self._filled_orders:
            # If already recorded but is a partial fill, update the quantity
            if self._filled_orders[order_id]['partial_fill']:
                current_qty = self._filled_orders[order_id]['filled_quantity']
                self._filled_orders[order_id]['filled_quantity'] = current_qty + quantity
                
                # Calculate new average filled price (VWAP)
                current_value = current_qty * self._filled_orders[order_id]['filled_price']
                new_value = quantity * filled_price
                new_total_qty = current_qty + quantity
                self._filled_orders[order_id]['filled_price'] = (current_value + new_value) / new_total_qty
                
                return True
            return False
        
        # Calculate slippage if original order had a price
        slippage = 0.0
        target_price = None
        
        if original_order and 'price' in original_order and original_order['price']:
            target_price = original_order['price']
            if side == 'buy':
                # For buys, positive slippage means we paid more than intended
                slippage = filled_price - target_price
            else:  # sell
                # For sells, positive slippage means we received less than intended
                slippage = target_price - filled_price
        
        # Determine if this is a complete or partial fill
        is_partial = False
        original_quantity = quantity
        if original_order and 'quantity' in original_order:
            original_quantity = original_order['quantity']
            is_partial = quantity < original_quantity
        
        self._filled_orders[order_id] = {
            'order_id': order_id,
            'symbol': symbol,
            'side': side,
            'order_type': order_type,
            'original_quantity': original_quantity,
            'filled_quantity': quantity,
            'filled_price': filled_price,
            'target_price': target_price,
            'slippage': slippage,
            'fill_timestamp': fill_timestamp,
            'strategy_id': strategy_id,
            'partial_fill': is_partial,
            **kwargs
        }
        return True
    
    def get_fill(self, order_id: str) -> Dict:
        """
        Get details of a specific filled order.
        
        Parameters:
        -----------
        order_id : str
            ID of the filled order to retrieve
            
        Returns:
        --------
        dict
            Order fill details or empty dict if not found
        """
        return self._filled_orders.get(order_id, {})
    
    def get_fills_by_symbol(self, symbol: str) -> List[Dict]:
        """
        Get all fills for a specific trading symbol.
        
        Parameters:
        -----------
        symbol : str
            The trading symbol to filter by
            
        Returns:
        --------
        list
            List of fill details for the given symbol
        """
        return [order for order in self._filled_orders.values() if order['symbol'] == symbol]
    
    def get_fills_by_strategy(self, strategy_id: str) -> List[Dict]:
        """
        Get all fills for a specific strategy.
        
        Parameters:
        -----------
        strategy_id : str
            The strategy ID to filter by
            
        Returns:
        --------
        list
            List of fill details for the given strategy
        """
        return [order for order in self._filled_orders.values() if order['strategy_id'] == strategy_id]
    
    def get_fills_by_timerange(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """
        Get all fills within a specific time range.
        
        Parameters:
        -----------
        start_time : datetime
            Start of the time range
        end_time : datetime
            End of the time range
            
        Returns:
        --------
        list
            List of fill details within the given time range
        """
        return [
            order for order in self._filled_orders.values() 
            if start_time <= order['fill_timestamp'] <= end_time
        ]
    
    def calculate_average_slippage(self, symbol: Optional[str] = None, 
                                 strategy_id: Optional[str] = None) -> float:
        """
        Calculate the average slippage across fills, optionally filtered.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        strategy_id : str, optional
            Filter by strategy
            
        Returns:
        --------
        float
            Average slippage in price units
        """
        fills = self._filled_orders.values()
        
        if symbol:
            fills = [f for f in fills if f['symbol'] == symbol]
            
        if strategy_id:
            fills = [f for f in fills if f['strategy_id'] == strategy_id]
            
        # Filter out fills without slippage data
        fills_with_slippage = [f for f in fills if 'slippage' in f and f['slippage'] is not None]
        
        if not fills_with_slippage:
            return 0.0
            
        total_slippage = sum(f['slippage'] for f in fills_with_slippage)
        return total_slippage / len(fills_with_slippage)
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert filled orders to a pandas DataFrame for analysis.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all filled orders
        """
        if not self._filled_orders:
            return pd.DataFrame()
        return pd.DataFrame(list(self._filled_orders.values()))
    
    def export_csv(self, filepath: str) -> bool:
        """
        Export filled orders data to a CSV file.
        
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
        Get the number of filled orders.
        
        Returns:
        --------
        int
            Count of filled orders
        """
        return len(self._filled_orders)
