"""
Slippage Calculator Module

Analyzes the difference between expected and actual execution prices.
Provides tools to calculate, categorize, and report on execution slippage.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime, timedelta


class SlippageCalculator:
    """
    Calculates and analyzes execution slippage across orders.
    
    Provides methods to:
    - Calculate raw slippage
    - Normalize slippage across different price scales
    - Analyze slippage patterns by time, symbol, and market conditions
    - Generate slippage reports
    """
    
    def __init__(self):
        """Initialize the slippage calculator."""
        self._slippage_records = []
        
    def add_slippage_record(self, order_id: str, symbol: str, side: str, 
                          target_price: float, execution_price: float,
                          quantity: float, timestamp: datetime,
                          market_volatility: Optional[float] = None,
                          **kwargs) -> None:
        """
        Add a slippage record for analysis.
        
        Parameters:
        -----------
        order_id : str
            Unique identifier for the order
        symbol : str
            The trading symbol/instrument
        side : str
            'buy' or 'sell'
        target_price : float
            The expected/desired execution price
        execution_price : float
            The actual price at which the order was executed
        quantity : float
            Size of the order
        timestamp : datetime
            Time of execution
        market_volatility : float, optional
            Volatility measure at time of execution
        **kwargs : dict
            Any additional slippage factors to consider
        """
        # Calculate raw slippage (difference between target and execution price)
        raw_slippage = 0
        if side.lower() == 'buy':
            # For buys, positive slippage means we paid more than intended
            raw_slippage = execution_price - target_price
        else:  # sell
            # For sells, positive slippage means we received less than intended
            raw_slippage = target_price - execution_price
            
        # Calculate percentage slippage relative to target price
        percent_slippage = (raw_slippage / target_price) * 100
        
        # Calculate slippage in dollars
        dollar_slippage = raw_slippage * quantity
        
        # Store the slippage record
        self._slippage_records.append({
            'order_id': order_id,
            'symbol': symbol,
            'side': side,
            'target_price': target_price,
            'execution_price': execution_price,
            'quantity': quantity,
            'timestamp': timestamp,
            'raw_slippage': raw_slippage,
            'percent_slippage': percent_slippage,
            'dollar_slippage': dollar_slippage,
            'market_volatility': market_volatility,
            **kwargs
        })
    
    def get_average_slippage(self, symbol: Optional[str] = None, 
                           side: Optional[str] = None, 
                           start_time: Optional[datetime] = None,
                           end_time: Optional[datetime] = None) -> Tuple[float, float, float]:
        """
        Calculate average slippage metrics, optionally filtered.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        side : str, optional
            Filter by side ('buy' or 'sell')
        start_time : datetime, optional
            Start of time range
        end_time : datetime, optional
            End of time range
            
        Returns:
        --------
        tuple
            (average_raw_slippage, average_percent_slippage, average_dollar_slippage)
        """
        records = self._filter_records(symbol, side, start_time, end_time)
        
        if not records:
            return (0.0, 0.0, 0.0)
        
        avg_raw = sum(r['raw_slippage'] for r in records) / len(records)
        avg_pct = sum(r['percent_slippage'] for r in records) / len(records)
        avg_dollar = sum(r['dollar_slippage'] for r in records) / len(records)
        
        return (avg_raw, avg_pct, avg_dollar)
    
    def analyze_slippage_by_time(self, interval_minutes: int = 60) -> pd.DataFrame:
        """
        Analyze slippage patterns over time.
        
        Parameters:
        -----------
        interval_minutes : int
            Size of time intervals to group by (in minutes)
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with slippage metrics by time interval
        """
        if not self._slippage_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(self._slippage_records)
        
        # Create time interval buckets
        df['time_interval'] = df['timestamp'].apply(
            lambda x: x.replace(
                minute=interval_minutes * (x.minute // interval_minutes),
                second=0,
                microsecond=0
            )
        )
        
        # Group by time interval and calculate metrics
        time_analysis = df.groupby('time_interval').agg({
            'raw_slippage': 'mean',
            'percent_slippage': 'mean',
            'dollar_slippage': 'mean',
            'order_id': 'count'  # count of orders
        }).reset_index()
        
        time_analysis.rename(columns={'order_id': 'order_count'}, inplace=True)
        return time_analysis
    
    def analyze_slippage_by_volatility(self, num_buckets: int = 5) -> pd.DataFrame:
        """
        Analyze relationship between market volatility and slippage.
        
        Parameters:
        -----------
        num_buckets : int
            Number of volatility buckets to group into
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with slippage metrics by volatility bucket
        """
        # Filter out records without volatility data
        records_with_vol = [r for r in self._slippage_records if r.get('market_volatility') is not None]
        
        if not records_with_vol:
            return pd.DataFrame()
        
        df = pd.DataFrame(records_with_vol)
        
        # Create volatility buckets
        min_vol = df['market_volatility'].min()
        max_vol = df['market_volatility'].max()
        bucket_size = (max_vol - min_vol) / num_buckets
        
        df['volatility_bucket'] = df['market_volatility'].apply(
            lambda x: min_vol + bucket_size * int((x - min_vol) / bucket_size)
        )
        
        # Group by volatility bucket and calculate metrics
        vol_analysis = df.groupby('volatility_bucket').agg({
            'raw_slippage': 'mean',
            'percent_slippage': 'mean',
            'dollar_slippage': 'mean',
            'order_id': 'count'  # count of orders
        }).reset_index()
        
        vol_analysis.rename(columns={'order_id': 'order_count'}, inplace=True)
        return vol_analysis
    
    def get_worst_slippage_instances(self, n: int = 10) -> List[Dict]:
        """
        Get the instances with the worst slippage.
        
        Parameters:
        -----------
        n : int
            Number of worst instances to return
            
        Returns:
        --------
        list
            List of records with the worst dollar slippage
        """
        if not self._slippage_records:
            return []
        
        # Sort records by dollar slippage (descending)
        sorted_records = sorted(
            self._slippage_records, 
            key=lambda x: x['dollar_slippage'], 
            reverse=True
        )
        
        return sorted_records[:n]
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert all slippage records to a pandas DataFrame.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all slippage records
        """
        if not self._slippage_records:
            return pd.DataFrame()
        return pd.DataFrame(self._slippage_records)
    
    def generate_summary_report(self) -> Dict:
        """
        Generate a comprehensive summary of slippage metrics.
        
        Returns:
        --------
        dict
            Dictionary containing summary statistics
        """
        if not self._slippage_records:
            return {
                'total_records': 0,
                'average_raw_slippage': 0,
                'average_percent_slippage': 0,
                'average_dollar_slippage': 0,
                'total_dollar_slippage': 0,
                'worst_slippage': 0,
                'best_slippage': 0
            }
        
        df = pd.DataFrame(self._slippage_records)
        
        # Buy/sell breakdown
        buy_slippage = df[df['side'] == 'buy']['dollar_slippage'].sum()
        sell_slippage = df[df['side'] == 'sell']['dollar_slippage'].sum()
        
        return {
            'total_records': len(self._slippage_records),
            'average_raw_slippage': df['raw_slippage'].mean(),
            'average_percent_slippage': df['percent_slippage'].mean(),
            'average_dollar_slippage': df['dollar_slippage'].mean(),
            'total_dollar_slippage': df['dollar_slippage'].sum(),
            'worst_slippage': df['dollar_slippage'].max(),
            'best_slippage': df['dollar_slippage'].min(),
            'buy_slippage': buy_slippage,
            'sell_slippage': sell_slippage,
            'symbols_count': len(df['symbol'].unique()),
            'date_range': [df['timestamp'].min(), df['timestamp'].max()]
        }
    
    def _filter_records(self, symbol: Optional[str] = None, 
                      side: Optional[str] = None, 
                      start_time: Optional[datetime] = None,
                      end_time: Optional[datetime] = None) -> List[Dict]:
        """
        Filter slippage records based on criteria.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        side : str, optional
            Filter by side ('buy' or 'sell')
        start_time : datetime, optional
            Start of time range
        end_time : datetime, optional
            End of time range
            
        Returns:
        --------
        list
            Filtered list of slippage records
        """
        records = self._slippage_records
        
        if symbol:
            records = [r for r in records if r['symbol'] == symbol]
            
        if side:
            records = [r for r in records if r['side'].lower() == side.lower()]
            
        if start_time:
            records = [r for r in records if r['timestamp'] >= start_time]
            
        if end_time:
            records = [r for r in records if r['timestamp'] <= end_time]
            
        return records
    
    def clear(self) -> None:
        """
        Clear all slippage records.
        """
        self._slippage_records = []
