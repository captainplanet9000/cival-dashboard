"""
Historical Positions Module

Maintains a record of all closed positions with comprehensive analytics capabilities.
Provides tools for performance tracking, pattern analysis, and strategy refinement.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime, timedelta


class HistoricalPositions:
    """
    Tracks and analyzes all closed trading positions.
    
    Provides methods to:
    - Record closed positions
    - Calculate performance metrics
    - Analyze trading patterns
    - Generate trade history reports
    - Support ElizaOS agent learning from historical performance
    """
    
    def __init__(self):
        """Initialize an empty historical positions container."""
        self._positions = []
        
    def add_closed_position(self, position: Dict) -> bool:
        """
        Add a closed position to the historical record.
        
        Parameters:
        -----------
        position : dict
            Details of the closed position, should include at minimum:
            - position_id: Unique identifier
            - symbol: Trading symbol
            - entry_price: Position entry price
            - exit_price: Position exit price
            - quantity: Position size
            - entry_time: Entry datetime
            - exit_time: Exit datetime
            - side: 'long' or 'short'
            - strategy_id: ID of the strategy
            
        Returns:
        --------
        bool
            True if position was added successfully, False otherwise
        """
        # Ensure required fields are present
        required_fields = ['position_id', 'symbol', 'entry_price', 'exit_price', 
                         'quantity', 'entry_time', 'exit_time', 'side', 'strategy_id']
        
        if not all(field in position for field in required_fields):
            return False
        
        # Calculate hold time
        if isinstance(position['entry_time'], datetime) and isinstance(position['exit_time'], datetime):
            hold_time = position['exit_time'] - position['entry_time']
            position['hold_time_days'] = hold_time.total_seconds() / (60 * 60 * 24)
        else:
            position['hold_time_days'] = None
        
        # Calculate P&L if not already present
        if 'realized_pnl' not in position:
            if position['side'].lower() == 'long':
                pnl = (position['exit_price'] - position['entry_price']) * position['quantity']
            else:  # short
                pnl = (position['entry_price'] - position['exit_price']) * position['quantity']
            
            position['realized_pnl'] = pnl
        
        # Calculate percentage P&L if not already present
        if 'realized_pnl_percent' not in position:
            initial_value = position['entry_price'] * position['quantity']
            if initial_value > 0:
                position['realized_pnl_percent'] = (position['realized_pnl'] / initial_value) * 100
            else:
                position['realized_pnl_percent'] = 0.0
        
        # Add status for consistency
        position['position_status'] = 'closed'
        
        # Store the position
        self._positions.append(position)
        return True
    
    def get_position_by_id(self, position_id: str) -> Optional[Dict]:
        """
        Get a historical position by its ID.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to retrieve
            
        Returns:
        --------
        dict or None
            Position details or None if not found
        """
        for position in self._positions:
            if position['position_id'] == position_id:
                return position
        return None
    
    def get_positions_by_symbol(self, symbol: str) -> List[Dict]:
        """
        Get all historical positions for a specific symbol.
        
        Parameters:
        -----------
        symbol : str
            The trading symbol to filter by
            
        Returns:
        --------
        list
            List of positions for the given symbol
        """
        return [p for p in self._positions if p['symbol'] == symbol]
    
    def get_positions_by_strategy(self, strategy_id: str) -> List[Dict]:
        """
        Get all historical positions for a specific strategy.
        
        Parameters:
        -----------
        strategy_id : str
            The strategy ID to filter by
            
        Returns:
        --------
        list
            List of positions for the given strategy
        """
        return [p for p in self._positions if p['strategy_id'] == strategy_id]
    
    def get_positions_by_timeperiod(self, start_time: datetime, 
                                  end_time: datetime) -> List[Dict]:
        """
        Get all positions that were active within a specific time period.
        
        Parameters:
        -----------
        start_time : datetime
            Start of the time period
        end_time : datetime
            End of the time period
            
        Returns:
        --------
        list
            List of positions active in the given time period
        """
        return [
            p for p in self._positions 
            if (p['entry_time'] <= end_time and p['exit_time'] >= start_time)
        ]
    
    def calculate_performance_metrics(self, 
                                    symbol: Optional[str] = None,
                                    strategy_id: Optional[str] = None,
                                    start_time: Optional[datetime] = None,
                                    end_time: Optional[datetime] = None) -> Dict:
        """
        Calculate comprehensive performance metrics for historical positions.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        strategy_id : str, optional
            Filter by strategy
        start_time : datetime, optional
            Start of time period
        end_time : datetime, optional
            End of time period
            
        Returns:
        --------
        dict
            Dictionary containing performance metrics
        """
        # Filter positions based on criteria
        positions = self._filter_positions(symbol, strategy_id, start_time, end_time)
        
        if not positions:
            return {
                'total_trades': 0,
                'win_rate': 0.0,
                'total_pnl': 0.0,
                'average_pnl': 0.0,
                'largest_win': 0.0,
                'largest_loss': 0.0,
                'average_win': 0.0,
                'average_loss': 0.0,
                'profit_factor': 0.0,
                'average_hold_time_days': 0.0
            }
        
        # Basic counts
        total_trades = len(positions)
        winning_trades = [p for p in positions if p['realized_pnl'] > 0]
        losing_trades = [p for p in positions if p['realized_pnl'] < 0]
        breakeven_trades = [p for p in positions if p['realized_pnl'] == 0]
        
        win_count = len(winning_trades)
        loss_count = len(losing_trades)
        breakeven_count = len(breakeven_trades)
        
        # Win rate
        win_rate = (win_count / total_trades) * 100 if total_trades > 0 else 0.0
        
        # PnL metrics
        total_pnl = sum(p['realized_pnl'] for p in positions)
        average_pnl = total_pnl / total_trades if total_trades > 0 else 0.0
        
        # Win/loss metrics
        largest_win = max([p['realized_pnl'] for p in winning_trades], default=0.0)
        largest_loss = min([p['realized_pnl'] for p in losing_trades], default=0.0)
        
        average_win = sum(p['realized_pnl'] for p in winning_trades) / win_count if win_count > 0 else 0.0
        average_loss = sum(p['realized_pnl'] for p in losing_trades) / loss_count if loss_count > 0 else 0.0
        
        # Profit factor
        total_gains = sum(p['realized_pnl'] for p in winning_trades)
        total_losses = abs(sum(p['realized_pnl'] for p in losing_trades))
        profit_factor = total_gains / total_losses if total_losses > 0 else float('inf')
        
        # Hold time metrics
        positions_with_holdtime = [p for p in positions if 'hold_time_days' in p and p['hold_time_days'] is not None]
        avg_hold_time = sum(p['hold_time_days'] for p in positions_with_holdtime) / len(positions_with_holdtime) if positions_with_holdtime else 0.0
        
        # By side
        long_positions = [p for p in positions if p['side'].lower() == 'long']
        short_positions = [p for p in positions if p['side'].lower() == 'short']
        
        long_pnl = sum(p['realized_pnl'] for p in long_positions)
        short_pnl = sum(p['realized_pnl'] for p in short_positions)
        
        # Calculate consecutive wins/losses
        sorted_positions = sorted(positions, key=lambda p: p['exit_time'])
        max_consecutive_wins = self._find_max_consecutive(sorted_positions, True)
        max_consecutive_losses = self._find_max_consecutive(sorted_positions, False)
        
        return {
            'total_trades': total_trades,
            'win_count': win_count,
            'loss_count': loss_count,
            'breakeven_count': breakeven_count,
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'average_pnl': average_pnl,
            'largest_win': largest_win,
            'largest_loss': largest_loss,
            'average_win': average_win,
            'average_loss': average_loss,
            'profit_factor': profit_factor,
            'average_hold_time_days': avg_hold_time,
            'long_trades': len(long_positions),
            'short_trades': len(short_positions),
            'long_pnl': long_pnl,
            'short_pnl': short_pnl,
            'max_consecutive_wins': max_consecutive_wins,
            'max_consecutive_losses': max_consecutive_losses
        }
    
    def calculate_monthly_performance(self,
                                    symbol: Optional[str] = None,
                                    strategy_id: Optional[str] = None) -> pd.DataFrame:
        """
        Calculate performance metrics broken down by month.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        strategy_id : str, optional
            Filter by strategy
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with monthly performance metrics
        """
        # Filter positions based on criteria
        positions = self._filter_positions(symbol, strategy_id)
        
        if not positions:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(positions)
        
        # Extract month from exit_time
        df['month'] = df['exit_time'].apply(lambda x: x.replace(day=1, hour=0, minute=0, second=0, microsecond=0))
        
        # Group by month
        monthly_stats = df.groupby('month').agg({
            'position_id': 'count',
            'realized_pnl': 'sum',
            'realized_pnl_percent': 'mean'
        }).reset_index()
        
        # Rename columns
        monthly_stats.rename(columns={
            'position_id': 'trade_count',
            'realized_pnl': 'total_pnl',
            'realized_pnl_percent': 'average_pnl_percent'
        }, inplace=True)
        
        # Calculate win rate for each month
        monthly_win_rates = []
        
        for month in monthly_stats['month']:
            month_positions = df[df['month'] == month]
            wins = sum(1 for pnl in month_positions['realized_pnl'] if pnl > 0)
            win_rate = (wins / len(month_positions)) * 100 if len(month_positions) > 0 else 0
            monthly_win_rates.append(win_rate)
        
        monthly_stats['win_rate'] = monthly_win_rates
        
        return monthly_stats
    
    def analyze_trade_distribution(self, 
                                 symbol: Optional[str] = None,
                                 strategy_id: Optional[str] = None,
                                 by: str = 'day_of_week') -> pd.DataFrame:
        """
        Analyze how trades are distributed across different time periods.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        strategy_id : str, optional
            Filter by strategy
        by : str
            Distribution dimension: 'day_of_week', 'hour_of_day', or 'month_of_year'
            
        Returns:
        --------
        pd.DataFrame
            DataFrame with trade distribution analysis
        """
        # Filter positions based on criteria
        positions = self._filter_positions(symbol, strategy_id)
        
        if not positions:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(positions)
        
        # Create distribution column based on 'by' parameter
        if by == 'day_of_week':
            df['distribution_key'] = df['exit_time'].apply(lambda x: x.strftime('%A'))  # Day name
        elif by == 'hour_of_day':
            df['distribution_key'] = df['exit_time'].apply(lambda x: x.hour)  # Hour (0-23)
        elif by == 'month_of_year':
            df['distribution_key'] = df['exit_time'].apply(lambda x: x.strftime('%B'))  # Month name
        else:
            raise ValueError(f"Invalid 'by' parameter: {by}. Use 'day_of_week', 'hour_of_day', or 'month_of_year'")
        
        # Group by distribution key
        distribution = df.groupby('distribution_key').agg({
            'position_id': 'count',
            'realized_pnl': ['sum', 'mean'],
            'realized_pnl_percent': 'mean'
        })
        
        # Flatten multi-level columns
        distribution.columns = ['_'.join(col).strip('_') for col in distribution.columns.values]
        distribution = distribution.reset_index()
        
        # Rename columns
        distribution.rename(columns={
            'position_id_count': 'trade_count',
            'realized_pnl_sum': 'total_pnl',
            'realized_pnl_mean': 'average_pnl',
            'realized_pnl_percent_mean': 'average_pnl_percent'
        }, inplace=True)
        
        # Add win rate
        if by == 'day_of_week':
            days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            win_rates = {}
            
            for day in days_order:
                day_positions = df[df['distribution_key'] == day]
                if len(day_positions) > 0:
                    wins = sum(1 for pnl in day_positions['realized_pnl'] if pnl > 0)
                    win_rates[day] = (wins / len(day_positions)) * 100
                else:
                    win_rates[day] = 0
            
            # Convert to DataFrame and merge
            win_rate_df = pd.DataFrame(list(win_rates.items()), columns=['distribution_key', 'win_rate'])
            distribution = pd.merge(distribution, win_rate_df, on='distribution_key', how='left')
            
            # Sort by days of week
            distribution['sort_key'] = distribution['distribution_key'].apply(lambda x: days_order.index(x))
            distribution = distribution.sort_values('sort_key').drop('sort_key', axis=1)
        else:
            # Calculate win rate for each group
            win_rates = []
            
            for key in distribution['distribution_key']:
                key_positions = df[df['distribution_key'] == key]
                wins = sum(1 for pnl in key_positions['realized_pnl'] if pnl > 0)
                win_rate = (wins / len(key_positions)) * 100
                win_rates.append(win_rate)
            
            distribution['win_rate'] = win_rates
        
        return distribution
    
    def find_correlated_symbols(self, min_correlation: float = 0.7) -> List[Tuple[str, str, float]]:
        """
        Find symbols with correlated performance.
        
        Parameters:
        -----------
        min_correlation : float
            Minimum correlation coefficient to include (0.0 to 1.0)
            
        Returns:
        --------
        list
            List of tuples with (symbol1, symbol2, correlation)
        """
        # Need at least 2 symbols to calculate correlation
        symbols = set(p['symbol'] for p in self._positions)
        if len(symbols) < 2:
            return []
        
        # Create a dictionary to group PnL by symbol and day
        symbol_daily_pnl = {}
        
        for symbol in symbols:
            symbol_positions = self.get_positions_by_symbol(symbol)
            
            # Group by day
            daily_pnl = {}
            for position in symbol_positions:
                day = position['exit_time'].date()
                if day in daily_pnl:
                    daily_pnl[day] += position['realized_pnl']
                else:
                    daily_pnl[day] = position['realized_pnl']
            
            symbol_daily_pnl[symbol] = daily_pnl
        
        # Calculate correlations
        correlations = []
        
        for i, symbol1 in enumerate(symbols):
            for symbol2 in list(symbols)[i+1:]:
                # Find common days
                common_days = set(symbol_daily_pnl[symbol1].keys()) & set(symbol_daily_pnl[symbol2].keys())
                
                if len(common_days) < 5:  # Need at least 5 common days for meaningful correlation
                    continue
                
                # Extract PnL series for common days
                pnl1 = [symbol_daily_pnl[symbol1][day] for day in common_days]
                pnl2 = [symbol_daily_pnl[symbol2][day] for day in common_days]
                
                # Calculate correlation
                if np.std(pnl1) > 0 and np.std(pnl2) > 0:  # Avoid division by zero
                    correlation = np.corrcoef(pnl1, pnl2)[0, 1]
                    
                    if abs(correlation) >= min_correlation:
                        correlations.append((symbol1, symbol2, correlation))
        
        return sorted(correlations, key=lambda x: abs(x[2]), reverse=True)
    
    def analyze_drawdowns(self, strategy_id: Optional[str] = None) -> List[Dict]:
        """
        Analyze historical drawdowns based on closed positions.
        
        Parameters:
        -----------
        strategy_id : str, optional
            Filter by strategy
            
        Returns:
        --------
        list
            List of drawdown periods and their characteristics
        """
        # Filter positions based on strategy
        positions = self._positions
        if strategy_id:
            positions = [p for p in positions if p['strategy_id'] == strategy_id]
        
        if not positions:
            return []
        
        # Sort positions by exit time
        sorted_positions = sorted(positions, key=lambda p: p['exit_time'])
        
        # Calculate cumulative PnL
        cumulative_pnl = 0
        peak = 0
        drawdowns = []
        current_drawdown = None
        
        for position in sorted_positions:
            cumulative_pnl += position['realized_pnl']
            
            if cumulative_pnl > peak:
                peak = cumulative_pnl
                
                # Close any active drawdown
                if current_drawdown:
                    current_drawdown['end_time'] = position['exit_time']
                    current_drawdown['recovery_trades'] = current_drawdown['trade_count']
                    current_drawdown['recovered'] = True
                    drawdowns.append(current_drawdown)
                    current_drawdown = None
            elif cumulative_pnl < peak:
                # In drawdown
                drawdown_amount = peak - cumulative_pnl
                drawdown_percentage = (drawdown_amount / peak) * 100 if peak > 0 else 0
                
                if current_drawdown is None:
                    # Start of a new drawdown
                    current_drawdown = {
                        'start_time': position['exit_time'],
                        'peak_equity': peak,
                        'max_drawdown': drawdown_amount,
                        'max_drawdown_percentage': drawdown_percentage,
                        'trade_count': 1,
                        'losing_trades': 1 if position['realized_pnl'] < 0 else 0,
                        'symbols': [position['symbol']],
                        'recovered': False
                    }
                else:
                    # Continuing drawdown
                    current_drawdown['trade_count'] += 1
                    
                    if position['realized_pnl'] < 0:
                        current_drawdown['losing_trades'] += 1
                    
                    if position['symbol'] not in current_drawdown['symbols']:
                        current_drawdown['symbols'].append(position['symbol'])
                    
                    if drawdown_amount > current_drawdown['max_drawdown']:
                        current_drawdown['max_drawdown'] = drawdown_amount
                        current_drawdown['max_drawdown_percentage'] = drawdown_percentage
        
        # Add the current drawdown if it exists and hasn't been recovered
        if current_drawdown:
            current_drawdown['end_time'] = sorted_positions[-1]['exit_time']
            current_drawdown['recovery_trades'] = 0
            drawdowns.append(current_drawdown)
        
        return drawdowns
    
    def identify_elizaos_learning_opportunities(self) -> Dict:
        """
        Identify learning opportunities for ElizaOS agents based on historical patterns.
        
        Returns:
        --------
        dict
            Dictionary with learning insights and opportunities
        """
        if not self._positions:
            return {
                'trading_patterns': [],
                'strategy_insights': [],
                'symbol_insights': [],
                'time_based_insights': []
            }
        
        insights = {
            'trading_patterns': [],
            'strategy_insights': [],
            'symbol_insights': [],
            'time_based_insights': []
        }
        
        # Find successful trade patterns
        df = pd.DataFrame(self._positions)
        
        # Strategy performance
        strategies = df['strategy_id'].unique()
        for strategy in strategies:
            strategy_df = df[df['strategy_id'] == strategy]
            win_rate = (sum(1 for pnl in strategy_df['realized_pnl'] if pnl > 0) / len(strategy_df)) * 100
            
            if win_rate > 60:
                insights['strategy_insights'].append({
                    'strategy_id': strategy,
                    'win_rate': win_rate,
                    'trade_count': len(strategy_df),
                    'insight': 'High performing strategy worth increasing allocation'
                })
            elif win_rate < 40:
                insights['strategy_insights'].append({
                    'strategy_id': strategy,
                    'win_rate': win_rate,
                    'trade_count': len(strategy_df),
                    'insight': 'Low performing strategy may need optimization or reduced allocation'
                })
        
        # Symbol performance
        symbols = df['symbol'].unique()
        for symbol in symbols:
            symbol_df = df[df['symbol'] == symbol]
            if len(symbol_df) < 5:  # Need at least 5 trades for meaningful analysis
                continue
                
            win_rate = (sum(1 for pnl in symbol_df['realized_pnl'] if pnl > 0) / len(symbol_df)) * 100
            
            if win_rate > 65:
                insights['symbol_insights'].append({
                    'symbol': symbol,
                    'win_rate': win_rate,
                    'trade_count': len(symbol_df),
                    'insight': 'Symbol shows favorable trading characteristics'
                })
            elif win_rate < 35:
                insights['symbol_insights'].append({
                    'symbol': symbol,
                    'win_rate': win_rate,
                    'trade_count': len(symbol_df),
                    'insight': 'Symbol shows challenging trading characteristics'
                })
        
        # Time-based patterns
        if len(df) >= 20:  # Need sufficient trades for time analysis
            day_analysis = self.analyze_trade_distribution(by='day_of_week')
            
            for _, row in day_analysis.iterrows():
                if row['win_rate'] > 70 and row['trade_count'] >= 5:
                    insights['time_based_insights'].append({
                        'time_period': row['distribution_key'],
                        'win_rate': row['win_rate'],
                        'trade_count': row['trade_count'],
                        'insight': f"High win rate on {row['distribution_key']}s"
                    })
                elif row['win_rate'] < 30 and row['trade_count'] >= 5:
                    insights['time_based_insights'].append({
                        'time_period': row['distribution_key'],
                        'win_rate': row['win_rate'],
                        'trade_count': row['trade_count'],
                        'insight': f"Low win rate on {row['distribution_key']}s"
                    })
        
        # Trading patterns
        # Look for successful hold time patterns
        if 'hold_time_days' in df.columns:
            df['hold_time_category'] = pd.cut(
                df['hold_time_days'],
                bins=[0, 1, 3, 7, 14, float('inf')],
                labels=['intraday', 'short_term', 'medium_term', 'swing', 'long_term']
            )
            
            hold_time_analysis = df.groupby('hold_time_category').agg({
                'realized_pnl': ['mean', 'sum'],
                'position_id': 'count'
            })
            
            hold_time_analysis.columns = ['_'.join(col).strip('_') for col in hold_time_analysis.columns.values]
            hold_time_analysis = hold_time_analysis.reset_index()
            
            for _, row in hold_time_analysis.iterrows():
                if row['position_id_count'] >= 5:
                    category = row['hold_time_category']
                    avg_pnl = row['realized_pnl_mean']
                    
                    if avg_pnl > 0:
                        insights['trading_patterns'].append({
                            'pattern_type': 'hold_time',
                            'category': category,
                            'average_pnl': avg_pnl,
                            'trade_count': row['position_id_count'],
                            'insight': f"Positive performance with {category} hold times"
                        })
        
        return insights
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert all historical positions to a pandas DataFrame.
        
        Returns:
        --------
        pd.DataFrame
            DataFrame containing all historical positions
        """
        if not self._positions:
            return pd.DataFrame()
        return pd.DataFrame(self._positions)
    
    def export_to_csv(self, filepath: str) -> bool:
        """
        Export historical positions to a CSV file.
        
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
    
    def _filter_positions(self, 
                        symbol: Optional[str] = None,
                        strategy_id: Optional[str] = None,
                        start_time: Optional[datetime] = None,
                        end_time: Optional[datetime] = None) -> List[Dict]:
        """
        Filter positions based on criteria.
        
        Parameters:
        -----------
        symbol : str, optional
            Filter by symbol
        strategy_id : str, optional
            Filter by strategy
        start_time : datetime, optional
            Start of time period
        end_time : datetime, optional
            End of time period
            
        Returns:
        --------
        list
            Filtered list of positions
        """
        positions = self._positions
        
        if symbol:
            positions = [p for p in positions if p['symbol'] == symbol]
            
        if strategy_id:
            positions = [p for p in positions if p['strategy_id'] == strategy_id]
            
        if start_time:
            positions = [p for p in positions if p['exit_time'] >= start_time]
            
        if end_time:
            positions = [p for p in positions if p['exit_time'] <= end_time]
            
        return positions
    
    def _find_max_consecutive(self, sorted_positions: List[Dict], is_wins: bool) -> int:
        """
        Find maximum consecutive wins or losses.
        
        Parameters:
        -----------
        sorted_positions : list
            List of positions sorted by exit time
        is_wins : bool
            True to find consecutive wins, False for losses
            
        Returns:
        --------
        int
            Maximum consecutive count
        """
        max_consecutive = 0
        current_streak = 0
        
        for position in sorted_positions:
            is_win = position['realized_pnl'] > 0
            
            if is_win == is_wins:
                current_streak += 1
                max_consecutive = max(max_consecutive, current_streak)
            else:
                current_streak = 0
        
        return max_consecutive
    
    def count(self) -> int:
        """
        Get the number of historical positions.
        
        Returns:
        --------
        int
            Count of historical positions
        """
        return len(self._positions)
    
    def clear(self) -> None:
        """
        Clear all historical positions (use with caution).
        """
        self._positions = []
