"""
Fill Quality Module

Analyzes the quality of order execution across multiple dimensions.
Provides tools for measuring fill ratios, speed, and market impact.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime, timedelta


class FillQuality:
    """
    Analyzes the quality of order fills based on various metrics.
    
    Provides methods to:
    - Measure fill ratios and partial fills
    - Calculate fill speed and latency
    - Assess market impact of orders
    - Compare fill quality across venues
    """
    
    def __init__(self):
        """Initialize the fill quality analyzer."""
        self._fill_records = []
        
    def add_fill_record(self, order_id: str, symbol: str, side: str, 
                      order_type: str, requested_quantity: float,
                      filled_quantity: float, submission_time: datetime,
                      fill_time: datetime, venue: str,
                      market_liquidity: Optional[float] = None,
                      pre_trade_price: Optional[float] = None,
                      post_trade_price: Optional[float] = None,
                      **kwargs) -> None:
        """
        Add a fill record for analysis.
        
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
        requested_quantity : float
            Original quantity requested
        filled_quantity : float
            Actual quantity filled
        submission_time : datetime
            Time the order was submitted
        fill_time : datetime
            Time the order was filled
        venue : str
            Trading venue or exchange
        market_liquidity : float, optional
            Measure of market liquidity at time of execution
        pre_trade_price : float, optional
            Market price just before the trade
        post_trade_price : float, optional
            Market price just after the trade
        **kwargs : dict
            Any additional fill quality factors
        """
        # Calculate fill ratio
        fill_ratio = filled_quantity / requested_quantity if requested_quantity > 0 else 0
        
        # Calculate fill latency in milliseconds
        latency_ms = (fill_time - submission_time).total_seconds() * 1000
        
        # Calculate market impact if pre and post trade prices are available
        market_impact = 0
        if pre_trade_price is not None and post_trade_price is not None:
            if side.lower() == 'buy':
                market_impact = (post_trade_price - pre_trade_price) / pre_trade_price * 100
            else:  # sell
                market_impact = (pre_trade_price - post_trade_price) / pre_trade_price * 100
        
        # Store the fill record
        self._fill_records.append({
            'order_id': order_id,
            'symbol': symbol,
            'side': side,
            'order_type': order_type,
            'requested_quantity': requested_quantity,
            'filled_quantity': filled_quantity,
            'fill_ratio': fill_ratio,
            'is_partial': fill_ratio < 1.0,
            'submission_time': submission_time,
            'fill_time': fill_time,
            'latency_ms': latency_ms,
            'venue': venue,
            'market_liquidity': market_liquidity,
            'pre_trade_price': pre_trade_price,
            'post_trade_price': post_trade_price,
            'market_impact': market_impact,
            **kwargs
        })
    
    def calculate_fill_rate(self, symbol: Optional[str] = None,
                          venue: Optional[str] = None) -> float:
        """
        Calculate the average fill ratio across orders.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        venue : str, optional
            Filter by trading venue
            
        Returns:
        --------
        float
            Average fill ratio (0.0 - 1.0)
        """
        records = self._filter_records(symbol=symbol, venue=venue)
        
        if not records:
            return 1.0  # Default to perfect fill if no records
        
        return sum(r['fill_ratio'] for r in records) / len(records)
    
    def calculate_average_latency(self, symbol: Optional[str] = None,
                                venue: Optional[str] = None,
                                order_type: Optional[str] = None) -> float:
        """
        Calculate the average fill latency in milliseconds.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        venue : str, optional
            Filter by trading venue
        order_type : str, optional
            Filter by order type
            
        Returns:
        --------
        float
            Average latency in milliseconds
        """
        records = self._filter_records(symbol=symbol, venue=venue, order_type=order_type)
        
        if not records:
            return 0.0
        
        return sum(r['latency_ms'] for r in records) / len(records)
    
    def analyze_partial_fills(self) -> Dict:
        """
        Analyze the frequency and characteristics of partial fills.
        
        Returns:
        --------
        dict
            Statistics about partial fills
        """
        if not self._fill_records:
            return {
                'partial_fill_count': 0,
                'partial_fill_rate': 0.0,
                'average_partial_fill_ratio': 0.0
            }
        
        partial_fills = [r for r in self._fill_records if r['is_partial']]
        
        partial_fill_count = len(partial_fills)
        partial_fill_rate = partial_fill_count / len(self._fill_records)
        
        avg_partial_fill_ratio = 0
        if partial_fills:
            avg_partial_fill_ratio = sum(r['fill_ratio'] for r in partial_fills) / partial_fill_count
            
        return {
            'partial_fill_count': partial_fill_count,
            'partial_fill_rate': partial_fill_rate,
            'average_partial_fill_ratio': avg_partial_fill_ratio
        }
    
    def compare_venues(self) -> pd.DataFrame:
        """
        Compare fill quality metrics across different trading venues.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame with fill quality metrics by venue
        """
        if not self._fill_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(self._fill_records)
        
        # Group by venue and calculate metrics
        venue_analysis = df.groupby('venue').agg({
            'fill_ratio': 'mean',
            'latency_ms': 'mean',
            'market_impact': 'mean',
            'order_id': 'count'  # count of orders
        }).reset_index()
        
        venue_analysis.rename(columns={'order_id': 'order_count'}, inplace=True)
        return venue_analysis
    
    def analyze_market_impact(self, symbol: Optional[str] = None) -> Dict:
        """
        Analyze the market impact of trades.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
            
        Returns:
        --------
        dict
            Market impact statistics
        """
        # Filter for records with market impact data
        records = [r for r in self._filter_records(symbol=symbol) 
                  if r.get('market_impact') is not None]
        
        if not records:
            return {
                'average_impact': 0.0,
                'max_impact': 0.0,
                'impact_by_side': {'buy': 0.0, 'sell': 0.0}
            }
        
        impacts = [r['market_impact'] for r in records]
        buy_records = [r for r in records if r['side'].lower() == 'buy']
        sell_records = [r for r in records if r['side'].lower() == 'sell']
        
        buy_impact = sum(r['market_impact'] for r in buy_records) / len(buy_records) if buy_records else 0
        sell_impact = sum(r['market_impact'] for r in sell_records) / len(sell_records) if sell_records else 0
        
        return {
            'average_impact': sum(impacts) / len(impacts),
            'max_impact': max(impacts, key=abs),
            'impact_by_side': {'buy': buy_impact, 'sell': sell_impact}
        }
    
    def analyze_fill_quality_by_time(self, interval_minutes: int = 60) -> pd.DataFrame:
        """
        Analyze fill quality metrics over time.
        
        Parameters:
        -----------
        interval_minutes : int
            Size of time intervals to group by (in minutes)
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with fill quality metrics by time interval
        """
        if not self._fill_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(self._fill_records)
        
        # Create time interval buckets
        df['time_interval'] = df['fill_time'].apply(
            lambda x: x.replace(
                minute=interval_minutes * (x.minute // interval_minutes),
                second=0,
                microsecond=0
            )
        )
        
        # Group by time interval and calculate metrics
        time_analysis = df.groupby('time_interval').agg({
            'fill_ratio': 'mean',
            'latency_ms': 'mean',
            'market_impact': 'mean',
            'order_id': 'count'  # count of orders
        }).reset_index()
        
        time_analysis.rename(columns={'order_id': 'order_count'}, inplace=True)
        return time_analysis
    
    def generate_quality_report(self) -> Dict:
        """
        Generate a comprehensive report on fill quality.
        
        Returns:
        --------
        dict
            Dictionary containing summary statistics
        """
        if not self._fill_records:
            return {
                'total_orders': 0,
                'average_fill_ratio': 0,
                'average_latency_ms': 0,
                'partial_fills': 0,
                'average_market_impact': 0
            }
        
        df = pd.DataFrame(self._fill_records)
        
        # Calculate average metrics
        avg_fill_ratio = df['fill_ratio'].mean()
        avg_latency = df['latency_ms'].mean()
        partial_fill_count = df[df['is_partial']].shape[0]
        
        # Market impact (only for records that have it)
        impact_records = df[df['market_impact'].notna()]
        avg_impact = impact_records['market_impact'].mean() if not impact_records.empty else 0
        
        # Venue performance ranking
        venue_performance = []
        if len(df['venue'].unique()) > 1:
            venue_metrics = self.compare_venues()
            # Rank venues by fill ratio (higher is better)
            venue_performance = venue_metrics.sort_values('fill_ratio', ascending=False)['venue'].tolist()
        
        return {
            'total_orders': len(self._fill_records),
            'average_fill_ratio': avg_fill_ratio,
            'average_latency_ms': avg_latency,
            'partial_fills': partial_fill_count,
            'partial_fill_percentage': (partial_fill_count / len(self._fill_records)) * 100,
            'average_market_impact': avg_impact,
            'venues_by_performance': venue_performance,
            'symbols_count': len(df['symbol'].unique()),
            'date_range': [df['fill_time'].min(), df['fill_time'].max()]
        }
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert all fill records to a pandas DataFrame.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all fill records
        """
        if not self._fill_records:
            return pd.DataFrame()
        return pd.DataFrame(self._fill_records)
    
    def _filter_records(self, symbol: Optional[str] = None,
                       venue: Optional[str] = None,
                       order_type: Optional[str] = None,
                       side: Optional[str] = None) -> List[Dict]:
        """
        Filter fill records based on criteria.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        venue : str, optional
            Filter by trading venue
        order_type : str, optional
            Filter by order type
        side : str, optional
            Filter by side ('buy' or 'sell')
            
        Returns:
        --------
        list
            Filtered list of fill records
        """
        records = self._fill_records
        
        if symbol:
            records = [r for r in records if r['symbol'] == symbol]
            
        if venue:
            records = [r for r in records if r['venue'] == venue]
            
        if order_type:
            records = [r for r in records if r['order_type'] == order_type]
            
        if side:
            records = [r for r in records if r['side'].lower() == side.lower()]
            
        return records
    
    def clear(self) -> None:
        """
        Clear all fill records.
        """
        self._fill_records = []
