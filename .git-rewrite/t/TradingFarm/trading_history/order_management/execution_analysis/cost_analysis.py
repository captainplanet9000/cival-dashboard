"""
Cost Analysis Module

Analyzes trading costs including fees, commissions, slippage, and market impact.
Provides tools to measure, categorize, and optimize trading costs.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime, timedelta


class CostAnalysis:
    """
    Analyzes trading costs across different categories and time periods.
    
    Provides methods to:
    - Track various types of trading costs
    - Calculate cost metrics relative to trade value
    - Analyze cost patterns and trends
    - Generate cost optimization recommendations
    """
    
    def __init__(self):
        """Initialize the cost analysis system."""
        self._cost_records = []
        
    def add_cost_record(self, order_id: str, symbol: str, timestamp: datetime,
                      trade_value: float, commission: float, exchange_fees: float,
                      slippage_cost: float, tax: float = 0.0, 
                      market_impact_cost: float = 0.0, 
                      other_costs: float = 0.0) -> None:
        """
        Add a trading cost record for analysis.
        
        Parameters:
        -----------
        order_id : str
            Unique identifier for the order
        symbol : str
            The trading symbol/instrument
        timestamp : datetime
            Time of the trade
        trade_value : float
            Nominal value of the trade
        commission : float
            Broker commission
        exchange_fees : float
            Exchange and clearing fees
        slippage_cost : float
            Cost due to slippage
        tax : float, optional
            Any applicable taxes
        market_impact_cost : float, optional
            Estimated cost due to market impact
        other_costs : float, optional
            Any other miscellaneous costs
        """
        # Calculate total explicit costs (fees, commissions, taxes)
        explicit_costs = commission + exchange_fees + tax
        
        # Calculate total implicit costs (slippage, market impact)
        implicit_costs = slippage_cost + market_impact_cost
        
        # Calculate total costs
        total_costs = explicit_costs + implicit_costs + other_costs
        
        # Calculate cost as percentage of trade value
        cost_percentage = (total_costs / trade_value) * 100 if trade_value > 0 else 0
        
        # Store the cost record
        self._cost_records.append({
            'order_id': order_id,
            'symbol': symbol,
            'timestamp': timestamp,
            'trade_value': trade_value,
            'commission': commission,
            'exchange_fees': exchange_fees,
            'tax': tax,
            'slippage_cost': slippage_cost,
            'market_impact_cost': market_impact_cost,
            'other_costs': other_costs,
            'explicit_costs': explicit_costs,
            'implicit_costs': implicit_costs,
            'total_costs': total_costs,
            'cost_percentage': cost_percentage
        })
    
    def calculate_average_cost_percentage(self, symbol: Optional[str] = None,
                                        start_time: Optional[datetime] = None,
                                        end_time: Optional[datetime] = None) -> float:
        """
        Calculate the average cost as a percentage of trade value.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        start_time : datetime, optional
            Start of time range
        end_time : datetime, optional
            End of time range
            
        Returns:
        --------
        float
            Average cost percentage
        """
        records = self._filter_records(symbol=symbol, start_time=start_time, end_time=end_time)
        
        if not records:
            return 0.0
        
        return sum(r['cost_percentage'] for r in records) / len(records)
    
    def breakdown_costs_by_category(self, symbol: Optional[str] = None) -> Dict[str, float]:
        """
        Break down costs by category.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
            
        Returns:
        --------
        dict
            Dictionary mapping cost categories to their percentage of total costs
        """
        records = self._filter_records(symbol=symbol)
        
        if not records:
            return {
                'commission': 0,
                'exchange_fees': 0,
                'tax': 0,
                'slippage_cost': 0,
                'market_impact_cost': 0,
                'other_costs': 0
            }
        
        total_commission = sum(r['commission'] for r in records)
        total_exchange_fees = sum(r['exchange_fees'] for r in records)
        total_tax = sum(r['tax'] for r in records)
        total_slippage = sum(r['slippage_cost'] for r in records)
        total_market_impact = sum(r['market_impact_cost'] for r in records)
        total_other = sum(r['other_costs'] for r in records)
        
        total_all_costs = (total_commission + total_exchange_fees + total_tax + 
                         total_slippage + total_market_impact + total_other)
        
        if total_all_costs == 0:
            return {
                'commission': 0,
                'exchange_fees': 0,
                'tax': 0,
                'slippage_cost': 0,
                'market_impact_cost': 0,
                'other_costs': 0
            }
        
        return {
            'commission': (total_commission / total_all_costs) * 100,
            'exchange_fees': (total_exchange_fees / total_all_costs) * 100,
            'tax': (total_tax / total_all_costs) * 100,
            'slippage_cost': (total_slippage / total_all_costs) * 100,
            'market_impact_cost': (total_market_impact / total_all_costs) * 100,
            'other_costs': (total_other / total_all_costs) * 100
        }
    
    def analyze_cost_by_trade_size(self, num_buckets: int = 5) -> pd.DataFrame:
        """
        Analyze how costs vary with trade size.
        
        Parameters:
        -----------
        num_buckets : int
            Number of trade size buckets to group into
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with cost metrics by trade size bucket
        """
        if not self._cost_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(self._cost_records)
        
        # Create trade size buckets
        min_value = df['trade_value'].min()
        max_value = df['trade_value'].max()
        
        if min_value == max_value:
            return pd.DataFrame({
                'trade_size_bucket': [min_value],
                'avg_cost_percentage': [df['cost_percentage'].mean()],
                'avg_explicit_costs': [df['explicit_costs'].mean()],
                'avg_implicit_costs': [df['implicit_costs'].mean()],
                'trade_count': [len(df)]
            })
        
        bucket_size = (max_value - min_value) / num_buckets
        
        df['trade_size_bucket'] = df['trade_value'].apply(
            lambda x: min_value + bucket_size * int((x - min_value) / bucket_size)
        )
        
        # Group by trade size bucket and calculate metrics
        size_analysis = df.groupby('trade_size_bucket').agg({
            'cost_percentage': 'mean',
            'explicit_costs': 'mean',
            'implicit_costs': 'mean',
            'order_id': 'count'  # count of trades
        }).reset_index()
        
        size_analysis.rename(columns={'order_id': 'trade_count'}, inplace=True)
        return size_analysis
    
    def analyze_cost_trend(self, interval_days: int = 7) -> pd.DataFrame:
        """
        Analyze how costs have changed over time.
        
        Parameters:
        -----------
        interval_days : int
            Size of time intervals to group by (in days)
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with cost metrics by time interval
        """
        if not self._cost_records:
            return pd.DataFrame()
        
        df = pd.DataFrame(self._cost_records)
        
        # Create time interval buckets (by day)
        df['time_interval'] = df['timestamp'].apply(
            lambda x: x.replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0
            ) + timedelta(days=interval_days * (x.day // interval_days))
        )
        
        # Group by time interval and calculate metrics
        time_analysis = df.groupby('time_interval').agg({
            'cost_percentage': 'mean',
            'explicit_costs': 'sum',
            'implicit_costs': 'sum',
            'total_costs': 'sum',
            'trade_value': 'sum',
            'order_id': 'count'  # count of trades
        }).reset_index()
        
        # Calculate weighted cost percentage
        time_analysis['weighted_cost_percentage'] = (
            time_analysis['total_costs'] / time_analysis['trade_value'] * 100
        )
        
        time_analysis.rename(columns={'order_id': 'trade_count'}, inplace=True)
        return time_analysis
    
    def identify_cost_optimization_opportunities(self) -> List[Dict]:
        """
        Identify opportunities to optimize and reduce trading costs.
        
        Returns:
        --------
        list
            List of cost optimization recommendations
        """
        if not self._cost_records:
            return []
        
        df = pd.DataFrame(self._cost_records)
        recommendations = []
        
        # Calculate average costs by symbol
        symbol_costs = df.groupby('symbol').agg({
            'cost_percentage': 'mean',
            'explicit_costs': 'sum',
            'implicit_costs': 'sum',
            'total_costs': 'sum',
            'trade_value': 'sum',
            'order_id': 'count'
        }).reset_index()
        
        # Identify symbols with above-average costs
        avg_cost_pct = df['cost_percentage'].mean()
        high_cost_symbols = symbol_costs[symbol_costs['cost_percentage'] > avg_cost_pct * 1.2]
        
        for _, row in high_cost_symbols.iterrows():
            symbol_df = df[df['symbol'] == row['symbol']]
            
            # Check if slippage is the main contributor
            slippage_pct = symbol_df['slippage_cost'].sum() / symbol_df['total_costs'].sum() * 100
            
            if slippage_pct > 50:
                recommendations.append({
                    'symbol': row['symbol'],
                    'issue': 'High slippage costs',
                    'cost_percentage': row['cost_percentage'],
                    'recommendation': 'Consider using limit orders or optimizing execution timing'
                })
            else:
                recommendations.append({
                    'symbol': row['symbol'],
                    'issue': 'High overall trading costs',
                    'cost_percentage': row['cost_percentage'],
                    'recommendation': 'Review fee structure and execution strategy'
                })
        
        # Check if certain trade sizes are more cost-effective
        size_analysis = self.analyze_cost_by_trade_size()
        
        if not size_analysis.empty and len(size_analysis) > 1:
            min_cost_size = size_analysis.loc[size_analysis['cost_percentage'].idxmin()]
            max_cost_size = size_analysis.loc[size_analysis['cost_percentage'].idxmax()]
            
            if max_cost_size['cost_percentage'] > min_cost_size['cost_percentage'] * 1.5:
                recommendations.append({
                    'issue': 'Trade size inefficiency',
                    'details': f"Trades around {max_cost_size['trade_size_bucket']} have {max_cost_size['cost_percentage']:.2f}% costs, " +
                             f"while trades around {min_cost_size['trade_size_bucket']} have only {min_cost_size['cost_percentage']:.2f}% costs",
                    'recommendation': 'Consider consolidating or splitting trades to optimize size'
                })
        
        return recommendations
    
    def generate_cost_report(self) -> Dict:
        """
        Generate a comprehensive report on trading costs.
        
        Returns:
        --------
        dict
            Dictionary containing summary statistics
        """
        if not self._cost_records:
            return {
                'total_trades': 0,
                'total_value': 0,
                'total_costs': 0,
                'average_cost_percentage': 0,
                'cost_breakdown': {}
            }
        
        df = pd.DataFrame(self._cost_records)
        
        total_value = df['trade_value'].sum()
        total_costs = df['total_costs'].sum()
        avg_cost_pct = (total_costs / total_value) * 100 if total_value > 0 else 0
        
        # Cost breakdown
        total_commission = df['commission'].sum()
        total_exchange_fees = df['exchange_fees'].sum()
        total_tax = df['tax'].sum()
        total_slippage = df['slippage_cost'].sum()
        total_market_impact = df['market_impact_cost'].sum()
        total_other = df['other_costs'].sum()
        
        # Calculate explicit vs implicit cost ratio
        explicit_costs = df['explicit_costs'].sum()
        implicit_costs = df['implicit_costs'].sum()
        
        return {
            'total_trades': len(self._cost_records),
            'total_value': total_value,
            'total_costs': total_costs,
            'average_cost_percentage': avg_cost_pct,
            'cost_breakdown': {
                'commission': total_commission,
                'exchange_fees': total_exchange_fees,
                'tax': total_tax,
                'slippage_cost': total_slippage,
                'market_impact_cost': total_market_impact,
                'other_costs': total_other
            },
            'explicit_costs': explicit_costs,
            'implicit_costs': implicit_costs,
            'explicit_implicit_ratio': explicit_costs / implicit_costs if implicit_costs > 0 else float('inf'),
            'symbols_count': len(df['symbol'].unique()),
            'date_range': [df['timestamp'].min(), df['timestamp'].max()]
        }
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert all cost records to a pandas DataFrame.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all cost records
        """
        if not self._cost_records:
            return pd.DataFrame()
        return pd.DataFrame(self._cost_records)
    
    def _filter_records(self, symbol: Optional[str] = None,
                       start_time: Optional[datetime] = None,
                       end_time: Optional[datetime] = None) -> List[Dict]:
        """
        Filter cost records based on criteria.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        start_time : datetime, optional
            Start of time range
        end_time : datetime, optional
            End of time range
            
        Returns:
        --------
        list
            Filtered list of cost records
        """
        records = self._cost_records
        
        if symbol:
            records = [r for r in records if r['symbol'] == symbol]
            
        if start_time:
            records = [r for r in records if r['timestamp'] >= start_time]
            
        if end_time:
            records = [r for r in records if r['timestamp'] <= end_time]
            
        return records
    
    def clear(self) -> None:
        """
        Clear all cost records.
        """
        self._cost_records = []
